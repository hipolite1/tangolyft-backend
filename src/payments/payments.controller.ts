import { Body, Controller, Post } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { InitializePaystackDto } from "./dto/initialize-paystack.dto";
import { VerifyPaystackDto } from "./dto/verify-paystack.dto";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequireRole } from "../auth/require-role";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("paystack/initialize")
  async initializePaystack(
    @CurrentUser() user: any,
    @Body() dto: InitializePaystackDto,
  ) {
    return this.payments.initializePaystack({
      userId: user.sub,
      tripId: dto.tripId,
    });
  }

  @RequireRole("RIDER", "ADMIN")
  @Post("paystack/verify")
  async verifyPaystack(
    @CurrentUser() user: any,
    @Body() dto: VerifyPaystackDto,
  ) {
    return this.payments.verifyPaystack({
      userId: user.sub,
      reference: dto.reference,
    });
  }
}