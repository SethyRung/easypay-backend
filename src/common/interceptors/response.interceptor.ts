import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";
import { ApiResponseCode } from "../types/api-response";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestId = uuidv4();
    const requestTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === "object" && "status" in data && "requestId" in data.status) {
          return data;
        }

        return {
          status: {
            code: ApiResponseCode.Success,
            message: "Success",
            requestId,
            requestTime,
          },
          data,
        };
      }),
    );
  }
}
