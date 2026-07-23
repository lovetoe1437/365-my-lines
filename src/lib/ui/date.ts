const longDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const toDate = (value: Date | string | number) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(value);
};

export const formatLongDate = (value: Date | string | number) => {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? "" : longDateFormatter.format(date);
};
