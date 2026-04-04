import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequireRole } from "../auth/require-role";
import { RequestTripDto } from "./dto/request-trip.dto";
import { TripsService } from "./trips.service";

@Controller("trips")
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("request")
  requestTrip(@CurrentUser() user: any, @Body() dto: RequestTripDto) {
    return this.tripsService.requestTrip(user, dto);
  }

  @RequireRole("RIDER", "ADMIN")
  @Get("mine")
  myTrips(@CurrentUser() user: any) {
    return this.tripsService.myTrips(user);
  }

  @RequireRole("DRIVER", "ADMIN")
  @Get("inbox")
  inbox(@CurrentUser() user: any) {
    return this.tripsService.inbox(user);
  }
}