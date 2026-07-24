import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRecoveredEntryId,
  resolveEntrySaveRequest,
} from "../src/lib/editor/entrySaveRecovery.ts";

test("первая попытка создаёт новую запись", () => {
  assert.deepEqual(
    resolveEntrySaveRequest(null, "/api/lines", (id) => `/api/lines/${id}`),
    { url: "/api/lines", method: "POST" },
  );
});

test("повторная попытка обновляет уже созданную запись", () => {
  assert.deepEqual(
    resolveEntrySaveRequest(17, "/api/pages", (id) => `/api/pages/${id}`),
    { url: "/api/pages/17", method: "PUT" },
  );
});

test("из локального восстановления принимается только положительный целый ID", () => {
  assert.equal(parseRecoveredEntryId("23"), 23);
  assert.equal(parseRecoveredEntryId("0"), null);
  assert.equal(parseRecoveredEntryId("2.5"), null);
  assert.equal(parseRecoveredEntryId("not-an-id"), null);
  assert.equal(parseRecoveredEntryId(null), null);
});
