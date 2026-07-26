import type { VisitInput } from "../visits/tracker.ts";
import type { VisitQuery } from "../visits/query.ts";
import { getVisitPeriodStart } from "../visits/query.ts";

export type SiteVisitRecord = {
  id: number;
  visited_at: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string;
  device_name: string | null;
  operating_system: string | null;
  browser: string | null;
  path: string;
  visitor_type: "human" | "bot" | "unknown";
  bot_name: string | null;
  active_seconds: number;
};

export type SiteVisitPage = {
  items: SiteVisitRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: {
    human: number;
    bot: number;
    unknown: number;
    activeSeconds: number;
  };
};

const visitColumns = `
  id, visited_at, country, country_code, city,
  device_type, device_name, operating_system, browser, path,
  visitor_type, bot_name, active_seconds
`;

export async function recordSiteVisit(
  db: D1Database,
  visit: VisitInput,
): Promise<void> {
  await db.batch([
    db
      .prepare(`
        DELETE FROM site_visits
        WHERE visited_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days')
      `),
    db
      .prepare(`
        INSERT INTO site_visits (
          visited_at, country, country_code, city,
          device_type, device_name, operating_system, browser,
          path, visitor_type, bot_name, active_seconds, dedupe_key
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(dedupe_key) DO UPDATE SET
          visitor_type = CASE
            WHEN excluded.visitor_type = 'human' THEN 'human'
            ELSE site_visits.visitor_type
          END,
          bot_name = CASE
            WHEN excluded.visitor_type = 'human' THEN NULL
            ELSE COALESCE(site_visits.bot_name, excluded.bot_name)
          END,
          active_seconds = MAX(site_visits.active_seconds, excluded.active_seconds)
      `)
      .bind(
        visit.visitedAt,
        visit.country,
        visit.countryCode,
        visit.city,
        visit.deviceType,
        visit.deviceName,
        visit.operatingSystem,
        visit.browser,
        visit.path,
        visit.visitorType,
        visit.botName,
        visit.activeSeconds,
        visit.dedupeKey,
      ),
  ]);
}

export async function getSiteVisits(
  db: D1Database,
  query: VisitQuery,
  now = new Date(),
): Promise<SiteVisitPage> {
  const periodStart = getVisitPeriodStart(query.period, now);
  const where = periodStart ? "WHERE visited_at >= ?" : "";
  const countStatement = db.prepare(
    `SELECT COUNT(*) AS count FROM site_visits ${where}`,
  );
  const itemsStatement = db.prepare(`
    SELECT ${visitColumns}
    FROM site_visits
    ${where}
    ORDER BY visited_at DESC, id DESC
    LIMIT ? OFFSET ?
  `);
  const summaryStatement = db.prepare(`
    SELECT
      SUM(CASE WHEN visitor_type = 'human' THEN 1 ELSE 0 END) AS human,
      SUM(CASE WHEN visitor_type = 'bot' THEN 1 ELSE 0 END) AS bot,
      SUM(CASE WHEN visitor_type = 'unknown' THEN 1 ELSE 0 END) AS unknown,
      SUM(active_seconds) AS active_seconds
    FROM site_visits
    ${where}
  `);
  const offset = (query.page - 1) * query.limit;
  const countQuery = periodStart
    ? countStatement.bind(periodStart)
    : countStatement;
  const itemsQuery = periodStart
    ? itemsStatement.bind(periodStart, query.limit, offset)
    : itemsStatement.bind(query.limit, offset);
  const summaryQuery = periodStart
    ? summaryStatement.bind(periodStart)
    : summaryStatement;

  const [countRow, itemsResult, summaryRow] = await Promise.all([
    countQuery.first<{ count: number }>(),
    itemsQuery.all<SiteVisitRecord>(),
    summaryQuery.first<{
      human: number | null;
      bot: number | null;
      unknown: number | null;
      active_seconds: number | null;
    }>(),
  ]);
  const total = countRow?.count ?? 0;

  return {
    items: itemsResult.results ?? [],
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    summary: {
      human: summaryRow?.human ?? 0,
      bot: summaryRow?.bot ?? 0,
      unknown: summaryRow?.unknown ?? 0,
      activeSeconds: summaryRow?.active_seconds ?? 0,
    },
  };
}
