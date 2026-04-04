import { Injectable } from "@nestjs/common";
import { PaymentProvider, PaymentStatus, TripStatus, PaymentMode  } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import crypto from "crypto";

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

private paystackBaseUrl = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
  private paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";

  private assertConfig() {
    if (!this.paystackSecret) throw new Error("Missing PAYSTACK_SECRET_KEY");
  }

  private toKobo(amountNgn: number) {
    return Math.round(amountNgn * 100);
  }

  private makeReference() {
    return `TL_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  }

  private fallbackEmailFromPhone(phone: string) {
    const clean = phone.replace(/[^0-9+]/g, "").replace("+", "");
    return `user_${clean}@tangolyft.app`;
  }

  async initializePaystack(input: { userId: string; tripId: string }) {
    this.assertConfig();

    const trip = await this.prisma.trip.findUnique({
      where: { id: input.tripId },
      include: { rider: true, fare: true, payment: true },
    });

    if (!trip) return { ok: false, message: "Trip not found" };
    if (trip.riderId !== input.userId) return { ok: false, message: "Not your trip" };

    if (trip.status === TripStatus.CANCELLED || trip.status === TripStatus.COMPLETED) {
      return { ok: false, message: "Trip is not payable" };
    }

    if (trip.paymentMode === PaymentMode.PAY_ON_DROPOFF) {
      return { ok: false, message: "This trip is PAY_ON_DROPOFF. No online payment required." };
    }

    // TODO: Replace with your real TripFare field name once confirmed
    const fareNgn =
      (trip.fare as any)?.totalFareNgn ??
      (trip.fare as any)?.total ??
      (trip.fare as any)?.amount ??
      null;

    if (!fareNgn || Number(fareNgn) <= 0) {
      return { ok: false, message: "Fare not available for this trip" };
    }

    const amount = this.toKobo(Number(fareNgn));
    const email = trip.rider.email || this.fallbackEmailFromPhone(trip.rider.phone);

    if (trip.payment) {
      if (trip.payment.status === PaymentStatus.PAID) {
        return { ok: true, status: "PAID", reference: trip.payment.reference };
      }
      if (trip.payment.status === PaymentStatus.PENDING && trip.payment.authorizationUrl) {
        return {
          ok: true,
          status: "PENDING",
          reference: trip.payment.reference,
          authorizationUrl: trip.payment.authorizationUrl,
          amount,
          currency: trip.payment.currency,
        };
      }
    }

    const reference = trip.payment?.reference || this.makeReference();

    const resp = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        reference,
        metadata: {
          tripId: trip.id,
          riderId: trip.riderId,
          city: trip.city,
          serviceType: trip.serviceType,
        },
      }),
    });

    const json: any = await resp.json().catch(() => null);

    if (!resp.ok || !json?.status) {
      return { ok: false, message: "Paystack initialize failed", details: json || { status: resp.status } };
    }

    const authorizationUrl = json.data?.authorization_url as string | undefined;
    if (!authorizationUrl) {
      return { ok: false, message: "Paystack did not return authorization_url", details: json };
    }

    const payment = await this.prisma.payment.upsert({
      where: { tripId: trip.id },
      create: {
        tripId: trip.id,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.PENDING,
        amount,
        reference,
        authorizationUrl,
      },
      update: {
        status: PaymentStatus.PENDING,
        amount,
        reference,
        authorizationUrl,
        verifiedAt: null,
      },
    });

    return {
      ok: true,
      status: payment.status,
      reference: payment.reference,
      authorizationUrl: payment.authorizationUrl,
      amount: payment.amount,
      currency: payment.currency,
    };
  }
}
