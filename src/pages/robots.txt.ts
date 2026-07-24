import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = site?.origin ?? url.origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /login",
    "Disallow: /write",
    "Disallow: /diary/write",
    "Disallow: /pages/*/edit",
    "Disallow: /prologue",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
