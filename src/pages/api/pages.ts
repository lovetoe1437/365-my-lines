import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createPage } from "../../lib/db/pages";
import {
  isValidEntryDate,
  isValidEntryTitle,
} from "../../lib/validation/entries";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const entryDate = String(formData.get("entryDate") ?? "").trim();

    if (!isValidEntryTitle(title) || !content || !isValidEntryDate(entryDate)) {
      return Response.json(
        {
          ok: false,
          message: "Заполни дату, название и текст записи.",
        },
        { status: 400 },
      );
    }

    const id = await createPage(env.DB, {
      title,
      content,
      entryDate,
    });

    return Response.json(
      {
        ok: true,
        id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Не удалось сохранить запись:", error);

    return Response.json(
      {
        ok: false,
        message: "Не удалось сохранить запись. Попробуй ещё раз.",
      },
      { status: 500 },
    );
  }
};
