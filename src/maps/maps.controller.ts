import { Body, Controller, Post } from "@nestjs/common";
import { RequireRole } from "../auth/require-role";
import { MapsService } from "./maps.service";

@Controller("maps")
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("geocode")
  async geocode(@Body() body: { address: string; city?: string }) {
    return this.maps.geocode(body);
  }
}
