import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { setupSwagger } from "./config/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableShutdownHooks();
  app.enableCors({
    origin: config.get("CORS_ORIGIN"),
    credentials: true,
  });

  setupSwagger(app);

  await app.listen(config.get<number>("PORT")!);
}
bootstrap();
