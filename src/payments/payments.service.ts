import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentMethod, PaymentProvider, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  private paystackKey() {
    return (this.config.get<string>("PAYSTACK_SECRET_KEY") || "").trim();
  }

  private generateReference(prefix = "TL") {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  }

  async initPaystackPayment(userId: string, tripId: string, amountOverride?: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { fare: true, rider: true },
    });
    if (!trip) return { ok: false, message: "Trip not found" };

    if (trip.riderId !== userId) {
      return { ok: false, message: "You can only pay for your own trip" };
    }

    const amount = trip.fare?.totalAmount ?? amountOverride ?? null;
    if (!amount || amount <= 0) {
      return { ok: false, message: "Trip fare not set yet. Complete trip or pass amount." };
    }

    const key = this.paystackKey();
    if (!key) return { ok: false, message: "PAYSTACK_SECRET_KEY missing in .env" };

    const reference = this.generateReference("TL_PAY");

    const payment = await this.prisma.payment.upsert({
      where: { tripId },
      update: {
        amount,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.PAYSTACK,
        method: PaymentMethod.TRANSFER,
        reference,
        authorizationUrl: null,
      },
      create: {
        tripId,
        amount,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.PAYSTACK,
        method: PaymentMethod.TRANSFER,
        reference,
      },
    });

    const amountKobo = amount * 100;

    const callback_url =
      `${this.config.get("APP_BASE_URL") || "http://localhost:3000"}/payments/paystack/callback`;

    const payload = {
      email: trip.rider.email || "rider@tangolyft.com",
      amount: amountKobo,
      reference: payment.reference,
      callback_url,
      metadata: {
        tripId,
        riderId: trip.riderId,
        city: trip.city,
        serviceType: trip.serviceType,
      },
    };

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json: any = await res.json();

    if (!res.ok || !json.status) {
      return { ok: false, message: "Paystack init failed", paystack: json };
    }

    const authUrl = json.data.authorization_url as string;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { authorizationUrl: authUrl },
    });

    return { ok: true, authorizationUrl: authUrl, reference: payment.reference, amount };
  }

  async verifyPaystack(reference: string) {
    const key = this.paystackKey();
    if (!key) return { ok: false, message: "PAYSTACK_SECRET_KEY missing in .env" };

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const json: any = await res.json();

    if (!res.ok || !json.status) {
      return { ok: false, message: "Paystack verify failed", paystack: json };
    }

    const status = json.data.status;

    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) return { ok: false, message: "Payment not found in DB" };

    if (status === "success") {
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, verifiedAt: new Date() },
      });
      return { ok: true, paid: true, payment: updated };
    }

    return { ok: true, paid: false, status, paystack: json.data };
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    const secret = (this.config.get<string>("PAYSTACK_WEBHOOK_SECRET") || this.paystackKey()).trim();
    if (!secret) return false;

    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    return hash === signature;
  }
}
