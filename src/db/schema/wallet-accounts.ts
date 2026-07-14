import { bigint, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./user";

export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    balanceMinor: bigint("balance_minor", { mode: "number" }).default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("wallet_accounts_user_id_idx").on(table.userId),
  }),
);

export type WalletAccount = typeof walletAccounts.$inferSelect;
export type NewWalletAccount = typeof walletAccounts.$inferInsert;
