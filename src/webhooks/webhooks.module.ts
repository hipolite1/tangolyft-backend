import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PaystackWebhookController } from "./paystack.webhook.controller";

@Module({
  imports: [PrismaModule],
  controllers: [PaystackWebhookController],
})
export class WebhooksModule {}

