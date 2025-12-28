import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequireRole } from "../auth/require-role";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("wallet")
export class WalletController {
  constructor(private readonly prisma: PrismaService) {}

  // Driver wallet summary (balance)
  @RequireRole("DRIVER", "ADMIN")
  @Get("me")
  async myWallet(@CurrentUser() user: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const wallet = await this.prisma.driverWallet.findUnique({
      where: { driverId: driver.id },
    });

    // if not created yet, return default
    return {
      ok: true,
      driver: { id: driver.id, city: driver.city, driverType: driver.driverType },
      wallet: wallet ?? { driverId: driver.id, balance: 0 },
    };
  }

  // Driver wallet transactions (history)
  @RequireRole("DRIVER", "ADMIN")
  @Get("transactions")
  async transactions(
    @CurrentUser() user: any,
    @Query("limit") limitRaw?: string,
  ) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
    if (!driver) return { ok: false, message: "Driver profile not found" };

    const limit = Math.min(Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1), 200);

    const txs = await this.prisma.walletTransaction.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { ok: true, count: txs.length, txs };
  }
}
