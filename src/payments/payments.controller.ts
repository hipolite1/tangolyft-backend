import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";
import { InitPaymentDto } from "./dto/init-payment.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("init")
  async init(@CurrentUser() user: any, @Body() dto: InitPaymentDto) {
    return this.payments.initPaystackPayment(user.sub, dto.tripId, dto.amount);
  }

  @RequireRole("RIDER", "ADMIN")
  @Post("verify")
  async verify(@Body() body: { reference: string }) {
    return this.payments.verifyPaystack(body.reference);
  }

  @Post("paystack/webhook")
  async webhook(@Headers("x-paystack-signature") sig: string, @Req() req: any) {
    const rawBody = req.rawBody?.toString?.() || JSON.stringify(req.body);
    const ok = this.payments.verifyWebhookSignature(rawBody, sig || "");
    if (!ok) return { ok: false, message: "Invalid signature" };
    return { ok: true };
  }
}
