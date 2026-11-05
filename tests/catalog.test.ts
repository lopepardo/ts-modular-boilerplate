import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/platform/db/client.js", () => ({ prisma: {} }));

const { buildApp } = await import("../src/app.js");
const { createInMemoryBookRepository } = await import("../src/modules/catalog/index.js");

type ErrorBody = { error: Record<string, unknown> };

let nextId = 0;
const app = await buildApp({
  generateId: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
  bookRepository: createInMemoryBookRepository(),
});

const register = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/books", payload });

describe("catalog: register and view a book", () => {
  afterAll(() => app.close());

  it("registers a book that is not retired and returns it with an id", async () => {
    const res = await register({
      title: "  Dune ",
      author: "Frank Herbert",
      isbn: "978-0441172719",
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: expect.any(String) as unknown,
      title: "Dune",
      author: "Frank Herbert",
      isbn: "978-0441172719",
      retired: false,
    });
  });

  it("views a registered book with its details and retired state", async () => {
    const created = (await register({ title: "Emma", author: "Jane Austen", isbn: "111" })).json<{
      id: string;
    }>();

    const res = await app.inject({
      method: "GET",
      url: `/books/${created.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: created.id,
      title: "Emma",
      author: "Jane Austen",
      isbn: "111",
      retired: false,
    });
  });

  it("returns 404 BOOK_NOT_FOUND for an unknown book", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/books/6f1c2b34-0000-4000-8000-000000000000",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().error).toMatchObject({
      code: "BOOK_NOT_FOUND",
    });
  });

  it("returns 400 VALIDATION_ERROR for invalid input", async () => {
    const res = await register({ title: " ", author: "A" });

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ path: "title" }),
        expect.objectContaining({ path: "isbn" }),
      ]) as unknown,
    });

    const badId = await app.inject({ method: "GET", url: "/books/abc" });
    expect(badId.statusCode).toBe(400);
  });

  it("registers two books with the same ISBN as two distinct Books", async () => {
    const payload = { title: "Dune", author: "Frank Herbert", isbn: "222" };
    const first = (await register(payload)).json<{ id: string }>();
    const second = (await register(payload)).json<{ id: string }>();

    expect(first.id).not.toBe(second.id);
    for (const { id } of [first, second]) {
      const res = await app.inject({ method: "GET", url: `/books/${id}` });
      expect(res.statusCode).toBe(200);
    }
  });
});
