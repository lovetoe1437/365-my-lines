import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { updateUnspoken, type UnspokenVisibility } from "../../../lib/db/unspoken";

const MAX_UNSPOKEN_FIELD_LENGTH = 20_000;
const MAX_UNSPOKEN_TOTAL_LENGTH = 100_000;

export const prerender = false;

const paragraphs = (value: FormDataEntryValue | null) => String(value ?? "")
  .split(/\n\s*\n/)
  .map((item) => item.trim())
  .filter(Boolean);

export const PUT: APIRoute = async ({ request }) => {
  try {
    const data = await request.formData();
    const visibilityValue = String(data.get("visibility") ?? "hidden");
    const visibility: UnspokenVisibility = visibilityValue === "epilogue" || visibilityValue === "link"
      ? visibilityValue
      : "hidden";

    const content = {
      eyebrow: String(data.get("eyebrow") ?? "").trim(),
      title: String(data.get("title") ?? "").trim(),
      opening: paragraphs(data.get("opening")),
      sectionTitle: String(data.get("sectionTitle") ?? "").trim(),
      story: paragraphs(data.get("story")),
      signature: String(data.get("signature") ?? "").trim(),
      motto: String(data.get("motto") ?? "").trim(),
      version: String(data.get("version") ?? "").trim(),
      date: String(data.get("date") ?? "").trim(),
      visibility,
    };

    const textValues = [
      content.eyebrow, content.title, ...content.opening, content.sectionTitle,
      ...content.story, content.signature, content.motto, content.version, content.date,
    ];
    const exceedsLimit = textValues.some((value) => value.length > MAX_UNSPOKEN_FIELD_LENGTH)
      || textValues.reduce((total, value) => total + value.length, 0) > MAX_UNSPOKEN_TOTAL_LENGTH;

    if (!content.title || !content.opening.length || !content.sectionTitle || !content.story.length || exceedsLimit) {
      return Response.json({ ok: false, message: "Заголовок, вступление и основной текст не могут быть пустыми." }, { status: 400 });
    }

    await updateUnspoken(env.DB, content);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Не удалось сохранить Unspoken:", error);
    return Response.json({ ok: false, message: "Не удалось сохранить страницу. Проверь миграцию базы и попробуй снова." }, { status: 500 });
  }
};
