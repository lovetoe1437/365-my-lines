import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createBookLine } from "../../lib/db/book-lines";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const number = Number(data.get("number"));
    const title = String(data.get("title") ?? "").trim();
    const content = String(data.get("content") ?? "").trim();
    const lineDate = String(data.get("lineDate") ?? "").trim();

    if (!Number.isInteger(number) || number < 1 || number > 365 || !title || !content || !lineDate) {
      return Response.json({ ok: false, message: "Заполни номер, дату, название и текст строки." }, { status: 400 });
    }

    const id = await createBookLine(env.DB, { number, title, content, lineDate });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("Не удалось сохранить строку:", error);
    const message = error instanceof Error && error.message.includes("UNIQUE")
      ? "Строка с таким номером уже существует."
      : "Не удалось сохранить строку. Попробуй ещё раз.";
    return Response.json({ ok: false, message }, { status: 500 });
  }
};
