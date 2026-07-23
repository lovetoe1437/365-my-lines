import assert from "node:assert/strict";
import test from "node:test";

import { findLatestByDate } from "../src/lib/ui/date.ts";

const byDisplayDate = (entry) => entry.displayDate;

test("последняя запись определяется по авторской дате", () => {
  const entries = [
    { id: "book", displayDate: "2026-07-19" },
    { id: "diary", displayDate: "2026-07-20" },
  ];

  assert.equal(findLatestByDate(entries, byDisplayDate)?.id, "diary");
});

test("техническое время изменения не влияет на выбор записи", () => {
  const entries = [
    {
      id: "book",
      displayDate: "2026-07-19",
      updatedAt: "2026-07-22 12:00:00",
    },
    {
      id: "diary",
      displayDate: "2026-07-20",
      updatedAt: "2026-07-20 12:00:00",
    },
  ];

  assert.equal(findLatestByDate(entries, byDisplayDate)?.id, "diary");
});

test("пустой список не содержит последней записи", () => {
  assert.equal(findLatestByDate([], byDisplayDate), null);
});

test("некорректная дата пропускается без ошибки", () => {
  const entries = [
    { id: "invalid", displayDate: "неизвестно" },
    { id: "valid", displayDate: "2026-07-19" },
  ];

  assert.equal(findLatestByDate(entries, byDisplayDate)?.id, "valid");
});
