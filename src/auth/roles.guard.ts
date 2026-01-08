import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, AppRole } from "./require-role";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // no roles required
    if (!roles || roles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    if (!user) throw new UnauthorizedException("Unauthorized");
    const role = user.role as AppRole | undefined;
    if (!role) throw new UnauthorizedException("Unauthorized");

    if (!roles.includes(role)) throw new ForbiddenException("Forbidden");
    return true;
  }
}
