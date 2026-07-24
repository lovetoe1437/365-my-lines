import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { deleteBookLine, updateBookLine } from "../../../lib/db/book-lines";
import { removeAllEntryImages } from "../../../lib/images/service";
import {
  isUniqueConstraintError,
  isValidEntryDate,
  isValidEntryTitle,
} from "../../../lib/validation/entries";

export const prerender = false;
const validId = (value: string | undefined) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const id = validId(params.id);
    if (!id) return Response.json({ ok: false, message: "Некорректный ID строки." }, { status: 400 });
    const data = await request.formData();
    const number = Number(data.get("number"));
    const title = String(data.get("title") ?? "").trim();
    const content = String(data.get("content") ?? "").trim();
    const lineDate = String(data.get("lineDate") ?? "").trim();
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 365 ||
      !isValidEntryTitle(title) ||
      !content ||
      !isValidEntryDate(lineDate)
    ) {
      return Response.json({ ok: false, message: "Заполни номер, дату, название и текст строки." }, { status: 400 });
    }
    const updated = await updateBookLine(env.DB, id, { number, title, content, lineDate });
    if (!updated) {
      return Response.json(
        { ok: false, message: "Страница книги не найдена. Возможно, она уже была удалена." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error("Не удалось обновить строку:", error);

    if (isUniqueConstraintError(error)) {
      return Response.json(
        { ok: false, message: "Строка с таким номером уже существует." },
        { status: 409 },
      );
    }

    return Response.json({ ok: false, message: "Не удалось сохранить изменения." }, { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = validId(params.id);
    if (!id) return Response.json({ ok: false, message: "Некорректный ID строки." }, { status: 400 });
    await removeAllEntryImages(env.DB, env.IMAGES_BUCKET, { kind: "book", id });
    const deleted = await deleteBookLine(env.DB, id);
    if (!deleted) {
      return Response.json(
        { ok: false, message: "Страница книги уже удалена или не существует." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Не удалось удалить строку:", error);
    return Response.json({ ok: false, message: "Не удалось удалить строку." }, { status: 500 });
  }
};
