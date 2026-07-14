import type { OpenAPIObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const SIGN_UP_REQUEST_SCHEMA = {
  type: "object",
  required: ["email", "password", "name", "phone"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8, maxLength: 128 },
    name: { type: "string" },
    phone: { type: "string" },
  },
};

const SIGN_IN_REQUEST_SCHEMA = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string" },
  },
};

const FORGET_PASSWORD_REQUEST_SCHEMA = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", format: "email" },
    redirectTo: { type: "string" },
  },
};

const RESET_PASSWORD_REQUEST_SCHEMA = {
  type: "object",
  required: ["newPassword", "token"],
  properties: {
    newPassword: { type: "string", minLength: 8 },
    token: { type: "string" },
  },
};

const USER_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
    name: { type: "string" },
    emailVerified: { type: "boolean" },
    image: { type: "string", nullable: true },
    phone: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const AUTH_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    token: { type: "string" },
    user: USER_SCHEMA,
  },
};

const SESSION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    user: USER_SCHEMA,
    session: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        token: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        ipAddress: { type: "string", nullable: true },
        userAgent: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  },
};

const SET_AUTH_TOKEN_HEADER = {
  description: "Bearer token. Send as `Authorization: Bearer <token>` on subsequent requests.",
  schema: { type: "string" },
};

const BEARER_SECURITY = [{ bearer: [] }];

export function appendAuthPaths(doc: OpenAPIObject): void {
  doc.paths = doc.paths ?? {};
  doc.tags = doc.tags ?? [];
  doc.components = doc.components ?? {};
  doc.components.schemas = doc.components.schemas ?? {};

  doc.tags.push({
    name: "auth",
    description: "Better-auth sessions — sign-up, sign-in, session, password reset",
  });

  Object.assign(doc.components.schemas, {
    SignUpRequest: SIGN_UP_REQUEST_SCHEMA,
    SignInRequest: SIGN_IN_REQUEST_SCHEMA,
    ForgetPasswordRequest: FORGET_PASSWORD_REQUEST_SCHEMA,
    ResetPasswordRequest: RESET_PASSWORD_REQUEST_SCHEMA,
    User: USER_SCHEMA,
    AuthResponse: AUTH_RESPONSE_SCHEMA,
    SessionResponse: SESSION_RESPONSE_SCHEMA,
  });

  Object.assign(doc.paths, {
    "/api/auth/ok": {
      get: {
        tags: ["auth"],
        summary: "Health check",
        description: "Returns `{ ok: true }` if BA is reachable. No auth required.",
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["auth"],
        summary: "Sign up with email + password",
        description:
          "Creates a new user and issues a session. `phone` is required. Session token returned in the `Set-Auth-Token` response header.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SignUpRequest" } },
          },
        },
        responses: {
          "200": {
            description: "User created and signed in",
            headers: { "Set-Auth-Token": SET_AUTH_TOKEN_HEADER },
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "422": {
            description: "Validation error (missing field, weak password, duplicate email/phone)",
          },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["auth"],
        summary: "Sign in with email + password",
        description: "Issues a session token in the `Set-Auth-Token` response header.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SignInRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Signed in",
            headers: { "Set-Auth-Token": SET_AUTH_TOKEN_HEADER },
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["auth"],
        summary: "Sign out",
        description: "Revokes the current session. Requires the bearer token.",
        security: BEARER_SECURITY,
        responses: { "200": { description: "Signed out" } },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["auth"],
        summary: "Get current session",
        description:
          "Returns `{ user, session }` if a valid bearer token is provided; otherwise `null`.",
        security: BEARER_SECURITY,
        responses: {
          "200": {
            description: "Session found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } },
            },
          },
          "401": { description: "No session" },
        },
      },
    },
    "/api/auth/forget-password": {
      post: {
        tags: ["auth"],
        summary: "Request a password-reset email",
        description:
          "Triggers the `sendResetPassword` hook. In dev the reset URL is logged via `logMockEmail`.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ForgetPasswordRequest" } },
          },
        },
        responses: { "200": { description: "Reset email queued" } },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["auth"],
        summary: "Reset password using a one-time token",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordRequest" } },
          },
        },
        responses: {
          "200": { description: "Password reset" },
          "400": { description: "Invalid or expired token" },
        },
      },
    },
  });
}
