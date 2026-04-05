import { PaymentsService } from "./payments.service";
import { InitializePaystackDto } from "./dto/initialize-paystack.dto";
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    initializePaystack(user: any, dto: InitializePaystackDto): Promise<{
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
