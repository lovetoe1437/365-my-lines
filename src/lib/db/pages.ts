export type PageInput = {
  title: string;
  content: string;
  entryDate: string;
};

export type PageRecord = {
  id: number;
  title: string;
  content: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

export async function createPage(db: D1Database, page: PageInput): Promise<number> {
  const result = await db
    .prepare(`
      INSERT INTO pages (title, content, entry_date)
      VALUES (?, ?, ?)
    `)
    .bind(page.title, page.content, page.entryDate)
    .run();

  const id = result.meta.last_row_id;
  if (typeof id !== "number") throw new Error("Не удалось получить ID сохранённой записи.");
  return id;
}

const pageSelect = `
  SELECT id, title, content,
    COALESCE(NULLIF(entry_date, ''), date(created_at)) AS entry_date,
    created_at, updated_at
  FROM pages
`;

export async function getPages(db: D1Database): Promise<PageRecord[]> {
  const { results } = await db
    .prepare(`${pageSelect} ORDER BY entry_date ASC, created_at ASC, id ASC`)
    .all<PageRecord>();
  return results ?? [];
}

export async function getPage(db: D1Database, id: number): Promise<PageRecord | null> {
  const page = await db
    .prepare(`${pageSelect} WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<PageRecord>();
  return page ?? null;
}

export type PageNavigation = {
  previous: PageRecord | null;
  next: PageRecord | null;
  position: number;
  total: number;
};

export async function getPageNavigation(db: D1Database, id: number): Promise<PageNavigation> {
  const { results } = await db
    .prepare(`${pageSelect} ORDER BY entry_date ASC, created_at ASC, id ASC`)
    .all<PageRecord>();
  const pages = results ?? [];
  const currentIndex = pages.findIndex((page) => page.id === id);
  if (currentIndex === -1) return { previous: null, next: null, position: 0, total: pages.length };
  return {
    previous: pages[currentIndex - 1] ?? null,
    next: pages[currentIndex + 1] ?? null,
    position: currentIndex + 1,
    total: pages.length,
  };
}

export async function updatePage(db: D1Database, id: number, page: PageInput): Promise<boolean> {
  const result = await db
    .prepare(`
      UPDATE pages
      SET title = ?, content = ?, entry_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(page.title, page.content, page.entryDate, id)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function deletePage(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM pages WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
