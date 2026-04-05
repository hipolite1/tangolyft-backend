import { PrismaService } from "../prisma/prisma.service";
export declare class PaystackWebhookController {
    private prisma;
    constructor(prisma: PrismaService);
    private secret;
    private verifySignature;
    handle(req: any, sig?: string): Promise<{
        ok: boolean;
        message: string;
        replay?: undefined;
        ignored?: undefined;
    } | {
        ok: boolean;
        replay: boolean;
        message?: undefined;
        ignored?: undefined;
    } | {
        ok: boolean;
        message?: undefined;
        replay?: undefined;
        ignored?: undefined;
    } | {
        ok: boolean;
        ignored: boolean;
        message?: undefined;
        replay?: undefined;
    }>;
    private mapEventType;
}
