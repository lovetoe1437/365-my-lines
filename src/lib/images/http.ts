import { EntryImageLimitError } from "../db/entry-images.ts";
import {
  EntryImageConsistencyError,
  EntryImageOwnerNotFoundError,
} from "./service.ts";
import { ImageStorageError } from "./storage.ts";

export function imageErrorResponse(error: unknown): Response {
  if (error instanceof EntryImageOwnerNotFoundError) {
    return Response.json({ ok: false, message: error.message }, { status: 404 });
  }
  if (error instanceof EntryImageLimitError) {
    return Response.json({ ok: false, message: error.message }, { status: 409 });
  }
  if (error instanceof ImageStorageError) {
    const status =
      error.code === "file_too_large"
        ? 413
        : error.code === "unsupported_format"
          ? 415
          : error.code === "storage_failed"
            ? 503
            : 422;
    return Response.json({ ok: false, message: error.message }, { status });
  }
  if (error instanceof TypeError) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
  if (error instanceof EntryImageConsistencyError) {
    return Response.json(
      {
        ok: false,
        message:
          "Не удалось завершить сохранение фотографии. Повторите попытку позднее.",
      },
      { status: 500 },
    );
  }

  return Response.json(
    {
      ok: false,
      message: "Не удалось выполнить операцию с фотографией.",
    },
    { status: 500 },
  );
}
