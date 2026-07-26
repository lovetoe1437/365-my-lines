import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro";
import { env, waitUntil } from "cloudflare:workers";
import { isAdmin, isReader } from "./lib/auth/session";
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

const PUBLIC_ROUTES = new Set([
  "/access",
  "/api/access",
  "/login",
  "/api/login",
  "/prologue",
  "/robots.txt",
  "/sitemap.xml",
]);

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/_astro/");

const readerLoginUrl = (context: APIContext) => {
  const next = `${context.url.pathname}${context.url.search}`;
  const url = new URL("/access", context.url);
  url.searchParams.set("next", next);
  return url.pathname + url.search;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  if (!isPublicRoute(pathname) && !(await isReader(context))) {
    return context.redirect(readerLoginUrl(context), 302);
  }

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
