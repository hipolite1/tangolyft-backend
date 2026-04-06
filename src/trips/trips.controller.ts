import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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

  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/accept")
  accept(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    return this.tripsService.accept(user, tripId);
  }

  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/start")
  start(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    return this.tripsService.start(user, tripId);
  }

  @RequireRole("DRIVER", "ADMIN")
  @Post(":tripId/complete")
  complete(@CurrentUser() user: any, @Param("tripId") tripId: string) {
    return this.tripsService.complete(user, tripId);
  }
}
