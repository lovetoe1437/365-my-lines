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
};

export type SiteVisitPage = {
  items: SiteVisitRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const visitColumns = `
  id, visited_at, country, country_code, city,
  device_type, device_name, operating_system, browser, path
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
        INSERT OR IGNORE INTO site_visits (
          visited_at, country, country_code, city,
          device_type, device_name, operating_system, browser,
          path, dedupe_key
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const offset = (query.page - 1) * query.limit;
  const countQuery = periodStart
    ? countStatement.bind(periodStart)
    : countStatement;
  const itemsQuery = periodStart
    ? itemsStatement.bind(periodStart, query.limit, offset)
    : itemsStatement.bind(query.limit, offset);

  const [countRow, itemsResult] = await Promise.all([
    countQuery.first<{ count: number }>(),
    itemsQuery.all<SiteVisitRecord>(),
  ]);
  const total = countRow?.count ?? 0;

  return {
    items: itemsResult.results ?? [],
    page: query.page,
    limit: query.limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
  };
}
