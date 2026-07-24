import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getSiteVisits } from "../../../lib/db/site-visits.ts";
import { parseVisitQuery } from "../../../lib/visits/query.ts";

export const prerender = false;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = parseVisitQuery(url.searchParams);
    const result = await getSiteVisits(env.DB, query);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Не удалось получить историю посещений.", error);
    return new Response(
      JSON.stringify({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        message: "Не удалось загрузить историю посещений.",
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
};
