import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createBookLine } from "../../lib/db/book-lines";
import {
  isUniqueConstraintError,
  isValidEntryDate,
  isValidEntryTitle,
} from "../../lib/validation/entries";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
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

    const id = await createBookLine(env.DB, { number, title, content, lineDate });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Не удалось сохранить строку:", error);
    if (isUniqueConstraintError(error)) {
      return Response.json(
        { ok: false, message: "Строка с таким номером уже существует." },
        { status: 409 },
      );
    }

    return Response.json(
      { ok: false, message: "Не удалось сохранить строку. Попробуй ещё раз." },
      { status: 500 },
    );
  }
};
