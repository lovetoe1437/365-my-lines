import {
  EntryImageLimitError,
  countEntryImages,
  createEntryImage,
  deleteEntryImage,
  getEntryImage,
  updateEntryImage,
  type EntryImageRecord,
} from "../db/entry-images.ts";
import {
  MAX_ENTRY_IMAGES,
  isEntryImagePlacement,
  isValidEntryImageOwner,
  normalizeImageCaption,
  type EntryImageOwner,
  type EntryImagePlacement,
} from "./metadata.ts";
import {
  deleteStoredEntryImage,
  processAndStoreEntryImage,
  type StoredEntryImage,
} from "./storage.ts";

export class EntryImageOwnerNotFoundError extends Error {
  constructor() {
    super("Страница книги или дневника не найдена.");
    this.name = "EntryImageOwnerNotFoundError";
  }
}

export class EntryImageConsistencyError extends Error {
  readonly originalError: unknown;
  readonly cleanupError: unknown;

  constructor(originalError: unknown, cleanupError: unknown) {
    super("Не удалось полностью отменить сохранение фотографии.", {
      cause: originalError,
    });
    this.name = "EntryImageConsistencyError";
    this.originalError = originalError;
    this.cleanupError = cleanupError;
  }
}

export async function runWithStorageRollback<TStored, TResult>(
  store: () => Promise<TStored>,
  persist: (stored: TStored) => Promise<TResult>,
  rollback: (stored: TStored) => Promise<void>,
): Promise<TResult> {
  const stored = await store();
  try {
    return await persist(stored);
  } catch (error) {
    try {
      await rollback(stored);
    } catch (cleanupError) {
      throw new EntryImageConsistencyError(error, cleanupError);
    }
    throw error;
  }
}

export async function entryImageOwnerExists(
  db: D1Database,
  owner: EntryImageOwner,
): Promise<boolean> {
  if (!isValidEntryImageOwner(owner)) return false;
  const table = owner.kind === "book" ? "book_lines" : "pages";
  const row = await db
    .prepare(`SELECT 1 AS found FROM ${table} WHERE id = ? LIMIT 1`)
    .bind(owner.id)
    .first<{ found: number }>();
  return row?.found === 1;
}

export type UploadEntryImageInput = {
  owner: EntryImageOwner;
  file: File;
  placement: EntryImagePlacement;
  sortOrder: number;
  caption: string | null;
};

export async function uploadEntryImage(
  db: D1Database,
  bucket: R2Bucket,
  images: ImagesBinding,
  input: UploadEntryImageInput,
): Promise<EntryImageRecord> {
  if (
    !isValidEntryImageOwner(input.owner) ||
    !isEntryImagePlacement(input.placement) ||
    !Number.isInteger(input.sortOrder) ||
    input.sortOrder < 0 ||
    input.sortOrder >= MAX_ENTRY_IMAGES
  ) {
    throw new TypeError("Некорректные параметры фотографии.");
  }

  if (!(await entryImageOwnerExists(db, input.owner))) {
    throw new EntryImageOwnerNotFoundError();
  }
  if ((await countEntryImages(db, input.owner)) >= MAX_ENTRY_IMAGES) {
    throw new EntryImageLimitError();
  }

  const imageId = await runWithStorageRollback<StoredEntryImage, number>(
    () => processAndStoreEntryImage(images, bucket, input.owner, input.file),
    (stored) =>
      createEntryImage(db, {
        ...stored,
        placement: input.placement,
        sortOrder: input.sortOrder,
        caption: normalizeImageCaption(input.caption),
      }),
    (stored) => deleteStoredEntryImage(bucket, stored.objectKey),
  );

  const record = await getEntryImage(db, imageId);
  if (!record) {
    throw new EntryImageConsistencyError(
      new Error("Метаданные сохранённой фотографии не найдены."),
      null,
    );
  }
  return record;
}

export async function changeEntryImage(
  db: D1Database,
  id: number,
  values: {
    placement: EntryImagePlacement;
    sortOrder: number;
    caption: string | null;
  },
): Promise<boolean> {
  return updateEntryImage(db, id, values);
}

export async function removeEntryImage(
  db: D1Database,
  bucket: R2Bucket,
  id: number,
): Promise<boolean> {
  const record = await getEntryImage(db, id);
  if (!record) return false;

  await deleteStoredEntryImage(bucket, record.object_key);
  return deleteEntryImage(db, id);
}
