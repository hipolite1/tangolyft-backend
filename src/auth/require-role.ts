import { UseGuards, applyDecorators } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

export function RequireRole(...roles: Array<"RIDER" | "DRIVER" | "ADMIN">) {
  return applyDecorators(UseGuards(AuthGuard, new RolesGuard(roles)));
}
