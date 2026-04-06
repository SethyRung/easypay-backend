import { Injectable, Inject } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { users, refreshTokens } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

@Injectable()
export class AuthRepository {
  constructor(@Inject("DATABASE_CLIENT") private readonly db: PostgresJsDatabase) {}

  async findByEmail(email: string) {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async findByPhone(phone: string) {
    const result = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async findById(id: string) {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(data: { email: string; phone: string; name: string; passwordHash: string }) {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const result = await this.db.insert(refreshTokens).values(data).returning();
    return result[0];
  }

  async findRefreshToken(tokenHash: string) {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);
    return result[0];
  }

  async findValidRefreshTokens(userId: string) {
    return this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async revokeRefreshToken(tokenId: string) {
    const result = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId))
      .returning();
    return result[0];
  }

  async revokeAllUserTokens(userId: string) {
    return this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  }
}
