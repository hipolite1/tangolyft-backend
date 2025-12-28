import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;

  constructor() {
    // Create ONE shared pool for the whole app (important)
    if (!PrismaService.pool) {
      const url = process.env.DATABASE_URL;

      if (!url) {
        throw new Error("DATABASE_URL is missing. Check your .env file in the project root.");
      }

      PrismaService.pool = new Pool({
        connectionString: url,
        // Neon requires SSL; pg will respect sslmode=require in your URL,
        // but this makes it explicit and avoids common local issues.
        ssl: { rejectUnauthorized: false },
      });
    }

    const adapter = new PrismaPg(PrismaService.pool);

    // Prisma 7: pass adapter at runtime
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    // Do NOT end the pool here in dev; it breaks hot reload.
  }
}



