import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { createHash } from "node:crypto";
import { catchError, firstValueFrom, of, timeout } from "rxjs";
import { AxiosError, AxiosResponse } from "axios";
import { AuthRepository } from "./auth.repository";
import { BridgeIssueResponseDto } from "./dto/bridge-issue.dto";
import type { CurrentUserData } from "@/common/decorators/current-user.decorator";

/**
 * Bridge auth — easypay-backend's role in the EasyPay ↔ glitch B2B
 * federation. We are the trusted proxy: verify the mobile's JWT,
 * compute the bridge hash, forward to glitch, relay the cookie back.
 *
 * Stateless forwarder. We never persist the cookie or any bridge
 * session state. See BRIDGE_AUTH.md for the full protocol.
 */
@Injectable()
export class BridgeIssueService {
  private readonly logger = new Logger(BridgeIssueService.name);

  private static readonly GLITCH_TIMEOUT_MS = 5000;
  private static readonly BRIDGE_PATH = "/api/auth/bridge-issue";

  constructor(
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Exchange a verified mobile JWT for a glitch session cookie.
   *
   * @throws NotFoundException — user no longer exists in DB, OR glitch
   *   reports NOT_FOUND on both login and register attempts.
   * @throws UnauthorizedException — glitch rejected the hash (security
   *   event; logged but no token/cookie/value is logged).
   * @throws ServiceUnavailableException — glitch 5xx or network error.
   */
  async issue(currentUser: CurrentUserData): Promise<BridgeIssueResponseDto> {
    // Confirm the user still exists. The JWT may be valid but the row
    // could have been deleted between issuance and this call.
    const user = await this.authRepository.findById(currentUser.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hash = this.computeHash(user.id, user.email);

    const cookie = await this.forwardToGlitch(user.id, user.email, hash, /* mode */ undefined);

    return { cookie };
  }

  // --- internals ------------------------------------------------------------

  /**
   * Per BRIDGE_AUTH.md (verbatim): `sha256(userId + email + BRIDGE_SHARED_SECRET)`.
   * No separator — both sides must use the same concatenation.
   *
   * NOTE: this is fragile to collisions if userId/email can be substrings
   * of each other. The literal spec wins; flagged in PR for glitch-side
   * coordination.
   */
  private computeHash(userId: string, email: string): string {
    const secret = this.configService.get<string>("BRIDGE_SHARED_SECRET");
    // Non-null assertion: env.validation.ts requires this var at boot.
    return createHash("sha256")
      .update(userId + email + secret)
      .digest("hex");
  }

  private get glitchBaseUrl(): string {
    const url = this.configService.get<string>("GLITCH_BASE_URL");
    // Non-null assertion: env.validation.ts requires this var at boot.
    return (url ?? "").replace(/\/$/, "");
  }

  private async forwardToGlitch(
    userId: string,
    email: string,
    hash: string,
    mode: "register" | undefined,
  ): Promise<string> {
    const body: Record<string, string> = { userId, email, hash };
    if (mode) body.mode = mode;

    const response = await firstValueFrom(
      this.httpService
        .post(`${this.glitchBaseUrl}${BridgeIssueService.BRIDGE_PATH}`, body, {
          headers: {
            "Content-Type": "application/json",
            "X-Bridge-Source": "easypay-backend",
          },
          // axios timeout in ms
          timeout: BridgeIssueService.GLITCH_TIMEOUT_MS,
          // Don't throw on any HTTP status — we want to inspect all responses.
          validateStatus: () => true,
        })
        .pipe(
          timeout({
            each: BridgeIssueService.GLITCH_TIMEOUT_MS,
            // On timeout, replace with a synthetic "no response" error
            // shape so the catchError branch below can handle uniformly.
          }),
          catchError((err: unknown) => {
            // Network error / DNS failure / axios timeout / connection reset.
            this.logger.warn(
              `bridge-issue: network error reaching glitch (${this.describeError(err)})`,
            );
            return of(this.networkErrorResponse());
          }),
        ),
    );

    return this.handleGlitchResponse(response, userId, mode);
  }

  /**
   * Map a glitch response into either a cookie string (success) or
   * a thrown NestJS exception. Implements the retry-on-NotFound logic:
   * on the first 404 we transparently retry with mode=register.
   */
  private async handleGlitchResponse(
    response: AxiosResponse,
    userId: string,
    mode: "register" | undefined,
  ): Promise<string> {
    const status = response.status;
    const envelopeCode: string | undefined = response.data?.status?.code;
    const isNotFound =
      status === 404 || envelopeCode === "NOT_FOUND" || envelopeCode === "NotFound";

    // Retry once on NotFound if we haven't already.
    if (isNotFound && !mode) {
      this.logger.log(
        `bridge-issue: glitch returned NOT_FOUND for user=${userId}; retrying with mode=register`,
      );
      const user = await this.authRepository.findById(userId);
      if (!user) {
        throw new NotFoundException("User not found");
      }
      return this.forwardToGlitch(
        user.id,
        user.email,
        this.computeHash(user.id, user.email),
        "register",
      );
    }

    // Final NotFound after retry → bubble up.
    if (isNotFound) {
      throw new NotFoundException("User not provisioned on bridge partner");
    }

    // Hash mismatch / unauthorized.
    if (status === 401 || envelopeCode === "UNAUTHORIZED" || envelopeCode === "Unauthorized") {
      // Security event. Log userId only — never the hash, the cookie,
      // or any other secret.
      this.logger.warn(
        `bridge-issue: bridge partner rejected auth for user=${userId} ` +
          `(possible secret rotation or tampering). requestId=not-bound-here`,
      );
      throw new UnauthorizedException("Bridge authentication rejected");
    }

    // Server-side / network failure.
    if (status >= 500 || status === 0) {
      this.logger.warn(`bridge-issue: bridge partner returned status=${status} for user=${userId}`);
      throw new ServiceUnavailableException("Bridge partner unavailable");
    }

    // Any other 4xx — treat as bad request but don't leak details.
    if (status >= 400) {
      this.logger.warn(
        `bridge-issue: bridge partner returned unexpected status=${status} for user=${userId}`,
      );
      throw new ServiceUnavailableException("Bridge partner returned an unexpected response");
    }

    // Success — extract the Set-Cookie header verbatim.
    const cookie = this.extractSetCookie(response);
    if (!cookie) {
      this.logger.warn(
        `bridge-issue: bridge partner returned 2xx with no Set-Cookie for user=${userId}`,
      );
      throw new ServiceUnavailableException("Bridge partner response missing session cookie");
    }
    return cookie;
  }

  /**
   * Pull the full Set-Cookie header value. Axios normalizes headers
   * to lowercase; `set-cookie` may be either a string (single cookie)
   * or an array of strings (multiple Set-Cookie headers). We relay
   * the first one — mobile clients typically expect a single
   * session cookie.
   */
  private extractSetCookie(response: AxiosResponse): string | undefined {
    const raw = response.headers?.["set-cookie"];
    if (!raw) return undefined;
    if (Array.isArray(raw)) return raw[0];
    return String(raw);
  }

  private describeError(err: unknown): string {
    if (err instanceof AxiosError) {
      return err.code ?? err.message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "unknown";
  }

  /**
   * Synthetic response shape used when the HTTP call fails before
   * reaching glitch (network error, timeout, DNS). The downstream
   * handler treats status=0 as "service unavailable".
   */
  private networkErrorResponse(): AxiosResponse {
    return {
      status: 0,
      data: undefined,
      // Minimal fields to satisfy AxiosResponse typing.
      statusText: "",
      headers: {},
      config: {} as never,
    };
  }
}
