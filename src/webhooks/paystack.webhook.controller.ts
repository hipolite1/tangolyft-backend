import { Controller, Headers, Post, Req } from "@nestjs/common";
import { PaymentStatus, PaystackEventType  } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import crypto from "crypto";

@Controller("webhooks/paystack")
export class PaystackWebhookController {
  constructor(private prisma: PrismaService) {}

private secret = process.env.PAYSTACK_SECRET_KEY || "";

  private verifySignature(rawBody: Buffer, signature: string) {
    const hash = crypto.createHmac("sha512", this.secret).update(rawBody).digest("hex");
    return hash === signature;
  }

  @Post()
  async handle(@Req() req: any, @Headers("x-paystack-signature") sig?: string) {
    if (!this.secret) return { ok: false, message: "Missing PAYSTACK_SECRET_KEY" };

    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) return { ok: false, message: "Missing rawBody (check main.ts middleware)" };

    if (!sig || !this.verifySignature(rawBody, sig)) {
      return { ok: false, message: "Invalid signature" };
    }

    const event = req.body;
    const eventName: string = event?.event || "";
    const data = event?.data || {};

    const reference: string | undefined = data?.reference;
    const paidAt: string | undefined = data?.paid_at;
    const paystackEventId: string | undefined = event?.id || data?.id;

    const dedupeKey =
      paystackEventId ||
      crypto
        .createHash("sha256")
        .update(`${eventName}|${reference || ""}|${paidAt || ""}|${rawBody.toString("utf8")}`)
        .digest("hex");

    const webhook = await this.prisma.paystackWebhookEvent
      .create({
        data: {
          eventId: dedupeKey,
          reference: reference || null,
          eventType: this.mapEventType(eventName),
          payload: event,
        },
      })
      .catch(() => null);

    if (!webhook) return { ok: true, replay: true };
    if (!reference) return { ok: true, message: "No reference in event" };

    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment) return { ok: true, message: "Payment not found for reference" };

    await this.prisma.paystackWebhookEvent.update({
      where: { id: (webhook as any).id },
      data: { paymentId: payment.id },
    });

    if (eventName === "charge.success") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, verifiedAt: new Date() },
      });

      await this.prisma.trip
        .update({
          where: { id: payment.tripId },
          data: { commitmentStatus: "CONFIRMED" as any },
        })
        .catch(() => null);

      return { ok: true };
    }

    if (eventName === "charge.failed") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return { ok: true };
    }

    return { ok: true, ignored: true };
  }

  private mapEventType(eventName: string): PaystackEventType {
    switch (eventName) {
      case "charge.success":
        return PaystackEventType.CHARGE_SUCCESS;
      case "transfer.success":
        return PaystackEventType.TRANSFER_SUCCESS;
      case "transfer.failed":
        return PaystackEventType.TRANSFER_FAILED;
      default:
        return PaystackEventType.UNKNOWN;
    }
  }
}
