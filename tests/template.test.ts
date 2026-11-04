import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/platform/db/client.js", () => ({ prisma: {} }));

const { buildApp } = await import("../src/app.js");

const FIXED_ID = "0b9f3a52-6c1e-4f7e-9d3a-2f6b8a1c4e10";
type ErrorBody = { error: Record<string, unknown> };

const app = await buildApp({ generateId: () => FIXED_ID });

describe("POST /_template", () => {
  afterAll(() => app.close());

  it("creates an example with the injected id", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/_template",
      payload: { name: "  First example  " },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: FIXED_ID, name: "First example" });
  });

  it("returns 422 VALIDATION_ERROR for an empty name", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/_template",
      payload: { name: "   " },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json<ErrorBody>().error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { name: expect.any(Array) as unknown },
    });
  });
});
