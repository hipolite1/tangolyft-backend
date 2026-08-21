import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommitmentStatus,
  PayoutStatus,
  Prisma,
  WalletTxReason,
  WalletTxType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createStaff(input: {
    fullName: string;
    phone: string;
    email?: string;
    role: 'CUSTOMER_SUPPORT' | 'OPERATIONS';
  }) {
    const normalizedPhone = normalizePhone(input.phone);

    if (!input.fullName?.trim()) {
      throw new BadRequestException('Full name is required');
    }

    if (!normalizedPhone) {
      throw new BadRequestException('Valid phone number is required');
    }

    if (!['CUSTOMER_SUPPORT', 'OPERATIONS'].includes(input.role)) {
      throw new BadRequestException('Invalid staff role');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingUser) {
      throw new BadRequestException('Phone number already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        phone: normalizedPhone,
        email: input.email?.trim() || null,
        role: input.role,
        status: 'ACTIVE',
      },
    });

    return {
      ok: true,
      message: 'Staff account created successfully',
      staff: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
  async listStaff() {
    const staff = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['CUSTOMER_SUPPORT', 'OPERATIONS'],
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      ok: true,
      staff,
    };
  }

  async suspendStaff(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    if (!['CUSTOMER_SUPPORT', 'OPERATIONS'].includes(user.role)) {
      throw new BadRequestException(
        'Only staff accounts can be suspended here',
      );
    }

    if (user.status === 'SUSPENDED') {
      return {
        ok: true,
        message: 'Staff account is already suspended',
        staff: user,
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });

    return {
      ok: true,
      message: 'Staff account suspended successfully',
      staff: updated,
    };
  }

  async reactivateStaff(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Staff account not found');
    }

    if (!['CUSTOMER_SUPPORT', 'OPERATIONS'].includes(user.role)) {
      throw new BadRequestException(
        'Only staff accounts can be reactivated here',
      );
    }

    if (user.status === 'ACTIVE') {
      return {
        ok: true,
        message: 'Staff account is already active',
        staff: user,
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    return {
      ok: true,
      message: 'Staff account reactivated successfully',
      staff: updated,
    };
  }
  async pendingDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { kycStatus: 'PENDING' },
      include: { user: true, documents: true, vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    return { ok: true, drivers };
  }

  async approvedDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { kycStatus: 'APPROVED' },
      include: { user: true, documents: true, vehicle: true },
      orderBy: { approvedAt: 'desc' },
    });

    return { ok: true, drivers };
  }

  async listTrips() {
    const trips = await this.prisma.trip.findMany({
      include: {
        rider: true,
        driver: {
          include: {
            user: true,
          },
        },
        delivery: true,
        fare: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });

    return { ok: true, trips };
  }
  async pendingPayouts() {
    const payouts = await this.prisma.payout.findMany({
      where: {
        status: {
          in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
        },
      },
      include: {
        driver: {
          include: {
            user: true,
            wallet: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { ok: true, payouts };
  }

  async markPayoutPaid(payoutId: string, user: any) {
    if (!payoutId || payoutId.length < 10) {
      throw new BadRequestException('Invalid payoutId');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
        include: {
          driver: {
            include: {
              user: true,
              wallet: true,
            },
          },
        },
      });

      if (!payout) {
        throw new NotFoundException('Payout not found');
      }

      if (payout.status === PayoutStatus.PAID) {
        return {
          alreadyPaid: true,
          payout,
        };
      }

      if (
        payout.status !== PayoutStatus.PENDING &&
        payout.status !== PayoutStatus.PROCESSING
      ) {
        throw new BadRequestException(
          `Cannot mark payout as paid from status ${payout.status}`,
        );
      }

      if (!payout.driver.wallet) {
        throw new BadRequestException('Driver wallet not found');
      }

      if (payout.driver.wallet.balance < payout.amount) {
        throw new BadRequestException(
          'Driver wallet balance is lower than payout amount',
        );
      }

      await tx.driverWallet.update({
        where: { driverId: payout.driverId },
        data: {
          balance: {
            decrement: payout.amount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          driverId: payout.driverId,
          type: WalletTxType.DEBIT,
          reason: WalletTxReason.PAYOUT,
          amount: payout.amount,
          note: `Manual payout paid by admin for payout ${payout.id}`,
        },
      });

      const updatedPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.PAID,
          paidAt: new Date(),
        },
        include: {
          driver: {
            include: {
              user: true,
              wallet: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: user.sub,
          action: 'PAYOUT_MARKED_PAID',
          entityType: 'Payout',
          entityId: payout.id,
          metadata: {
            driverId: payout.driverId,
            amount: payout.amount,
            schedule: payout.schedule,
          },
        },
      });

      return {
        alreadyPaid: false,
        payout: updatedPayout,
      };
    });

    return {
      ok: true,
      message: result.alreadyPaid
        ? 'Payout was already marked as paid'
        : 'Payout marked as paid and driver wallet debited',
      payout: result.payout,
    };
  }

  async getTripDetail(tripId: string) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException('Invalid tripId');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        rider: true,
        driver: {
          include: {
            user: true,
          },
        },
        delivery: true,
        fare: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip not found: ${tripId}`);
    }

    return { ok: true, trip };
  }

  async waiveCommitment(tripId: string, user: any, body: { reason?: string }) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException('Invalid tripId');
    }

    const exists = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Trip not found: ${tripId}`);
    }

    try {
      const updated = await this.prisma.trip.update({
        where: { id: tripId },
        data: {
          commitmentStatus: CommitmentStatus.WAIVED,
          commitmentWaivedAt: new Date(),
          commitmentWaivedBy: user.sub,
          commitmentReason: (body?.reason?.trim() || 'Waived by staff').slice(
            0,
            300,
          ),
        },
      });

      await this.prisma.auditLog
        .create({
          data: {
            adminUserId: user.sub,
            action: 'TRIP_COMMITMENT_WAIVED',
            entityType: 'Trip',
            entityId: tripId,
            metadata: {
              reason: (body?.reason?.trim() || 'Waived by staff').slice(0, 300),
            },
          },
        })
        .catch(() => null);

      return { ok: true, trip: updated };
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Trip not found: ${tripId}`);
      }

      throw e;
    }
  }

  async cancelTrip(tripId: string, reason: string, adminId?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed trip');
    }

    if (trip.status === 'CANCELLED') {
      return { ok: true, message: 'Trip already cancelled' };
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
        cancelledBy: 'ADMIN',
      },
    });

    return { ok: true, trip: updated };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private serviceTypeMatchesDriver(driverType: string, serviceType: string) {
    if (serviceType === 'CAR_RIDE') {
      return driverType === 'CAR_DRIVER';
    }

    if (serviceType === 'BIKE_DELIVERY') {
      return driverType === 'BIKE_COURIER';
    }

    return true;
  }

  async nearbyDriversForTrip(tripId: string) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException('Invalid tripId');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.pickupLat == null || trip.pickupLng == null) {
      throw new BadRequestException('Trip pickup location is missing');
    }

    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000;
    const maxNearbyDistanceKm = 50;

    const drivers = await this.prisma.driver.findMany({
      where: {
        availability: 'ONLINE',
        kycStatus: 'APPROVED',
        city: trip.city,
      },
      include: {
        user: true,
        location: true,
        vehicle: true,
      },
    });

    const nearbyDrivers = drivers
      .map((driver) => {
        const location = driver.location;
        const lastSeenAt = location?.lastSeenAt || null;
        const ageMs = lastSeenAt ? now - new Date(lastSeenAt).getTime() : null;
        const isFresh = ageMs !== null ? ageMs <= maxAgeMs : false;
        const matchesServiceType = this.serviceTypeMatchesDriver(
          String(driver.driverType),
          String(trip.serviceType),
        );

        const distanceKm =
          location?.lat != null && location?.lng != null
            ? this.haversineKm(
                trip.pickupLat,
                trip.pickupLng,
                location.lat,
                location.lng,
              )
            : null;

        return {
          driverId: driver.id,
          fullName: driver.user?.fullName || null,
          phone: driver.user?.phone || null,
          driverType: driver.driverType,
          city: driver.city,
          availability: driver.availability,
          kycStatus: driver.kycStatus,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          accuracyM: location?.accuracyM ?? null,
          heading: location?.heading ?? null,
          lastSeenAt,
          ageMs,
          isFresh,
          matchesServiceType,
          distanceKm,
        };
      })
      .filter((driver) => driver.matchesServiceType)
      .filter((driver) => driver.isFresh)
      .filter((driver) => driver.distanceKm !== null)
      .filter(
        (driver) =>
          (driver.distanceKm ?? Number.MAX_VALUE) <= maxNearbyDistanceKm,
      )
      .sort((a, b) => {
        return (
          (a.distanceKm ?? Number.MAX_VALUE) -
          (b.distanceKm ?? Number.MAX_VALUE)
        );
      })
      .slice(0, 10);

    return {
      ok: true,
      trip: {
        id: trip.id,
        serviceType: trip.serviceType,
        city: trip.city,
        pickupLat: trip.pickupLat,
        pickupLng: trip.pickupLng,
      },
      count: nearbyDrivers.length,
      nearbyDrivers,
    };
  }

  async assignDriver(tripId: string, driverPhone: string) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException('Invalid tripId');
    }

    const normalizedDriverPhone = normalizePhone(driverPhone);

    if (!normalizedDriverPhone || normalizedDriverPhone.length < 5) {
      throw new BadRequestException('Driver phone is required');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedDriverPhone },
    });

    if (!user) {
      throw new NotFoundException('Driver user not found for this phone');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found for this phone');
    }

    if (driver.kycStatus !== 'APPROVED') {
      throw new BadRequestException('Driver is not approved');
    }

    if (
      !this.serviceTypeMatchesDriver(
        String(driver.driverType),
        String(trip.serviceType),
      )
    ) {
      const requiredDriverType =
        trip.serviceType === 'BIKE_DELIVERY'
          ? 'Bike Courier'
          : trip.serviceType === 'CAR_RIDE'
            ? 'Car Driver'
            : 'matching driver';

      throw new BadRequestException(
        `This trip requires a ${requiredDriverType}. Selected driver type is ${driver.driverType}.`,
      );
    }

    const activeDriverTrip = await this.prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: ['REQUESTED', 'ACCEPTED', 'STARTED'],
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    if (activeDriverTrip && activeDriverTrip.id !== tripId) {
      throw new BadRequestException(
        `Driver already has an active trip: ${activeDriverTrip.id}. Complete or cancel that trip before assigning a new one.`,
      );
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: driver.id,
        status: 'REQUESTED',
        matchedAt: new Date(),
        acceptedAt: null,
      },
    });

    return {
      ok: true,
      message: 'Driver assigned successfully',
      trip: updated,
    };
  }

  async startTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'STARTED',
        startedAt: new Date(),
      },
    });

    return {
      ok: true,
      message: 'Trip started successfully',
      trip: updated,
    };
  }

  async completeTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      ok: true,
      message: 'Trip completed successfully',
      trip: updated,
    };
  }

  async approveDriver(driverId: string, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException('Invalid driverId');
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus: 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
        kycNote: null,
        availability: 'OFFLINE',
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          adminUserId: user.sub,
          action: 'DRIVER_APPROVED',
          entityType: 'Driver',
          entityId: driverId,
          metadata: {
            kycStatus: 'APPROVED',
          },
        },
      })
      .catch(() => null);

    return { ok: true, driver };
  }

  async rejectDriver(driverId: string, body: any, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException('Invalid driverId');
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const note = (body?.note?.trim() || 'Rejected').slice(0, 300);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus: 'REJECTED',
        rejectedAt: new Date(),
        kycNote: note,
        availability: 'OFFLINE',
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          adminUserId: user.sub,
          action: 'DRIVER_REJECTED',
          entityType: 'Driver',
          entityId: driverId,
          metadata: {
            note,
            kycStatus: 'REJECTED',
          },
        },
      })
      .catch(() => null);

    return { ok: true, driver };
  }

  async suspendDriver(driverId: string, body: any, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException('Invalid driverId');
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const note = (body?.note?.trim() || 'Suspended by staff').slice(0, 300);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        availability: 'SUSPENDED',
        kycNote: note,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          adminUserId: user.sub,
          action: 'DRIVER_SUSPENDED',
          entityType: 'Driver',
          entityId: driverId,
          metadata: {
            note,
            availability: 'SUSPENDED',
          },
        },
      })
      .catch(() => null);

    return { ok: true, driver };
  }

  async unsuspendDriver(driverId: string, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException('Invalid driverId');
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, kycStatus: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    if (exists.kycStatus !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED drivers can be unsuspended');
    }

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        availability: 'OFFLINE',
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          adminUserId: user.sub,
          action: 'DRIVER_UNSUSPENDED',
          entityType: 'Driver',
          entityId: driverId,
          metadata: {
            availability: 'OFFLINE',
          },
        },
      })
      .catch(() => null);

    return { ok: true, driver };
  }
}
