import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { signJwt, DEFAULT_EXPIRES_IN } from "./jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import twilio from "twilio";
import { normalizePhone } from "../common/phone";

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

  private toE164(rawPhone: string): string {
    const normalized = normalizePhone(rawPhone);
    return normalized.startsWith("+") ? normalized : `+${normalized}`;
  }

  private getTwilioVerifyConfig() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new InternalServerErrorException(
        "Twilio Verify is not fully configured.",
      );
    }

    return {
      client: twilio(accountSid, authToken),
      verifyServiceSid,
    };
  }

  /**
   * Local development OTP flow.
   *
   * This preserves the previous fake-number test workflow when
   * OTP_DEV_MODE=true. Production should keep OTP_DEV_MODE=false.
   */
  private async requestLocalDevOtp(phone: string) {
    const otp = "123456";
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(
      Date.now() + this.otpExpiresMinutes() * 60_000,
    );

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
      data: {
        phone,
        otpHash,
        expiresAt,
      },
    });

    const debugOtp =
      (process.env.DEBUG_OTP || "").toLowerCase() === "true";

    return {
      ok: true,
      phone,
      channel: "development",
      expiresInMinutes: this.otpExpiresMinutes(),
      ...(debugOtp ? { otp } : {}),
    };
  }

  async requestOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);

    if (this.otpDevMode()) {
      return this.requestLocalDevOtp(phone);
    }

    const { client, verifyServiceSid } = this.getTwilioVerifyConfig();
    const destination = this.toE164(phone);

    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: destination,
          channel: "sms",
        });

      console.log("TWILIO_VERIFY_REQUEST", {
        phone,
        status: verification.status,
      });

      return {
        ok: true,
        phone,
        channel: "sms",
        status: verification.status,
        expiresInMinutes: 10,
      };
    } catch (error: any) {
      console.error("TWILIO_VERIFY_SEND_ERROR", {
        phone,
        code: error?.code,
        status: error?.status,
        message: error?.message,
      });

      throw new ServiceUnavailableException(
        error?.message || "Could not send OTP by SMS.",
      );
    }
  }

  private async verifyLocalDevOtp(phone: string, otp: string) {
    const now = new Date();

    const session = await this.prisma.otpSession.findFirst({
      where: {
        phone,
        verifiedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      throw new UnauthorizedException(
        "No active OTP session found. Request a new code.",
      );
    }

    if (session.attempts >= 3) {
      throw new UnauthorizedException(
        "Too many attempts. Request a new code.",
      );
    }

    const valid = await bcrypt.compare(otp, session.otpHash);

    await this.prisma.otpSession.update({
      where: {
        id: session.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    if (!valid) {
      throw new UnauthorizedException("Invalid OTP.");
    }

    await this.prisma.otpSession.update({
      where: {
        id: session.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    });
  }

  async verifyOtp(rawPhone: string, otp: string) {
    const phone = normalizePhone(rawPhone);

    if (this.otpDevMode()) {
      await this.verifyLocalDevOtp(phone, otp);
    } else {
      const { client, verifyServiceSid } = this.getTwilioVerifyConfig();
      const destination = this.toE164(phone);

      try {
        const verificationCheck = await client.verify.v2
          .services(verifyServiceSid)
          .verificationChecks.create({
            to: destination,
            code: otp.trim(),
          });

        console.log("TWILIO_VERIFY_CHECK", {
          phone,
          status: verificationCheck.status,
          valid: verificationCheck.valid,
        });

        if (
          verificationCheck.status !== "approved" ||
          !verificationCheck.valid
        ) {
          throw new UnauthorizedException("Invalid or expired OTP.");
        }
      } catch (error: any) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }

        console.error("TWILIO_VERIFY_CHECK_ERROR", {
          phone,
          code: error?.code,
          status: error?.status,
          message: error?.message,
        });

        throw new UnauthorizedException(
          "Invalid, expired, or unavailable OTP.",
        );
      }
    }

    const user = await this.prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        "User not found for this phone number.",
      );
    }

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