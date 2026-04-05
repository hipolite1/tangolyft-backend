set -euo pipefail

echo "==> Step 2: Create Payments module files"
mkdir -p src/payments/dto
cat > src/payments/payments.module.ts <<'TS'
import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
TS

cat > src/payments/dto/initialize-paystack.dto.ts <<'TS'
import { IsUUID } from "class-validator";

export class InitializePaystackDto {
  @IsUUID()
  tripId!: string;
}
TS

cat > src/payments/payments.controller.ts <<'TS'
import { Body, Controller, Post } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { InitializePaystackDto } from "./dto/initialize-paystack.dto";
import { CurrentUser } from "../auth/current-user.decorator"; // adjust if yours differs
import { RequireRole } from "../auth/require-role.decorator"; // adjust if yours differs

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("paystack/initialize")
  async initializePaystack(@CurrentUser() user: any, @Body() dto: InitializePaystackDto) {
    return this.payments.initializePaystack({ userId: user.sub, tripId: dto.tripId });
  }
}
TS

cat > src/payments/payments.service.ts <<'TS'
import { Injectable } from "@nestjs/common";
import { PrismaClient, PaymentProvider, PaymentStatus, TripStatus, PaymentMode } from "@prisma/client";
import crypto from "crypto";

@Injectable()
export class PaymentsService {
  private prisma = new PrismaClient();

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

    if ([TripStatus.CANCELLED, TripStatus.COMPLETED].includes(trip.status)) {
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
TS

echo "==> Step 3: Create Webhooks module files"
mkdir -p src/webhooks
cat > src/webhooks/webhooks.module.ts <<'TS'
import { Module } from "@nestjs/common";
import { PaystackWebhookController } from "./paystack.webhook.controller";

@Module({
  controllers: [PaystackWebhookController],
})
export class WebhooksModule {}
TS

cat > src/webhooks/paystack.webhook.controller.ts <<'TS'
import { Controller, Headers, Post, Req } from "@nestjs/common";
import { PrismaClient, PaymentStatus, PaystackEventType } from "@prisma/client";
import crypto from "crypto";

@Controller("webhooks/paystack")
export class PaystackWebhookController {
  private prisma = new PrismaClient();
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
TS

echo "==> Step 4: Patch src/app.module.ts (best effort)"
APP_MODULE="src/app.module.ts"
if [ -f "$APP_MODULE" ]; then
  grep -q 'PaymentsModule' "$APP_MODULE" || sed -i '1s;^;import { PaymentsModule } from "./payments/payments.module";\n;' "$APP_MODULE"
  grep -q 'WebhooksModule' "$APP_MODULE" || sed -i '1s;^;import { WebhooksModule } from "./webhooks/webhooks.module";\n;' "$APP_MODULE"

  if grep -q 'imports:\s*\[' "$APP_MODULE"; then
    sed -i 's/imports:\s*\[\s*/imports: [\n    PaymentsModule,\n    WebhooksModule,\n    /' "$APP_MODULE" || true
  else
    echo "!! Could not auto-insert into imports: [] (no 'imports: [' pattern found). Add manually."
  fi
else
  echo "!! src/app.module.ts not found. Add modules manually."
fi

echo "==> DONE: files created. Next: patch startTrip by setting START_FILE"
echo "To find it:"
echo "  grep -R --line-number 'TripStatus.STARTED' src | head -n 20"
