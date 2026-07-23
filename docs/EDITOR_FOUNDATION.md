# Editor Foundation

## Purpose

The book-line editor and diary editor intentionally have different visual moods, but they share one behavioural foundation.

Shared behaviour lives in:

```text
src/lib/editor/createEditor.ts
```

Shared editor styles live in:

```text
src/styles/editor.css
```

## What the shared module controls

- restoring a local draft;
- delayed draft autosave;
- character counting;
- optional textarea auto-resizing;
- submit loading state;
- API error display;
- clearing a saved draft after a successful request;
- redirecting to the created page.

## Page-specific configuration

Each editor supplies only the values that are unique to it:

- localStorage key;
- API endpoint;
- redirect path;
- save-button text;
- optional minimum textarea height.

## Editing rule

Do not copy editor JavaScript back into individual Astro pages. Extend `createEditor.ts` when behaviour should be shared by both editors.

Keep visual differences in `editor.css` under the relevant Book or Diary section.
