# Diary Experience

The diary is the living continuation of the printed-book experience.

## Principles

- It shares the same paper, typography, spacing and quiet motion as the book.
- The diary index reads like a table of personal pages, not an admin dashboard.
- Opening an entry uses a calm transition consistent with the book contents.
- The writing screen feels like a clean sheet of paper rather than a web form.
- Technical identifiers remain hidden from the reader.

## Updated surfaces

- `/book` — diary contents
- `/diary/write` — new diary entry

The existing reading and editing routes remain compatible with the current database and API structure.


## Editable diary date

- New diary entries receive today’s date by default.
- The date can be changed before the first save and during later editing.
- Draft autosave includes the selected date, title, and content.
- Reading, contents ordering, and previous/next navigation use the diary entry date rather than the technical creation timestamp.
- Existing entries receive their original creation date through migration `0004_add_entry_date_to_pages.sql`.


## Editor unity polish

- Creation and editing now use the same diary-paper language.
- Draft state is shown as a calm live indicator: ready, saving, saved, or restored.
- The selected entry date remains independent from the day the text is edited.
- Save and reading transitions gently fade the page, preserving the book-like rhythm.
- Reduced-motion preferences disable non-essential motion.
