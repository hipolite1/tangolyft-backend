import { PrismaService } from "../prisma/prisma.service";
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private paystackBaseUrl;
    private paystackSecret;
    private assertConfig;
    private toKobo;
    private makeReference;
    private fallbackEmailFromPhone;
    initializePaystack(input: {
        userId: string;
        tripId: string;
    }): Promise<{
        ok: boolean;
        message: string;
        status?: undefined;
        reference?: undefined;
        authorizationUrl?: undefined;
        amount?: undefined;
        currency?: undefined;
        details?: undefined;
    } | {
        ok: boolean;
        status: string;
        reference: string;
        message?: undefined;
        authorizationUrl?: undefined;
        amount?: undefined;
        currency?: undefined;
        details?: undefined;
    } | {
        ok: boolean;
        status: string;
        reference: string;
        authorizationUrl: string;
        amount: number;
        currency: "NGN";
        message?: undefined;
        details?: undefined;
    } | {
        ok: boolean;
        message: string;
        details: any;
        status?: undefined;
        reference?: undefined;
        authorizationUrl?: undefined;
        amount?: undefined;
        currency?: undefined;
    }>;
}
