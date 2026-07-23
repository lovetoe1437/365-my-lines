import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE_BYTES,
  type EntryImageMetadata,
  type EntryImageOwner,
} from "./metadata.ts";

export const MAX_STORED_IMAGE_DIMENSION = 2400;
export const STORED_IMAGE_QUALITY = 82;

const ACCEPTED_INPUT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type InputImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";

export type StoredEntryImage = Omit<EntryImageMetadata, "caption" | "placement" | "sortOrder">;

export class ImageStorageError extends Error {
  readonly code:
    | "invalid_file"
    | "unsupported_format"
    | "file_too_large"
    | "invalid_dimensions"
    | "processing_failed"
    | "storage_failed";

  constructor(code: ImageStorageError["code"], message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ImageStorageError";
    this.code = code;
  }
}

function hasBytes(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

export function detectInputImageMimeType(bytes: Uint8Array): InputImageMimeType | null {
  if (bytes.length >= 3 && hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 12 && readAscii(bytes, 4, 4) === "ftyp") {
    const brand = readAscii(bytes, 8, 4).toLowerCase();
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
    if (["mif1", "msf1"].includes(brand)) {
      return "image/heif";
    }
  }

  return null;
}

export function isAcceptedInputMimeType(value: string): boolean {
  return ACCEPTED_INPUT_MIME_TYPES.has(value.toLowerCase());
}

export function doesDeclaredMimeTypeMatch(
  declaredType: string,
  detectedType: InputImageMimeType,
): boolean {
  if (!declaredType) return true;
  const normalizedType = declaredType.toLowerCase();
  if (
    (detectedType === "image/heic" || detectedType === "image/heif") &&
    (normalizedType === "image/heic" || normalizedType === "image/heif")
  ) {
    return true;
  }
  return normalizedType === detectedType;
}

export function createEntryImageObjectKey(
  owner: EntryImageOwner,
  id = crypto.randomUUID(),
): string {
  const ownerType = owner.kind === "book" ? "book" : "diary";
  const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!Number.isInteger(owner.id) || owner.id <= 0 || !safeId) {
    throw new ImageStorageError("invalid_file", "Некорректный владелец фотографии.");
  }

  return `entries/${ownerType}/${owner.id}/${safeId}.webp`;
}

export function calculateStoredDimensions(
  width: number,
  height: number,
  limit = MAX_STORED_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    throw new ImageStorageError(
      "invalid_dimensions",
      "Не удалось определить корректный размер фотографии.",
    );
  }

  const scale = Math.min(1, limit / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function validateInputFile(file: File): Promise<InputImageMimeType> {
  if (!(file instanceof File) || file.size <= 0) {
    throw new ImageStorageError("invalid_file", "Выберите непустой файл фотографии.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageStorageError(
      "file_too_large",
      "Размер исходной фотографии не должен превышать 15 МБ.",
    );
  }

  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const detectedType = detectInputImageMimeType(header);
  if (!detectedType) {
    throw new ImageStorageError(
      "unsupported_format",
      "Поддерживаются фотографии JPEG, PNG, WebP, HEIC и HEIF.",
    );
  }

  if (
    file.type &&
    (!isAcceptedInputMimeType(file.type) ||
      !doesDeclaredMimeTypeMatch(file.type, detectedType))
  ) {
    throw new ImageStorageError(
      "unsupported_format",
      "Формат файла не соответствует поддерживаемому изображению.",
    );
  }

  return detectedType;
}

export async function processAndStoreEntryImage(
  images: ImagesBinding,
  bucket: R2Bucket,
  owner: EntryImageOwner,
  file: File,
): Promise<StoredEntryImage> {
  await validateInputFile(file);

  let sourceInfo: ImageInfoResponse;
  try {
    sourceInfo = await images.info(file.stream());
  } catch (error) {
    throw new ImageStorageError(
      "processing_failed",
      "Cloudflare не удалось прочитать эту фотографию.",
      error,
    );
  }

  if (!("width" in sourceInfo)) {
    throw new ImageStorageError(
      "unsupported_format",
      "Векторные изображения не поддерживаются.",
    );
  }

  const dimensions = calculateStoredDimensions(sourceInfo.width, sourceInfo.height);
  let processed: ArrayBuffer;
  try {
    const result = await images
      .input(file.stream())
      .transform({
        width: MAX_STORED_IMAGE_DIMENSION,
        height: MAX_STORED_IMAGE_DIMENSION,
        fit: "scale-down",
      })
      .output({
        format: "image/webp",
        quality: STORED_IMAGE_QUALITY,
        anim: false,
      });
    processed = await new Response(result.image()).arrayBuffer();
  } catch (error) {
    throw new ImageStorageError(
      "processing_failed",
      "Не удалось подготовить фотографию для книги.",
      error,
    );
  }

  if (processed.byteLength <= 0 || processed.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageStorageError(
      "processing_failed",
      "После обработки фотография осталась слишком большой.",
    );
  }

  const objectKey = createEntryImageObjectKey(owner);
  let object: R2Object;
  try {
    object = await bucket.put(objectKey, processed, {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "private, max-age=31536000, immutable",
      },
      customMetadata: {
        ownerKind: owner.kind,
        ownerId: String(owner.id),
        width: String(dimensions.width),
        height: String(dimensions.height),
      },
    });
  } catch (error) {
    throw new ImageStorageError(
      "storage_failed",
      "Не удалось сохранить подготовленную фотографию.",
      error,
    );
  }

  return {
    owner,
    objectKey,
    objectEtag: object.httpEtag,
    mimeType: "image/webp",
    width: dimensions.width,
    height: dimensions.height,
    sizeBytes: processed.byteLength,
  };
}

export async function deleteStoredEntryImage(
  bucket: R2Bucket,
  objectKey: string,
): Promise<void> {
  if (!objectKey.startsWith("entries/") || objectKey.includes("..")) {
    throw new ImageStorageError("invalid_file", "Некорректный путь фотографии.");
  }

  try {
    await bucket.delete(objectKey);
  } catch (error) {
    throw new ImageStorageError(
      "storage_failed",
      "Не удалось удалить фотографию из хранилища.",
      error,
    );
  }
}
