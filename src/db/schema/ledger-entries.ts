import { pgTable, uuid, varchar, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { walletAccounts } from "./wallet-accounts";
import { transfers } from "./transfers";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAccountId: uuid("wallet_account_id")
      .references(() => walletAccounts.id, { onDelete: "cascade" })
      .notNull(),
    transferId: uuid("transfer_id").references(() => transfers.id, { onDelete: "set null" }),
    entryType: varchar("entry_type", { length: 20 }).notNull(), // debit, credit, fee
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    balanceBeforeMinor: bigint("balance_before_minor", { mode: "number" }).notNull(),
    balanceAfterMinor: bigint("balance_after_minor", { mode: "number" }).notNull(),
    description: varchar("description", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    walletAccountIdx: index("ledger_entries_wallet_account_id_idx").on(table.walletAccountId),
    transferIdx: index("ledger_entries_transfer_id_idx").on(table.transferId),
    createdAtIdx: index("ledger_entries_created_at_idx").on(table.createdAt),
  }),
);

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
