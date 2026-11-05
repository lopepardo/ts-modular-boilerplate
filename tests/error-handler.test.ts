import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { errorHandler } from "../src/platform/http/errorHandler.js";
import { notFoundHandler } from "../src/platform/http/notFoundHandler.js";
import {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../src/shared/errors.js";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    traceId: string;
    details?: { path: string; message: string }[];
  };
};

const Schema = z.object({
  name: z.string().min(1),
  tags: z.array(z.object({ label: z.string() })),
});

const app = Fastify({ bodyLimit: 64 });
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);
app.get("/not-found", async () => {
  throw new NotFoundError("THING_NOT_FOUND", "Thing not found");
});
app.get("/conflict", async () => {
  throw new ConflictError("THING_CONFLICT", "Thing conflicts");
});
app.get("/unauthorized", async () => {
  throw new UnauthorizedError("AUTH_REQUIRED", "Authentication required");
});
app.get("/forbidden", async () => {
  throw new ForbiddenError("ACCESS_DENIED", "Access denied");
});
app.get("/business", async () => {
  throw new BusinessError("RULE_BROKEN", "Rule broken");
});
app.get("/boom", async () => {
  throw new Error("secret internals");
});
app.get("/stray-zod", async () => {
  // A ZodError escaping a service is a server fault, not a client error.
  return z.string().parse(42);
});
app
  .withTypeProvider<ZodTypeProvider>()
  .post("/validate", { schema: { body: Schema } }, async (request) => request.body);

const post = (payload: string, contentType = "application/json") =>
  app.inject({
    method: "POST",
    url: "/validate",
    headers: { "content-type": contentType },
    payload,
  });

describe("errorHandler", () => {
  afterAll(() => app.close());

  it("business errors carry no HTTP knowledge", () => {
    const error = new BusinessError("RULE_BROKEN", "Rule broken");
    expect(error).not.toHaveProperty("statusCode");
    expect(error.code).toBe("RULE_BROKEN");
  });

  it.each([
    ["/not-found", 404, "THING_NOT_FOUND"],
    ["/conflict", 409, "THING_CONFLICT"],
    ["/unauthorized", 401, "AUTH_REQUIRED"],
    ["/forbidden", 403, "ACCESS_DENIED"],
    ["/business", 422, "RULE_BROKEN"],
  ])("maps %s to %i", async (url, status, code) => {
    const res = await app.inject({ method: "GET", url });

    expect(res.statusCode).toBe(status);
    expect(res.json<ErrorBody>()).toEqual({
      error: {
        code,
        message: expect.any(String) as unknown,
        traceId: expect.any(String) as unknown,
      },
    });
  });

  it("returns 400 with per-field details for invalid input", async () => {
    const res = await post(JSON.stringify({ name: "", tags: [{ label: 1 }] }));

    expect(res.statusCode).toBe(400);
    const { error } = res.json<ErrorBody>();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details?.map((d) => d.path)).toEqual(["name", "tags.0.label"]);
  });

  it("returns 400 INVALID_JSON for malformed JSON", async () => {
    const res = await post("{not json");

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error.code).toBe("INVALID_JSON");
  });

  it("returns 415 for an unsupported media type", async () => {
    const res = await post("<a/>", "application/xml");

    expect(res.statusCode).toBe(415);
    expect(res.json<ErrorBody>().error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 413 when the body exceeds the limit", async () => {
    const res = await post(JSON.stringify({ name: "x".repeat(200) }));

    expect(res.statusCode).toBe(413);
    expect(res.json<ErrorBody>().error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 404 ROUTE_NOT_FOUND for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });

    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns 500 without leaking details for unknown errors", async () => {
    const res = await app.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorBody>().error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.body).not.toContain("secret internals");
  });

  it("treats a ZodError thrown outside request validation as a 500", async () => {
    const res = await app.inject({ method: "GET", url: "/stray-zod" });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorBody>().error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
