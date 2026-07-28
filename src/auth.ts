import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import * as bcrypt from 'bcrypt';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';

const BCRYPT_COST = 12;
const ONE_DAY_SECONDS = 60 * 60 * 24;
const FIVE_MINUTES_SECONDS = 60 * 5;

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;
const isProd = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN || '*';

const url = process.env.DATABASE_URL ?? '';
const client = postgres(url, { max: 10 });
const db = drizzle(client, { schema });

function logMockEmail(label: string, to: string, url: string): void {
  console.log(`\n[mock email] ${label}\n  to: ${to}\n  link: ${url}\n`);
}

export const auth = betterAuth({
  appName: 'EasyPay',
  secret,
  baseURL,
  database: drizzleAdapter(db, { provider: 'pg' }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: (password: string) => bcrypt.hash(password, BCRYPT_COST),
      verify: ({ password, hash }: { password: string; hash: string }) =>
        bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      logMockEmail('Password reset', user.email, url);
    },
    requireEmailVerification: false,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      logMockEmail('Verify your email', user.email, url);
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },

  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },

  advanced: {
    cookiePrefix: 'easypay',
    useSecureCookies: isProd,
  },

  session: {
    expiresIn: ONE_DAY_SECONDS * 7,
    updateAge: ONE_DAY_SECONDS,
    cookieCache: {
      enabled: true,
      maxAge: FIVE_MINUTES_SECONDS,
    },
  },

  trustedOrigins: (() => {
    if (corsOrigin === '*') return [];
    return corsOrigin
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  })(),

  plugins: [bearer()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
