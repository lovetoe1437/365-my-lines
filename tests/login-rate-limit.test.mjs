import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLoginAttempt,
  createLoginRateLimitKey,
  emptyLoginRateLimitState,
  loginRateLimitTtlSeconds,
  parseLoginRateLimitState,
  recordFailedLogin,
} from "../src/lib/auth/login-rate-limit.ts";

test("десять ошибок входа запускают короткую блокировку", () => {
  const now = 1_000_000;
  let state = emptyLoginRateLimitState(now);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    state = recordFailedLogin(state, now + attempt);
  }

  assert.equal(state.failures, 10);
  assert.equal(state.blockedUntil, now + 9 + 10 * 60 * 1000);
  assert.deepEqual(checkLoginAttempt(state, now + 10), {
    allowed: false,
    retryAfterSeconds: 600,
  });
  assert.equal(checkLoginAttempt(state, state.blockedUntil).allowed, true);
  assert.ok(loginRateLimitTtlSeconds(state, now) >= 60);
});

test("счётчик сбрасывается после окна и повреждённые данные не принимаются", () => {
  const now = 1_000_000;
  const state = emptyLoginRateLimitState(now);
  assert.equal(checkLoginAttempt(state, state.windowEndsAt).allowed, true);
  assert.equal(parseLoginRateLimitState("not-json"), null);
  assert.equal(parseLoginRateLimitState('{"failures":-1}'), null);
});

test("ключ лимита не хранит IP и одинаков для одного адреса", async () => {
  const secret = "a".repeat(32);
  const first = await createLoginRateLimitKey("203.0.113.10", secret);
  const second = await createLoginRateLimitKey("203.0.113.10", secret);
  const other = await createLoginRateLimitKey("203.0.113.11", secret);
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.equal(first?.includes("203.0.113.10"), false);
});
