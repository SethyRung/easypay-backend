import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from '@/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  app.setGlobalPrefix('/api');

  setupSwagger(app);

  await app.listen(config.get<number>('PORT', 3000));
}
bootstrap();
