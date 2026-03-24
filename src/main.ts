import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { setupSwagger } from "./config/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new ConfigService();

  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN") || "*",
    credentials: true,
  });

  setupSwagger(app);

  await app.listen(config.get<string>("PORT") ?? 8080);
}
bootstrap();
