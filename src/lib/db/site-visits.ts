import type { VisitInput } from "../visits/tracker.ts";

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
