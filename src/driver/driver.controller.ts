import { Body, Controller, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("driver")
export class DriverController {
  constructor(private readonly prisma: PrismaService) {}

  // Apply to become a driver/courier
  @RequireRole("RIDER", "DRIVER", "ADMIN")
  @Post("apply")
  async apply(@CurrentUser() user: any, @Body() body: any) {
    const driverType = body?.driverType; // "CAR_DRIVER" or "BIKE_COURIER"
    if (!driverType) return { ok: false, message: "driverType is required: CAR_DRIVER or BIKE_COURIER" };

    const existing = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (existing) return { ok: true, driver: existing };

    const driver = await this.prisma.driver.create({
      data: {
        userId: user.sub,
        driverType,
        kycStatus: "PENDING",
        availability: "OFFLINE",
        city: "ABUJA",
      },
    });

    // Upgrade role to DRIVER (so they can access driver endpoints)
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { role: "DRIVER" },
    });

    return { ok: true, driver };
  }

  // Add a KYC document record (placeholder fileUrl for now)
  @RequireRole("DRIVER", "ADMIN")
  @Post("documents")
  async addDoc(@CurrentUser() user: any, @Body() body: any) {
    const { docType, fileUrl } = body || {};
    if (!docType || !fileUrl) return { ok: false, message: "docType and fileUrl are required" };

    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found. Apply first." };

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
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
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
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: { availability: "OFFLINE" },
    });

    return { ok: true, driver: updated };
  }
}
