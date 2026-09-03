const IST_OFFSET = "+05:30";

/** Convert a `datetime-local` value labeled as India time (IST) into a UTC Date. */
export function istDatetimeLocalToUtc(local: string): Date {
  const value = local.length === 16 ? `${local}:00` : local;
  return new Date(`${value}${IST_OFFSET}`);
}

/** Format a UTC Date as a `datetime-local` string in India time (IST). */
export function utcToIstDatetimeLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`;
}

export function formatIstDate(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
