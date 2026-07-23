import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  deletePage,
  updatePage,
} from "../../../lib/db/pages";

export const prerender = false;

const getValidId = (value: string | undefined) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const id = getValidId(params.id);

    if (id === null) {
      return Response.json(
        {
          ok: false,
          message: "Некорректный номер записи.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const entryDate = String(formData.get("entryDate") ?? "").trim();

    if (!title || !content || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return Response.json(
        {
          ok: false,
          message: "Заполни дату, название и текст записи.",
        },
        { status: 400 },
      );
    }

    const updated = await updatePage(env.DB, id, {
      title,
      content,
      entryDate,
    });

    if (!updated) {
      return Response.json(
        { ok: false, message: "Запись не найдена. Возможно, она уже была удалена." },
        { status: 404 },
      );
    }

    return Response.json({
      ok: true,
      id,
    });
  } catch (error) {
    console.error("Не удалось обновить запись:", error);

    return Response.json(
      {
        ok: false,
        message: "Не удалось сохранить изменения. Попробуй ещё раз.",
      },
      { status: 500 },
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = getValidId(params.id);

    if (id === null) {
      return Response.json(
        {
          ok: false,
          message: "Некорректный номер записи.",
        },
        { status: 400 },
      );
    }

    const deleted = await deletePage(env.DB, id);

    if (!deleted) {
      return Response.json(
        { ok: false, message: "Запись уже удалена или не существует." },
        { status: 404 },
      );
    }

    return Response.json({
      ok: true,
    });
  } catch (error) {
    console.error("Не удалось удалить запись:", error);

    return Response.json(
      {
        ok: false,
        message: "Не удалось удалить запись. Попробуй ещё раз.",
      },
      { status: 500 },
    );
  }
};