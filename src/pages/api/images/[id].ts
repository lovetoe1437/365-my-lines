import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { imageErrorResponse } from "../../../lib/images/http.ts";
import {
  changeEntryImage,
  removeEntryImage,
} from "../../../lib/images/service.ts";

export const prerender = false;

function validId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError("Некорректный номер фотографии.");
  }
  return id;
}

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const id = validId(params.id);
    const data = await request.formData();
    const placementValue = data.get("placement");
    if (placementValue !== "before" && placementValue !== "after") {
      throw new TypeError("Выберите положение фотографии.");
    }

    const updated = await changeEntryImage(env.DB, id, {
      placement: placementValue,
      sortOrder: Number(data.get("sortOrder")),
      caption: String(data.get("caption") ?? ""),
    });
    if (!updated) {
      return Response.json(
        { ok: false, message: "Фотография не найдена." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error("Не удалось изменить фотографию:", error);
    return imageErrorResponse(error);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = validId(params.id);
    const deleted = await removeEntryImage(env.DB, env.IMAGES_BUCKET, id);
    if (!deleted) {
      return Response.json(
        { ok: false, message: "Фотография уже удалена или не существует." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Не удалось удалить фотографию:", error);
    return imageErrorResponse(error);
  }
};
