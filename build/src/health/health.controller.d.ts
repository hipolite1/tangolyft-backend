import { PrismaService } from "../prisma/prisma.service";
export declare class HealthController {
    private prisma;
    constructor(prisma: PrismaService);
    health(): {
        ok: boolean;
        service: string;
        ts: string;
    };
    db(): Promise<{
        ok: boolean;
        db: string;
        ts: string;
    }>;
}
