import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import compression from "compression";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render/Cloudflare proxy (Express)
  const server: any = app.getHttpAdapter().getInstance();
  server.set("trust proxy", 1);

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

  await app.listen(process.env.PORT || 3000);
}
bootstrap();








