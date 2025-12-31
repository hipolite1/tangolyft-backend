import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequestTripDto } from "./dto/request-trip.dto";
import { ServiceType, TripStatus } from "@prisma/client";
import { computeFare } from "../fare/fare";


function serviceTypeMatchesDriver(driverType: string, serviceType: ServiceType) {
  if (serviceType === ServiceType.CAR_RIDE) return driverType === "CAR_DRIVER";
  if (serviceType === ServiceType.BIKE_DELIVERY) return driverType === "BIKE_COURIER";
  return true;
}


@Controller("trips")
export class TripsController {
  constructor(private readonly prisma: PrismaService) {}

  // Rider creates a trip request (REQUESTED, no driver assigned)
  @RequireRole("RIDER", "ADMIN", "DRIVER")
  @Post("request")
  async requestTrip(@CurrentUser() user: any, @Body() dto: RequestTripDto) {
    // basic sanity checks (even if validation pipe not enabled)
    if (!dto?.serviceType) return { ok: false, message: "serviceType is required" };
    if (!dto?.pickupAddress || dto.pickupLat === undefined || dto.pickupLng === undefined) {
      return { ok: false, message: "pickupAddress, pickupLat, pickupLng are required" };
    }
    if (!dto?.dropoffAddress || dto.dropoffLat === undefined || dto.dropoffLng === undefined) {
      return { ok: false, message: "dropoffAddress, dropoffLat, dropoffLng are required" };
    }

    const data: any = {
      serviceType: dto.serviceType,
      city: dto.city ?? "ABUJA",
      riderId: user.sub,
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffAddress: dto.dropoffAddress,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
      distanceKmEst: dto.distanceKmEst ?? null,
      durationMinEst: dto.durationMinEst ?? null,
      status: TripStatus.REQUESTED,
    };

    // If DELIVERY, create DeliveryDetail (only if provided)
    if (dto.serviceType === ServiceType.BIKE_DELIVERY) {
      if (!dto.itemDescription || !dto.recipientName || !dto.recipientPhone) {
        return {
          ok: false,
          message: "For DELIVERY, itemDescription, recipientName, recipientPhone are required",
        };
      }
      data.delivery = {
        create: {
          itemDescription: dto.itemDescription,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          noteToCourier: dto.noteToCourier ?? null,
        },
      };
    }

    const trip = await this.prisma.trip.create({
      data,
      include: { rider: true, driver: true },
    });

    return { ok: true, trip };
  }

  // Rider views their trips
  @RequireRole("RIDER", "ADMIN", "DRIVER")
  @Get("my")
  async myTrips(@CurrentUser() user: any) {
    const trips = await this.prisma.trip.findMany({
      where: { riderId: user.sub },
      orderBy: { requestedAt: "desc" },
      include: { driver: true },
    });
    return { ok: true, trips };
  }

  // Driver inbox: show REQUESTED trips in driver's city/service, unassigned
  @RequireRole("DRIVER", "ADMIN")
  @Get("inbox")
  async inbox(@CurrentUser() user: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    // Only approved drivers should see/accept work
    if (driver.kycStatus !== "APPROVED") return { ok: false, message: "KYC not approved" };
    if (driver.availability !== "ONLINE") return { ok: false, message: "Driver is not ONLINE" };

  const trips = await this.prisma.trip.findMany({
  where: {
    status: TripStatus.REQUESTED,
    driverId: null,
    city: driver.city,
    commitmentStatus: { in: ["CONFIRMED", "WAIVED"] },
  },
  orderBy: { requestedAt: "asc" },
  include: { rider: true },
});


    // Filter by serviceType vs driverType
    const filtered = trips.filter((t) => serviceTypeMatchesDriver(driver.driverType as any, t.serviceType));

    return { ok: true, trips: filtered };
  }

  // Driver accepts a trip
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/accept")
  async accept(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };
    if (driver.kycStatus !== "APPROVED") return { ok: false, message: "KYC not approved" };
    if (driver.availability !== "ONLINE") return { ok: false, message: "Driver is not ONLINE" };

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return { ok: false, message: "Trip not found" };
    if (trip.status !== TripStatus.REQUESTED || trip.driverId) {
      return { ok: false, message: "Trip is no longer available" };
    }
    if (trip.city !== driver.city) return { ok: false, message: "Trip city mismatch" };
    if (!serviceTypeMatchesDriver(driver.driverType as any, trip.serviceType)) {
      return { ok: false, message: "Service type does not match driver type" };
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: driver.id,
        status: TripStatus.ACCEPTED,
        matchedAt: new Date(),
        acceptedAt: new Date(),
      },
      include: { rider: true, driver: true },
    });

    return { ok: true, trip: updated };
  }

  // Driver starts the trip
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/start")
  async start(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return { ok: false, message: "Trip not found" };
    if (trip.driverId !== driver.id) return { ok: false, message: "Not assigned to this driver" };
    if (trip.status !== TripStatus.ACCEPTED) return { ok: false, message: "Trip must be ACCEPTED first" };

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.STARTED, startedAt: new Date() },
    });

    return { ok: true, trip: updated };
  }

    // Driver completes the trip + computes fare + credits wallet (D1)
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/complete")
  async complete(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return { ok: false, message: "Trip not found" };
    if (trip.driverId !== driver.id) return { ok: false, message: "Not assigned to this driver" };
    if (trip.status !== TripStatus.STARTED) return { ok: false, message: "Trip must be STARTED first" };

    // Phase D1 needs estimates (later we replace with real distance/time)
    if (trip.distanceKmEst == null || trip.durationMinEst == null) {
      return {
        ok: false,
        message: "distanceKmEst and durationMinEst are required to compute fare (Phase D1).",
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Complete trip
      const completedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.COMPLETED, completedAt: new Date() },
      });

      // 2) Idempotency: if fare already exists, do not credit again
      const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
      if (existingFare) {
        return { trip: completedTrip, fare: existingFare, walletUpdated: false };
      }

      // 3) Find active fare policy for city + serviceType
      const policy = await tx.farePolicy.findFirst({
        where: { city: trip.city, serviceType: trip.serviceType, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (!policy) {
        throw new Error(`No active FarePolicy for ${trip.city} / ${trip.serviceType}`);
      }

      const fareCalc = computeFare(
  policy,
  trip.distanceKmEst!,
  trip.durationMinEst!
);


      // 4) Create TripFare snapshot
      const fare = await tx.tripFare.create({
        data: {
          tripId,
          currency: fareCalc.currency,
          baseFare: fareCalc.baseFare,
          perKmFare: fareCalc.perKmFare,
          perMinFare: fareCalc.perMinFare,
          bookingFee: fareCalc.bookingFee,
          discount: fareCalc.discount,
          totalAmount: fareCalc.totalAmount,
          platformEarning: fareCalc.platformEarning,
          driverEarning: fareCalc.driverEarning,
          distanceKm: trip.distanceKmEst,
          durationMin: trip.durationMinEst,
        },
      });

      // 5) Ensure driver wallet exists then credit driver (80%)
      await tx.driverWallet.upsert({
        where: { driverId: driver.id },
        create: { driverId: driver.id, balance: 0 },
        update: {},
      });

      await tx.driverWallet.update({
        where: { driverId: driver.id },
        data: { balance: { increment: fareCalc.driverEarning } },
      });

      await tx.walletTransaction.create({
        data: {
          driverId: driver.id,
          tripId,
          type: "CREDIT",
          reason: "TRIP_EARNING",
          amount: fareCalc.driverEarning,
          note: `Trip earning for ${tripId} (platform=${fareCalc.platformEarning})`,
        },
      });

      // 6) Record platform commission as an audit log entry (for tracking)
      await tx.auditLog.create({
        data: {
          adminUserId: user.sub,
          action: "TRIP_COMMISSION_RECORDED",
          entityType: "Trip",
          entityId: tripId,
          metadata: {
            totalAmount: fareCalc.totalAmount,
            driverEarning: fareCalc.driverEarning,
            platformEarning: fareCalc.platformEarning,
            currency: fareCalc.currency,
          },
        },
      });

      return { trip: completedTrip, fare, walletUpdated: true };
    });

    return { ok: true, ...result };
  }
 } 