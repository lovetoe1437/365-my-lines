import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { verifyPassword } from "../../lib/auth/password";
import { createAdminSession } from "../../lib/auth/session";

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const passwordValue = formData.get("password");

  if (typeof passwordValue !== "string" || passwordValue.length === 0) {
    return context.redirect("/login?error=invalid", 303);
  }

  const adminPassword = env.ADMIN_PASSWORD;

  if (typeof adminPassword !== "string" || adminPassword.length === 0) {
    console.error("ADMIN_PASSWORD is not configured");

    return new Response("Server configuration error", {
      status: 500
    });
  }

  const passwordIsValid = await verifyPassword(
    passwordValue,
    adminPassword
  );

  if (!passwordIsValid) {
    return context.redirect("/login?error=wrong-password", 303);
  }

  createAdminSession(context);

  return context.redirect("/dashboard", 303);
};
