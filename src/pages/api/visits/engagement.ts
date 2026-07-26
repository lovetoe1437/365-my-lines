import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { recordSiteVisit } from "../../../lib/db/site-visits.ts";
import { createVisitInput } from "../../../lib/visits/tracker.ts";

export const prerender = false;

const MAX_BODY_LENGTH = 512;
const MAX_ACTIVE_SECONDS = 43_200;
const MAX_STARTED_AT_AGE = 24 * 60 * 60 * 1_000;

const isReadablePath = (value: unknown): value is string =>
  typeof value === "string"
  && value.startsWith("/")
  && !value.startsWith("//")
  && !value.startsWith("/api/")
  && !value.startsWith("/admin")
  && !value.startsWith("/media/")
  && !value.includes("\\");

export const POST: APIRoute = async ({ request }) => {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) return new Response(null, { status: 204 });

    const payload = JSON.parse(raw) as {
      path?: unknown;
      startedAt?: unknown;
      activeSeconds?: unknown;
    };
    if (!isReadablePath(payload.path) || !Number.isFinite(payload.startedAt) || !Number.isFinite(payload.activeSeconds)) {
      return new Response(null, { status: 204 });
    }

    const startedAt = new Date(payload.startedAt);
    const age = Date.now() - startedAt.getTime();
    if (Number.isNaN(startedAt.getTime()) || age < -60_000 || age > MAX_STARTED_AT_AGE) {
      return new Response(null, { status: 204 });
    }

    const activeSeconds = Math.max(0, Math.min(MAX_ACTIVE_SECONDS, payload.activeSeconds));
    const url = new URL(request.url);
    url.pathname = payload.path;
    url.search = "";
    const trackedRequest = new Request(url, { headers: request.headers });
    const visit = await createVisitInput(
      trackedRequest,
      env.VISITOR_HASH_SECRET,
      startedAt,
      { visitorType: "human", activeSeconds },
    );
    if (visit) await recordSiteVisit(env.DB, visit);
  } catch (error) {
    console.error("Could not record visit engagement", error);
  }

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
