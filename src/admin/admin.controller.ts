import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @RequireRole("ADMIN")
  @Get("drivers/pending")
  async pendingDrivers() {
    return this.adminService.pendingDrivers();
  }

  @RequireRole("ADMIN")
  @Get("drivers/approved")
  async approvedDrivers() {
    return this.adminService.approvedDrivers();
  }

  @RequireRole("ADMIN")
  @Get("trips")
  async trips() {
    return this.adminService.listTrips();
  }
  @RequireRole("ADMIN")
  @Get("payouts/pending")
  async pendingPayouts() {
    return this.adminService.pendingPayouts();
  }

  @RequireRole("ADMIN")
  @Post("payouts/:payoutId/mark-paid")
  async markPayoutPaid(
    @Param("payoutId") payoutId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.markPayoutPaid(payoutId, user);
  }

  @RequireRole("ADMIN")
  @Get("trips/:tripId")
  async tripDetail(@Param("tripId") tripId: string) {
    return this.adminService.getTripDetail(tripId);
  }

  @RequireRole("ADMIN")
  @Post("trips/:tripId/waive-commitment")
  async waiveCommitment(
    @Param("tripId") tripId: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.waiveCommitment(tripId, user, body);
  }
  @RequireRole("ADMIN")
  @Post("trips/:tripId/assign-driver")
async assignDriver(
  @Param("tripId") tripId: string,
  @Body() body: { driverName: string },
) {
  return this.adminService.assignDriver(tripId, body.driverName);
}
@RequireRole("ADMIN")
@Post("trips/:tripId/start")
async startTrip(@Param("tripId") tripId: string) {
  return this.adminService.startTrip(tripId);
}

@RequireRole("ADMIN")
@Post("trips/:tripId/complete")
async completeTrip(@Param("tripId") tripId: string) {
  return this.adminService.completeTrip(tripId);
}

  // ✅ FIXED: Cancel Trip endpoint (NOW INSIDE CLASS)
  @RequireRole("ADMIN")
  @Post("trips/:tripId/cancel")
  async cancelTrip(
    @Param("tripId") tripId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.cancelTrip(
      tripId,
      body?.reason || "Cancelled by admin",
      user?.sub,
    );
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/approve")
  async approve(@Param("driverId") driverId: string, @CurrentUser() user: any) {
    return this.adminService.approveDriver(driverId, user);
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/reject")
  async reject(
    @Param("driverId") driverId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.adminService.rejectDriver(driverId, body, user);
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/suspend")
  async suspend(
    @Param("driverId") driverId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.adminService.suspendDriver(driverId, body, user);
  }

  @RequireRole("ADMIN")
  @Post("drivers/:driverId/unsuspend")
  async unsuspend(
    @Param("driverId") driverId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.unsuspendDriver(driverId, user);
  }
}