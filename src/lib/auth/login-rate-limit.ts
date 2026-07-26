const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;

export type LoginRateLimitState = {
  failures: number;
  windowEndsAt: number;
  blockedUntil: number | null;
};

export type LoginAttemptCheck =
  | { allowed: true; state: LoginRateLimitState }
  | { allowed: false; retryAfterSeconds: number };

export const emptyLoginRateLimitState = (now: number): LoginRateLimitState => ({
  failures: 0,
  windowEndsAt: now + WINDOW_MS,
  blockedUntil: null,
});

export const checkLoginAttempt = (
  state: LoginRateLimitState | null,
  now: number,
): LoginAttemptCheck => {
  if (!state || state.windowEndsAt <= now || (state.blockedUntil !== null && state.blockedUntil <= now)) {
    return { allowed: true, state: emptyLoginRateLimitState(now) };
  }

  if (state.blockedUntil !== null) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }

  return { allowed: true, state };
};

export const recordFailedLogin = (
  state: LoginRateLimitState,
  now: number,
): LoginRateLimitState => {
  const failures = state.failures + 1;
  return {
    ...state,
    failures,
    blockedUntil: failures >= MAX_FAILURES ? now + BLOCK_MS : null,
  };
};

export const loginRateLimitTtlSeconds = (state: LoginRateLimitState, now: number) =>
  Math.max(60, Math.ceil((Math.max(state.windowEndsAt, state.blockedUntil ?? 0) - now) / 1000));

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const createLoginRateLimitKey = async (
  ip: string | null,
  secret: string | undefined,
): Promise<string | null> => {
  if (!ip || !secret || secret.length < 32) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`reader-login\\n${ip}`),
  );

  return `reader-login:${toHex(signature)}`;
};

export const parseLoginRateLimitState = (value: string | null): LoginRateLimitState | null => {
  if (!value) return null;

  try {
    const state = JSON.parse(value) as Partial<LoginRateLimitState>;
    if (
      !Number.isInteger(state.failures) || state.failures < 0 ||
      !Number.isFinite(state.windowEndsAt) ||
      (state.blockedUntil !== null && state.blockedUntil !== undefined && !Number.isFinite(state.blockedUntil))
    ) {
      return null;
    }

    return {
      failures: state.failures,
      windowEndsAt: state.windowEndsAt,
      blockedUntil: state.blockedUntil ?? null,
    };
  } catch {
    return null;
  }
};
