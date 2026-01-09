import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  health() {
    return {
      ok: true,
      service: "tangolyft-backend",
      ts: new Date().toISOString(),
    };
  }

  @Get("db")
  async db() {
    // Simple DB ping
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      db: "up",
      ts: new Date().toISOString(),
    };
  }
}
