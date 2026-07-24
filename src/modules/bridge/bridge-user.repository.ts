import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "@/db/database.module";
import { user } from "@/db/schema";

@Injectable()
export class BridgeUserRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return result[0];
  }
}
