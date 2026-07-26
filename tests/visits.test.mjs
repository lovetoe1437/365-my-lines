import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisitInput,
  shouldTrackVisit,
} from "../src/lib/visits/tracker.ts";
import { parseVisitClient } from "../src/lib/visits/userAgent.ts";
import {
  getVisitPeriodStart,
  parseVisitQuery,
} from "../src/lib/visits/query.ts";

const htmlResponse = () =>
  new Response("", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const browserRequest = (path = "/book", headers = {}) =>
  new Request(`https://example.com${path}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
      "sec-fetch-dest": "document",
      ...headers,
    },
  });

test("публичная HTML-страница записывается", () => {
  assert.equal(shouldTrackVisit(browserRequest(), htmlResponse()), true);
});

test("админка, API, изображения, редакторы и боты не записываются", () => {
  for (const path of [
    "/admin/visits",
    "/api/admin/visits",
    "/media/images/1",
    "/access",
    "/login",
    "/lines/write",
    "/lines/d-1/edit",
    "/pages/1/edit",
  ]) {
    assert.equal(shouldTrackVisit(browserRequest(path), htmlResponse()), false);
  }

  assert.equal(
    shouldTrackVisit(
      browserRequest("/", { "user-agent": "Googlebot/2.1" }),
      htmlResponse(),
    ),
    false,
  );
});
test("не-HTML и предварительная загрузка не записываются", () => {
  assert.equal(
    shouldTrackVisit(
      browserRequest("/styles.css"),
      new Response("", { headers: { "content-type": "text/css" } }),
    ),
    false,
  );
  assert.equal(
    shouldTrackVisit(browserRequest("/", { purpose: "prefetch" }), htmlResponse()),
    false,
  );
});

test("iPhone Safari определяется без выдуманной модели", () => {
  assert.deepEqual(
    parseVisitClient(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
    ),
    {
      deviceType: "mobile",
      deviceName: "iPhone",
      operatingSystem: "iOS 18.5",
      browser: "Safari 18.5",
    },
  );
});

test("Windows Edge определяется до Chrome", () => {
  const client = parseVisitClient(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  );
  assert.equal(client.deviceType, "desktop");
  assert.equal(client.operatingSystem, "Windows");
  assert.equal(client.browser, "Edge 126.0.0.0");
});

test("HMAC дедупликации стабилен в пределах минуты и меняется после неё", async () => {
  const secret = "a".repeat(32);
  const request = browserRequest("/prologue", {
    "cf-connecting-ip": "203.0.113.5",
  });
  const first = await createVisitInput(
    request,
    secret,
    new Date("2026-07-24T10:00:05.000Z"),
  );
  const repeated = await createVisitInput(
    request,
    secret,
    new Date("2026-07-24T10:00:55.000Z"),
  );
  const later = await createVisitInput(
    request,
    secret,
    new Date("2026-07-24T10:01:00.000Z"),
  );

  assert.ok(first);
  assert.equal(first.dedupeKey, repeated?.dedupeKey);
  assert.notEqual(first.dedupeKey, later?.dedupeKey);
  assert.equal(first.path, "/prologue");
});

test("без секрета или IP посещение безопасно пропускается", async () => {
  assert.equal(await createVisitInput(browserRequest(), "a".repeat(32)), null);
  assert.equal(
    await createVisitInput(
      browserRequest("/", { "cf-connecting-ip": "203.0.113.5" }),
      "short",
    ),
    null,
  );
});

test("параметры API нормализуются и limit ограничен", () => {
  assert.deepEqual(
    parseVisitQuery(new URLSearchParams("page=3&limit=500&period=30d")),
    { page: 3, limit: 50, period: "30d" },
  );
  assert.deepEqual(parseVisitQuery(new URLSearchParams("page=-1&period=wrong")), {
    page: 1,
    limit: 20,
    period: "7d",
  });
});

test("сегодня начинается в полночь Europe/Berlin с летним временем", () => {
  assert.equal(
    getVisitPeriodStart("today", new Date("2026-07-24T12:00:00.000Z")),
    "2026-07-23T22:00:00.000Z",
  );
});

test("периоды 7 и 30 дней используют точные скользящие границы", () => {
  const now = new Date("2026-07-24T12:00:00.000Z");
  assert.equal(getVisitPeriodStart("7d", now), "2026-07-17T12:00:00.000Z");
  assert.equal(getVisitPeriodStart("30d", now), "2026-06-24T12:00:00.000Z");
  assert.equal(getVisitPeriodStart("all", now), null);
});
