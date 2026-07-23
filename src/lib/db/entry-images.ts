import {
  MAX_ENTRY_IMAGES,
  MAX_IMAGE_CAPTION_LENGTH,
  isValidEntryImageMetadata,
  normalizeImageCaption,
  type EntryImageMetadata,
  type EntryImageOwner,
  type EntryImagePlacement,
  type StoredImageMimeType,
} from "../images/metadata";

export type EntryImageRecord = {
  id: number;
  book_line_id: number | null;
  page_id: number | null;
  object_key: string;
  object_etag: string;
  placement: EntryImagePlacement;
  sort_order: number;
  caption: string | null;
  mime_type: StoredImageMimeType;
  width: number;
  height: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

export class EntryImageLimitError extends Error {
  constructor() {
    super(`К одной странице можно прикрепить не более ${MAX_ENTRY_IMAGES} фотографий.`);
    this.name = "EntryImageLimitError";
  }
}

const selectEntryImages = `
  SELECT id, book_line_id, page_id, object_key, object_etag,
    placement, sort_order, caption, mime_type, width, height,
    size_bytes, created_at, updated_at
  FROM entry_images
`;

const ownerColumn = (owner: EntryImageOwner): "book_line_id" | "page_id" =>
  owner.kind === "book" ? "book_line_id" : "page_id";

export async function getEntryImages(
  db: D1Database,
  owner: EntryImageOwner,
): Promise<EntryImageRecord[]> {
  const column = ownerColumn(owner);
  const { results } = await db
    .prepare(`
      ${selectEntryImages}
      WHERE ${column} = ?
      ORDER BY
        CASE placement WHEN 'before' THEN 0 ELSE 1 END,
        sort_order ASC,
        id ASC
    `)
    .bind(owner.id)
    .all<EntryImageRecord>();

  return results ?? [];
}

export async function getEntryImage(
  db: D1Database,
  id: number,
): Promise<EntryImageRecord | null> {
  return (
    (await db
      .prepare(`${selectEntryImages} WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<EntryImageRecord>()) ?? null
  );
}

export async function countEntryImages(
  db: D1Database,
  owner: EntryImageOwner,
): Promise<number> {
  const column = ownerColumn(owner);
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM entry_images WHERE ${column} = ?`)
    .bind(owner.id)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function createEntryImage(
  db: D1Database,
  metadata: EntryImageMetadata,
): Promise<number> {
  const normalizedMetadata = {
    ...metadata,
    objectKey: metadata.objectKey.trim(),
    objectEtag: metadata.objectEtag.trim(),
    caption: normalizeImageCaption(metadata.caption),
  };

  if (!isValidEntryImageMetadata(normalizedMetadata)) {
    throw new TypeError("Некорректные метаданные фотографии.");
  }

  if ((await countEntryImages(db, metadata.owner)) >= MAX_ENTRY_IMAGES) {
    throw new EntryImageLimitError();
  }

  const bookLineId = metadata.owner.kind === "book" ? metadata.owner.id : null;
  const pageId = metadata.owner.kind === "diary" ? metadata.owner.id : null;
  const result = await db
    .prepare(`
      INSERT INTO entry_images (
        book_line_id, page_id, object_key, object_etag,
        placement, sort_order, caption, mime_type,
        width, height, size_bytes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      bookLineId,
      pageId,
      normalizedMetadata.objectKey,
      normalizedMetadata.objectEtag,
      normalizedMetadata.placement,
      normalizedMetadata.sortOrder,
      normalizedMetadata.caption,
      normalizedMetadata.mimeType,
      normalizedMetadata.width,
      normalizedMetadata.height,
      normalizedMetadata.sizeBytes,
    )
    .run();

  const id = result.meta.last_row_id;
  if (typeof id !== "number") {
    throw new Error("Не удалось получить ID сохранённой фотографии.");
  }

  return id;
}

export async function updateEntryImage(
  db: D1Database,
  id: number,
  values: {
    placement: EntryImagePlacement;
    sortOrder: number;
    caption: string | null;
  },
): Promise<boolean> {
  const caption = normalizeImageCaption(values.caption);
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !["before", "after"].includes(values.placement) ||
    !Number.isInteger(values.sortOrder) ||
    values.sortOrder < 0 ||
    values.sortOrder >= MAX_ENTRY_IMAGES ||
    (caption !== null && caption.length > MAX_IMAGE_CAPTION_LENGTH)
  ) {
    throw new TypeError("Некорректные изменения фотографии.");
  }

  const result = await db
    .prepare(`
      UPDATE entry_images
      SET placement = ?, sort_order = ?, caption = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(values.placement, values.sortOrder, caption, id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function deleteEntryImage(
  db: D1Database,
  id: number,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM entry_images WHERE id = ?")
    .bind(id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}
