import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createFakeClock } from "./support/fakeClock.js";
import { createTestApp } from "./support/testApp.js";

type App = Awaited<ReturnType<typeof createTestApp>>["app"];
type ErrorBody = { error: Record<string, unknown> };

/** The moment the clock shows while the tests run. */
const FIXED_NOW = new Date("2026-03-01T10:00:00.000Z");

/**
 * Each describe gets its own app on the real Postgres and deletes only the rows it created.
 * There is no foreign key between modules, so the delete order does not matter.
 */
const setup = (clock = createFakeClock(FIXED_NOW)) =>
  createTestApp({
    clock,
    purge: async (prisma, ids) => {
      await prisma.loan.deleteMany({ where: { id: { in: ids } } });
      await prisma.book.deleteMany({ where: { id: { in: ids } } });
    },
  });

describe("lending: borrow a book", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(async () => {
    await wiring.cleanup();
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
      overdue: false,
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

describe("lending: return a loan", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;

  beforeAll(async () => {
    wiring = await setup();
    app = wiring.app;
  });

  afterAll(async () => {
    await wiring.cleanup();
  });

  const registerBook = async () =>
    (
      await app.inject({
        method: "POST",
        url: "/books",
        payload: { title: "Dune", author: "Frank Herbert", isbn: "978-0441172719" },
      })
    ).json<{ id: string }>().id;
  const borrowLoan = async (bookId: string) =>
    (
      await app.inject({
        method: "POST",
        url: "/loans",
        payload: { memberId: "member-1", bookId },
      })
    ).json<{ id: string }>().id;
  const giveBack = (id: string) => app.inject({ method: "POST", url: `/loans/${id}/return` });

  it("marks an active Loan as returned", async () => {
    const bookId = await registerBook();
    const loanId = await borrowLoan(bookId);

    const res = await giveBack(loanId);

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
    const loanId = await borrowLoan(await registerBook());
    await giveBack(loanId);

    const res = await giveBack(loanId);

    expect(res.statusCode).toBe(409);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "LOAN_ALREADY_RETURNED" });
  });

  it("lets only one of several concurrent returns succeed, the rest get 409", async () => {
    const loanId = await borrowLoan(await registerBook());

    const results = await Promise.all(Array.from({ length: 5 }, () => giveBack(loanId)));

    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    const refused = results.filter((r) => r.statusCode === 409);
    expect(refused).toHaveLength(4);
    for (const res of refused) {
      expect(res.json<ErrorBody>().error).toMatchObject({ code: "LOAN_ALREADY_RETURNED" });
    }
  });

  it("returns 404 LOAN_NOT_FOUND for an unknown Loan", async () => {
    const res = await giveBack("6f1c2b34-0000-4000-8000-000000000000");

    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "LOAN_NOT_FOUND" });
  });

  it("returns 400 VALIDATION_ERROR when the id is not a uuid", async () => {
    const res = await giveBack("abc");

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns a Loan even if its Book was retired after it was borrowed", async () => {
    const bookId = await registerBook();
    const loanId = await borrowLoan(bookId);
    await app.inject({ method: "POST", url: `/books/${bookId}/retire` });

    const res = await giveBack(loanId);

    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("returned");
  });
});

describe("lending: borrowing rules", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;
  let clock: ReturnType<typeof createFakeClock>;

  beforeAll(async () => {
    clock = createFakeClock(FIXED_NOW);
    wiring = await createTestApp({
      clock,
      purge: async (prisma, ids) => {
        await prisma.loan.deleteMany({ where: { id: { in: ids } } });
        await prisma.book.deleteMany({ where: { id: { in: ids } } });
      },
    });
    app = wiring.app;
  });

  beforeEach(() => {
    clock.set(FIXED_NOW);
  });

  afterAll(async () => {
    await wiring.cleanup();
  });

  const registerBook = async () =>
    (
      await app.inject({
        method: "POST",
        url: "/books",
        payload: { title: "Dune", author: "Frank Herbert", isbn: "978-0441172719" },
      })
    ).json<{ id: string }>().id;
  const borrow = (memberId: string, bookId: string) =>
    app.inject({ method: "POST", url: "/loans", payload: { memberId, bookId } });
  const borrowNew = async (memberId: string) => borrow(memberId, await registerBook());
  const giveBack = (id: string) => app.inject({ method: "POST", url: `/loans/${id}/return` });
  const errorCode = (res: { json: <T>() => T }) => res.json<ErrorBody>().error["code"];

  it("refuses a Book that already has an active Loan with 409 BOOK_ALREADY_LOANED", async () => {
    const bookId = await registerBook();
    await borrow("member-a", bookId);

    const res = await borrow("member-b", bookId);

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("BOOK_ALREADY_LOANED");
  });

  it("lets a Book be borrowed again once its Loan was returned", async () => {
    const bookId = await registerBook();
    const first = await borrow("member-a", bookId);
    await giveBack(first.json<{ id: string }>().id);

    expect((await borrow("member-b", bookId)).statusCode).toBe(201);
  });

  it("refuses a Member's fourth active Loan with 409 LOAN_LIMIT_REACHED", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await borrowNew("member-limit")).statusCode).toBe(201);
    }

    const res = await borrowNew("member-limit");

    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe("LOAN_LIMIT_REACHED");
  });

  it("frees a slot when a Loan is returned", async () => {
    const loans = [];
    for (let i = 0; i < 3; i++) {
      loans.push((await borrowNew("member-free")).json<{ id: string }>().id);
    }
    expect((await borrowNew("member-free")).statusCode).toBe(409);

    await giveBack(loans[0] as string);

    expect((await borrowNew("member-free")).statusCode).toBe(201);
  });

  it("holds the limit and the one-active-per-Book rule under concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, async () => borrowNew("member-race")),
    );
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(3);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(3);

    const bookId = await registerBook();
    const same = await Promise.all(
      ["race-1", "race-2", "race-3", "race-4"].map((m) => borrow(m, bookId)),
    );
    expect(same.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(same.filter((r) => r.statusCode === 409)).toHaveLength(3);
  });

  it("blocks a Member with an Overdue Loan until it is returned", async () => {
    const overdue = (await borrowNew("member-late")).json<{ id: string }>().id;

    // Exactly on the DueDate the Loan is not overdue yet; one millisecond later it is.
    clock.set(new Date("2026-03-15T10:00:00.000Z"));
    expect((await borrowNew("member-late")).statusCode).toBe(201);
    clock.set(new Date("2026-03-15T10:00:00.001Z"));
    const blocked = await borrowNew("member-late");
    expect(blocked.statusCode).toBe(409);
    expect(errorCode(blocked)).toBe("MEMBER_HAS_OVERDUE_LOANS");

    await giveBack(overdue);
    // The second Loan (due 14 days after its own start) is still not overdue.
    expect((await borrowNew("member-late")).statusCode).toBe(201);
  });

  it("lets a Member with only returned or non-overdue Loans borrow", async () => {
    const returned = (await borrowNew("member-ok")).json<{ id: string }>().id;
    await giveBack(returned);
    clock.set(new Date("2026-06-01T10:00:00.000Z"));

    expect((await borrowNew("member-ok")).statusCode).toBe(201);
    expect((await borrowNew("member-ok")).statusCode).toBe(201);
  });
});

it("the database allows only one active Loan per Book", async () => {
  const { prisma, cleanup } = await setup();
  const loan = (id: string, status: "active" | "returned") => ({
    id,
    bookId: "book-unique-index",
    memberId: "member-index",
    status,
    borrowedAt: FIXED_NOW,
    dueDate: FIXED_NOW,
  });
  const ids = [randomUUID(), randomUUID(), randomUUID()] as const;
  try {
    await prisma.loan.create({ data: loan(ids[0], "active") });

    // A second active Loan for the same Book is rejected by the partial unique index...
    await expect(prisma.loan.create({ data: loan(ids[1], "active") })).rejects.toThrow();
    // ...but returned Loans do not count.
    await expect(prisma.loan.create({ data: loan(ids[2], "returned") })).resolves.toBeDefined();
  } finally {
    await prisma.loan.deleteMany({ where: { id: { in: [...ids] } } });
    await cleanup();
  }
});

describe("lending: view and list loans", () => {
  let wiring: Awaited<ReturnType<typeof setup>>;
  let app: App;
  const clock = createFakeClock(FIXED_NOW);
  type LoanBody = { id: string; memberId: string; status: string; overdue: boolean };

  beforeAll(async () => {
    wiring = await setup(clock);
    app = wiring.app;
  });

  afterAll(async () => {
    await wiring.cleanup();
  });

  beforeEach(() => {
    clock.set(FIXED_NOW);
  });

  const borrowFor = async (memberId: string) => {
    const bookId = (
      await app.inject({
        method: "POST",
        url: "/books",
        payload: { title: "Dune", author: "Frank Herbert", isbn: "978-0441172719" },
      })
    ).json<{ id: string }>().id;
    return (
      await app.inject({ method: "POST", url: "/loans", payload: { memberId, bookId } })
    ).json<LoanBody>();
  };
  const view = (id: string) => app.inject({ method: "GET", url: `/loans/${id}` });
  const list = (query: string) => app.inject({ method: "GET", url: `/loans?${query}` });
  const ids = (res: { json: <T>() => T }) => res.json<LoanBody[]>().map((loan) => loan.id);

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
    const res = await view("6f1c2b34-0000-4000-8000-000000000000");

    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().error).toMatchObject({ code: "LOAN_NOT_FOUND" });
  });

  it("returns 400 VALIDATION_ERROR when the id is not a uuid", async () => {
    expect((await view("abc")).statusCode).toBe(400);
  });

  it("flips an active Loan to overdue when the clock passes its due date, without any write", async () => {
    const loan = await borrowFor("overdue-member");

    clock.set(new Date("2026-03-15T10:00:00.000Z"));
    expect((await view(loan.id)).json<LoanBody>().overdue).toBe(false);

    clock.set(new Date("2026-03-15T10:00:00.001Z"));
    const res = await view(loan.id);
    expect(res.json<LoanBody>()).toMatchObject({ status: "active", overdue: true });
  });

  it("never reports a returned Loan as overdue", async () => {
    const loan = await borrowFor("returned-member");
    await app.inject({ method: "POST", url: `/loans/${loan.id}/return` });
    clock.set(new Date("2027-01-01T00:00:00.000Z"));

    const res = await view(loan.id);

    expect(res.json<LoanBody>()).toMatchObject({ status: "returned", overdue: false });
  });

  it("lists Loans filtered by member, by status, and both combined", async () => {
    const a1 = await borrowFor("list-a");
    const a2 = await borrowFor("list-a");
    const b1 = await borrowFor("list-b");
    await app.inject({ method: "POST", url: `/loans/${a2.id}/return` });

    const byMember = await list("memberId=list-a");
    expect(ids(byMember).sort()).toEqual([a1.id, a2.id].sort());

    const byStatus = await list("status=active&memberId=list-b");
    expect(ids(byStatus)).toEqual([b1.id]);

    const combined = await list("memberId=list-a&status=returned");
    expect(ids(combined)).toEqual([a2.id]);

    const allActive = ids(await list("status=active"));
    expect(allActive).toEqual(expect.arrayContaining([a1.id, b1.id]));
    expect(allActive).not.toContain(a2.id);
  });

  it("computes overdue in listings from the clock", async () => {
    const loan = await borrowFor("list-overdue");
    clock.set(new Date("2026-04-01T00:00:00.000Z"));

    const res = await list("memberId=list-overdue");

    expect(res.json<LoanBody[]>()).toMatchObject([{ id: loan.id, overdue: true }]);
  });

  it("rejects an invalid status filter with 400", async () => {
    expect((await list("status=bogus")).statusCode).toBe(400);
  });
});
