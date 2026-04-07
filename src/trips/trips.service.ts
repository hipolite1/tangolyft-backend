import { Injectable } from "@nestjs/common";
import {
  CommitmentStatus,
  Prisma,
  ServiceType,
  TripStatus,
  WalletTxReason,
  WalletTxType,
} from "@prisma/client";
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

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  private toRad(value: number) {
    return (value * Math.PI) / 180;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async findEligibleDriversForTrip(tripId: string) {
    try {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
      });

      if (!trip) return { ok: false, message: "Trip not found" };

      const now = Date.now();
      const maxAgeMs = 2 * 60 * 1000;

      const drivers = await this.prisma.driver.findMany({
        include: {
          user: true,
          location: true,
          vehicle: true,
        },
      });

      const queriedDrivers = drivers.map((driver) => {
        const hasLocation = !!driver.location;

        const seenAtMs = driver.location?.lastSeenAt
          ? new Date(driver.location.lastSeenAt).getTime()
          : null;

        const isFresh = seenAtMs !== null ? now - seenAtMs <= maxAgeMs : false;

        const matchesServiceType = serviceTypeMatchesDriver(
          driver.driverType as any,
          trip.serviceType,
        );

        const distanceKm =
          hasLocation &&
          trip.pickupLat != null &&
          trip.pickupLng != null &&
          driver.location?.lat != null &&
          driver.location?.lng != null
            ? this.haversineKm(
                trip.pickupLat,
                trip.pickupLng,
                driver.location.lat,
                driver.location.lng,
              )
            : null;

        const reasons: string[] = [];
        if (driver.city !== trip.city) reasons.push("city");
        if (driver.kycStatus !== "APPROVED") reasons.push("kycStatus");
        if (driver.availability !== "ONLINE") reasons.push("availability");
        if (!hasLocation) reasons.push("hasLocation");
        if (!isFresh) reasons.push("isFresh");
        if (!matchesServiceType) reasons.push("matchesServiceType");

        return {
          driverId: driver.id,
          userId: driver.userId,
          fullName: driver.user?.fullName ?? null,
          phone: driver.user?.phone ?? null,
          driverType: driver.driverType,
          city: driver.city,
          kycStatus: driver.kycStatus,
          availability: driver.availability,

          hasLocation,
          lat: driver.location?.lat ?? null,
          lng: driver.location?.lng ?? null,
          heading: driver.location?.heading ?? null,
          accuracyM: driver.location?.accuracyM ?? null,
          lastSeenAt: driver.location?.lastSeenAt ?? null,
          seenAtMs,
          nowMs: now,
          ageMs: seenAtMs !== null ? now - seenAtMs : null,
          isFresh,

          matchesServiceType,
          distanceKm,

          passesFinalFilter: reasons.length === 0,
          reasons,
        };
      });

      const eligible = queriedDrivers
        .filter((driver) => driver.passesFinalFilter)
        .sort(
          (a, b) =>
            (a.distanceKm ?? Number.MAX_VALUE) -
            (b.distanceKm ?? Number.MAX_VALUE),
        );

      return {
        ok: true,
        trip: {
          id: trip.id,
          serviceType: trip.serviceType,
          city: trip.city,
          pickupLat: trip.pickupLat,
          pickupLng: trip.pickupLng,
        },
        count: eligible.length,
        drivers: eligible,
        queriedDrivers,
      };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  async requestTrip(user: any, dto: RequestTripDto) {
    try {
      if (!dto?.serviceType) {
        return { ok: false, message: "serviceType is required" };
      }

      if (
        !dto?.pickupAddress ||
        dto.pickupLat === undefined ||
        dto.pickupLng === undefined
      ) {
        return {
          ok: false,
          message: "pickupAddress, pickupLat, pickupLng are required",
        };
      }

      if (
        !dto?.dropoffAddress ||
        dto.dropoffLat === undefined ||
        dto.dropoffLng === undefined
      ) {
        return {
          ok: false,
          message: "dropoffAddress, dropoffLat, dropoffLng are required",
        };
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
        commitmentStatus: CommitmentStatus.WAIVED,
      };

      if (dto.serviceType === ServiceType.BIKE_DELIVERY) {
        if (!dto.itemDescription || !dto.recipientName || !dto.recipientPhone) {
          return {
            ok: false,
            message:
              "For BIKE_DELIVERY, itemDescription, recipientName, recipientPhone are required",
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
        include: {
          rider: true,
          driver: true,
          delivery: true,
          fare: true,
        },
      });

      return { ok: true, trip };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  async myTrips(user: any) {
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

  private async expireStaleRequestedTrips() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.prisma.trip.updateMany({
      where: {
        status: TripStatus.REQUESTED,
        driverId: null,
        requestedAt: { lt: cutoff },
      },
      data: {
        status: TripStatus.CANCELLED,
        cancelledBy: "ADMIN",
        cancelReason: "System timeout: no driver accepted in time",
        cancelledAt: new Date(),
      },
    });

    return result.count;
  }

  async inbox(user: any) {
    try {
      const expiredCount = await this.expireStaleRequestedTrips();

      const driver = await this.prisma.driver.findUnique({
        where: { userId: user.sub },
        include: { location: true },
      });

      if (!driver) {
        return { ok: false, message: "Driver profile not found" };
      }

      if (driver.kycStatus !== "APPROVED") {
        return { ok: false, message: "KYC not approved" };
      }

      if (driver.availability !== "ONLINE") {
        return { ok: false, message: "Driver is not ONLINE" };
      }

      if (!driver.location) {
        return { ok: false, message: "Driver location missing. Update location first." };
      }

      const now = Date.now();
      const maxAgeMs = 2 * 60 * 1000;
      const recentWindowMs = 60 * 60 * 1000;

      const seenAtMs = new Date(driver.location.lastSeenAt).getTime();
      const isFresh = now - seenAtMs <= maxAgeMs;

      if (!isFresh) {
        return { ok: false, message: "Driver location is stale. Update location first." };
      }

      const cutoff = new Date(now - recentWindowMs);

      const trips = await this.prisma.trip.findMany({
        where: {
          status: TripStatus.REQUESTED,
          driverId: null,
          city: driver.city,
          requestedAt: {
            gte: cutoff,
          },
        },
        include: {
          rider: true,
          delivery: true,
        },
      });

      const ranked = trips
        .filter((trip) =>
          serviceTypeMatchesDriver(driver.driverType as any, trip.serviceType),
        )
        .filter((trip) => trip.pickupLat != null && trip.pickupLng != null)
        .map((trip) => {
          const distanceKm = this.haversineKm(
            driver.location!.lat,
            driver.location!.lng,
            trip.pickupLat!,
            trip.pickupLng!,
          );

          return {
            ...trip,
            distanceKm,
          };
        })
        .sort((a, b) => {
          if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
          return (
            new Date(b.requestedAt).getTime() -
            new Date(a.requestedAt).getTime()
          );
        })
        .slice(0, 20);

      return {
        ok: true,
        phase4Marker: "PHASE4-FRESH-COPY-2",
        expiredCount,
        count: ranked.length,
        windowMinutes: 60,
        driver: {
          id: driver.id,
          userId: driver.userId,
          driverType: driver.driverType,
          city: driver.city,
          availability: driver.availability,
          lat: driver.location.lat,
          lng: driver.location.lng,
          lastSeenAt: driver.location.lastSeenAt,
        },
        trips: ranked,
      };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  async accept(user: any, tripId: string) {
    try {
      const driver = await this.prisma.driver.findUnique({
        where: { userId: user.sub },
      });

      if (!driver) {
        return { ok: false, message: "Driver profile not found" };
      }

      if (driver.kycStatus !== "APPROVED") {
        return { ok: false, message: "KYC not approved" };
      }

      if (driver.availability !== "ONLINE") {
        return { ok: false, message: "Driver is not ONLINE" };
      }

      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: { rider: true, delivery: true, fare: true },
      });

      if (!trip) {
        return { ok: false, message: "Trip not found" };
      }

      if (trip.status !== TripStatus.REQUESTED) {
        return { ok: false, message: "Trip is not REQUESTED" };
      }

      if (trip.driverId) {
        return { ok: false, message: "Trip has already been accepted" };
      }

      if (trip.city !== driver.city) {
        return { ok: false, message: "Trip city does not match driver city" };
      }

      if (!serviceTypeMatchesDriver(driver.driverType as any, trip.serviceType)) {
        return { ok: false, message: "Trip serviceType does not match driver type" };
      }

      const now = new Date();

      const updated = await this.prisma.trip.update({
        where: { id: tripId },
        data: {
          driverId: driver.id,
          status: TripStatus.ACCEPTED,
          matchedAt: now,
          acceptedAt: now,
        },
        include: {
          rider: true,
          driver: true,
          delivery: true,
          fare: true,
        },
      });

      return { ok: true, trip: updated };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  async start(user: any, tripId: string) {
    try {
      const driver = await this.prisma.driver.findUnique({
        where: { userId: user.sub },
      });

      if (!driver) {
        return { ok: false, message: "Driver profile not found" };
      }

      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: { rider: true, driver: true, delivery: true, fare: true },
      });

      if (!trip) {
        return { ok: false, message: "Trip not found" };
      }

      if (trip.driverId !== driver.id) {
        return { ok: false, message: "This trip is not assigned to this driver" };
      }

      if (trip.status !== TripStatus.ACCEPTED) {
        return { ok: false, message: "Trip must be ACCEPTED before START" };
      }

      const updated = await this.prisma.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.STARTED,
          startedAt: new Date(),
        },
        include: {
          rider: true,
          driver: true,
          delivery: true,
          fare: true,
        },
      });

      return { ok: true, trip: updated };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }

  async complete(user: any, tripId: string) {
    try {
      const driver = await this.prisma.driver.findUnique({
        where: { userId: user.sub },
      });

      if (!driver) {
        return { ok: false, message: "Driver profile not found" };
      }

      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          fare: true,
          rider: true,
          driver: true,
          delivery: true,
        },
      });

      if (!trip) {
        return { ok: false, message: "Trip not found" };
      }

      if (trip.driverId !== driver.id) {
        return { ok: false, message: "This trip is not assigned to this driver" };
      }

      if (trip.status === TripStatus.COMPLETED) {
        return { ok: true, trip };
      }

      if (trip.status !== TripStatus.STARTED) {
        return { ok: false, message: "Trip must be STARTED before COMPLETE" };
      }

      const policy = await this.prisma.farePolicy.findFirst({
        where: {
          city: trip.city,
          serviceType: trip.serviceType,
          isActive: true,
        },
      });

      if (!policy) {
        return { ok: false, message: "Fare policy not found" };
      }

      const distanceKm = trip.distanceKmEst ?? 2;
      const durationMin = trip.durationMinEst ?? 10;
      const fareData = computeFare(policy, distanceKm, durationMin);

      await this.prisma.$transaction(async (tx) => {
        const existingFare = await tx.tripFare.findUnique({
          where: { tripId: trip.id },
        });

        if (!existingFare) {
          await tx.tripFare.create({
            data: {
              tripId: trip.id,
              currency: fareData.currency,
              baseFare: fareData.baseFare,
              perKmFare: fareData.perKmFare,
              perMinFare: fareData.perMinFare,
              bookingFee: fareData.bookingFee,
              discount: fareData.discount,
              totalAmount: fareData.totalAmount,
              platformEarning: fareData.platformEarning,
              driverEarning: fareData.driverEarning,
              distanceKm,
              durationMin,
            },
          });
        }

        const wallet = await tx.driverWallet.upsert({
          where: { driverId: driver.id },
          update: {},
          create: {
            driverId: driver.id,
            balance: 0,
          },
        });

        const existingTx = await tx.walletTransaction.findFirst({
          where: {
            driverId: driver.id,
            tripId: trip.id,
            reason: WalletTxReason.TRIP_EARNING,
          },
        });

        if (!existingTx) {
          await tx.driverWallet.update({
            where: { driverId: wallet.driverId },
            data: {
              balance: { increment: fareData.driverEarning },
            },
          });

          await tx.walletTransaction.create({
            data: {
              driverId: driver.id,
              tripId: trip.id,
              type: WalletTxType.CREDIT,
              reason: WalletTxReason.TRIP_EARNING,
              amount: fareData.driverEarning,
              note: `Trip earning for ${trip.id} (platform=${fareData.platformEarning})`,
            },
          });
        }

        await tx.trip.update({
          where: { id: trip.id },
          data: {
            status: TripStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      });

      const updatedTrip = await this.prisma.trip.findUnique({
        where: { id: trip.id },
        include: {
          fare: true,
          rider: true,
          driver: true,
          delivery: true,
        },
      });

      return { ok: true, trip: updatedTrip };
    } catch (e) {
      return { ok: false, message: prismaErrMessage(e) };
    }
  }
}
