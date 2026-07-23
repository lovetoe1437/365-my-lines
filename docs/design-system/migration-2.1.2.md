# Migration 2.1.2 — scoped style compatibility

The initial wrapper migration passed page-specific class names into child Astro components. Astro scoped CSS attaches scope attributes at compile time, so selectors defined inside a page no longer matched the element rendered by the child component.

The affected page wrappers were restored to native HTML. Foundation components remain available and should be introduced only where styles are global, colocated inside the component, or explicitly written with `:global(...)`.
