import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { HealthModule } from "./health/health.module";
import { VersionModule } from "./version/version.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { DriverModule } from "./driver/driver.module";
import { AdminModule } from "./admin/admin.module";
import { TripsModule } from "./trips/trips.module";
import { WalletModule } from "./wallet/wallet.module";
import { PaymentsModule } from "./payments/payments.module";

import { ThrottlerProxyGuard } from "./auth/throttler-proxy.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Rate limit: 120 requests / 60s per real client IP (Cloudflare/Render aware)
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      getTracker: (req: any) => {
        const cf = req.headers?.["cf-connecting-ip"];
        const xff = req.headers?.["x-forwarded-for"];

        const cfIp = Array.isArray(cf) ? cf[0] : cf;
        const xffIp =
          typeof xff === "string"
            ? xff.split(",")[0].trim()
            : Array.isArray(xff)
              ? xff[0]?.split(",")[0].trim()
              : undefined;

        return (cfIp || xffIp || req.ip || "unknown").toString();
      },
    }),

    HealthModule,
    VersionModule,
    PrismaModule,
    AuthModule,
    DriverModule,
    AdminModule,
    TripsModule,
    WalletModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerProxyGuard }, AppService],
})
export class AppModule {}






