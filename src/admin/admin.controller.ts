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
  @Post("trips/:tripId/waive-commitment")
  async waiveCommitment(
    @Param("tripId") tripId: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.waiveCommitment(tripId, user, body);
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
