import { Body, Controller, Post } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { InitializePaystackDto } from "./dto/initialize-paystack.dto";
import { CurrentUser } from "../auth/current-user.decorator"; // adjust if yours differs
import { RequireRole } from "../auth/require-role"; // adjust if yours differs

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequireRole("RIDER", "ADMIN")
  @Post("paystack/initialize")
  async initializePaystack(@CurrentUser() user: any, @Body() dto: InitializePaystackDto) {
    return this.payments.initializePaystack({ userId: user.sub, tripId: dto.tripId });
  }
}
