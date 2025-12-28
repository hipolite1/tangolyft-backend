import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
export declare class PaymentsService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    private paystackKey;
    private generateReference;
    initPaystackPayment(userId: string, tripId: string, amountOverride?: number): Promise<{
        ok: boolean;
        message: string;
        paystack?: undefined;
        authorizationUrl?: undefined;
        reference?: undefined;
        amount?: undefined;
    } | {
        ok: boolean;
        message: string;
        paystack: any;
        authorizationUrl?: undefined;
        reference?: undefined;
        amount?: undefined;
    } | {
        ok: boolean;
        authorizationUrl: string;
        reference: string;
        amount: number;
        message?: undefined;
        paystack?: undefined;
    }>;
    verifyPaystack(reference: string): Promise<{
        ok: boolean;
        message: string;
        paystack?: undefined;
        paid?: undefined;
        payment?: undefined;
        status?: undefined;
    } | {
        ok: boolean;
        message: string;
        paystack: any;
        paid?: undefined;
        payment?: undefined;
        status?: undefined;
    } | {
        ok: boolean;
        paid: boolean;
        payment: {
            id: string;
            verifiedAt: Date | null;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            updatedAt: Date;
            currency: import("@prisma/client").$Enums.Currency;
            tripId: string;
            amount: number;
            reference: string;
            provider: import("@prisma/client").$Enums.PaymentProvider;
            method: import("@prisma/client").$Enums.PaymentMethod;
            authorizationUrl: string | null;
        };
        message?: undefined;
        paystack?: undefined;
        status?: undefined;
    } | {
        ok: boolean;
        paid: boolean;
        status: any;
        paystack: any;
        message?: undefined;
        payment?: undefined;
    }>;
    verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
