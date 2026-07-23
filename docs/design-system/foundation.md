# Foundation components

Release 2.1 introduces small, presentation-focused primitives. They provide a common vocabulary without owning page-specific content or behavior.

## Layout

- `Container` controls maximum width and responsive page gutters.
- `Section` controls vertical section spacing.
- `Stack` creates vertical rhythm.
- `Cluster` arranges related inline actions or metadata.

## Surface

- `Paper` is the primary editorial surface with tone, padding, radius and elevation variants.
- `Card` is a lighter grouping surface.
- `Divider` provides semantic horizontal or vertical separation.

## Typography

- `Heading` defines the display hierarchy.
- `Text` defines copy size, tone and alignment.
- `Eyebrow` is the small uppercase editorial label.
- `Quote` is reserved for reflective or emotional copy.

## Rules

1. Components own only reusable layout and visual rules.
2. Pages keep their domain-specific class names and content.
3. Prefer tokens over literal values.
4. Do not wrap elements in a primitive when the primitive adds no semantic or visual value.
