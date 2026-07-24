import { defineMiddleware } from "astro:middleware";
import { env, waitUntil } from "cloudflare:workers";
import { isAdmin } from "./lib/auth/session";
import { recordSiteVisit } from "./lib/db/site-visits";
import {
  createVisitInput,
  shouldTrackVisit,
} from "./lib/visits/tracker";

const PROTECTED_ROUTES = [
  "/lines/write",
  "/diary/write",
  "/write",
  "/api/pages",
  "/api/lines",
  "/api/images",
  "/api/unspoken",
  "/api/admin",
  "/admin",
  "/unspoken/edit",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const isEditRoute = /^\/lines\/d-\d+\/edit\/?$/.test(pathname) || /^\/pages\/\d+\/edit\/?$/.test(pathname);
  const isProtectedRoute = isEditRoute || PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isProtectedRoute && !(await isAdmin(context))) {
    if (pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Сессия завершилась. Войдите снова.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return context.redirect("/login", 302);
  }

  const response = await next();

  if (shouldTrackVisit(context.request, response)) {
    waitUntil(
      createVisitInput(
        context.request,
        env.VISITOR_HASH_SECRET,
      )
        .then((visit) => visit && recordSiteVisit(env.DB, visit))
        .catch((error) => {
          console.error("Не удалось записать посещение.", error);
        }),
    );
  }

  return response;
});
