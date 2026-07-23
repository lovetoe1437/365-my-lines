export const MAX_ENTRY_TITLE_LENGTH = 160;

export function isValidEntryTitle(title: string): boolean {
  return title.length > 0 && title.length <= MAX_ENTRY_TITLE_LENGTH;
}

export function isValidEntryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE");
}
