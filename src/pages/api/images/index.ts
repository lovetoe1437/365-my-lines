import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { imageErrorResponse } from "../../../lib/images/http.ts";
import {
  uploadEntryImage,
  type UploadEntryImageInput,
} from "../../../lib/images/service.ts";

export const prerender = false;

function readOwner(kind: FormDataEntryValue | null, idValue: FormDataEntryValue | null) {
  const id = Number(idValue);
  if ((kind !== "book" && kind !== "diary") || !Number.isInteger(id) || id <= 0) {
    throw new TypeError("Некорректная страница для фотографии.");
  }
  return { kind, id } as UploadEntryImageInput["owner"];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const file = data.get("image");
    if (!(file instanceof File)) {
      throw new TypeError("Выберите фотографию.");
    }

    const placementValue = data.get("placement");
    const placement =
      placementValue === "before" || placementValue === "after"
        ? placementValue
        : null;
    if (!placement) {
      throw new TypeError("Выберите положение фотографии.");
    }

    const input: UploadEntryImageInput = {
      owner: readOwner(data.get("ownerKind"), data.get("ownerId")),
      file,
      placement,
      sortOrder: Number(data.get("sortOrder")),
      caption: String(data.get("caption") ?? ""),
    };
    const image = await uploadEntryImage(
      env.DB,
      env.IMAGES_BUCKET,
      env.IMAGES,
      input,
    );

    return Response.json(
      {
        ok: true,
        image: {
          id: image.id,
          placement: image.placement,
          sortOrder: image.sort_order,
          caption: image.caption,
          width: image.width,
          height: image.height,
          url: `/media/images/${image.id}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Не удалось загрузить фотографию:", error);
    return imageErrorResponse(error);
  }
};
