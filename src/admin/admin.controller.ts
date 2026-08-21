import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { RequireRole } from '../auth/require-role';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ADMIN ONLY: Create Customer Support or Operations staff accounts
  @RequireRole('ADMIN')
  @Post('staff')
  async createStaff(
    @Body()
    body: {
      fullName: string;
      phone: string;
      email?: string;
      role: 'CUSTOMER_SUPPORT' | 'OPERATIONS';
    },
  ) {
    return this.adminService.createStaff(body);
  }

  // ADMIN ONLY: View Customer Support and Operations staff accounts
  @RequireRole('ADMIN')
  @Get('staff')
  async listStaff() {
    return this.adminService.listStaff();
  }

  // ADMIN ONLY: Suspend a staff account
  @RequireRole('ADMIN')
  @Post('staff/:userId/suspend')
  async suspendStaff(@Param('userId') userId: string) {
    return this.adminService.suspendStaff(userId);
  }

  // ADMIN ONLY: Reactivate a staff account
  @RequireRole('ADMIN')
  @Post('staff/:userId/reactivate')
  async reactivateStaff(@Param('userId') userId: string) {
    return this.adminService.reactivateStaff(userId);
  }

  // CUSTOMER SUPPORT / OPERATIONS / ADMIN: Read-only driver views
  @RequireRole('CUSTOMER_SUPPORT', 'OPERATIONS', 'ADMIN')
  @Get('drivers/pending')
  async pendingDrivers() {
    return this.adminService.pendingDrivers();
  }

  @RequireRole('CUSTOMER_SUPPORT', 'OPERATIONS', 'ADMIN')
  @Get('drivers/approved')
  async approvedDrivers() {
    return this.adminService.approvedDrivers();
  }

  // CUSTOMER SUPPORT / OPERATIONS / ADMIN: Read-only trip views
  @RequireRole('CUSTOMER_SUPPORT', 'OPERATIONS', 'ADMIN')
  @Get('trips')
  async trips() {
    return this.adminService.listTrips();
  }

  @RequireRole('CUSTOMER_SUPPORT', 'OPERATIONS', 'ADMIN')
  @Get('trips/:tripId')
  async tripDetail(@Param('tripId') tripId: string) {
    return this.adminService.getTripDetail(tripId);
  }

  @RequireRole('CUSTOMER_SUPPORT', 'OPERATIONS', 'ADMIN')
  @Get('trips/:tripId/nearby-drivers')
  async nearbyDrivers(@Param('tripId') tripId: string) {
    return this.adminService.nearbyDriversForTrip(tripId);
  }

  // OPERATIONS / ADMIN: Can view pending payouts
  @RequireRole('OPERATIONS', 'ADMIN')
  @Get('payouts/pending')
  async pendingPayouts() {
    return this.adminService.pendingPayouts();
  }

  // ADMIN ONLY: Financial payout action
  @RequireRole('ADMIN')
  @Post('payouts/:payoutId/mark-paid')
  async markPayoutPaid(
    @Param('payoutId') payoutId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.markPayoutPaid(payoutId, user);
  }

  // OPERATIONS / ADMIN: Trip-management actions
  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('trips/:tripId/waive-commitment')
  async waiveCommitment(
    @Param('tripId') tripId: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.waiveCommitment(tripId, user, body);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('trips/:tripId/assign-driver')
  async assignDriver(
    @Param('tripId') tripId: string,
    @Body() body: { driverName: string },
  ) {
    return this.adminService.assignDriver(tripId, body.driverName);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('trips/:tripId/start')
  async startTrip(@Param('tripId') tripId: string) {
    return this.adminService.startTrip(tripId);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('trips/:tripId/complete')
  async completeTrip(@Param('tripId') tripId: string) {
    return this.adminService.completeTrip(tripId);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('trips/:tripId/cancel')
  async cancelTrip(
    @Param('tripId') tripId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.cancelTrip(
      tripId,
      body?.reason || 'Cancelled by staff',
      user?.sub,
    );
  }

  // OPERATIONS / ADMIN: Driver-management actions
  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('drivers/:driverId/approve')
  async approve(@Param('driverId') driverId: string, @CurrentUser() user: any) {
    return this.adminService.approveDriver(driverId, user);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('drivers/:driverId/reject')
  async reject(
    @Param('driverId') driverId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.adminService.rejectDriver(driverId, body, user);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('drivers/:driverId/suspend')
  async suspend(
    @Param('driverId') driverId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.adminService.suspendDriver(driverId, body, user);
  }

  @RequireRole('OPERATIONS', 'ADMIN')
  @Post('drivers/:driverId/unsuspend')
  async unsuspend(
    @Param('driverId') driverId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.unsuspendDriver(driverId, user);
  }
}
