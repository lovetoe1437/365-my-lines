import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { verifyPassword } from "../../lib/auth/password";
import { safeInternalPath } from "../../lib/auth/redirect";
import { createReaderSession } from "../../lib/auth/session";
import {
  checkLoginAttempt,
  createLoginRateLimitKey,
  emptyLoginRateLimitState,
  loginRateLimitTtlSeconds,
  parseLoginRateLimitState,
  recordFailedLogin,
} from "../../lib/auth/login-rate-limit";

export const GET: APIRoute = (context) => context.redirect("/access", 302);

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const passwordValue = formData.get("password");
  const next = safeInternalPath(formData.get("next"), context.url.origin);
  const rateLimitKey = await createLoginRateLimitKey(
    context.request.headers.get("cf-connecting-ip"),
    env.VISITOR_HASH_SECRET,
  );
  const now = Date.now();
  let rateLimitState = null;

  if (rateLimitKey) {
    try {
      rateLimitState = parseLoginRateLimitState(
        await env.LOGIN_RATE_LIMIT.get(rateLimitKey),
      );
      const attempt = checkLoginAttempt(rateLimitState, now);
      if (!attempt.allowed) {
        return context.redirect(`/access?error=too-many-attempts&next=${encodeURIComponent(next)}`, 303);
      }
      rateLimitState = attempt.state;
    } catch (error) {
      console.error("Could not check reader login rate limit", error);
      rateLimitState = null;
    }
  }

  if (typeof passwordValue !== "string" || passwordValue.length === 0 || passwordValue.length > 512) {
    return context.redirect(`/access?error=invalid&next=${encodeURIComponent(next)}`, 303);
  }

  const readerPassword = env.READER_PASSWORD;
  if (typeof readerPassword !== "string" || readerPassword.length === 0) {
    console.error("READER_PASSWORD is not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  if (!(await verifyPassword(passwordValue, readerPassword))) {
    if (rateLimitKey && rateLimitState) {
      try {
        const failedAttempt = recordFailedLogin(rateLimitState, now);
        await env.LOGIN_RATE_LIMIT.put(
          rateLimitKey,
          JSON.stringify(failedAttempt),
          { expirationTtl: loginRateLimitTtlSeconds(failedAttempt, now) },
        );
      } catch (error) {
        console.error("Could not record reader login failure", error);
      }
    }
    return context.redirect(`/access?error=wrong-password&next=${encodeURIComponent(next)}`, 303);
  }

  if (rateLimitKey) {
    try {
      await env.LOGIN_RATE_LIMIT.delete(rateLimitKey);
    } catch (error) {
      console.error("Could not reset reader login rate limit", error);
    }
  }

  await createReaderSession(context);
  return context.redirect(next, 303);
};
