import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class BridgeUserRepository {
  constructor(@Inject("DATABASE_CLIENT") private readonly db: PostgresJsDatabase) {}

  async findById(id: string) {
    const result = await this.db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return result[0];
  }
}
