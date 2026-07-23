export const MAX_ENTRY_IMAGES = 6;
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_CAPTION_LENGTH = 280;
export const MAX_IMAGE_DIMENSION = 12_000;

export const ENTRY_IMAGE_PLACEMENTS = ["before", "after"] as const;
export type EntryImagePlacement = (typeof ENTRY_IMAGE_PLACEMENTS)[number];

export const STORED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type StoredImageMimeType = (typeof STORED_IMAGE_MIME_TYPES)[number];

export type EntryImageOwner =
  | { kind: "book"; id: number }
  | { kind: "diary"; id: number };

export type EntryImageMetadata = {
  owner: EntryImageOwner;
  objectKey: string;
  objectEtag: string;
  placement: EntryImagePlacement;
  sortOrder: number;
  caption: string | null;
  mimeType: StoredImageMimeType;
  width: number;
  height: number;
  sizeBytes: number;
};

export function normalizeImageCaption(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const caption = value.replace(/\s+/g, " ").trim();
  return caption || null;
}

export function isEntryImagePlacement(value: unknown): value is EntryImagePlacement {
  return (
    typeof value === "string" &&
    ENTRY_IMAGE_PLACEMENTS.includes(value as EntryImagePlacement)
  );
}

export function isStoredImageMimeType(value: unknown): value is StoredImageMimeType {
  return (
    typeof value === "string" &&
    STORED_IMAGE_MIME_TYPES.includes(value as StoredImageMimeType)
  );
}

export function isValidEntryImageOwner(owner: EntryImageOwner): boolean {
  return (
    (owner.kind === "book" || owner.kind === "diary") &&
    Number.isInteger(owner.id) &&
    owner.id > 0
  );
}

export function isValidEntryImageMetadata(
  metadata: EntryImageMetadata,
): boolean {
  const caption = normalizeImageCaption(metadata.caption);

  return (
    isValidEntryImageOwner(metadata.owner) &&
    metadata.objectKey.trim().length > 0 &&
    metadata.objectKey.length <= 1024 &&
    metadata.objectEtag.trim().length > 0 &&
    metadata.objectEtag.length <= 256 &&
    isEntryImagePlacement(metadata.placement) &&
    Number.isInteger(metadata.sortOrder) &&
    metadata.sortOrder >= 0 &&
    metadata.sortOrder < MAX_ENTRY_IMAGES &&
    (caption === null || caption.length <= MAX_IMAGE_CAPTION_LENGTH) &&
    isStoredImageMimeType(metadata.mimeType) &&
    Number.isInteger(metadata.width) &&
    metadata.width > 0 &&
    metadata.width <= MAX_IMAGE_DIMENSION &&
    Number.isInteger(metadata.height) &&
    metadata.height > 0 &&
    metadata.height <= MAX_IMAGE_DIMENSION &&
    Number.isInteger(metadata.sizeBytes) &&
    metadata.sizeBytes > 0 &&
    metadata.sizeBytes <= MAX_IMAGE_SIZE_BYTES
  );
}
