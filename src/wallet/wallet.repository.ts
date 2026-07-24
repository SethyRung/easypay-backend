import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, desc, sql, and, gte, like } from 'drizzle-orm';
import { DATABASE, type Database } from '@/db/database.module';
import { walletAccounts, ledgerEntries } from '@/db/schema';

@Injectable()
export class WalletRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findWalletByUserId(userId: string) {
    const result = await this.db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.userId, userId))
      .limit(1);
    return result[0];
  }

  async getOrCreateWalletByUserId(userId: string) {
    return this.db.transaction(async (db) => {
      const inserted = await db
        .insert(walletAccounts)
        .values({
          userId,
          currency: 'USD',
          balanceMinor: 0,
          status: 'active',
        })
        .onConflictDoNothing({ target: walletAccounts.userId })
        .returning();
      const wallet = inserted[0];
      if (wallet) {
        return wallet;
      }
      const existing = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .limit(1);
      return existing[0];
    });
  }

  async getTransactionHistory(
    walletAccountId: string,
    limit: number,
    offset: number,
  ) {
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.walletAccountId, walletAccountId));
    const total = countResult[0]?.count || 0;

    const transactions = await this.db
      .select({
        id: ledgerEntries.id,
        entryType: ledgerEntries.entryType,
        amountMinor: ledgerEntries.amountMinor,
        balanceBeforeMinor: ledgerEntries.balanceBeforeMinor,
        balanceAfterMinor: ledgerEntries.balanceAfterMinor,
        description: ledgerEntries.description,
        transferId: ledgerEntries.transferId,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.walletAccountId, walletAccountId))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(limit)
      .offset(offset);

    return { transactions, total };
  }

  async topUpWallet(
    userId: string,
    amountMinor: number,
    maxDailyMinor: number,
    note?: string,
  ) {
    return this.db.transaction(async (db) => {
      const updatedWalletResult = await db
        .update(walletAccounts)
        .set({
          balanceMinor: sql`${walletAccounts.balanceMinor} + ${amountMinor}`,
          updatedAt: new Date(),
        })
        .where(eq(walletAccounts.userId, userId))
        .returning({
          id: walletAccounts.id,
          currency: walletAccounts.currency,
          balanceMinor: walletAccounts.balanceMinor,
        });
      const updatedWallet = updatedWalletResult[0];

      if (!updatedWallet) {
        return null;
      }

      const balanceAfterMinor = updatedWallet.balanceMinor;
      const balanceBeforeMinor = balanceAfterMinor - amountMinor;

      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const dailyTopUpTotalResult = await db
        .select({
          total: sql<number>`coalesce(sum(${ledgerEntries.amountMinor}), 0)::int`,
        })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.walletAccountId, updatedWallet.id),
            eq(ledgerEntries.entryType, 'credit'),
            like(ledgerEntries.description, 'Wallet top-up%'),
            gte(ledgerEntries.createdAt, startOfDay),
          ),
        );
      const dailyTopUpTotal = dailyTopUpTotalResult[0]?.total ?? 0;

      if (dailyTopUpTotal + amountMinor > maxDailyMinor) {
        throw new BadRequestException(
          `Top-up exceeds daily limit of ${maxDailyMinor} minor units`,
        );
      }

      const entryResult = await db
        .insert(ledgerEntries)
        .values({
          walletAccountId: updatedWallet.id,
          entryType: 'credit',
          amountMinor,
          balanceBeforeMinor,
          balanceAfterMinor,
          description: note ? `Wallet top-up: ${note}` : 'Wallet top-up',
        })
        .returning();
      const entry = entryResult[0];

      return { wallet: updatedWallet, entry, balanceBeforeMinor };
    });
  }

  async withdrawWallet(userId: string, amountMinor: number, note?: string) {
    return this.db.transaction(async (db) => {
      const walletResult = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, userId))
        .for('update')
        .limit(1);
      const wallet = walletResult[0];

      if (!wallet) {
        return null;
      }

      if (wallet.balanceMinor < amountMinor) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceBeforeMinor = wallet.balanceMinor;
      const balanceAfterMinor = wallet.balanceMinor - amountMinor;

      await db
        .update(walletAccounts)
        .set({ balanceMinor: balanceAfterMinor, updatedAt: new Date() })
        .where(eq(walletAccounts.id, wallet.id));

      const entryResult = await db
        .insert(ledgerEntries)
        .values({
          walletAccountId: wallet.id,
          entryType: 'debit',
          amountMinor,
          balanceBeforeMinor,
          balanceAfterMinor,
          description: note
            ? `Wallet withdrawal: ${note}`
            : 'Wallet withdrawal',
        })
        .returning();
      const entry = entryResult[0];

      return {
        wallet: {
          id: wallet.id,
          currency: wallet.currency,
          balanceMinor: balanceAfterMinor,
        },
        entry,
        balanceBeforeMinor,
      };
    });
  }
}
