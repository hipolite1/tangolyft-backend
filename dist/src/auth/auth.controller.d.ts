import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    requestOtp(dto: RequestOtpDto): Promise<{
        devOtp?: string | undefined;
        ok: boolean;
        phone: string;
        expiresInMinutes: number;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        ok: boolean;
        token: string;
        user: {
            id: string;
            phone: string;
            role: import("@prisma/client").$Enums.Role;
            status: import("@prisma/client").$Enums.UserStatus;
        };
    }>;
}
