import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { buildApp } from "../../src/app.js";

type App = Awaited<ReturnType<typeof buildApp>>;
type ErrorBody = { error: Record<string, unknown> };

/** A wiring of the app under test (in-memory or Prisma) plus its cleanup. */
export type CatalogWiring = {
  app: App;
  /** Runs after the scenarios; must leave any external state clean. */
  cleanup?: () => Promise<void>;
};

/**
 * HTTP scenarios for `catalog`, written once and run against every wiring
 * (in-memory in `pnpm test`, Prisma in `pnpm test:integration`).
 */
export const catalogScenarios = (wiringName: string, setup: () => Promise<CatalogWiring>) => {
  describe(`catalog: register and view a book (${wiringName})`, () => {
    let wiring: CatalogWiring;
    let app: App;

    beforeAll(async () => {
      wiring = await setup();
      app = wiring.app;
    });

    afterAll(async () => {
      await wiring.app.close();
      await wiring.cleanup?.();
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
};
