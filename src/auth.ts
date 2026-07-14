import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as bcrypt from "bcrypt";
import { db } from "@/db";

const BCRYPT_COST = 12;
const ONE_DAY_SECONDS = 60 * 60 * 24;
const FIVE_MINUTES_SECONDS = 60 * 5;

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is required and must be at least 32 characters");
}
if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is required (e.g. http://localhost:8080)");
}

const isProd = process.env.NODE_ENV === "production";

function logMockEmail(label: string, to: string, url: string): void {
  console.log(`\n[mock email] ${label}\n  to: ${to}\n  link: ${url}\n`);
}

export const auth = betterAuth({
  appName: "EasyPay",
  secret,
  baseURL,
  database: drizzleAdapter(db, { provider: "pg" }),

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
      logMockEmail("Password reset", user.email, url);
    },
    requireEmailVerification: false,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      logMockEmail("Verify your email", user.email, url);
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
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  advanced: {
    cookiePrefix: "easypay",
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
    const raw = process.env.CORS_ORIGIN;
    if (!raw || raw === "*") return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  })(),
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
