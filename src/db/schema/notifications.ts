import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
