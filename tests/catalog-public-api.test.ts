import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { loadEnv } from "../src/platform/config/env.js";
import { createPrismaClient } from "../src/platform/db/client.js";
import { createCatalogModule, createPrismaBookRepository } from "../src/modules/catalog/index.js";

describe("catalog public API: getBookStatus", () => {
  const prisma = createPrismaClient(loadEnv());
  const catalog = createCatalogModule({
    repository: createPrismaBookRepository(prisma),
    generateId: () => randomUUID(),
  });
  const bookId = randomUUID();

  afterAll(async () => {
    try {
      await prisma.book.deleteMany({ where: { id: bookId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("reports an unknown book as not existing", async () => {
    expect(await catalog.getBookStatus(randomUUID())).toEqual({ exists: false });
  });

  it("reports whether an existing book is retired", async () => {
    await prisma.book.create({
      data: { id: bookId, title: "Dune", author: "Herbert", isbn: "1", retired: false },
    });
    expect(await catalog.getBookStatus(bookId)).toEqual({ exists: true, retired: false });

    await prisma.book.update({ where: { id: bookId }, data: { retired: true } });
    expect(await catalog.getBookStatus(bookId)).toEqual({ exists: true, retired: true });
  });

  it("exposes exactly the routes and the status query", () => {
    expect(Object.keys(catalog).sort()).toEqual(["getBookStatus", "routes"]);
  });
});
