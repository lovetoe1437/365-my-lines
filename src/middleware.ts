import { defineMiddleware } from "astro:middleware";
import { isAdmin } from "./lib/auth/session";

const PROTECTED_ROUTES = ["/dashboard", "/write", "/edit"];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  console.log("[middleware]", pathname);

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return next();
  }

  const authenticated = await isAdmin(context);

  console.log("[middleware] admin:", authenticated);

  if (!authenticated) {
    return context.redirect("/login", 302);
  }

  return next();
});
