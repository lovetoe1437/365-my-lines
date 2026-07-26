export const VISIT_PERIODS = ["today", "7d", "30d", "all"] as const;
export type VisitPeriod = (typeof VISIT_PERIODS)[number];
export const VISIT_TYPES = ["all", "human", "bot", "unknown"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export type VisitQuery = {
  page: number;
  limit: number;
  period: VisitPeriod;
  type: VisitType;
};

const integerParameter = (
  value: string | null,
  fallback: number,
  maximum: number,
) => {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1
    ? Math.min(parsed, maximum)
    : fallback;
};

export function parseVisitQuery(searchParams: URLSearchParams): VisitQuery {
  const periodValue = searchParams.get("period");
  const period = VISIT_PERIODS.includes(periodValue as VisitPeriod)
    ? (periodValue as VisitPeriod)
    : "7d";
  const typeValue = searchParams.get("type");
  const type = VISIT_TYPES.includes(typeValue as VisitType)
    ? (typeValue as VisitType)
    : "all";

  return {
    page: integerParameter(searchParams.get("page"), 1, 1_000_000),
    limit: integerParameter(searchParams.get("limit"), 20, 50),
    period,
    type,
  };
}

const timeZoneOffset = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  const representedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return representedAsUtc - date.getTime();
};

const startOfZonedDay = (now: Date, timeZone: string) => {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    dateParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const midnightGuess = new Date(
    Date.UTC(values.year, values.month - 1, values.day),
  );
  return new Date(
    midnightGuess.getTime() - timeZoneOffset(midnightGuess, timeZone),
  );
};

export function getVisitPeriodStart(
  period: VisitPeriod,
  now = new Date(),
): string | null {
  if (period === "all") return null;
  if (period === "today") {
    return startOfZonedDay(now, "Europe/Berlin").toISOString();
  }

  const days = period === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
