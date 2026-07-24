import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const DATABASE = Symbol("DATABASE");
export type Database = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const url = config.getOrThrow<string>("DATABASE_URL");
        const client = postgres(url, { max: 10 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
