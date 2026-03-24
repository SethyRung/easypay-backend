import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class DatabaseService {
  constructor(@Inject("DATABASE_CLIENT") private readonly db: PostgresJsDatabase) {}

  getClient() {
    return this.db;
  }

  async transaction<T>(callback: (db: PostgresJsDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
}
