import { ThrottlerGuard } from "@nestjs/throttler";
export declare class ThrottlerProxyGuard extends ThrottlerGuard {
    protected getTracker(req: any): Promise<string>;
}
