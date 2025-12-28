import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyJwtToken } from "./jwt";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const header = req.headers["authorization"] as string | undefined;
    if (!header) throw new UnauthorizedException("Missing Authorization header");

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid Authorization format. Use: Bearer <token>");
    }

    const payload = verifyJwtToken(token);
    req.user = payload;
    return true;
  }
}
