import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyJwt } from "./jwt";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const header = (req.headers?.authorization || req.headers?.Authorization) as string | undefined;
    if (!header || typeof header !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Authorization must be: Bearer <token>");
    }

    try {
      const payload = verifyJwt(token);

      // Expecting payload like: { sub: string, role: "RIDER"|"DRIVER"|"ADMIN" }
      if (!payload?.sub || !payload?.role) {
        throw new UnauthorizedException("Invalid token payload");
      }

      req.user = payload;
      return true;
    } catch (e: any) {
      // IMPORTANT: never throw raw Error → always 401
      throw new UnauthorizedException(e?.message || "Invalid/expired token");
    }
  }
}

