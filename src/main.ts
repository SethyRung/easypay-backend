import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { setupSwagger } from "@/config/swagger.config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix("/api");

  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get("CORS_ORIGIN", "*"),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupSwagger(app);

  await app.listen(config.get<number>("PORT", 3000));
}
bootstrap();
