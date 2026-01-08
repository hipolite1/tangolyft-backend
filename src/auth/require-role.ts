import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

export const ROLES_KEY = "roles";
export type AppRole = "RIDER" | "DRIVER" | "ADMIN";

export function RequireRole(...roles: AppRole[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(AuthGuard, RolesGuard));
}

