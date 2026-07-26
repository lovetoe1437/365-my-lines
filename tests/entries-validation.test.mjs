import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_ENTRY_CONTENT_LENGTH,
  isValidEntryContent,
} from "../src/lib/validation/entries.ts";

test("текст записи ограничен сервером, но допускает большие личные записи", () => {
  assert.equal(isValidEntryContent("Одна строка"), true);
  assert.equal(isValidEntryContent(""), false);
  assert.equal(isValidEntryContent("а".repeat(MAX_ENTRY_CONTENT_LENGTH)), true);
  assert.equal(isValidEntryContent("а".repeat(MAX_ENTRY_CONTENT_LENGTH + 1)), false);
});
