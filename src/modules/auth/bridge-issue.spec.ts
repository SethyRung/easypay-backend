import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { AxiosError } from "axios";
import { BridgeIssueService } from "./bridge-issue";
import { AuthRepository } from "./auth.repository";
import type { CurrentUserData } from "@/common/decorators/current-user.decorator";
import { validateEnv } from "@/config/env.validation";

/**
 * Verification matrix (mirrors BRIDGE_AUTH.md):
 *   - happy path: valid hash on glitch → cookie relayed back
 *   - NotFound → retry with mode=register succeeds
 *   - NotFound → retry still NotFound → 404
 *   - InvalidRequest (401) → 401
 *   - glitch 5xx → 503
 *   - network error → 503
 *   - missing user in DB → 404
 *   - missing BRIDGE_SHARED_SECRET at startup → fail-fast
 */
describe("BridgeIssueService", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const email = "user@example.com";
  const currentUser: CurrentUserData = { userId, email };
  const sharedSecret = "x".repeat(48); // ≥32 chars
  const glitchBaseUrl = "http://glitch.test";
  const fakeCookie = "session=abc.def.ghi; Path=/; HttpOnly; SameSite=Lax";

  let service: BridgeIssueService;
  let httpPost: jest.Mock;
  let authRepo: { findById: jest.Mock };

  /**
   * Test module factory. Pass `dbUser: null` to simulate "user missing
   * from DB"; omit or pass a user object for the default user.
   *
   * `httpResponse` controls the HttpService.post() observable:
   *   - "ok": resolves with an AxiosResponse (use for 2xx and 4xx since
   *     the service uses axios `validateStatus: () => true`)
   *   - "axios-error": rejects with an AxiosError (real network failure
   *     that axios surfaces as a thrown error)
   *   - "throw": rejects with any error (non-axios errors)
   */
  async function buildModule(opts: {
    dbUser?: { id: string; email: string } | null;
    httpResponse?:
      | {
          kind: "ok";
          status: number;
          data?: unknown;
          setCookie?: string | string[];
        }
      | { kind: "axios-error"; status: number; data?: unknown }
      | { kind: "throw"; error: Error };
  }) {
    authRepo = { findById: jest.fn() };
    authRepo.findById.mockImplementation(() =>
      Promise.resolve(opts.dbUser === null ? null : (opts.dbUser ?? { id: userId, email })),
    );

    httpPost = jest.fn();
    if (opts.httpResponse) {
      switch (opts.httpResponse.kind) {
        case "ok": {
          const headers = opts.httpResponse.setCookie
            ? { "set-cookie": opts.httpResponse.setCookie }
            : {};
          httpPost.mockReturnValue(
            of({
              status: opts.httpResponse.status,
              data: opts.httpResponse.data ?? {},
              headers,
              statusText: "",
              config: {} as never,
            } as never),
          );
          break;
        }
        case "axios-error": {
          const err = new AxiosError(
            "Request failed",
            String(opts.httpResponse.status),
            {} as never,
            {},
            {
              status: opts.httpResponse.status,
              data: opts.httpResponse.data ?? {},
              headers: {},
              statusText: "",
              config: {} as never,
            } as never,
          );
          httpPost.mockReturnValue(throwError(() => err));
          break;
        }
        case "throw": {
          // Narrow through a local const — TS doesn't always carry
          // discriminated-union narrowing across the double access.
          const throwResp = opts.httpResponse;
          httpPost.mockReturnValue(
            throwError(() =>
              throwResp.kind === "throw" ? throwResp.error : new Error("unreachable"),
            ),
          );
          break;
        }
      }
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              BRIDGE_SHARED_SECRET: sharedSecret,
              GLITCH_BASE_URL: glitchBaseUrl,
            }),
          ],
        }),
      ],
      providers: [
        BridgeIssueService,
        { provide: AuthRepository, useValue: authRepo },
        { provide: HttpService, useValue: { post: httpPost } },
      ],
    }).compile();

    service = moduleRef.get(BridgeIssueService);
  }

  // ---------- happy path ---------------------------------------------------

  it("happy path: 2xx + Set-Cookie → relays the cookie to mobile", async () => {
    await buildModule({
      httpResponse: { kind: "ok", status: 200, setCookie: fakeCookie },
    });

    const result = await service.issue(currentUser);

    expect(result).toEqual({ cookie: fakeCookie });
    expect(httpPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = httpPost.mock.calls[0];
    expect(url).toBe(`${glitchBaseUrl}/api/auth/bridge-issue`);
    expect(body).toMatchObject({ userId, email });
    expect(body.hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(body.mode).toBeUndefined(); // no retry yet
    expect(config.headers["X-Bridge-Source"]).toBe("easypay-backend");
    expect(config.timeout).toBe(5000);
  });

  // ---------- NotFound → retry ---------------------------------------------

  it("NotFound then success on retry: returns the cookie from the retry", async () => {
    httpPost = jest
      .fn()
      .mockReturnValueOnce(
        of({
          status: 404,
          data: { status: { code: "NOT_FOUND" } },
          headers: {},
          statusText: "",
          config: {} as never,
        } as never),
      )
      .mockReturnValueOnce(
        of({
          status: 200,
          headers: { "set-cookie": fakeCookie },
          data: {},
          statusText: "",
          config: {} as never,
        } as never),
      );

    authRepo = { findById: jest.fn().mockResolvedValue({ id: userId, email }) };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              BRIDGE_SHARED_SECRET: sharedSecret,
              GLITCH_BASE_URL: glitchBaseUrl,
            }),
          ],
        }),
      ],
      providers: [
        BridgeIssueService,
        { provide: AuthRepository, useValue: authRepo },
        { provide: HttpService, useValue: { post: httpPost } },
      ],
    }).compile();
    service = moduleRef.get(BridgeIssueService);

    const result = await service.issue(currentUser);

    expect(result).toEqual({ cookie: fakeCookie });
    expect(httpPost).toHaveBeenCalledTimes(2);
    expect(httpPost.mock.calls[0][0]).toBe(`${glitchBaseUrl}/api/auth/bridge-issue`);
    expect(httpPost.mock.calls[0][1].mode).toBeUndefined();
    expect(httpPost.mock.calls[1][1].mode).toBe("register");
  });

  it("NotFound on both attempts: throws NotFoundException", async () => {
    await buildModule({
      httpResponse: { kind: "ok", status: 404, data: { status: { code: "NOT_FOUND" } } },
    });

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(httpPost).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  // ---------- Unauthorized / hash mismatch ---------------------------------

  it("glitch 401 (hash mismatch): throws UnauthorizedException, no retry", async () => {
    // The service uses axios `validateStatus: () => true`, so a 401
    // arrives as a normal response — not as an axios rejection.
    await buildModule({
      httpResponse: {
        kind: "ok",
        status: 401,
        data: { status: { code: "UNAUTHORIZED" } },
      },
    });

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(httpPost).toHaveBeenCalledTimes(1); // no retry on auth failure
  });

  // ---------- 5xx / network errors -----------------------------------------

  it("glitch 5xx: throws ServiceUnavailableException", async () => {
    await buildModule({ httpResponse: { kind: "ok", status: 503 } });

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("network error (axios throws with no response): throws ServiceUnavailableException", async () => {
    await buildModule({
      httpResponse: { kind: "throw", error: new Error("ECONNREFUSED") },
    });

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("glitch 2xx but no Set-Cookie: throws ServiceUnavailableException", async () => {
    await buildModule({ httpResponse: { kind: "ok", status: 200 } }); // no set-cookie header

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  // ---------- missing user in DB -------------------------------------------

  it("user missing from DB: throws NotFoundException before forwarding", async () => {
    await buildModule({ dbUser: null, httpResponse: { kind: "ok", status: 200 } });

    await expect(service.issue(currentUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(httpPost).not.toHaveBeenCalled(); // never reached glitch
  });
});

/**
 * The fail-fast on missing bridge env vars lives in env.validation.ts
 * and is exercised at boot. We assert it here so a regression in the
 * schema is caught by `pnpm test`.
 */
describe("env.validation — bridge secrets", () => {
  const baseValid = {
    JWT_ACCESS_SECRET: "x".repeat(48),
    JWT_REFRESH_SECRET: "x".repeat(48),
  };

  // validateEnv prints a noisy treeified error on failure; silence it
  // for the negative-path assertions so the test output stays readable.
  let errSpy: jest.SpyInstance;
  beforeAll(() => {
    errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterAll(() => {
    errSpy.mockRestore();
  });

  it("rejects when BRIDGE_SHARED_SECRET is missing or too short", () => {
    expect(() => validateEnv({ ...baseValid, GLITCH_BASE_URL: "http://glitch.test" })).toThrow(
      "Invalid environment variables",
    );

    expect(() =>
      validateEnv({
        ...baseValid,
        BRIDGE_SHARED_SECRET: "short",
        GLITCH_BASE_URL: "http://glitch.test",
      }),
    ).toThrow("Invalid environment variables");
  });

  it("rejects when GLITCH_BASE_URL is missing or not a URL", () => {
    expect(() => validateEnv({ ...baseValid, BRIDGE_SHARED_SECRET: "x".repeat(48) })).toThrow(
      "Invalid environment variables",
    );

    expect(() =>
      validateEnv({
        ...baseValid,
        BRIDGE_SHARED_SECRET: "x".repeat(48),
        GLITCH_BASE_URL: "not-a-url",
      }),
    ).toThrow("Invalid environment variables");
  });

  it("accepts a valid config", () => {
    const env = validateEnv({
      ...baseValid,
      BRIDGE_SHARED_SECRET: "x".repeat(48),
      GLITCH_BASE_URL: "http://glitch.test",
    });
    expect(env.BRIDGE_SHARED_SECRET).toHaveLength(48);
    expect(env.GLITCH_BASE_URL).toBe("http://glitch.test");
  });
});
