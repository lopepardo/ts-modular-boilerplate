import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/platform/db/client.js", () => ({ prisma: {} }));

const { buildApp } = await import("../src/app.js");
const { createInMemoryBookRepository } = await import("../src/modules/catalog/index.js");

type ErrorBody = { error: Record<string, unknown> };

const FIXED_ID = "0b9f3a52-6c1e-4f7e-9d3a-2f6b8a1c4e10";

const app = await buildApp({
  clock: { now: () => new Date("2026-11-04T12:00:00.000Z") },
  generateId: () => FIXED_ID,
  bookRepository: createInMemoryBookRepository(),
});

describe("app dependency overrides", () => {
  afterAll(() => app.close());

  it("drives the app with a fixed id generator and fake repository", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/books",
      payload: { title: "Dune", author: "Frank Herbert", isbn: "978" },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json<Record<string, unknown>>()).toMatchObject({
      id: FIXED_ID,
    });

    const fetched = await app.inject({
      method: "GET",
      url: `/books/${FIXED_ID}`,
    });
    expect(fetched.statusCode).toBe(200);
  });

  it("maps a business not-found error to 404 with the unchanged format", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/books/6f1c2b34-0000-4000-8000-000000000000",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>()).toEqual({
      error: {
        code: "BOOK_NOT_FOUND",
        message: expect.any(String) as unknown,
        traceId: expect.any(String) as unknown,
      },
    });
  });

  it("returns 422 VALIDATION_ERROR with details for invalid input", async () => {
    const res = await app.inject({ method: "GET", url: "/books/abc" });

    expect(res.statusCode).toBe(422);
    expect(res.json<ErrorBody>().error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { id: expect.any(Array) as unknown },
    });
  });
});
