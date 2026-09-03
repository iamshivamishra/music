const IST_OFFSET = "+05:30";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function currentIstYearMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}

/** Inclusive start / exclusive end of an IST calendar month, as UTC Dates. */
export function istMonthRange(year: number, month: number): { from: Date; to: Date } {
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1–12, got ${month}`);
  }

  const from = new Date(`${year}-${pad2(month)}-01T00:00:00${IST_OFFSET}`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = new Date(`${nextYear}-${pad2(nextMonth)}-01T00:00:00${IST_OFFSET}`);
  return { from, to };
}

export function formatIstDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatIstMonthLabel(year: number, month: number): string {
  const date = new Date(`${year}-${pad2(month)}-01T00:00:00${IST_OFFSET}`);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  });
}

export function formatIstYearMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}
