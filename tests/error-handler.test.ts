import Fastify from "fastify";
import { afterAll, describe, expect, it } from "vitest";

import { errorHandler } from "../src/platform/http/errorHandler.js";
import { BusinessError, ConflictError, NotFoundError } from "../src/shared/errors.js";

type ErrorBody = { error: { code: string } };

const app = Fastify();
app.setErrorHandler(errorHandler);
app.get("/not-found", async () => {
  throw new NotFoundError("THING_NOT_FOUND", "Thing not found");
});
app.get("/conflict", async () => {
  throw new ConflictError("THING_CONFLICT", "Thing conflicts");
});
app.get("/business", async () => {
  throw new BusinessError("RULE_BROKEN", "Rule broken");
});
app.get("/boom", async () => {
  throw new Error("secret internals");
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

  it("returns 500 without leaking details for unknown errors", async () => {
    const res = await app.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorBody>().error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.body).not.toContain("secret internals");
  });
});
