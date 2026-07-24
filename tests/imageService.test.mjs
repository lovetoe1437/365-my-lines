import assert from "node:assert/strict";
import test from "node:test";
import {
  EntryImageConsistencyError,
  runWithStorageRollback,
} from "../src/lib/images/service.ts";

test("успешное сохранение не запускает откат R2", async () => {
  const events = [];
  const result = await runWithStorageRollback(
    async () => {
      events.push("store");
      return "object-key";
    },
    async (stored) => {
      events.push(`persist:${stored}`);
      return 17;
    },
    async () => {
      events.push("rollback");
    },
  );

  assert.equal(result, 17);
  assert.deepEqual(events, ["store", "persist:object-key"]);
});

test("ошибка D1 удаляет уже сохранённый объект R2", async () => {
  const events = [];
  const databaseError = new Error("D1 unavailable");

  await assert.rejects(
    runWithStorageRollback(
      async () => {
        events.push("store");
        return "object-key";
      },
      async () => {
        events.push("persist");
        throw databaseError;
      },
      async (stored) => {
        events.push(`rollback:${stored}`);
      },
    ),
    (error) => error === databaseError,
  );
  assert.deepEqual(events, ["store", "persist", "rollback:object-key"]);
});

test("двойной сбой сохраняет обе причины для диагностики", async () => {
  const databaseError = new Error("D1 unavailable");
  const storageError = new Error("R2 unavailable");

  await assert.rejects(
    runWithStorageRollback(
      async () => "object-key",
      async () => {
        throw databaseError;
      },
      async () => {
        throw storageError;
      },
    ),
    (error) =>
      error instanceof EntryImageConsistencyError &&
      error.originalError === databaseError &&
      error.cleanupError === storageError,
  );
});
