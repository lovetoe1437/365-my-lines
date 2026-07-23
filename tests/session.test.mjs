import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSession,
  destroyAdminSession,
  isAdmin,
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
