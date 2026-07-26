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

const TRUSTED_FORM_ORIGINS = new Set([
  "https://365mylines.com",
  "https://www.365mylines.com",
  "https://365-my-lines.pages.dev",
]);

const isUnsafeRequest = (request: Request) =>
  !["GET", "HEAD", "OPTIONS"].includes(request.method);

const hasTrustedFormOrigin = (context: APIContext) => {
  if (!isUnsafeRequest(context.request)) return true;

  const origin = context.request.headers.get("origin");
  if (origin && origin !== "null") {
    return TRUSTED_FORM_ORIGINS.has(origin) || origin === context.url.origin;
  }

  const referer = context.request.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return TRUSTED_FORM_ORIGINS.has(refererOrigin) || refererOrigin === context.url.origin;
    } catch {
      return false;
    }
  }

  // Safari can omit Origin and Referer on a same-site form submission.
  return context.request.headers.get("sec-fetch-site") !== "cross-site";
};

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/_astro/");

const applySecurityHeaders = (response: Response, isPrivateRoute: boolean) => {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  if (isPrivateRoute && !response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
};

const readerLoginUrl = (context: APIContext) => {
  const next = `${context.url.pathname}${context.url.search}`;
  const url = new URL("/access", context.url);
  url.searchParams.set("next", next);
  return url.pathname + url.search;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  if (!hasTrustedFormOrigin(context)) {
    return applySecurityHeaders(new Response("Forbidden", { status: 403 }), true);
  }

  if (!isPublicRoute(pathname) && !(await isReader(context))) {
    return applySecurityHeaders(context.redirect(readerLoginUrl(context), 302), true);
  }

  const isEditRoute = /^\/lines\/d-\d+\/edit\/?$/.test(pathname) || /^\/pages\/\d+\/edit\/?$/.test(pathname);
  const isProtectedRoute = isEditRoute || PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isProtectedRoute && !(await isAdmin(context))) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(new Response(
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
      ), true);
    }

    return applySecurityHeaders(context.redirect("/login", 302), true);
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

  return applySecurityHeaders(response, !isPublicRoute(pathname));
});
