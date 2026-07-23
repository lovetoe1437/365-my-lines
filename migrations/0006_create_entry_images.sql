CREATE TABLE IF NOT EXISTS entry_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_line_id INTEGER,
  page_id INTEGER,
  object_key TEXT NOT NULL UNIQUE,
  object_etag TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('before', 'after')),
  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 5),
  caption TEXT,
  mime_type TEXT NOT NULL CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 12000),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 12000),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 15728640),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_line_id) REFERENCES book_lines(id) ON DELETE RESTRICT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE RESTRICT,
  CHECK (
    (book_line_id IS NOT NULL AND page_id IS NULL)
    OR
    (book_line_id IS NULL AND page_id IS NOT NULL)
  ),
  CHECK (
    caption IS NULL
    OR (length(trim(caption)) BETWEEN 1 AND 280)
  )
);

CREATE INDEX IF NOT EXISTS idx_entry_images_book_line
  ON entry_images(book_line_id, placement, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_entry_images_page
  ON entry_images(page_id, placement, sort_order, id);

CREATE TRIGGER IF NOT EXISTS entry_images_limit_book_line
BEFORE INSERT ON entry_images
WHEN NEW.book_line_id IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM entry_images
    WHERE book_line_id = NEW.book_line_id
  ) >= 6
BEGIN
  SELECT RAISE(ABORT, 'entry_image_limit_exceeded');
END;

CREATE TRIGGER IF NOT EXISTS entry_images_limit_page
BEFORE INSERT ON entry_images
WHEN NEW.page_id IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM entry_images
    WHERE page_id = NEW.page_id
  ) >= 6
BEGIN
  SELECT RAISE(ABORT, 'entry_image_limit_exceeded');
END;
