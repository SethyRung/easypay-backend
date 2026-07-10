# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

**EasyPay Backend** is an Android-only wallet API. It powers the EasyPay Android banking app and exposes endpoints for authentication, wallet balance, and P2P wallet-to-wallet transfers.

The complete specification lives in `ANDROID_BACKEND_PLAN.md` (planned). Treat that document as authoritative for API surface, data model, and execution rules. When this file and the plan disagree, the plan wins.

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: NestJS 11
- **ORM**: Drizzle ORM (PostgreSQL via `postgres` driver)
- **Auth**: JWT access + refresh tokens (`@nestjs/jwt`, `passport-jwt`)
- **Validation**: `class-validator` + `class-transformer`
- **Schema validation**: `zod` (used alongside class-validator where appropriate)
- **Linting**: `oxlint` (not ESLint)
- **Formatting**: `oxfmt` (not Prettier)
- **Testing**: Jest (unit) + Supertest (e2e)
- **Package manager**: `pnpm` (version pinned via `packageManager` field)
- **API docs**: `@nestjs/swagger`

## Commands

```bash
# Install
pnpm install

# Develop (default port 8080, watch mode)
pnpm run start:dev

# Build
pnpm run build

# Production
pnpm run start:prod

# Lint / format
pnpm run lint          # oxlint check
pnpm run lint:fix      # oxlint --fix
pnpm run fmt           # oxfmt format
pnpm run fmt:check     # oxfmt --check only

# Tests
pnpm run test          # unit (Jest, src/**/*.spec.ts)
pnpm run test:e2e      # e2e (jest-e2e.json)
pnpm run test:cov      # coverage
pnpm run test:watch    # watch mode

# Database (Drizzle)
pnpm run db:generate   # generate migration from schema diffs
pnpm run db:migrate    # apply migrations
pnpm run db:push       # push schema directly (dev only)
pnpm run db:studio     # open Drizzle Studio
```

## Project Layout

```
src/
  main.ts                        # entry point (port 8080)
  app.module.ts                  # root Nest module
  app.controller.ts
  app.service.ts
  config/
    env.validation.ts            # runtime env validation
  common/
    decorators/                  # @CurrentUser, etc.
    filters/                     # exception filters
    guards/                      # JWT guard, role guards
    interceptors/                # ApiResponse wrapper, requestId/requestTime
    types/                       # shared types (ApiResponse<T>, ApiResponseCode, etc.)
  db/
    schema/                      # Drizzle table definitions
    drizzle.module.ts
  modules/
    auth/                        # register, login, refresh, logout, me
    wallet/                      # balance, transactions
    transfers/                   # P2P transfers (core feature)
    payments/                    # payment flows
```

Each `modules/<feature>/` directory typically contains: `controller.ts`, `service.ts`, `module.ts`, and a `dto/` folder for request/response classes.

## API Response Contract

**Every** endpoint MUST return responses wrapped in the standard `ApiResponse<T>` structure. No raw payloads ever leave a controller.

```typescript
enum ApiResponseCode {
  Success = "SUCCESS",
  Error = "ERROR",
  NotFound = "NOT_FOUND",
  ValidationError = "VALIDATION_ERROR",
  Unauthorized = "UNAUTHORIZED",
  Forbidden = "FORBIDDEN",
  InvalidRequest = "INVALID_REQUEST",
  InternalError = "INTERNAL_ERROR",
}

interface ApiResponse<T> {
  status: {
    code: ApiResponseCode;
    message: string;
    requestId: string; // auto-generated UUID per request
    requestTime: number; // epoch ms
  };
  data: T;
  meta?: {
    // present ONLY for paginated responses
    total: number;
    limit: number;
    offset: number;
  };
}
```

A global NestJS interceptor injects `requestId` (UUID) and `requestTime` (epoch ms). Do not set these by hand.

## Money Handling

**Always store amounts in minor units as integers. Never floats.**

- INR ₹130.00 → `13000` paise
- Database columns MUST be `bigint` for monetary fields
- Use `bigint` in Drizzle column definitions (`bigint(...)` mode)
- Never use `number` / `float` / `decimal` for monetary arithmetic at runtime
- When accepting amounts from clients, convert from major units (e.g., rupees) to minor units at the validation/DTO boundary and reject fractional minor units
- Ledger entries must record `balance_before_minor` and `balance_after_minor` explicitly so the double-entry trail is auditable

## Data Model

| Table             | Key fields                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `users`           | `id`, `email`, `phone`, `password_hash`                                                                |
| `wallet_accounts` | `id`, `user_id`, `balance_minor`, `status`                                                             |
| `transfers`       | `id`, `sender_user_id`, `recipient_user_id`, `amount_minor`, `fee_minor`, `idempotency_key`            |
| `ledger_entries`  | `id`, `wallet_account_id`, `entry_type`, `amount_minor`, `balance_before_minor`, `balance_after_minor` |
| `refresh_tokens`  | `id`, `user_id`, `token_hash`, `expires_at`                                                            |

See `src/db/schema/` for the canonical Drizzle definitions and `ANDROID_BACKEND_PLAN.md` for the full spec.

## Transfer Execution Rules

Follow this order in `TransfersService.executeTransfer()`:

1. Validate auth + request schema (`Idempotency-Key` header, sender user, recipient, amount).
2. Resolve recipient by phone or `userId`.
3. Reject if `sender === recipient` (HTTP 400, `InvalidRequest`).
4. Compute fee (flat ₹2 / 200 minor units for MVP; configurable via env).
5. Open a Drizzle transaction.
6. Lock both wallets with `SELECT ... FOR UPDATE` (order wallets by id to avoid deadlocks).
7. Check sender balance >= `amount + fee`. If not, roll back and reject.
8. Insert `transfers` row with the supplied `idempotency_key`.
9. Insert matching `ledger_entries`: sender debit, recipient credit, and (if fee > 0) a fee debit on the sender.
10. Update both `wallet_accounts.balance_minor` to the post-state and write `balance_after_minor`.
11. Commit and return the transfer receipt.

**Idempotency:** the same `idempotency_key` MUST return the same receipt on retry — short-circuit by looking up `transfers.idempotency_key` before re-executing the flow. Never partially re-execute.

## Auth Rules

- Access tokens: short-lived JWTs carried in `Authorization: Bearer ...`.
- Refresh tokens: opaque, stored hashed in `refresh_tokens.token_hash` — never store raw.
- `POST /auth/logout` MUST revoke the current refresh token (`revoked_at = now()`).
- `POST /auth/refresh` issues a new access token AND rotates the refresh token (revoke old, insert new).
- `GET /auth/me` returns the current user based on the access token's subject.
- Hash passwords with `bcrypt` (cost factor ≥ 12).

## Security Requirements

- **All balance mutations** go through Drizzle transactions with row-level locks — no exceptions.
- **Hash** refresh tokens in DB (`bcrypt` or `argon2`) — never store the raw token.
- **Rate limit** `POST /auth/login` and `POST /transfers` (NestJS `@nestjs/throttler` recommended).
- **Server-side caps** on transfer amount per transaction and per day — enforce in the service, not the DTO.
- **Audit log** all auth events and every transfer attempt (success and failure) with `requestId`.
- **Never log** passwords, tokens, OTPs, or full PAN/account numbers. Mask phone numbers in logs (`+91******1234`).
- Validate every env var at boot via `src/config/env.validation.ts` — fail fast on misconfiguration.

## Code Conventions

- **Indentation/quoting**: `oxfmt`-formatted; double quotes. Run `pnpm run fmt` before committing.
- **Linting**: `pnpm run lint:fix` should leave zero warnings. Avoid patterns `oxlint` flags.
- **Module resolution**: `nodenext` with `ES2023` target (see `tsconfig.json`).
- **Decorators**: `experimentalDecorators` + `emitDecoratorMetadata` are required (NestJS DI). Do not strip them.
- **`noImplicitAny`**: `false` — but prefer explicit `unknown` over `any` in new code.
- **Naming**: kebab-case for files (`wallet.service.ts`), PascalCase for classes, camelCase for variables/functions, SCREAMING_SNAKE_CASE for env-derived constants and `ApiResponseCode` enum members.
- **DTOs**: one file per DTO, validate with `class-validator` decorators and a `@Body() dto: XxxDto` parameter in controllers.
- **Imports**: type-only imports use `import type { ... }` where it helps tree-shaking.
- **Error handling**: throw NestJS `HttpException` subclasses from services; let `common/filters/` translate to the `ApiResponse<T>` envelope.

## When Adding a Feature

1. Add a DTO in `modules/<feature>/dto/` with `class-validator` annotations.
2. Implement the service with explicit types and DB transactions for any mutation.
3. Wire the controller — return raw domain objects; the global interceptor wraps them in `ApiResponse<T>`.
4. Write a `.spec.ts` next to the unit and an e2e case in `test/` if the endpoint is public.
5. If the schema changed, run `pnpm run db:generate` and commit the migration under `drizzle/`.
6. Run `pnpm run lint:fix && pnpm run fmt && pnpm run test` before declaring done.

## Pointers

- Public-facing overview: `README.md`
- API + data model spec: `ANDROID_BACKEND_PLAN.md` (planned)
- Environment template: `.env.example`
- Docker setup: `Dockerfile`, `docker-compose.yml`
- Drizzle config: `drizzle.config.ts`
- Test config: `test/jest-e2e.json`
