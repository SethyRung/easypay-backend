import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { BridgeIssueService } from './bridge.service';
import { BridgeUserRepository } from './bridge-user.repository';
import { ApiResponseCode } from '@/common/types/api-response';

const TICKET =
  'eyJzdWIiOiJ1c2VyXzEyMyIsImp0aSI6ImFiY2RlZmdoaWprbG1ub3BxcnN0IiwiZXhwIjoxNzI4OTAwMH0=.O8cDzEqXKn3f5Q7v8m2pL9wY4xC6zB0aH1jR5sV3uD4';

function makeResponse(status: number, body: unknown): AxiosResponse {
  return {
    status,
    data: body,
    statusText: '',
    headers: {},
    config: {} as never,
  };
}

describe('BridgeIssueService.issue', () => {
  let service: BridgeIssueService;
  let bridgeUserRepository: jest.Mocked<BridgeUserRepository>;
  let httpService: { post: jest.Mock };
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    bridgeUserRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<BridgeUserRepository>;
    bridgeUserRepository.findById.mockResolvedValue({
      id: 'user-1',
      name: 'User One',
      email: 'user-1@example.com',
    });

    httpService = { post: jest.fn() };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'BRIDGE_SHARED_SECRET') return 'test-shared-secret';
        if (key === 'GLITCH_BASE_URL') return 'https://glitch.example.com';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new BridgeIssueService(
      configService,
      bridgeUserRepository,
      httpService as unknown as HttpService,
    );
  });

  it('happy path: 200 envelope with ticket → returns { ticket }', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: { ticket: TICKET },
        }),
      ),
    );

    const result = await service.issue('user-1');

    expect(result).toEqual({ ticket: TICKET });
    expect(httpService.post).toHaveBeenCalledTimes(1);
    const [url, body] = httpService.post.mock.calls[0];
    expect(url).toBe('https://glitch.example.com/api/bridge/issue');
    expect(body).toEqual({
      userId: 'user-1',
      name: 'User One',
      email: 'user-1@example.com',
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it('name is present in the body forwarded to glitch', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: { ticket: TICKET },
        }),
      ),
    );

    await service.issue('user-1');

    const [, body] = httpService.post.mock.calls[0];
    expect(body).toMatchObject({ name: 'User One' });
  });

  it('hash differs when name differs (proves name is in the digest)', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: { ticket: TICKET },
        }),
      ),
    );

    await service.issue('user-1');
    const hashWithOriginalName = httpService.post.mock.calls[0][1]
      .hash as string;

    bridgeUserRepository.findById.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Different Name',
      email: 'user-1@example.com',
    });

    await service.issue('user-1');
    const hashWithDifferentName = httpService.post.mock.calls[1][1]
      .hash as string;

    expect(hashWithDifferentName).not.toEqual(hashWithOriginalName);
  });

  it('local user not found → throws NotFoundException without calling glitch', async () => {
    bridgeUserRepository.findById.mockResolvedValue(undefined);

    await expect(service.issue('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('401 from glitch → throws UnauthorizedException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(401, {
          status: { code: ApiResponseCode.Unauthorized, message: 'bad hash' },
        }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('UNAUTHORIZED envelope code without 401 → throws UnauthorizedException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Unauthorized, message: 'rejected' },
        }) as AxiosResponse,
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('404 from glitch → throws NotFoundException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(404, {
          status: { code: ApiResponseCode.NotFound, message: 'user missing' },
        }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'User not provisioned on bridge partner',
    );
  });

  it('NOT_FOUND envelope code without 404 → throws NotFoundException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.NotFound, message: 'no user' },
        }) as AxiosResponse,
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('5xx from glitch → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      of(makeResponse(503, { status: { code: ApiResponseCode.Error } })),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner unavailable',
    );
  });

  it('network failure → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('4xx (non-401, non-404) → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(422, { status: { code: ApiResponseCode.InvalidRequest } }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner returned an unexpected response',
    );
  });

  it('200 envelope without data.ticket → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: {},
        }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner response missing ticket',
    );
  });

  it('200 envelope with empty-string ticket → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: { ticket: '' },
        }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('200 envelope with non-string ticket → throws ServiceUnavailableException', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: { code: ApiResponseCode.Success },
          data: { ticket: 12345 },
        }) as AxiosResponse,
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("200 + INVALID_REQUEST envelope with message → surfaces glitch's cause in a 503", async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: {
            code: ApiResponseCode.InvalidRequest,
            message: 'hash mismatch',
          },
        }) as AxiosResponse,
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner rejected request',
    );
    await expect(service.issue('user-1')).rejects.toThrow('hash mismatch');
  });

  it('200 + INVALID_REQUEST envelope without message → 503 with default text', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, { status: { code: ApiResponseCode.InvalidRequest } }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner rejected request',
    );
  });

  it("200 + INTERNAL_ERROR envelope with message → surfaces glitch's cause in a 503", async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, {
          status: {
            code: ApiResponseCode.InternalError,
            message: 'user upsert failed',
          },
        }) as AxiosResponse,
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner internal error',
    );
    await expect(service.issue('user-1')).rejects.toThrow('user upsert failed');
  });

  it('200 + INTERNAL_ERROR envelope without message → 503 with default text', async () => {
    httpService.post.mockReturnValue(
      of(
        makeResponse(200, { status: { code: ApiResponseCode.InternalError } }),
      ),
    );

    await expect(service.issue('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.issue('user-1')).rejects.toThrow(
      'Bridge partner internal error',
    );
  });
});
