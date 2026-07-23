import { defineMiddleware } from "astro:middleware";
import { isAdmin } from "./lib/auth/session";

const PROTECTED_ROUTES = [
  "/lines/write",
  "/diary/write",
  "/write",
  "/api/pages",
  "/api/lines",
  "/api/unspoken",
  "/unspoken/edit",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const isEditRoute = /^\/lines\/d-\d+\/edit\/?$/.test(pathname) || /^\/pages\/\d+\/edit\/?$/.test(pathname);
  const isProtectedRoute = isEditRoute || PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!isProtectedRoute) return next();

  if (!(await isAdmin(context))) {
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

  return next();
});
