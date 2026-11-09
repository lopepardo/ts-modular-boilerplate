import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./support/testApp.js";

type App = Awaited<ReturnType<typeof createTestApp>>["app"];
type ErrorBody = { error: Record<string, unknown> };

/** Each describe gets its own app on the real Postgres and deletes only the Books it created. */
const setup = () =>
  createTestApp({
    purge: (prisma, ids) => prisma.book.deleteMany({ where: { id: { in: ids } } }),
  });

describe("catalog: register and view a book", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(async () => {
    await wiring.cleanup();
  });

  const register = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/books", payload });

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
        expect.objectContaining({ in: "body", path: "title" }),
        expect.objectContaining({ in: "body", path: "isbn" }),
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

describe("catalog: list, search and retire books", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(async () => {
    await wiring.cleanup();
  });

  type BookBody = { id: string; title: string; author: string; isbn: string; retired: boolean };

  const register = async (title: string, author: string, isbn: string) =>
    (
      await app.inject({ method: "POST", url: "/books", payload: { title, author, isbn } })
    ).json<BookBody>();
  const retire = (id: string) => app.inject({ method: "POST", url: `/books/${id}/retire` });
  const list = async (query: string) => {
    const res = await app.inject({ method: "GET", url: `/books?${query}` });
    expect(res.statusCode).toBe(200);
    return res.json<BookBody[]>();
  };

  it("lists registered books", async () => {
    const a = await register("Listed A", "Lister Lee", "L-1");
    const b = await register("Listed B", "Lister Lee", "L-2");

    const books = await list("author=Lister%20Lee");

    expect(books.map((book) => book.id).sort()).toEqual([a.id, b.id].sort());
    expect(books[0]).toEqual(
      expect.objectContaining({ title: expect.any(String) as unknown, retired: false }),
    );
  });

  it("lists books ordered by title", async () => {
    await register("Order B", "Order Author", "O-2");
    await register("Order A", "Order Author", "O-1");

    const books = await list("author=Order%20Author");

    expect(books.map((book) => book.title)).toEqual(["Order A", "Order B"]);
  });

  it("lists without filters", async () => {
    const created = await register("Unfiltered", "Anon Writer", "U-1");
    const books = await list("");
    expect(books.map((book) => book.id)).toContain(created.id);
  });

  it("searches by title and author, ignoring case and matching parts", async () => {
    const match = await register("The Searchable Saga", "Quinn Seeker", "S-1");
    await register("Unrelated", "Someone Else", "S-2");

    expect((await list("title=searchable%20SAGA")).map((b) => b.id)).toEqual([match.id]);
    expect((await list("author=quinn")).map((b) => b.id)).toEqual([match.id]);
    expect(await list("title=searchable&author=nobody")).toEqual([]);
  });

  it("searches by exact ISBN", async () => {
    const match = await register("By Isbn", "Isbn Author", "ISBN-EXACT-9");
    await register("By Isbn Prefix", "Isbn Author", "ISBN-EXACT-99");

    expect((await list("isbn=ISBN-EXACT-9")).map((b) => b.id)).toEqual([match.id]);
  });

  it("filters by retired state", async () => {
    const keep = await register("Keep", "Filter Author", "F-1");
    const gone = await register("Gone", "Filter Author", "F-2");
    await retire(gone.id);

    expect((await list("author=Filter%20Author&retired=true")).map((b) => b.id)).toEqual([gone.id]);
    expect((await list("author=Filter%20Author&retired=false")).map((b) => b.id)).toEqual([
      keep.id,
    ]);
    expect(await list("author=Filter%20Author")).toHaveLength(2);
  });

  it("returns 400 VALIDATION_ERROR for an invalid filter", async () => {
    const res = await app.inject({ method: "GET", url: "/books?retired=maybe" });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("retires a book and keeps it viewable", async () => {
    const created = await register("To Retire", "Retire Author", "R-1");

    const res = await retire(created.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...created, retired: true });
    const view = await app.inject({ method: "GET", url: `/books/${created.id}` });
    expect(view.json()).toEqual({ ...created, retired: true });
  });

  it("retires an already retired book without changing anything else", async () => {
    const created = await register("Twice", "Retire Author", "R-2");
    await retire(created.id);

    const again = await retire(created.id);

    expect(again.statusCode).toBe(200);
    expect(again.json()).toEqual({ ...created, retired: true });
  });

  it("returns 404 BOOK_NOT_FOUND when retiring an unknown book", async () => {
    const res = await retire("6f1c2b34-0000-4000-8000-000000000000");
    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "BOOK_NOT_FOUND" });
  });

  it("returns 400 VALIDATION_ERROR when retiring with a malformed id", async () => {
    expect((await retire("abc")).statusCode).toBe(400);
  });

  it("has no way to delete a book", async () => {
    const created = await register("Permanent", "Retire Author", "R-3");
    const res = await app.inject({ method: "DELETE", url: `/books/${created.id}` });
    expect(res.statusCode).toBe(404);
    const view = await app.inject({ method: "GET", url: `/books/${created.id}` });
    expect(view.statusCode).toBe(200);
  });
});
