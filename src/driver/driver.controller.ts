import { Body, Controller, Patch, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";
import { UpdateLocationDto } from "./dto/update-location.dto";

@Controller("driver")
export class DriverController {
  constructor(private readonly prisma: PrismaService) {}

  // Apply to become a driver/courier
 @Post("apply")
async apply(@Body() body: any) {
  const {
    fullName,
    phone,
    email,
    city,
    vehicleType,
  } = body || {};

  if (!fullName || !phone || !city || !vehicleType) {
    return {
      ok: false,
      message: "fullName, phone, city and vehicleType are required",
    };
  }

  const existingUser = await this.prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    return {
      ok: false,
      message: "Phone number already exists",
    };
  }

  const user = await this.prisma.user.create({
    data: {
      phone,
      role: "DRIVER",
    },
  });

  const driver = await this.prisma.driver.create({
    data: {
      userId: user.id,
      driverType: vehicleType,
      kycStatus: "PENDING",
      availability: "OFFLINE",
      city,
    },
  });

  return {
    ok: true,
    message: "Driver application submitted successfully",
    driver,
  };
}
  // Add a KYC document record (placeholder fileUrl for now)
  @RequireRole("DRIVER", "ADMIN")
  @Post("documents")
  async addDoc(@CurrentUser() user: any, @Body() body: any) {
    const { docType, fileUrl } = body || {};
    if (!docType || !fileUrl) {
      return { ok: false, message: "docType and fileUrl are required" };
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.sub },
    });
    if (!driver) {
      return { ok: false, message: "Driver profile not found. Apply first." };
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

  // Go online (only APPROVED drivers)
  @RequireRole("DRIVER", "ADMIN")
  @Post("go-online")
  async goOnline(@CurrentUser() user: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.sub },
    });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    if (driver.kycStatus !== "APPROVED") {
      return { ok: false, message: "KYC not approved yet" };
    }

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { availability: "ONLINE" },
    });

    return { ok: true, driver: updated };
  }

  @RequireRole("DRIVER", "ADMIN")
  @Post("go-offline")
  async goOffline(@CurrentUser() user: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.sub },
    });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { availability: "OFFLINE" },
    });

    return { ok: true, driver: updated };
  }

  // Update live driver location
  @RequireRole("DRIVER", "ADMIN")
  @Patch("location")
  async updateLocation(
    @CurrentUser() user: any,
    @Body() body: UpdateLocationDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: user.sub },
      include: { location: true },
    });

    if (!driver) {
      return { ok: false, message: "Driver profile not found" };
    }

    if (driver.kycStatus !== "APPROVED") {
      return { ok: false, message: "Only approved drivers can update location" };
    }

    if (driver.location) {
      const location = await this.prisma.driverLocation.update({
        where: { driverId: driver.id },
        data: {
          lat: body.lat,
          lng: body.lng,
          heading: body.heading ?? null,
          accuracyM: body.accuracyM ?? null,
          lastSeenAt: new Date(),
        },
      });

      return { ok: true, location };
    }

    const location = await this.prisma.driverLocation.create({
      data: {
        driverId: driver.id,
        lat: body.lat,
        lng: body.lng,
        heading: body.heading ?? null,
        accuracyM: body.accuracyM ?? null,
        lastSeenAt: new Date(),
      },
    });

    return { ok: true, location };
  }
}