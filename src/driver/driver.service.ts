import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, body: any) {
    const driverType = body?.driverType; // "CAR_DRIVER" or "BIKE_COURIER"

    if (!driverType) {
      return {
        ok: false,
        message: "driverType is required: CAR_DRIVER or BIKE_COURIER",
      };
    }

    const existing = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (existing) {
      return { ok: true, driver: existing };
    }

    const driver = await this.prisma.driver.create({
      data: {
        userId,
        driverType,
        kycStatus: "PENDING",
        availability: "OFFLINE",
        city: "ABUJA",
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "DRIVER" },
    });

    return { ok: true, driver };
  }

  async addDocument(userId: string, body: any) {
    const { docType, fileUrl } = body || {};

    if (!docType || !fileUrl) {
      return {
        ok: false,
        message: "docType and fileUrl are required",
      };
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return {
        ok: false,
        message: "Driver profile not found. Apply first.",
      };
    }

    const doc = await this.prisma.driverDocument.create({
      data: {
        driverId: driver.id,
        docType,
        fileUrl,
        status: "UPLOADED",
      },
    });

    return { ok: true, doc };
  }

  async goOnline(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException("Driver profile not found");
    }

    if (driver.availability === "SUSPENDED") {
      throw new ForbiddenException("Driver is suspended");
    }

    if (driver.kycStatus !== "APPROVED") {
      return { ok: false, message: "KYC not approved yet" };
    }

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { availability: "ONLINE" },
    });

    return { ok: true, driver: updated };
  }

  async goOffline(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException("Driver profile not found");
    }

    if (driver.availability === "ON_TRIP") {
      return {
        ok: false,
        message: "Driver cannot go offline while on an active trip",
      };
    }

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { availability: "OFFLINE" },
    });

    return { ok: true, driver: updated };
  }

  async getDriverByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException("Driver profile not found");
    }

    return driver;
  }

  async setOnTrip(driverId: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { availability: "ON_TRIP" },
    });
  }

  async setOnline(driverId: string) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: { availability: "ONLINE" },
    });
  }
}