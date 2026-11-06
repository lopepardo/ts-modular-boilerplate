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
    details?: { in: string; path: string; message: string }[];
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
app
  .withTypeProvider<ZodTypeProvider>()
  .post("/validate", { schema: { body: Schema } }, async (request) => request.body);
const PublicSchema = z.object({ id: z.string() });
const typed = app.withTypeProvider<ZodTypeProvider>();
typed.get(
  "/strips-extra-fields",
  { schema: { response: { 200: PublicSchema } } },
  // Cast: the compiler would reject this, which is exactly what we simulate
  // (a handler that bypasses the presenter).
  async () => ({ id: "1", secret: "internal" }) as { id: string },
);
typed.get(
  "/bad-response",
  { schema: { response: { 200: PublicSchema } } },
  async () => ({ id: 42 }) as unknown as { id: string },
);

const post = (payload: string) =>
  app.inject({
    method: "POST",
    url: "/validate",
    headers: { "content-type": "application/json" },
    payload,
  });

describe("errorHandler", () => {
  afterAll(() => app.close());

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
    expect(error.details?.map((d) => d.in)).toEqual(["body", "body"]);
  });

  it("returns 400 INVALID_JSON for malformed JSON", async () => {
    const res = await post("{not json");

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error.code).toBe("INVALID_JSON");
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

  it("strips fields not declared in the response schema", async () => {
    const res = await app.inject({ method: "GET", url: "/strips-extra-fields" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "1" });
    expect(res.body).not.toContain("internal");
  });

  it("returns a generic 500 when the response does not match its schema", async () => {
    const res = await app.inject({ method: "GET", url: "/bad-response" });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorBody>()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
        traceId: expect.any(String) as unknown,
      },
    });
  });
});
