import assert from "node:assert/strict";
import test from "node:test";

import {
  clearEditorDraft,
  handleExpiredEditorSession,
  readEditorDraft,
  readEditorResponse,
  writeEditorDraft,
} from "../src/lib/editor/editorRuntime.ts";

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

const restoreGlobals = () => {
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalLocalStorage;
  }

  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
};

test.afterEach(restoreGlobals);

test("readEditorResponse принимает только ожидаемые поля JSON", async () => {
  const response = new Response(
    JSON.stringify({ ok: true, id: 12, message: "Сохранено", ignored: "value" }),
    { headers: { "content-type": "application/json" } },
  );

  assert.deepEqual(await readEditorResponse(response), {
    ok: true,
    id: 12,
    message: "Сохранено",
  });
});

test("readEditorResponse безопасно обрабатывает повреждённый JSON", async () => {
  const response = new Response("{", {
    headers: { "content-type": "application/json" },
  });

  assert.deepEqual(await readEditorResponse(response), {});
});

test("черновик сохраняется, читается и удаляется", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  assert.equal(writeEditorDraft("draft", { title: "Страница" }), true);
  assert.deepEqual(readEditorDraft("draft"), { title: "Страница" });

  clearEditorDraft("draft");
  assert.equal(readEditorDraft("draft"), null);
});

test("повреждённый черновик удаляется, а недоступное хранилище не ломает редактор", () => {
  let removed = false;
  globalThis.localStorage = {
    getItem: () => "{",
    setItem: () => {
      throw new Error("Storage unavailable");
    },
    removeItem: () => {
      removed = true;
    },
  };

  assert.equal(readEditorDraft("draft"), null);
  assert.equal(removed, true);
  assert.equal(writeEditorDraft("draft", { content: "Строка" }), false);
  assert.doesNotThrow(() => clearEditorDraft("draft"));
});

test("401 завершает редакторскую сессию и открывает вход", () => {
  const messageElement = { textContent: "" };
  let dialogClosed = false;
  let expired = false;
  let shownDialog;

  globalThis.window = {
    showAppDialog: (options) => {
      shownDialog = options;
    },
  };

  const handled = handleExpiredEditorSession({
    response: new Response(null, { status: 401 }),
    result: { message: "Войдите снова" },
    messageElement,
    dialog: { close: () => { dialogClosed = true; } },
    onExpired: () => { expired = true; },
  });

  assert.equal(handled, true);
  assert.equal(messageElement.textContent, "Войдите снова");
  assert.equal(dialogClosed, true);
  assert.equal(expired, true);
  assert.equal(shownDialog.actionHref, "/login");
  assert.equal(shownDialog.message, "Войдите снова");
});

