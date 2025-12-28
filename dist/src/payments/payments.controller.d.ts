import { PaymentsService } from "./payments.service";
import { InitPaymentDto } from "./dto/init-payment.dto";
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    init(user: any, dto: InitPaymentDto): Promise<{
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
    verify(body: {
        reference: string;
    }): Promise<{
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
    webhook(sig: string, req: any): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
}
