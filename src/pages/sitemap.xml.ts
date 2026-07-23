import type { APIRoute } from "astro";

const publicRoutes = ["/", "/lines", "/book"];

export const GET: APIRoute = ({ site, url }) => {
  const origin = site?.origin ?? url.origin;
  const urls = publicRoutes
    .map((path) => `<url><loc>${new URL(path, origin).href}</loc><changefreq>weekly</changefreq><priority>${path === "/" ? "1.0" : "0.8"}</priority></url>`)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
