import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ApiResponseCode } from "../types/api-response";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = uuidv4();
    const requestTime = Date.now();

    let message = "Internal server error";
    let code = ApiResponseCode.InternalError;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      message = exception.message;

      if (status === HttpStatus.BAD_REQUEST) {
        const exceptionResponse = exception.getResponse();
        if (typeof exceptionResponse === "object" && "message" in exceptionResponse) {
          message = Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(", ")
            : message;
        }
        code = ApiResponseCode.ValidationError;
      } else {
        code = this.getErrorCode(status);
      }
    }

    response.status(HttpStatus.OK).json({
      status: {
        code,
        message,
        requestId,
        requestTime,
      },
      data: null,
    });
  }

  private getErrorCode(status: number): ApiResponseCode {
    switch (status) {
      case 400:
        return ApiResponseCode.InvalidRequest;
      case 401:
        return ApiResponseCode.Unauthorized;
      case 403:
        return ApiResponseCode.Forbidden;
      case 404:
        return ApiResponseCode.NotFound;
      case 422:
        return ApiResponseCode.ValidationError;
      default:
        return ApiResponseCode.InternalError;
    }
  }
}
