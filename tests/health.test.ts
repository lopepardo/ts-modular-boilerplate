import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/platform/db/client.js", () => ({ prisma: {} }));

const { buildApp } = await import("../src/app.js");

const app = await buildApp();

describe("GET /health", () => {
  afterAll(() => app.close());

  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
