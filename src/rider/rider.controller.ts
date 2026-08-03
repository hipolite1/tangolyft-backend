import {
  Body,
  Controller,
  Get,
  Patch,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequireRole } from "../auth/require-role";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";
import { RiderService } from "./rider.service";

@Controller("rider")
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @RequireRole("RIDER")
  @Get("profile")
  getProfile(@CurrentUser() user: any) {
    return this.riderService.getProfile(user.sub);
  }

  @RequireRole("RIDER")
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateRiderProfileDto,
  ) {
    return this.riderService.updateProfile(user.sub, dto);
  }
}