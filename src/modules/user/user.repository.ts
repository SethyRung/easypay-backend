import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE, type Database } from "@/db/database.module";
import { user, walletAccounts } from "@/db/schema";

@Injectable()
export class UserRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(userId: string) {
    const rows = await this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        balanceMinor: walletAccounts.balanceMinor,
      })
      .from(user)
      .leftJoin(walletAccounts, eq(walletAccounts.userId, user.id))
      .where(eq(user.id, userId))
      .limit(1);
    return rows[0] ?? null;
  }
}
