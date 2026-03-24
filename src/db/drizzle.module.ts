import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "DATABASE_CLIENT",
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = `postgres://${configService.get("DATABASE_USER")}:${configService.get("DATABASE_PASSWORD")}@${configService.get("DATABASE_HOST")}:${configService.get("DATABASE_PORT")}/${configService.get("DATABASE_NAME")}`;
        const client = postgres(connectionString);
        return drizzle(client);
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService, "DATABASE_CLIENT"],
})
export class DrizzleModule {}
