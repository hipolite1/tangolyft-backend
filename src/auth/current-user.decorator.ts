import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "./jwt";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as JwtPayload | undefined;
});
