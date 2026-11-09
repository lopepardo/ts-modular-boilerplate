import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { buildApp } from "../../src/app.js";

type App = Awaited<ReturnType<typeof buildApp>>;
type ErrorBody = { error: Record<string, unknown> };

/** The moment the clock shows while the scenarios run. */
export const FIXED_NOW = new Date("2026-03-01T10:00:00.000Z");

/** A wiring of the app under test (in-memory or Prisma) plus its cleanup. */
export type LendingWiring = {
  app: App;
  /** Runs after the scenarios; must leave any external state clean. */
  cleanup?: () => Promise<void>;
};

/**
 * HTTP scenarios for `lending`, written once and run against every wiring.
 * The wiring must set its clock to `FIXED_NOW`.
 */
export const lendingScenarios = (wiringName: string, setup: () => Promise<LendingWiring>) => {
  describe(`lending: borrow a book (${wiringName})`, () => {
    let wiring: LendingWiring;
    let app: App;

    beforeAll(async () => {
      wiring = await setup();
      app = wiring.app;
    });

    afterAll(async () => {
      await wiring.app.close();
      await wiring.cleanup?.();
    });

    const registerBook = async () =>
      (
        await app.inject({
          method: "POST",
          url: "/books",
          payload: { title: "Dune", author: "Frank Herbert", isbn: "978-0441172719" },
        })
      ).json<{ id: string }>().id;
    const borrow = (payload: Record<string, unknown>) =>
      app.inject({ method: "POST", url: "/loans", payload });

    it("borrows an existing book: an active Loan due exactly 14 days later", async () => {
      const bookId = await registerBook();

      const res = await borrow({ memberId: "member-1", bookId });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        id: expect.any(String) as unknown,
        bookId,
        memberId: "member-1",
        status: "active",
        borrowedAt: "2026-03-01T10:00:00.000Z",
        dueDate: "2026-03-15T10:00:00.000Z",
      });
    });

    it("returns 404 BOOK_NOT_FOUND for an unknown book", async () => {
      const res = await borrow({
        memberId: "member-1",
        bookId: "6f1c2b34-0000-4000-8000-000000000000",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json<ErrorBody>().error).toMatchObject({ code: "BOOK_NOT_FOUND" });
    });

    it("refuses a Retired book with 409 BOOK_RETIRED", async () => {
      const bookId = await registerBook();
      await app.inject({ method: "POST", url: `/books/${bookId}/retire` });

      const res = await borrow({ memberId: "member-1", bookId });

      expect(res.statusCode).toBe(409);
      expect(res.json<ErrorBody>().error).toMatchObject({ code: "BOOK_RETIRED" });
    });

    it("returns 400 VALIDATION_ERROR for invalid input", async () => {
      const res = await borrow({ memberId: " ", bookId: "abc" });

      expect(res.statusCode).toBe(400);
      expect(res.json<ErrorBody>().error).toMatchObject({
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({ in: "body", path: "memberId" }),
          expect.objectContaining({ in: "body", path: "bookId" }),
        ]) as unknown,
      });
    });
  });
};
