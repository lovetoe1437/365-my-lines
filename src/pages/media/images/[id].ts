import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getEntryImage } from "../../../lib/db/entry-images.ts";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const metadata = await getEntryImage(env.DB, id);
  if (!metadata) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.IMAGES_BUCKET.get(metadata.object_key);
  if (!object) {
    console.error(`Файл фотографии ${id} отсутствует в R2.`);
    return new Response("Not found", { status: 404 });
  }

  if (request.headers.get("If-None-Match") === object.httpEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: object.httpEtag,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": metadata.mime_type,
      "Content-Length": String(metadata.size_bytes),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
};
