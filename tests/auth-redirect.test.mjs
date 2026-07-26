import assert from "node:assert/strict";
import test from "node:test";

import { safeInternalPath } from "../src/lib/auth/redirect.ts";

const origin = "https://365mylines.com";

test("после входа разрешены только адреса этого же сайта", () => {
  assert.equal(safeInternalPath("/book?page=2", origin), "/book?page=2");
  assert.equal(safeInternalPath("/lines/d-12", origin), "/lines/d-12");
});

test("внешние и нестандартные адреса после входа отклоняются", () => {
  for (const value of [
    "https://example.com",
    "//example.com",
    "/\\\\example.com",
    "javascript:alert(1)",
    null,
  ]) {
    assert.equal(safeInternalPath(value, origin), "/");
  }
});
