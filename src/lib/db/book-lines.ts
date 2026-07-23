export type BookLineInput = {
  number: number;
  title: string;
  content: string;
  lineDate: string;
};

export type BookLineRecord = {
  id: number;
  number: number;
  title: string;
  content: string;
  line_date: string;
  created_at: string;
  updated_at: string;
};

export async function createBookLine(db: D1Database, line: BookLineInput): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO book_lines (number, title, content, line_date)
    VALUES (?, ?, ?, ?)
  `).bind(line.number, line.title, line.content, line.lineDate).run();

  const id = result.meta.last_row_id;
  if (typeof id !== "number") throw new Error("Не удалось получить ID новой строки.");
  return id;
}

export async function getBookLines(db: D1Database): Promise<BookLineRecord[]> {
  const { results } = await db.prepare(`
    SELECT id, number, title, content, line_date, created_at, updated_at
    FROM book_lines
    ORDER BY number ASC, id ASC
  `).all<BookLineRecord>();
  return results ?? [];
}

export async function getBookLine(db: D1Database, id: number): Promise<BookLineRecord | null> {
  return (await db.prepare(`
    SELECT id, number, title, content, line_date, created_at, updated_at
    FROM book_lines WHERE id = ? LIMIT 1
  `).bind(id).first<BookLineRecord>()) ?? null;
}


export async function getBookLineByNumber(db: D1Database, number: number): Promise<BookLineRecord | null> {
  return (await db.prepare(`
    SELECT id, number, title, content, line_date, created_at, updated_at
    FROM book_lines WHERE number = ? LIMIT 1
  `).bind(number).first<BookLineRecord>()) ?? null;
}

export async function updateBookLine(db: D1Database, id: number, line: BookLineInput): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE book_lines SET number = ?, title = ?, content = ?, line_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(line.number, line.title, line.content, line.lineDate, id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteBookLine(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare("DELETE FROM book_lines WHERE id = ?").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
