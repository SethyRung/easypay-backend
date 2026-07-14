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
import { BridgeUserRepository } from "./bridge-user.repository";
import { BridgeIssueResponseDto } from "./dto/bridge-issue-response.dto";

const GLITCH_TIMEOUT_MS = 5000;
const BRIDGE_PATH = "/api/auth/bridge-issue";

@Injectable()
export class BridgeIssueService {
  private readonly logger = new Logger(BridgeIssueService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly bridgeUserRepository: BridgeUserRepository,
    private readonly httpService: HttpService,
  ) {}

  async issue(userId: string): Promise<BridgeIssueResponseDto> {
    const user = await this.bridgeUserRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hash = this.computeHash(user.id, user.email);
    const cookie = await this.forwardToGlitch(user.id, user.email, hash, undefined);
    return { cookie };
  }

  private computeHash(userId: string, email: string): string {
    const secret = this.configService.get<string>("BRIDGE_SHARED_SECRET");

    return createHash("sha256")
      .update(userId + email + secret)
      .digest("hex");
  }

  private get glitchBaseUrl(): string {
    const url = this.configService.get<string>("GLITCH_BASE_URL");
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
        .post(`${this.glitchBaseUrl}${BRIDGE_PATH}`, body, {
          headers: {
            "Content-Type": "application/json",
            "X-Bridge-Source": "easypay-backend",
          },
          timeout: GLITCH_TIMEOUT_MS,
          validateStatus: () => true,
        })
        .pipe(
          timeout({ each: GLITCH_TIMEOUT_MS }),
          catchError((err: unknown) => {
            this.logger.warn(
              `bridge-issue: network error reaching glitch (${this.describeError(err)})`,
            );
            return of(this.networkErrorResponse());
          }),
        ),
    );

    return this.handleGlitchResponse(response, userId, mode);
  }

  private async handleGlitchResponse(
    response: AxiosResponse,
    userId: string,
    mode: "register" | undefined,
  ): Promise<string> {
    const status = response.status;
    const envelopeCode: string | undefined = response.data?.status?.code;
    const isNotFound =
      status === 404 || envelopeCode === "NOT_FOUND" || envelopeCode === "NotFound";

    if (isNotFound && !mode) {
      this.logger.log(
        `bridge-issue: glitch returned NOT_FOUND for user=${userId}; retrying with mode=register`,
      );
      const user = await this.bridgeUserRepository.findById(userId);
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

    if (isNotFound) {
      throw new NotFoundException("User not provisioned on bridge partner");
    }

    if (status === 401 || envelopeCode === "UNAUTHORIZED" || envelopeCode === "Unauthorized") {
      this.logger.warn(
        `bridge-issue: bridge partner rejected auth for user=${userId} ` +
          `(possible secret rotation or tampering). requestId=not-bound-here`,
      );
      throw new UnauthorizedException("Bridge authentication rejected");
    }

    if (status >= 500 || status === 0) {
      this.logger.warn(`bridge-issue: bridge partner returned status=${status} for user=${userId}`);
      throw new ServiceUnavailableException("Bridge partner unavailable");
    }

    if (status >= 400) {
      this.logger.warn(
        `bridge-issue: bridge partner returned unexpected status=${status} for user=${userId}`,
      );
      throw new ServiceUnavailableException("Bridge partner returned an unexpected response");
    }

    const cookie = this.extractSetCookie(response);
    if (!cookie) {
      this.logger.warn(
        `bridge-issue: bridge partner returned 2xx with no Set-Cookie for user=${userId}`,
      );
      throw new ServiceUnavailableException("Bridge partner response missing session cookie");
    }
    return cookie;
  }

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

  private networkErrorResponse(): AxiosResponse {
    return {
      status: 0,
      data: undefined,
      statusText: "",
      headers: {},
      config: {} as never,
    };
  }
}
