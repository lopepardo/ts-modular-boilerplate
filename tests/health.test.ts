import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { fakePrisma } from "./support/fakePrisma.js";

const app = await buildApp({ prisma: fakePrisma });

describe("GET /health", () => {
  afterAll(() => app.close());

  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
