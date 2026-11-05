import { afterAll, describe, expect, it } from "vitest";

import {
  createInMemoryExampleRepository,
  createTemplateModule,
} from "../src/modules/_template/index.js";
import { createServer } from "../src/platform/http/createServer.js";

const FIXED_ID = "0b9f3a52-6c1e-4f7e-9d3a-2f6b8a1c4e10";
type ErrorBody = { error: Record<string, unknown> };

// `_template` is not mounted by `buildApp`: the test wires it onto a bare server.
const app = await createServer();
const template = createTemplateModule({
  repository: createInMemoryExampleRepository(),
  generateId: () => FIXED_ID,
});
await app.register(template.routes, { prefix: "/_template" });

describe("POST /_template", () => {
  afterAll(() => app.close());

  it("creates an example with the injected id", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/_template",
      payload: { name: "  First example  " },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: FIXED_ID, name: "First example" });
  });

  it("returns 400 VALIDATION_ERROR for an empty name", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/_template",
      payload: { name: "   " },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: [{ path: "name", message: expect.any(String) as unknown }],
    });
  });
});
