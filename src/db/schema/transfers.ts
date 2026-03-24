import { pgTable, uuid, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderUserId: uuid("sender_user_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    recipientUserId: uuid("recipient_user_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    feeMinor: bigint("fee_minor", { mode: "number" }).notNull(),
    totalDebitMinor: bigint("total_debit_minor", { mode: "number" }).notNull(),
    status: varchar("status", { length: 20 }).default("completed").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    senderIdempotencyIdx: index("transfers_sender_idempotency_idx").on(
      table.senderUserId,
      table.idempotencyKey,
    ),
    senderIdx: index("transfers_sender_user_id_idx").on(table.senderUserId),
    recipientIdx: index("transfers_recipient_user_id_idx").on(table.recipientUserId),
  }),
);

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
