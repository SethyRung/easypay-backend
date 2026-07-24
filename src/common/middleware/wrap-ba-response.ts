import { v4 as uuidv4 } from 'uuid';
import { ApiResponseCode } from '@/common/types/api-response';

type BaMiddleware = (
  req: any,
  res: any,
  next: (error?: unknown) => void,
) => void | Promise<void>;

const HTTP_TO_API_CODE: Record<number, ApiResponseCode> = {
  400: ApiResponseCode.InvalidRequest,
  401: ApiResponseCode.Unauthorized,
  403: ApiResponseCode.Forbidden,
  404: ApiResponseCode.NotFound,
  409: ApiResponseCode.Error,
  422: ApiResponseCode.ValidationError,
  429: ApiResponseCode.Error,
};

function mapHttpToApiCode(status: number): ApiResponseCode {
  return HTTP_TO_API_CODE[status] ?? ApiResponseCode.InternalError;
}

function asBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  if (typeof chunk === 'string') return Buffer.from(chunk, 'utf-8');
  return Buffer.from(String(chunk), 'utf-8');
}

/**
 * Better-auth's `setResponse` (better-call) writes via res.writeHead + res.write(Unit8Array) +
 * res.end directly — bypassing res.json / res.send entirely. It passes Uint8Array chunks from
 * a ReadableStream reader. To wrap the body we defer writeHead until end() so we can rewrite
 * the body and status together.
 */
export const wrapBaResponseMiddleware: BaMiddleware = (req, res, next) => {
  const originalWriteHead = res.writeHead.bind(res);
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  let isIntercepting = true;
  let interceptedStatus = 200;
  const bufferedChunks: Buffer[] = [];

  res.writeHead = function (statusCode: number, ...rest: unknown[]) {
    if (isIntercepting) {
      interceptedStatus = statusCode;
      return res;
    }
    return originalWriteHead.call(this, statusCode, ...rest);
  };

  res.write = function (chunk: unknown, ...args: unknown[]): boolean {
    if (isIntercepting && chunk != null) {
      bufferedChunks.push(asBuffer(chunk));
      return true;
    }
    return originalWrite.call(this, chunk as Buffer | string, ...(args as []));
  };

  res.end = function (chunk?: unknown, ...args: unknown[]): unknown {
    if (!isIntercepting) {
      return originalEnd.call(this, chunk as Buffer | string, ...(args as []));
    }

    if (chunk != null) {
      bufferedChunks.push(asBuffer(chunk));
    }

    const originalBody = Buffer.concat(bufferedChunks).toString('utf-8');
    let bodyToWrite = originalBody;
    let responseStatus = 200;

    try {
      const parsed = originalBody.length > 0 ? JSON.parse(originalBody) : null;

      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        parsed.status &&
        typeof parsed.status === 'object' &&
        'requestId' in parsed.status
      ) {
        bodyToWrite = originalBody;
        responseStatus = interceptedStatus;
      } else {
        const isError = interceptedStatus >= 400;
        const code = isError
          ? mapHttpToApiCode(interceptedStatus)
          : ApiResponseCode.Success;
        let message: string;
        let data: unknown;

        if (isError) {
          const maybeMessage =
            parsed !== null && typeof parsed === 'object' && 'message' in parsed
              ? (parsed as { message: unknown }).message
              : undefined;
          message = typeof maybeMessage === 'string' ? maybeMessage : code;
          data = null;
        } else {
          message = 'Success';
          data = parsed;
        }

        bodyToWrite = JSON.stringify({
          status: {
            code,
            message,
            requestId: uuidv4(),
            requestTime: Date.now(),
          },
          data,
        });
        responseStatus = 200;
      }
    } catch {
      bodyToWrite = originalBody;
      responseStatus = interceptedStatus;
    }

    res.removeHeader('content-length');
    res.removeHeader('transfer-encoding');
    res.setHeader('Content-Length', Buffer.byteLength(bodyToWrite, 'utf-8'));
    res.setHeader('Content-Type', 'application/json');

    isIntercepting = false;
    bufferedChunks.length = 0;

    originalWriteHead.call(res, responseStatus);
    return originalEnd.call(res, bodyToWrite, 'utf-8');
  };

  next();
};
