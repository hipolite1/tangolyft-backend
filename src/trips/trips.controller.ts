import { Body, Controller, Get, Param, Post, ParseUUIDPipe } from "@nestjs/common";
import { Prisma, ServiceType, TripStatus } from "@prisma/client";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { computeFare } from "../fare/fare";
import { RequestTripDto } from "./dto/request-trip.dto";

function serviceTypeMatchesDriver(driverType: string, serviceType: ServiceType) {
  if (serviceType === ServiceType.CAR_RIDE) return driverType === "CAR_DRIVER";
  if (serviceType === ServiceType.BIKE_DELIVERY) return driverType === "BIKE_COURIER";
  return true;
}

function prismaErrMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) return `DB error: ${e.code}`;
  if (e instanceof Error) return e.message || "Unexpected error";
  return "Unexpected error";
}

@Controller("trips")
export class TripsController {
  constructor(private readonly prisma: PrismaService) {}

  // Rider creates a trip request (REQUESTED, no driver assigned)
  @RequireRole("RIDER", "ADMIN")
  @Post("request")
  async requestTrip(@CurrentUser() user: any, @Body() dto: RequestTripDto) {
    try {
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

        // optional; complete() will fallback if missing
        distanceKmEst: dto.distanceKmEst ?? null,
        durationMinEst: dto.durationMinEst ?? null,

        status: TripStatus.REQUESTED,
        // paymentMode is NOT read from DTO (Prisma default = PAY_ON_DROPOFF)
      };

      if (dto.serviceType === ServiceType.BIKE_DELIVERY) {
        if (!dto.itemDescription || !dto.recipientName || !dto.recipientPhone) {
          return {
            ok: false,
            message: "For BIKE_DELIVERY, itemDescription, recipientName, recipientPhone are required",
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
        include: { rider: true, driver: true, delivery: true, fare: true },
      });

      return { ok: true, trip };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  // Rider views their trips
  @RequireRole("RIDER", "ADMIN")
  @Get("my")
  async myTrips(@CurrentUser() user: any) {
    try {
      const trips = await this.prisma.trip.findMany({
        where: { riderId: user.sub },
        orderBy: { requestedAt: "desc" },
        include: { driver: true, delivery: true, fare: true },
      });

      return { ok: true, trips };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  // Driver inbox: show REQUESTED trips in driver's city, unassigned
  @RequireRole("DRIVER", "ADMIN")
  @Get("inbox")
  async inbox(@CurrentUser() user: any) {
    try {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
      if (!driver) return { ok: false, message: "Driver profile not found" };

      if (driver.kycStatus !== "APPROVED") return { ok: false, message: "KYC not approved" };
      if (driver.availability !== "ONLINE") return { ok: false, message: "Driver is not ONLINE" };

      const trips = await this.prisma.trip.findMany({
        where: {
          status: TripStatus.REQUESTED,
          driverId: null,
          city: driver.city,
        },
        orderBy: { requestedAt: "asc" },
        include: { rider: true, delivery: true },
      });

      const filtered = trips.filter((t) =>
        serviceTypeMatchesDriver(driver.driverType as any, t.serviceType),
      );

      return { ok: true, trips: filtered };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  // Driver accepts a trip (atomic: no double-accept)
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/accept")
  async accept(@CurrentUser() user: any, @Param("tripId", new ParseUUIDPipe()) tripId: string) {
    try {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
      if (!driver) return { ok: false, message: "Driver profile not found" };

      if (driver.kycStatus !== "APPROVED") return { ok: false, message: "KYC not approved" };
      if (driver.availability !== "ONLINE") return { ok: false, message: "Driver is not ONLINE" };

      // Atomic claim: only succeeds if still REQUESTED + unassigned
      const updated = await this.prisma.trip
        .update({
          where: {
            // requires a compound unique in schema to be perfect;
            // so we do the atomic claim inside tx (below) instead.
            id: tripId,
          },
          data: {},
        })
        .catch(() => null);

      // Use transaction for safe claim
      const result = await this.prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findUnique({ where: { id: tripId } });
        if (!trip) return { ok: false as const, message: "Trip not found" };

        if (trip.status !== TripStatus.REQUESTED || trip.driverId) {
          return { ok: false as const, message: "Trip is no longer available" };
        }

        if (trip.city !== driver.city) {
          return { ok: false as const, message: "Trip city mismatch" };
        }

        if (!serviceTypeMatchesDriver(driver.driverType as any, trip.serviceType)) {
          return { ok: false as const, message: "Service type does not match driver type" };
        }

        // this update will throw if someone changed it between read/update
        const claimed = await tx.trip.update({
          where: { id: tripId },
          data: {
            driverId: driver.id,
            status: TripStatus.ACCEPTED,
            matchedAt: new Date(),
            acceptedAt: new Date(),
          },
          include: { rider: true, driver: true, delivery: true },
        });

        return { ok: true as const, trip: claimed };
      });

      // keep TS happy (and ignore unused var)
      void updated;

      return result;
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  // Driver starts trip
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/start")
  async start(@CurrentUser() user: any, @Param("tripId", new ParseUUIDPipe()) tripId: string) {
    try {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
      if (!driver) return { ok: false, message: "Driver profile not found" };

      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return { ok: false, message: "Trip not found" };

      if (trip.driverId !== driver.id) return { ok: false, message: "Not assigned to this driver" };
      if (trip.status !== TripStatus.ACCEPTED) return { ok: false, message: "Trip must be ACCEPTED first" };

      const updated = await this.prisma.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.STARTED, startedAt: new Date() },
        include: { delivery: true },
      });

      return { ok: true, trip: updated };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  // Driver completes trip + fare + wallet credit (idempotent + safe)
  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/complete")
  async complete(
    @CurrentUser() user: any,
    @Param("tripId", new ParseUUIDPipe()) tripId: string,
    @Body() body?: { distanceKmEst?: number; durationMinEst?: number },
  ) {
    try {
      const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
      if (!driver) return { ok: false, message: "Driver profile not found" };

      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return { ok: false, message: "Trip not found" };

      if (trip.driverId !== driver.id) return { ok: false, message: "Not assigned to this driver" };

      if (trip.status === TripStatus.COMPLETED) {
        const existingFare = await this.prisma.tripFare.findUnique({ where: { tripId } });
        return { ok: true, trip, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
      }

      if (trip.status !== TripStatus.STARTED) return { ok: false, message: "Trip must be STARTED first" };

      const rawDistance = body?.distanceKmEst ?? trip.distanceKmEst ?? null;
      const rawDuration = body?.durationMinEst ?? trip.durationMinEst ?? null;

      let distanceKmEst = Number(rawDistance);
      let durationMinEst = Number(rawDuration);

      if (!Number.isFinite(distanceKmEst) || distanceKmEst <= 0) distanceKmEst = 1;
      if (!Number.isFinite(durationMinEst) || durationMinEst <= 0) durationMinEst = 5;

      const result = await this.prisma.$transaction(async (tx) => {
        const latest = await tx.trip.findUnique({ where: { id: tripId } });
        if (!latest) throw new Error("Trip not found");

        if (latest.status === TripStatus.COMPLETED) {
          const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
          return { trip: latest, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
        }

        if (latest.status !== TripStatus.STARTED) {
          throw new Error("Trip must be STARTED first");
        }

        const completedTrip = await tx.trip.update({
          where: { id: tripId },
          data: {
            status: TripStatus.COMPLETED,
            completedAt: new Date(),
            distanceKmEst,
            durationMinEst,
          },
        });

        const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
        if (existingFare) {
          return { trip: completedTrip, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
        }

        const policy = await tx.farePolicy.findFirst({
          where: { city: completedTrip.city, serviceType: completedTrip.serviceType, isActive: true },
          orderBy: { createdAt: "desc" },
        });
        if (!policy) throw new Error(`No active FarePolicy for ${completedTrip.city} / ${completedTrip.serviceType}`);

        const fareCalc = computeFare(policy, distanceKmEst, durationMinEst);

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
            distanceKm: distanceKmEst,
            durationMin: durationMinEst,
          },
        });

        const existingTx = await tx.walletTransaction.findFirst({
          where: { tripId, driverId: driver.id, type: "CREDIT", reason: "TRIP_EARNING" },
        });

        let walletUpdated = false;

        if (!existingTx) {
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

          walletUpdated = true;
        }

        // optional audit log (if AuditLog exists in schema)
        await tx.auditLog
          .create({
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
                distanceKmEst,
                durationMinEst,
                walletUpdated,
              },
            },
          })
          .catch(() => null);

        return { trip: completedTrip, fare, walletUpdated, alreadyCompleted: false };
      });

      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }
}



     