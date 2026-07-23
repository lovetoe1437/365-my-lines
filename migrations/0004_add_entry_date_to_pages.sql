ALTER TABLE pages ADD COLUMN entry_date TEXT;

UPDATE pages
SET entry_date = date(created_at)
WHERE entry_date IS NULL OR trim(entry_date) = '';
