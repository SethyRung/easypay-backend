import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name').notNull(),
    image: text('image'),
    phone: text('phone').unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('user_email_idx').on(table.email),
    phoneIdx: index('user_phone_idx').on(table.phone),
  }),
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('session_user_id_idx').on(table.userId),
  }),
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index('verification_identifier_idx').on(table.identifier),
  }),
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('account_user_id_idx').on(table.userId),
    providerAccountIdx: index('account_provider_account_idx').on(
      table.providerId,
      table.accountId,
    ),
  }),
);

export const walletAccounts = pgTable(
  'wallet_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    balanceMinor: bigint('balance_minor', { mode: 'number' })
      .default(0)
      .notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('wallet_accounts_user_id_idx').on(table.userId),
  }),
);

export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderUserId: text('sender_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    feeMinor: bigint('fee_minor', { mode: 'number' }).notNull(),
    totalDebitMinor: bigint('total_debit_minor', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    note: varchar('note', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    senderIdempotencyIdx: index('transfers_sender_idempotency_idx').on(
      table.senderUserId,
      table.idempotencyKey,
    ),
    senderIdx: index('transfers_sender_user_id_idx').on(table.senderUserId),
    recipientIdx: index('transfers_recipient_user_id_idx').on(
      table.recipientUserId,
    ),
  }),
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAccountId: uuid('wallet_account_id')
      .references(() => walletAccounts.id, { onDelete: 'cascade' })
      .notNull(),
    transferId: uuid('transfer_id').references(() => transfers.id, {
      onDelete: 'set null',
    }),
    entryType: varchar('entry_type', { length: 20 }).notNull(), // debit, credit, fee
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    balanceBeforeMinor: bigint('balance_before_minor', {
      mode: 'number',
    }).notNull(),
    balanceAfterMinor: bigint('balance_after_minor', {
      mode: 'number',
    }).notNull(),
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    walletAccountIdx: index('ledger_entries_wallet_account_id_idx').on(
      table.walletAccountId,
    ),
    transferIdx: index('ledger_entries_transfer_id_idx').on(table.transferId),
    createdAtIdx: index('ledger_entries_created_at_idx').on(table.createdAt),
  }),
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    readAt: timestamp('read_at'),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  }),
);

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type NewWalletAccount = typeof walletAccounts.$inferInsert;
