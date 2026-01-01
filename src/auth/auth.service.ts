import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

function normalizePhone(input: string): string {
  return input.trim();
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private otpExpiresMinutes(): number {
    const raw = process.env.OTP_EXPIRES_MIN ?? "5";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 5;
  }

  private otpDevMode(): boolean {
    return (process.env.OTP_DEV_MODE ?? "false").toLowerCase() === "true";
  }

  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing in .env");
    return secret;
  }

  private issueJwt(userId: string, role: "RIDER" | "DRIVER" | "ADMIN") {
    return jwt.sign({ sub: userId, role }, this.jwtSecret(), { expiresIn: "7d" });
  }

  async requestOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);

    const otp = this.otpDevMode()
      ? "123456"
      : String(Math.floor(100000 + Math.random() * 900000));

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + this.otpExpiresMinutes() * 60_000);

    await this.prisma.otpSession.create({
      data: { phone, otpHash, expiresAt },
    });

    // DEBUG_OTP toggle (Render env var)
    const debugOtpRaw = process.env.DEBUG_OTP; // TEMP visibility
    const debugOtp = (debugOtpRaw || "").toLowerCase() === "true";

    return {
      ok: true,
      phone,
      expiresInMinutes: this.otpExpiresMinutes(),

      // TEMP: helps confirm Render env var is applied (remove later)
      debugOtpRaw,
      debugOtp,

      ...(debugOtp ? { otp } : {}),
    };
  }

  async verifyOtp(rawPhone: string, otp: string) {
    const phone = normalizePhone(rawPhone);

    const session = await this.prisma.otpSession.findFirst({
      where: { phone, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!session) throw new UnauthorizedException("No OTP session found. Request a new code.");
    if (new Date() > session.expiresAt) throw new UnauthorizedException("OTP expired. Request a new code.");
    if (session.attempts >= 3) throw new UnauthorizedException("Too many attempts. Request a new code.");

    const ok = await bcrypt.compare(otp, session.otpHash);

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) throw new UnauthorizedException("Invalid OTP.");

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { verifiedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone, role: "RIDER" } });
    }

    const token = this.issueJwt(user.id, user.role);

    return {
      ok: true,
      token,
      user: { id: user.id, phone: user.phone, role: user.role, status: user.status },
    };
  }
}
