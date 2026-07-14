import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { transfers, user, walletAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

@Injectable()
export class TransfersRepository {
  constructor(@Inject("DATABASE_CLIENT") private readonly db: PostgresJsDatabase) {}

  async findByPhone(phone: string) {
    const result = await this.db.select().from(user).where(eq(user.phone, phone)).limit(1);
    return result[0];
  }

  async findTransferByIdempotency(senderUserId: string, idempotencyKey: string) {
    const result = await this.db
      .select()
      .from(transfers)
      .where(
        and(eq(transfers.senderUserId, senderUserId), eq(transfers.idempotencyKey, idempotencyKey)),
      )
      .limit(1);
    return result[0];
  }

  async findTransferById(transferId: string) {
    const result = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId))
      .limit(1);
    return result[0];
  }

  async getWalletWithLock(userId: string) {
    const result = await this.db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.userId, userId))
      .for("update")
      .limit(1);
    return result[0];
  }
}
