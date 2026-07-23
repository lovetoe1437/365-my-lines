import { unspokenContent } from "../../content/unspoken";

export type UnspokenVisibility = "hidden" | "epilogue" | "link";

export type UnspokenContent = {
  eyebrow: string;
  title: string;
  opening: string[];
  sectionTitle: string;
  story: string[];
  signature: string;
  motto: string;
  version: string;
  date: string;
  visibility: UnspokenVisibility;
};

const fallback: UnspokenContent = { ...unspokenContent, visibility: "hidden" };

const parseParagraphs = (value: unknown, fallbackValue: string[]) => {
  if (typeof value !== "string") return fallbackValue;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  }
  return fallbackValue;
};

export async function getUnspoken(db: D1Database): Promise<UnspokenContent> {
  try {
    const row = await db.prepare(`
      SELECT eyebrow, title, opening, section_title, story, signature, motto, version,
        display_date, visibility
      FROM unspoken_settings WHERE id = 1 LIMIT 1
    `).first<Record<string, unknown>>();

    if (!row) return fallback;
    const visibility = row.visibility === "epilogue" || row.visibility === "link" ? row.visibility : "hidden";
    return {
      eyebrow: String(row.eyebrow ?? fallback.eyebrow),
      title: String(row.title ?? fallback.title),
      opening: parseParagraphs(row.opening, fallback.opening),
      sectionTitle: String(row.section_title ?? fallback.sectionTitle),
      story: parseParagraphs(row.story, fallback.story),
      signature: String(row.signature ?? fallback.signature),
      motto: String(row.motto ?? fallback.motto),
      version: String(row.version ?? fallback.version),
      date: String(row.display_date ?? fallback.date),
      visibility,
    };
  } catch (error) {
    console.warn("Unspoken settings are unavailable; using bundled content.", error);
    return fallback;
  }
}

export async function updateUnspoken(db: D1Database, content: UnspokenContent): Promise<void> {
  await db.prepare(`
    INSERT INTO unspoken_settings (
      id, eyebrow, title, opening, section_title, story, signature, motto, version,
      display_date, visibility, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      eyebrow = excluded.eyebrow,
      title = excluded.title,
      opening = excluded.opening,
      section_title = excluded.section_title,
      story = excluded.story,
      signature = excluded.signature,
      motto = excluded.motto,
      version = excluded.version,
      display_date = excluded.display_date,
      visibility = excluded.visibility,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    content.eyebrow,
    content.title,
    JSON.stringify(content.opening),
    content.sectionTitle,
    JSON.stringify(content.story),
    content.signature,
    content.motto,
    content.version,
    content.date,
    content.visibility,
  ).run();
}
