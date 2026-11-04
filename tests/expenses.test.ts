import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  expense: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock("../src/platform/db/client.js", () => ({ prisma: prismaMock }));

const { buildApp } = await import("../src/app.js");

const ID = "0b9f3a52-6c1e-4f7e-9d3a-2f6b8a1c4e10";

const dbRow = {
  id: ID,
  amountCents: 1250,
  description: "Set lunch",
  category: "food",
  date: new Date("2026-10-20T00:00:00.000Z"),
  createdAt: new Date("2026-10-20T10:30:00.000Z"),
};

const app = await buildApp();

describe("expenses", () => {
  afterAll(() => app.close());

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /expenses", () => {
    it("creates an expense and returns 201", async () => {
      prismaMock.expense.create.mockResolvedValue(dbRow);

      const res = await app.inject({
        method: "POST",
        url: "/expenses",
        payload: {
          amountCents: 1250,
          description: "Set lunch",
          category: "food",
          date: "2026-10-20",
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        id: ID,
        amountCents: 1250,
        date: "2026-10-20",
      });
      expect(prismaMock.expense.create).toHaveBeenCalledWith({
        data: {
          amountCents: 1250,
          description: "Set lunch",
          category: "food",
          date: new Date("2026-10-20T00:00:00.000Z"),
        },
      });
    });

    it.each([12.5, -100, 0, "1250"])(
      "rejects invalid amount %j con 422",
      async (importe) => {
        const res = await app.inject({
          method: "POST",
          url: "/expenses",
          payload: {
            amountCents: importe,
            description: "x",
            category: "food",
            date: "2026-10-20",
          },
        });

        expect(res.statusCode).toBe(422);
        expect(prismaMock.expense.create).not.toHaveBeenCalled();
      },
    );
  });

  describe("GET /expenses", () => {
    it("lists applying filters", async () => {
      prismaMock.expense.findMany.mockResolvedValue([dbRow]);

      const res = await app.inject({
        method: "GET",
        url: "/expenses?from=2026-10-01&to=2026-10-31&category=food",
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            category: "food",
            date: {
              gte: new Date("2026-10-01T00:00:00.000Z"),
              lte: new Date("2026-10-31T00:00:00.000Z"),
            },
          },
        }),
      );
    });

    it("without filters does not restrict the query", async () => {
      prismaMock.expense.findMany.mockResolvedValue([]);

      const res = await app.inject({ method: "GET", url: "/expenses" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("rejects malformed dates with 422", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/expenses?from=yesterday",
      });

      expect(res.statusCode).toBe(422);
    });
  });

  describe("GET /expenses/summary", () => {
    it("returns zero totals and no categories for a month without expenses", async () => {
      prismaMock.expense.groupBy.mockResolvedValue([]);

      const res = await app.inject({
        method: "GET",
        url: "/expenses/summary?month=2026-09",
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        month: "2026-09",
        totalCents: 0,
        count: 0,
        categories: [],
      });
      expect(prismaMock.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date("2026-09-01T00:00:00.000Z"),
              lt: new Date("2026-10-01T00:00:00.000Z"),
            },
          },
        }),
      );
    });

    it("sums in integer cents and sorts by total desc, then category", async () => {
      prismaMock.expense.groupBy.mockResolvedValue([
        {
          category: "transport",
          _sum: { amountCents: 1250 },
          _count: { _all: 1 },
        },
        { category: "food", _sum: { amountCents: 3030 }, _count: { _all: 2 } },
        { category: "bills", _sum: { amountCents: 1250 }, _count: { _all: 1 } },
      ]);

      const res = await app.inject({
        method: "GET",
        url: "/expenses/summary?month=2026-10",
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        month: "2026-10",
        totalCents: 5530,
        count: 4,
        categories: [
          { category: "food", totalCents: 3030, count: 2 },
          { category: "bills", totalCents: 1250, count: 1 },
          { category: "transport", totalCents: 1250, count: 1 },
        ],
      });
    });

    it("uses January of the next year as the upper bound for December", async () => {
      prismaMock.expense.groupBy.mockResolvedValue([]);

      await app.inject({
        method: "GET",
        url: "/expenses/summary?month=2026-12",
      });

      expect(prismaMock.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date("2026-12-01T00:00:00.000Z"),
              lt: new Date("2027-01-01T00:00:00.000Z"),
            },
          },
        }),
      );
    });

    it.each(["", "?month=2026-13", "?month=2026-1", "?month=2026-10-01"])(
      "rejects invalid month %j with 422",
      async (query) => {
        const res = await app.inject({
          method: "GET",
          url: `/expenses/summary${query}`,
        });

        expect(res.statusCode).toBe(422);
        expect(prismaMock.expense.groupBy).not.toHaveBeenCalled();
      },
    );

    it("never produces an uncategorised group: creating without category is rejected", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/expenses",
        payload: { amountCents: 500, description: "x", date: "2026-10-20" },
      });

      expect(res.statusCode).toBe(422);
      expect(prismaMock.expense.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /expenses/:id", () => {
    it("returns the expense", async () => {
      prismaMock.expense.findUnique.mockResolvedValue(dbRow);

      const res = await app.inject({ method: "GET", url: `/expenses/${ID}` });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: ID, category: "food" });
    });

    it("returns 404 if it does not exist", async () => {
      prismaMock.expense.findUnique.mockResolvedValue(null);

      const res = await app.inject({ method: "GET", url: `/expenses/${ID}` });

      expect(res.statusCode).toBe(404);
    });

    it("returns 422 if the id is not a uuid", async () => {
      const res = await app.inject({ method: "GET", url: "/expenses/abc" });

      expect(res.statusCode).toBe(422);
    });
  });

  describe("DELETE /expenses/:id", () => {
    it("deletes and returns 204", async () => {
      prismaMock.expense.deleteMany.mockResolvedValue({ count: 1 });

      const res = await app.inject({
        method: "DELETE",
        url: `/expenses/${ID}`,
      });

      expect(res.statusCode).toBe(204);
    });

    it("returns 404 if it does not exist", async () => {
      prismaMock.expense.deleteMany.mockResolvedValue({ count: 0 });

      const res = await app.inject({
        method: "DELETE",
        url: `/expenses/${ID}`,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
