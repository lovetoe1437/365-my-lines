import { parseVisitClient } from "./userAgent.ts";

const EXCLUDED_PREFIXES = [
  "/admin",
  "/api",
  "/media",
  "/access",
  "/login",
  "/lines/write",
  "/diary/write",
  "/write",
  "/unspoken/edit",
];

const BOT_USER_AGENTS = [
  ["Googlebot", /googlebot/i],
  ["Bingbot", /bingbot|bingpreview/i],
  ["YandexBot", /yandexbot/i],
  ["Социальный предпросмотр", /facebookexternalhit|whatsapp|telegrambot|discordbot/i],
  ["Технический бот", /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|curl|wget/i],
] as const;

type CloudflareRequest = Request & {
  cf?: {
    country?: string;
    city?: string;
  };
};

export type VisitInput = {
  visitedAt: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  deviceType: string;
  deviceName: string | null;
  operatingSystem: string | null;
  browser: string | null;
  visitorType: "human" | "bot" | "unknown";
  botName: string | null;
  activeSeconds: number;
  path: string;
  dedupeKey: string;
};

export function classifyVisitor(userAgent: string): {
  visitorType: "bot" | "unknown";
  botName: string | null;
} {
  const match = BOT_USER_AGENTS.find(([, expression]) => expression.test(userAgent));
  return match
    ? { visitorType: "bot", botName: match[0] }
    : { visitorType: "unknown", botName: null };
}

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

async function createDedupeKey(
  secret: string,
  value: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function shouldTrackVisit(
  request: Request,
  response: Response,
): boolean {
  if (request.method !== "GET" || response.status < 200 || response.status >= 400) {
    return false;
  }

  const path = new URL(request.url).pathname;
  if (
    EXCLUDED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    ) ||
    /^\/(?:lines\/d-\d+|pages\/\d+)\/edit\/?$/.test(path)
  ) {
    return false;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) return false;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination && destination !== "document") return false;

  const purpose = [
    request.headers.get("purpose"),
    request.headers.get("sec-purpose"),
  ]
    .filter(Boolean)
    .join(" ");
  if (/prefetch|prerender/i.test(purpose)) return false;

  const userAgent = request.headers.get("user-agent")?.trim() ?? "";
  return userAgent.length > 0;
}

export async function createVisitInput(
  request: Request,
  secret: string | undefined,
  now = new Date(),
  insights: {
    visitorType?: "human";
    activeSeconds?: number;
  } = {},
): Promise<VisitInput | null> {
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim();
  if (!secret || secret.length < 32 || !ip || !userAgent) return null;

  const path = new URL(request.url).pathname;
  const cf = (request as CloudflareRequest).cf;
  const countryCode = cf?.country?.trim().toUpperCase() || null;
  const country = countryCode
    ? new Intl.DisplayNames(["ru"], { type: "region" }).of(countryCode) ?? null
    : null;
  const city = cf?.city?.trim() || null;
  const client = parseVisitClient(userAgent);
  const classification = classifyVisitor(userAgent);
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  const dedupeKey = await createDedupeKey(
    secret,
    `${ip}\n${userAgent}\n${path}\n${minuteBucket}`,
  );

  return {
    visitedAt: now.toISOString(),
    country,
    countryCode,
    city,
    deviceType: client.deviceType,
    deviceName: client.deviceName,
    operatingSystem: client.operatingSystem,
    browser: client.browser,
    visitorType: insights.visitorType ?? classification.visitorType,
    botName: insights.visitorType === "human" ? null : classification.botName,
    activeSeconds: Math.max(0, Math.min(43_200, Math.round(insights.activeSeconds ?? 0))),
    path,
    dedupeKey,
  };
}
