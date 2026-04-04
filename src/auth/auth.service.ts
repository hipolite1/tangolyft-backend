import { Injectable, UnauthorizedException } from "@nestjs/common";
import { signJwt, DEFAULT_EXPIRES_IN } from "./jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

function normalizePhone(input: string): string {
  const raw = input.trim().replace(/\s+/g, "").replace(/-/g, "");

  if (raw.startsWith("+234")) {
    return raw.slice(1); // +2348011111112 -> 2348011111112
  }

  if (raw.startsWith("234")) {
    return raw; // already canonical
  }

  if (raw.startsWith("0") && raw.length === 11) {
    return `234${raw.slice(1)}`; // 08011111112 -> 2348011111112
  }

  return raw;
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

  private issueJwt(userId: string, role: "RIDER" | "DRIVER" | "ADMIN") {
    return signJwt({ sub: userId, role }, DEFAULT_EXPIRES_IN);
  }

  async requestOtp(rawPhone: string) {
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

  async verifyOtp(rawPhone: string, otp: string) {
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
      throw new UnauthorizedException("No active OTP session found. Request a new code.");
    }

    console.log("VERIFY_OTP_SESSION", {
      id: session.id,
      phone: session.phone,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      attempts: session.attempts,
    });

    if (session.attempts >= 3) {
      throw new UnauthorizedException("Too many attempts. Request a new code.");
    }

    const ok = await bcrypt.compare(otp, session.otpHash);

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) {
      throw new UnauthorizedException("Invalid OTP.");
    }

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { verifiedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException("User not found for this phone number.");
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
}