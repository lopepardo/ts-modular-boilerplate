import { afterAll, describe, expect, it } from "vitest";

import { createTestApp } from "./support/testApp.js";

const { app, cleanup } = await createTestApp();

describe("GET /health", () => {
  afterAll(cleanup);

  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
