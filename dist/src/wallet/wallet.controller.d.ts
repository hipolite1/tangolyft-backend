import { PrismaService } from "../prisma/prisma.service";
export declare class WalletController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    myWallet(user: any): Promise<{
        ok: boolean;
        message: string;
        driver?: undefined;
        wallet?: undefined;
    } | {
        ok: boolean;
        driver: {
            id: string;
            city: "ABUJA";
            driverType: import("@prisma/client").$Enums.DriverType;
        };
        wallet: {
            updatedAt: Date;
            driverId: string;
            balance: number;
        } | {
            driverId: string;
            balance: number;
        };
        message?: undefined;
    }>;
    transactions(user: any, limitRaw?: string): Promise<{
        ok: boolean;
        message: string;
        count?: undefined;
        txs?: undefined;
    } | {
        ok: boolean;
        count: number;
        txs: {
            id: string;
            createdAt: Date;
            type: import("@prisma/client").$Enums.WalletTxType;
            driverId: string;
            tripId: string | null;
            reason: import("@prisma/client").$Enums.WalletTxReason;
            amount: number;
            note: string | null;
        }[];
        message?: undefined;
    }>;
}
