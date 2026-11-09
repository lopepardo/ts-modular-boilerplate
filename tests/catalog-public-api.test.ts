import { describe, expect, it } from "vitest";

import { createCatalogModule, createInMemoryBookRepository } from "../src/modules/catalog/index.js";

describe("catalog public API: getBookStatus", () => {
  const catalog = createCatalogModule({
    repository: createInMemoryBookRepository(),
    generateId: () => "00000000-0000-4000-8000-000000000001",
  });

  it("reports an unknown book as not existing", async () => {
    expect(await catalog.getBookStatus("missing")).toEqual({ exists: false });
  });

  it("reports whether an existing book is retired", async () => {
    const { id } = await catalog.registerBook({ title: "Dune", author: "Herbert", isbn: "1" });
    expect(await catalog.getBookStatus(id)).toEqual({ exists: true, retired: false });

    await catalog.retireBook(id);
    expect(await catalog.getBookStatus(id)).toEqual({ exists: true, retired: true });
  });

  it("exposes exactly the agreed use cases and routes on the module", () => {
    expect(Object.keys(catalog).sort()).toEqual(
      ["getBook", "getBookStatus", "registerBook", "retireBook", "listBooks", "routes"].sort(),
    );
  });
});
