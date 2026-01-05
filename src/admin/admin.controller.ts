import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";
import { CommitmentStatus, Prisma } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";

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

  /**
   * Admin: waive commitment for a trip
   * Fixes the old 500:
   * - returns 404 if trip not found (instead of Prisma throwing)
   * - validates tripId
   */
  @RequireRole("ADMIN")
  @Post("trips/:tripId/waive-commitment")
  async waiveCommitment(
    @Param("tripId") tripId: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    if (!tripId || tripId.length < 10) {
      throw new BadRequestException("Invalid tripId");
    }

    // pre-check so we can return a clean 404 instead of a Prisma 500
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

      return { ok: true, trip: updated };
    } catch (e: any) {
      // In case of rare race conditions (deleted between find & update)
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException(`Trip not found: ${tripId}`);
      }
      throw e;
    }
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/approve")
  async approve(@Param("driverId") driverId: string) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
    }

    // pre-check => clean 404
    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Driver not found: ${driverId}`);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        kycStatus: "APPROVED",
        approvedAt: new Date(),
        rejectedAt: null,
        kycNote: null,
      },
    });

    return { ok: true, driver };
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/reject")
  async reject(@Param("driverId") driverId: string, @Body() body: any) {
    if (!driverId || driverId.length < 10) {
      throw new BadRequestException("Invalid driverId");
    }

    const exists = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Driver not found: ${driverId}`);

    const note = (body?.note?.trim() || "Rejected").slice(0, 300);

    const driver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { kycStatus: "REJECTED", rejectedAt: new Date(), kycNote: note },
    });

    return { ok: true, driver };
  }
}
