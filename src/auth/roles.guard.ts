import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly allowed: Array<"RIDER" | "DRIVER" | "ADMIN">) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: string } | undefined;

    if (!user?.role) throw new ForbiddenException("Missing user role");
    if (!this.allowed.includes(user.role as any)) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
