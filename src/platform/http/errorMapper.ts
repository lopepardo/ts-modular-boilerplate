import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

import {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors.js";

export type ErrorDetail = { path: string; message: string };

export type ErrorResponse = {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
};

/**
 * Fastify client errors we expose, with a stable code and a safe message.
 *
 * TODO: map the remaining Fastify 4xx codes (today they fall back to a generic
 * 4xx BAD_REQUEST): FST_ERR_CTP_INVALID_CONTENT_LENGTH (400), FST_ERR_BAD_URL
 * (400), FST_ERR_MAX_PARAM_LENGTH (414). Also 5xx such as
 * FST_ERR_HANDLER_TIMEOUT (503) currently collapse into a 500, and plugin
 * errors (e.g. @fastify/rate-limit 429) will need entries when added.
 */
const FASTIFY_CLIENT_ERRORS: Record<string, ErrorResponse> = {
  FST_ERR_CTP_INVALID_JSON_BODY: {
    status: 400,
    code: "INVALID_JSON",
    message: "Request body is not valid JSON",
  },
  FST_ERR_CTP_EMPTY_JSON_BODY: {
    status: 400,
    code: "INVALID_JSON",
    message: "Request body is empty",
  },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: {
    status: 415,
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Unsupported media type",
  },
  FST_ERR_CTP_BODY_TOO_LARGE: {
    status: 413,
    code: "PAYLOAD_TOO_LARGE",
    message: "Request body is too large",
  },
};

const INTERNAL: ErrorResponse = {
  status: 500,
  code: "INTERNAL_SERVER_ERROR",
  message: "Unexpected server error",
};

const businessStatus = (error: BusinessError): number => {
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 422;
};

const readFastifyError = (error: unknown): { code?: string; statusCode?: number } => {
  if (typeof error !== "object" || error === null) return {};
  const { code, statusCode } = error as Record<string, unknown>;
  return {
    ...(typeof code === "string" && { code }),
    ...(typeof statusCode === "number" && { statusCode }),
  };
};

/** Pure: turns anything that was thrown into the public error contract. */
export const toErrorResponse = (error: unknown): ErrorResponse => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: error.validation.map((issue) => ({
        // "/tags/0/label" -> "tags.0.label"
        path: issue.instancePath.replace(/^\//, "").split("/").join("."),
        message: issue.message ?? "Invalid value",
      })),
    };
  }

  if (error instanceof BusinessError) {
    return {
      status: businessStatus(error),
      code: error.code,
      message: error.message,
    };
  }

  const { code, statusCode } = readFastifyError(error);
  if (code !== undefined) {
    const known = FASTIFY_CLIENT_ERRORS[code];
    if (known) return known;
  }
  // Unknown 4xx: keep the status but never echo the library's message.
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return {
      status: statusCode,
      code: "BAD_REQUEST",
      message: "The request could not be processed",
    };
  }

  return INTERNAL;
};
