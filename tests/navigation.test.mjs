import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowNavigation } from "../src/lib/ui/navigation.ts";

test("пролог изолирован от основной навигации", () => {
  assert.equal(shouldShowNavigation("/prologue"), false);
  assert.equal(shouldShowNavigation("/"), true);
  assert.equal(shouldShowNavigation("/lines"), true);
  assert.equal(shouldShowNavigation("/book"), true);
});
