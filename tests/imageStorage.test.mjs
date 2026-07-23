import assert from "node:assert/strict";
import test from "node:test";
import {
  ImageStorageError,
  calculateStoredDimensions,
  createEntryImageObjectKey,
  detectInputImageMimeType,
  doesDeclaredMimeTypeMatch,
  isAcceptedInputMimeType,
} from "../src/lib/images/storage.ts";

test("формат фотографии определяется по содержимому, а не только по расширению", () => {
  assert.equal(
    detectInputImageMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    "image/jpeg",
  );
  assert.equal(
    detectInputImageMimeType(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "image/png",
  );
  assert.equal(
    detectInputImageMimeType(
      Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
    ),
    "image/webp",
  );
  assert.equal(
    detectInputImageMimeType(
      Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
    ),
    "image/heic",
  );
  assert.equal(detectInputImageMimeType(new Uint8Array(12)), null);
});

test("принимаются только согласованные форматы исходных фотографий", () => {
  assert.equal(isAcceptedInputMimeType("image/jpeg"), true);
  assert.equal(isAcceptedInputMimeType("image/heic"), true);
  assert.equal(isAcceptedInputMimeType("image/heif"), true);
  assert.equal(isAcceptedInputMimeType("image/svg+xml"), false);
  assert.equal(isAcceptedInputMimeType("video/quicktime"), false);
  assert.equal(doesDeclaredMimeTypeMatch("image/jpeg", "image/jpeg"), true);
  assert.equal(doesDeclaredMimeTypeMatch("image/jpeg", "image/png"), false);
  assert.equal(doesDeclaredMimeTypeMatch("image/heif", "image/heic"), true);
  assert.equal(doesDeclaredMimeTypeMatch("", "image/webp"), true);
});

test("большая фотография уменьшается пропорционально без обрезки", () => {
  assert.deepEqual(calculateStoredDimensions(4032, 3024), {
    width: 2400,
    height: 1800,
  });
  assert.deepEqual(calculateStoredDimensions(3024, 4032), {
    width: 1800,
    height: 2400,
  });
});

test("маленькая фотография не увеличивается", () => {
  assert.deepEqual(calculateStoredDimensions(1170, 800), {
    width: 1170,
    height: 800,
  });
});

test("некорректные размеры отклоняются", () => {
  assert.throws(
    () => calculateStoredDimensions(0, 100),
    (error) =>
      error instanceof ImageStorageError && error.code === "invalid_dimensions",
  );
  assert.throws(
    () => calculateStoredDimensions(12_001, 100),
    (error) =>
      error instanceof ImageStorageError && error.code === "invalid_dimensions",
  );
});

test("ключ R2 изолирует фотографии книги и дневника", () => {
  assert.equal(
    createEntryImageObjectKey({ kind: "book", id: 7 }, "ABC-123"),
    "entries/book/7/abc-123.webp",
  );
  assert.equal(
    createEntryImageObjectKey({ kind: "diary", id: 9 }, "DEF-456"),
    "entries/diary/9/def-456.webp",
  );
});
