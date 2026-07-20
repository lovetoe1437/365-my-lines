export type PageInput = {
  title: string;
  content: string;
};

export type PageRecord = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function createPage(
  db: D1Database,
  page: PageInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO pages (title, content)
        VALUES (?, ?)
      `,
    )
    .bind(page.title, page.content)
    .run();

  const id = result.meta.last_row_id;

  if (typeof id !== "number") {
    throw new Error("Не удалось получить ID сохранённой записи.");
  }

  return id;
}

export async function getPages(
  db: D1Database,
): Promise<PageRecord[]> {
  const { results } = await db
    .prepare(
      `
        SELECT
          id,
          title,
          content,
          created_at,
          updated_at
        FROM pages
        ORDER BY created_at DESC, id DESC
      `,
    )
    .all<PageRecord>();

  return results ?? [];
}

export async function getPage(
  db: D1Database,
  id: number,
): Promise<PageRecord | null> {
  const page = await db
    .prepare(
      `
        SELECT
          id,
          title,
          content,
          created_at,
          updated_at
        FROM pages
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<PageRecord>();

  return page ?? null;
}
export async function updatePage(
  db: D1Database,
  id: number,
  page: PageInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE pages
        SET
          title = ?,
          content = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(page.title, page.content, id)
    .run();
}export async function deletePage(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM pages
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}