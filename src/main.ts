import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // attach filters BEFORE listen
  app.useGlobalFilters(new AllExceptionsFilter());

  // Render provides PORT; bind to 0.0.0.0
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();




