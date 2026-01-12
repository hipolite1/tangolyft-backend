import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: any): Promise<string> {
    const cf = req.headers?.["cf-connecting-ip"];
    const xff = req.headers?.["x-forwarded-for"];

    const cfIp = Array.isArray(cf) ? cf[0] : cf;

    const xffIp =
      typeof xff === "string"
        ? xff.split(",")[0].trim()
        : Array.isArray(xff)
          ? xff[0]?.split(",")[0].trim()
          : undefined;

    return (cfIp || xffIp || req.ip || "unknown").toString();
  }
}
