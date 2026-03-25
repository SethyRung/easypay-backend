import { pgTable, uuid, varchar, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    balanceMinor: bigint("balance_minor", { mode: "number" }).default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("wallet_accounts_user_id_idx").on(table.userId),
  }),
);

export type WalletAccount = typeof walletAccounts.$inferSelect;
export type NewWalletAccount = typeof walletAccounts.$inferInsert;
