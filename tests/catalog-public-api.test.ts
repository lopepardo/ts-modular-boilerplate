import { describe, expect, it } from "vitest";

import { createCatalogModule, createInMemoryBookRepository } from "../src/modules/catalog/index.js";

describe("catalog public API: getBookStatus", () => {
  const repository = createInMemoryBookRepository();
  const catalog = createCatalogModule({
    repository,
    generateId: () => "00000000-0000-4000-8000-000000000001",
  });
  const book = { id: "book-1", title: "Dune", author: "Herbert", isbn: "1" };

  it("reports an unknown book as not existing", async () => {
    expect(await catalog.getBookStatus("missing")).toEqual({ exists: false });
  });

  it("reports whether an existing book is retired", async () => {
    await repository.save({ ...book, retired: false });
    expect(await catalog.getBookStatus(book.id)).toEqual({ exists: true, retired: false });

    await repository.save({ ...book, retired: true });
    expect(await catalog.getBookStatus(book.id)).toEqual({ exists: true, retired: true });
  });

  it("exposes exactly the routes and the status query", () => {
    expect(Object.keys(catalog).sort()).toEqual(["getBookStatus", "routes"]);
  });
});
