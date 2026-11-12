import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createFakeClock } from "./support/fakeClock.js";
import { createTestApp } from "./support/testApp.js";

type App = Awaited<ReturnType<typeof createTestApp>>["app"];
type Res = { statusCode: number; json: <T>() => T };
type ErrorBody = { error: Record<string, unknown> };
type LoanBody = { id: string; status: string; overdue: boolean };

/** The moment the clock shows while the tests run. */
const FIXED_NOW = Temporal.Instant.from("2026-03-01T10:00:00.000Z");
/** A day after the DueDate of a Loan borrowed at `FIXED_NOW`. */
const PAST_DUE = Temporal.Instant.from("2026-03-16T10:00:00.000Z");
const UNKNOWN_ID = "6f1c2b34-0000-4000-8000-000000000000";

/** Each describe gets its own app on the real Postgres and deletes only the rows it created. */
const setup = (clock = createFakeClock(FIXED_NOW)) =>
  createTestApp({
    clock,
    purge: async (prisma, ids) => {
      await prisma.loan.deleteMany({ where: { id: { in: ids } } });
      await prisma.book.deleteMany({ where: { id: { in: ids } } });
    },
  });

const registerBook = async (app: App) =>
  (
    await app.inject({
      method: "POST",
      url: "/books",
      payload: { title: "Dune", author: "Frank Herbert", isbn: "978-0441172719" },
    })
  ).json<{ id: string }>().id;
const borrow = (app: App, memberId: string, bookId: string) =>
  app.inject({ method: "POST", url: "/loans", payload: { memberId, bookId } });
const borrowNew = async (app: App, memberId: string) =>
  borrow(app, memberId, await registerBook(app));
const giveBack = (app: App, id: string) =>
  app.inject({ method: "POST", url: `/loans/${id}/return` });
const idOf = (res: Res) => res.json<{ id: string }>().id;
const errorCode = (res: Res) => res.json<ErrorBody>().error["code"];

describe("lending: borrow a book", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(() => wiring.cleanup());

  it("borrows an existing book: an active Loan due exactly 14 days later", async () => {
    const bookId = await registerBook(app);

    const res = await borrow(app, "member-1", bookId);

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: expect.any(String) as unknown,
      bookId,
      memberId: "member-1",
      status: "active",
      overdue: false,
      borrowedAt: "2026-03-01T10:00:00.000Z",
      dueDate: "2026-03-15T10:00:00.000Z",
    });
  });

  it("returns 404 BOOK_NOT_FOUND for an unknown book", async () => {
    const res = await borrow(app, "member-1", UNKNOWN_ID);

    expect(res.statusCode).toBe(404);
    expect(errorCode(res)).toBe("BOOK_NOT_FOUND");
  });

  it("refuses a Retired book with 409 BOOK_RETIRED", async () => {
    const bookId = await registerBook(app);
    await app.inject({ method: "POST", url: `/books/${bookId}/retire` });

    const res = await borrow(app, "member-1", bookId);

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("BOOK_RETIRED");
  });

  it("returns 400 VALIDATION_ERROR for invalid input", async () => {
    const res = await borrow(app, " ", "abc");

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

describe("lending: return a loan", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(() => wiring.cleanup());

  it("marks an active Loan as returned", async () => {
    const bookId = await registerBook(app);
    const loanId = idOf(await borrow(app, "member-1", bookId));

    const res = await giveBack(app, loanId);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: loanId,
      bookId,
      memberId: "member-1",
      status: "returned",
      overdue: false,
      borrowedAt: "2026-03-01T10:00:00.000Z",
      dueDate: "2026-03-15T10:00:00.000Z",
    });
  });

  it("refuses to return an already returned Loan with 409 LOAN_ALREADY_RETURNED", async () => {
    const loanId = idOf(await borrowNew(app, "member-1"));
    await giveBack(app, loanId);

    const res = await giveBack(app, loanId);

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("LOAN_ALREADY_RETURNED");
  });

  it("lets only one of several concurrent returns succeed, the rest get 409", async () => {
    const loanId = idOf(await borrowNew(app, "member-1"));

    const results = await Promise.all(Array.from({ length: 5 }, () => giveBack(app, loanId)));

    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    const refused = results.filter((r) => r.statusCode === 409);
    expect(refused).toHaveLength(4);
    for (const res of refused) {
      expect(errorCode(res)).toBe("LOAN_ALREADY_RETURNED");
    }
  });

  it("returns 404 LOAN_NOT_FOUND for an unknown Loan", async () => {
    const res = await giveBack(app, UNKNOWN_ID);

    expect(res.statusCode).toBe(404);
    expect(errorCode(res)).toBe("LOAN_NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR when the id is not a uuid", async () => {
    const res = await giveBack(app, "abc");

    expect(res.statusCode).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });

  it("returns a Loan even if its Book was retired after it was borrowed", async () => {
    const bookId = await registerBook(app);
    const loanId = idOf(await borrow(app, "member-1", bookId));
    await app.inject({ method: "POST", url: `/books/${bookId}/retire` });

    const res = await giveBack(app, loanId);

    expect(res.statusCode).toBe(200);
    expect(res.json<LoanBody>().status).toBe("returned");
  });
});

describe("lending: borrowing rules", () => {
  const clock = createFakeClock(FIXED_NOW);
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup(clock);
    app = wiring.app;
  });

  beforeEach(() => {
    clock.set(FIXED_NOW);
  });

  afterAll(() => wiring.cleanup());

  it("refuses a Book that already has an active Loan with 409 BOOK_ALREADY_LOANED", async () => {
    const bookId = await registerBook(app);
    await borrow(app, "member-a", bookId);

    const res = await borrow(app, "member-b", bookId);

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("BOOK_ALREADY_LOANED");
  });

  it("lets a Book be borrowed again once its Loan was returned", async () => {
    const bookId = await registerBook(app);
    await giveBack(app, idOf(await borrow(app, "member-a", bookId)));

    expect((await borrow(app, "member-b", bookId)).statusCode).toBe(201);
  });

  it("refuses a Member's fourth active Loan with 409 LOAN_LIMIT_REACHED", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await borrowNew(app, "member-limit")).statusCode).toBe(201);
    }

    const res = await borrowNew(app, "member-limit");

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("LOAN_LIMIT_REACHED");
  });

  it("counts returned Loans neither for the limit nor as Overdue", async () => {
    for (let i = 0; i < 3; i++) {
      await giveBack(app, idOf(await borrowNew(app, "member-returned")));
    }
    clock.set(PAST_DUE);

    expect((await borrowNew(app, "member-returned")).statusCode).toBe(201);
  });

  it("holds the limit and the one-active-per-Book rule under concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, async () => borrowNew(app, "member-race")),
    );
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(3);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(3);

    const bookId = await registerBook(app);
    const same = await Promise.all(
      ["race-1", "race-2", "race-3", "race-4"].map((m) => borrow(app, m, bookId)),
    );
    expect(same.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(same.filter((r) => r.statusCode === 409)).toHaveLength(3);
  });

  it("blocks a Member with an Overdue Loan until it is returned", async () => {
    const overdue = idOf(await borrowNew(app, "member-late"));
    clock.set(PAST_DUE);

    const blocked = await borrowNew(app, "member-late");
    expect(blocked.statusCode).toBe(409);
    expect(errorCode(blocked)).toBe("MEMBER_HAS_OVERDUE_LOANS");

    await giveBack(app, overdue);
    expect((await borrowNew(app, "member-late")).statusCode).toBe(201);
  });
});

describe("lending: view and list loans", () => {
  const clock = createFakeClock(FIXED_NOW);
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup(clock);
    app = wiring.app;
  });

  beforeEach(() => {
    clock.set(FIXED_NOW);
  });

  afterAll(() => wiring.cleanup());

  const borrowFor = async (memberId: string) => (await borrowNew(app, memberId)).json<LoanBody>();
  const view = (id: string) => app.inject({ method: "GET", url: `/loans/${id}` });
  const list = (query: string) => app.inject({ method: "GET", url: `/loans?${query}` });
  const ids = (res: Res) => res.json<LoanBody[]>().map((loan) => loan.id);

  it("views a Loan with its status, due date and overdue flag", async () => {
    const loan = await borrowFor("view-member");

    const res = await view(loan.id);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: loan.id,
      status: "active",
      overdue: false,
      dueDate: "2026-03-15T10:00:00.000Z",
    });
  });

  it("returns 404 LOAN_NOT_FOUND for an unknown Loan", async () => {
    const res = await view(UNKNOWN_ID);

    expect(res.statusCode).toBe(404);
    expect(errorCode(res)).toBe("LOAN_NOT_FOUND");
  });

  it("computes overdue on read from the clock, without any write", async () => {
    const loan = await borrowFor("overdue-member");

    clock.set(PAST_DUE);

    expect((await view(loan.id)).json<LoanBody>()).toMatchObject({
      status: "active",
      overdue: true,
    });
  });

  it("lists Loans filtered by member, by status, and both combined", async () => {
    const a1 = await borrowFor("list-a");
    const a2 = await borrowFor("list-a");
    const b1 = await borrowFor("list-b");
    await giveBack(app, a2.id);

    expect(ids(await list("memberId=list-a")).sort()).toEqual([a1.id, a2.id].sort());
    expect(ids(await list("status=active&memberId=list-b"))).toEqual([b1.id]);
    expect(ids(await list("memberId=list-a&status=returned"))).toEqual([a2.id]);

    const allActive = ids(await list("status=active"));
    expect(allActive).toEqual(expect.arrayContaining([a1.id, b1.id]));
    expect(allActive).not.toContain(a2.id);
  });

  it("computes overdue in listings from the clock", async () => {
    const loan = await borrowFor("list-overdue");
    clock.set(PAST_DUE);

    const res = await list("memberId=list-overdue");

    expect(res.json<LoanBody[]>()).toMatchObject([{ id: loan.id, overdue: true }]);
  });

  it("rejects an invalid status filter with 400", async () => {
    expect((await list("status=bogus")).statusCode).toBe(400);
  });
});
