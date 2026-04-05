"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("./jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
function normalizePhone(input) {
    const raw = input.trim().replace(/\s+/g, "").replace(/-/g, "");
    if (raw.startsWith("+234")) {
        return raw.slice(1);
    }
    if (raw.startsWith("234")) {
        return raw;
    }
    if (raw.startsWith("0") && raw.length === 11) {
        return `234${raw.slice(1)}`;
    }
    return raw;
}
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    otpExpiresMinutes() {
        const raw = process.env.OTP_EXPIRES_MIN ?? "5";
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : 5;
    }
    otpDevMode() {
        return (process.env.OTP_DEV_MODE ?? "false").toLowerCase() === "true";
    }
    issueJwt(userId, role) {
        return (0, jwt_1.signJwt)({ sub: userId, role }, jwt_1.DEFAULT_EXPIRES_IN);
    }
    async requestOtp(rawPhone) {
        const phone = normalizePhone(rawPhone);
        const otp = this.otpDevMode()
            ? "123456"
            : String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + this.otpExpiresMinutes() * 60_000);
        await this.prisma.otpSession.updateMany({
            where: {
                phone,
                verifiedAt: null,
            },
            data: {
                verifiedAt: new Date(),
            },
        });
        await this.prisma.otpSession.create({
            data: { phone, otpHash, expiresAt },
        });
        const debugOtpRaw = process.env.DEBUG_OTP;
        const debugOtp = (debugOtpRaw || "").toLowerCase() === "true";
        return {
            ok: true,
            phone,
            expiresInMinutes: this.otpExpiresMinutes(),
            buildStamp: "LOCAL-E-TEST-1",
            debugOtpRaw,
            debugOtp,
            expiresAt,
            ...(debugOtp ? { otp } : {}),
        };
    }
    async verifyOtp(rawPhone, otp) {
        const phone = normalizePhone(rawPhone);
        const now = new Date();
        console.log("DB_URL_CHECK", process.env.DATABASE_URL);
        console.log("VERIFY_PHONE_LOOKUP", phone);
        console.log("VERIFY_NOW", now.toISOString());
        const session = await this.prisma.otpSession.findFirst({
            where: {
                phone,
                verifiedAt: null,
                expiresAt: {
                    gt: now,
                },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!session) {
            throw new common_1.UnauthorizedException("No active OTP session found. Request a new code.");
        }
        console.log("VERIFY_OTP_SESSION", {
            id: session.id,
            phone: session.phone,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            attempts: session.attempts,
        });
        if (session.attempts >= 3) {
            throw new common_1.UnauthorizedException("Too many attempts. Request a new code.");
        }
        const ok = await bcrypt.compare(otp, session.otpHash);
        await this.prisma.otpSession.update({
            where: { id: session.id },
            data: { attempts: { increment: 1 } },
        });
        if (!ok) {
            throw new common_1.UnauthorizedException("Invalid OTP.");
        }
        await this.prisma.otpSession.update({
            where: { id: session.id },
            data: { verifiedAt: new Date() },
        });
        const user = await this.prisma.user.findUnique({
            where: { phone },
        });
        if (!user) {
            throw new common_1.UnauthorizedException("User not found for this phone number.");
        }
        console.log("VERIFY_OTP_USER", {
            id: user.id,
            phone: user.phone,
            role: user.role,
            status: user.status,
        });
        const token = this.issueJwt(user.id, user.role);
        return {
            ok: true,
            token,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map