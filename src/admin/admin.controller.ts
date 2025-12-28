import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";

@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @RequireRole("ADMIN")
  @Get("drivers/pending")
  async pendingDrivers() {
    const drivers = await this.prisma.driver.findMany({
      where: { kycStatus: "PENDING" },
      include: { user: true, documents: true, vehicle: true },
      orderBy: { createdAt: "desc" },
    });

    return { ok: true, drivers };
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/approve")
  async approve(@Param("driverId") driverId: string) {
    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { kycStatus: "APPROVED", approvedAt: new Date(), rejectedAt: null, kycNote: null },
    });

    return { ok: true, driver };
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/reject")
  async reject(@Param("driverId") driverId: string, @Body() body: any) {
    const note = body?.note ?? "Rejected";

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { kycStatus: "REJECTED", rejectedAt: new Date(), kycNote: note },
    });

    return { ok: true, driver };
  }
}
