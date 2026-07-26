import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSession,
  createReaderSession,
  destroyAdminSession,
  isAdmin,
  isReader,
} from "../src/lib/auth/session.ts";

test("авторская сессия записывается только после завершения регенерации", async () => {
  const operations = [];
  let finishRegeneration;

  const regeneration = new Promise((resolve) => {
    finishRegeneration = () => {
      operations.push("regenerated");
      resolve();
    };
  });

  const context = {
    session: {
      regenerate: () => {
        operations.push("regenerating");
        return regeneration;
      },
      set: (key, value) => {
        operations.push(`set:${key}:${value}`);
      },
    },
  };

  const creating = createAdminSession(context);

  assert.deepEqual(operations, ["regenerating"]);
  finishRegeneration();
  await creating;

  assert.deepEqual(operations, [
    "regenerating",
    "regenerated",
    "set:admin:true",
    "set:reader:true",
  ]);
});

test("isAdmin разрешает доступ только при точном значении true", async () => {
  const context = {
    session: {
      get: async (key) => key === "admin" ? true : undefined,
    },
  };

  assert.equal(await isAdmin(context), true);

  context.session.get = async () => "true";
  assert.equal(await isAdmin(context), false);
});

test("читательская сессия открывает книгу, а админская также считается читательской", async () => {
  const operations = [];
  const readerContext = {
    session: {
      regenerate: async () => operations.push("regenerated"),
      set: (key, value) => operations.push(`set:${key}:${value}`),
      get: async (key) => key === "reader" ? true : undefined,
    },
  };

  await createReaderSession(readerContext);
  assert.deepEqual(operations, ["regenerated", "set:reader:true"]);
  assert.equal(await isReader(readerContext), true);

  const adminContext = {
    session: {
      get: async (key) => key === "admin" ? true : undefined,
    },
  };
  assert.equal(await isReader(adminContext), true);
});

test("destroyAdminSession уничтожает существующую сессию", () => {
  let destroyed = false;
  const context = {
    session: {
      destroy: () => {
        destroyed = true;
      },
    },
  };

  destroyAdminSession(context);
  assert.equal(destroyed, true);
});
