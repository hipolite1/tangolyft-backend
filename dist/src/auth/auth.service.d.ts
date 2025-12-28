import { PrismaService } from "../prisma/prisma.service";
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private otpExpiresMinutes;
    private otpDevMode;
    private jwtSecret;
    private issueJwt;
    requestOtp(rawPhone: string): Promise<{
        devOtp?: string | undefined;
        ok: boolean;
        phone: string;
        expiresInMinutes: number;
    }>;
    verifyOtp(rawPhone: string, otp: string): Promise<{
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
