# EasyPay Backend

Android wallet API for P2P transfers, built with NestJS.

## Overview

This backend serves the EasyPay Android banking app, providing:

- User authentication (JWT with refresh tokens)
- Wallet balance management
- P2P wallet-to-wallet transfers
- Transaction history and receipts

## Tech Stack

- **Framework**: NestJS 11
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh tokens)
- **Validation**: class-validator
- **Linting**: oxlint
- **Formatting**: oxfmt
- **Package Manager**: pnpm

## Getting Started

```bash
# Install dependencies
pnpm install

# Development server (port 8080)
pnpm run start:dev

# Build for production
pnpm run build

# Run production build
pnpm run start:prod
```

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov

# Watch mode
pnpm run test:watch
```

## Code Quality

```bash
# Lint
pnpm run lint
pnpm run lint:fix

# Format
pnpm run fmt
pnpm run fmt:check
```

## API Response Format

All endpoints return responses wrapped in a standard structure:

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
    // only for paginated responses
    total: number;
    limit: number;
    offset: number;
  };
}
```

```

## Planned Endpoints

| Module    | Endpoints                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Auth      | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Wallet    | `GET /wallet/balance`, `GET /wallet/transactions`                                                    |
| Transfers | `POST /transfers`, `GET /transfers/:id`                                                              |

```

## License

[MIT License](LICENSE)
