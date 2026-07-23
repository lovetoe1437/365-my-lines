import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMAGE_SIZE_BYTES,
  isValidEntryImageMetadata,
  normalizeImageCaption,
} from "../src/lib/images/metadata.ts";

const validMetadata = {
  owner: { kind: "book", id: 1 },
  objectKey: "entries/book/1/photo.webp",
  objectEtag: "example-etag",
  placement: "before",
  sortOrder: 0,
  caption: null,
  mimeType: "image/webp",
  width: 1800,
  height: 1200,
  sizeBytes: 750_000,
};

test("подпись фотографии нормализуется и может отсутствовать", () => {
  assert.equal(normalizeImageCaption("  Один   важный момент  "), "Один важный момент");
  assert.equal(normalizeImageCaption("   "), null);
  assert.equal(normalizeImageCaption(null), null);
});

test("корректные метаданные фотографии принимаются", () => {
  assert.equal(isValidEntryImageMetadata(validMetadata), true);
  assert.equal(
    isValidEntryImageMetadata({
      ...validMetadata,
      owner: { kind: "diary", id: 12 },
      placement: "after",
      caption: "После текста",
    }),
    true,
  );
});

test("некорректный владелец, позиция и порядок отклоняются", () => {
  assert.equal(
    isValidEntryImageMetadata({
      ...validMetadata,
      owner: { kind: "book", id: 0 },
    }),
    false,
  );
  assert.equal(
    isValidEntryImageMetadata({
      ...validMetadata,
      owner: { kind: "unknown", id: 1 },
    }),
    false,
  );
  assert.equal(
    isValidEntryImageMetadata({ ...validMetadata, placement: "middle" }),
    false,
  );
  assert.equal(
    isValidEntryImageMetadata({ ...validMetadata, sortOrder: 6 }),
    false,
  );
});

test("слишком большая фотография и длинная подпись отклоняются", () => {
  assert.equal(
    isValidEntryImageMetadata({
      ...validMetadata,
      sizeBytes: MAX_IMAGE_SIZE_BYTES + 1,
    }),
    false,
  );
  assert.equal(
    isValidEntryImageMetadata({
      ...validMetadata,
      caption: "а".repeat(281),
    }),
    false,
  );
});
