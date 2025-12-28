import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { DriverModule } from "./driver/driver.module";
import { AdminModule } from "./admin/admin.module";
import { TripsModule } from "./trips/trips.module";
import { WalletModule } from "./wallet/wallet.module";
import { PaymentsModule } from "./payments/payments.module";


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    DriverModule,
    AdminModule,
    TripsModule,
    WalletModule,
    PaymentsModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

