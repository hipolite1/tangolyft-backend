import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import compression from "compression";
import express from "express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Capture RAW body for webhook signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Render/Cloudflare proxy (so req.ip uses X-Forwarded-For properly)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

  // Strong request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  console.log("CORS_PRELIGHT_FIX_V2_LIVE");
  await app.listen(process.env.PORT || 3000);
}
bootstrap();











