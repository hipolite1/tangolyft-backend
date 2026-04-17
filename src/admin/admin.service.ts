import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CommitmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async pendingDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { kycStatus: "PENDING" },
      include: { user: true, documents: true, vehicle: true },
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, drivers };
  }

  async approvedDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { kycStatus: "APPROVED" },
      include: { user: true, documents: true, vehicle: true },
      orderBy: { approvedAt: "desc" },
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
      orderBy: { requestedAt: "desc" },
      take: 100,
    });

    return { ok: true, trips };
  }

  async getTripDetail(tripId: string) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException("Invalid tripId");
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

  async waiveCommitment(
    tripId: string,
    user: any,
    body: { reason?: string },
  ) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException("Invalid tripId");
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
          commitmentReason: (body?.reason?.trim() || "Waived by admin").slice(0, 300),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          adminUserId: user.sub,
          action: "TRIP_COMMITMENT_WAIVED",
          entityType: "Trip",
          entityId: tripId,
          metadata: {
            reason: (body?.reason?.trim() || "Waived by admin").slice(0, 300),
          },
        },
      }).catch(() => null);

      return { ok: true, trip: updated };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException(`Trip not found: ${tripId}`);
      }
      throw e;
    }
  }

  async approveDriver(driverId: string, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
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
        kycStatus: "APPROVED",
        approvedAt: new Date(),
        rejectedAt: null,
        kycNote: null,
        availability: "OFFLINE",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: user.sub,
        action: "DRIVER_APPROVED",
        entityType: "Driver",
        entityId: driverId,
        metadata: {
          kycStatus: "APPROVED",
        },
      },
    }).catch(() => null);

    return { ok: true, driver };
  }

  async rejectDriver(driverId: string, body: any, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const note = (body?.note?.trim() || "Rejected").slice(0, 300);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus: "REJECTED",
        rejectedAt: new Date(),
        kycNote: note,
        availability: "OFFLINE",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: user.sub,
        action: "DRIVER_REJECTED",
        entityType: "Driver",
        entityId: driverId,
        metadata: {
          note,
          kycStatus: "REJECTED",
        },
      },
    }).catch(() => null);

    return { ok: true, driver };
  }

  async suspendDriver(driverId: string, body: any, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    const note = (body?.note?.trim() || "Suspended by admin").slice(0, 300);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        availability: "SUSPENDED",
        kycNote: note,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: user.sub,
        action: "DRIVER_SUSPENDED",
        entityType: "Driver",
        entityId: driverId,
        metadata: {
          note,
          availability: "SUSPENDED",
        },
      },
    }).catch(() => null);

    return { ok: true, driver };
  }

  async unsuspendDriver(driverId: string, user: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, kycStatus: true },
    });

    if (!exists) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    if (exists.kycStatus !== "APPROVED") {
      throw new BadRequestException("Only APPROVED drivers can be unsuspended");
    }

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        availability: "OFFLINE",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: user.sub,
        action: "DRIVER_UNSUSPENDED",
        entityType: "Driver",
        entityId: driverId,
        metadata: {
          availability: "OFFLINE",
        },
      },
    }).catch(() => null);

    return { ok: true, driver };
  }
}
