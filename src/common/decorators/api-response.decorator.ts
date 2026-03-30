import { Type, applyDecorators } from "@nestjs/common";
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseCode } from "../types/api-response";

// Helper to check if type is a primitive constructor
const isPrimitiveType = (type: any): boolean => {
  return type === String || type === Number || type === Boolean || type === Date;
};

// Get schema for primitive types
const getPrimitiveSchema = (type: any) => {
  if (type === String) return { type: "string", example: "pong" };
  if (type === Number) return { type: "number", example: 0 };
  if (type === Boolean) return { type: "boolean", example: true };
  if (type === Date)
    return { type: "string", format: "date-time", example: new Date().toISOString() };
  return { type: "string" };
};

export const ApiOkResponseWrapper = <DataDto extends Type<any>>(dataDto: DataDto) => {
  if (isPrimitiveType(dataDto)) {
    return applyDecorators(
      ApiOkResponse({
        schema: {
          properties: {
            status: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  enum: Object.values(ApiResponseCode),
                  example: ApiResponseCode.Success,
                },
                message: { type: "string", example: "Success" },
                requestId: {
                  type: "string",
                  format: "uuid",
                  example: "550e8400-e29b-41d4-a716-446655440000",
                },
                requestTime: { type: "number", example: 1774426801182 },
              },
            },
            data: getPrimitiveSchema(dataDto),
          },
        },
      }),
    );
  }

  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiOkResponse({
      schema: {
        properties: {
          status: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: Object.values(ApiResponseCode),
                example: ApiResponseCode.Success,
              },
              message: { type: "string", example: "Success" },
              requestId: {
                type: "string",
                format: "uuid",
                example: "550e8400-e29b-41d4-a716-446655440000",
              },
              requestTime: { type: "number", example: 1774426801182 },
            },
          },
          data: {
            $ref: getSchemaPath(dataDto),
          },
        },
      },
    }),
  );
};

export const ApiOkResponsePaginated = <DataDto extends Type<any>>(dataDto: DataDto) => {
  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiOkResponse({
      schema: {
        properties: {
          status: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: Object.values(ApiResponseCode),
                example: ApiResponseCode.Success,
              },
              message: { type: "string", example: "Success" },
              requestId: {
                type: "string",
                format: "uuid",
                example: "550e8400-e29b-41d4-a716-446655440000",
              },
              requestTime: { type: "number", example: 1774426801182 },
            },
          },
          data: {
            type: "array",
            items: { $ref: getSchemaPath(dataDto) },
          },
          meta: {
            type: "object",
            properties: {
              total: { type: "number", example: 100 },
              limit: { type: "number", example: 10 },
              offset: { type: "number", example: 0 },
            },
          },
        },
      },
    }),
  );
};
