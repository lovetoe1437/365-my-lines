# Book Experience

## Purpose

This stage adds quiet emotional feedback without turning the project into an
animated interface. The text remains the main character of every screen.

## Writing prompts

Book and diary editors receive a randomly selected placeholder when opened.
The phrases live in `src/lib/editor/messages.ts`, not inside page templates, so
the tone can be maintained in one place.

Rules for new phrases:

- keep them short;
- invite rather than instruct;
- avoid motivational language;
- do not compete with the author's own words.

## Save states

The save button now has four states:

- `idle` — quiet before the page changes;
- `dirty` — clearer after the author starts writing;
- `saving` — prevents repeated submission;
- `saved` — confirms success before navigation.

A short confirmation remains visible for about 850 ms before the saved page
opens. This delay should stay brief: it is feedback, not an interruption.

## Empty states

Empty book and diary screens explain what the space is for and offer one clear
next action. They should never look like error screens or dashboards with no
data.

## Accessibility

- success and error messages use the existing `aria-live` region;
- motion is disabled when `prefers-reduced-motion` is enabled;
- placeholders are supportive text, not replacements for labels.
