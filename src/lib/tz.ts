// All app times display in India Standard Time (Asia/Kolkata, GMT+5:30).
export const APP_TZ = "Asia/Kolkata";

function parts(d: Date) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
}

/** A Date whose UTC fields equal the wall-clock in Asia/Kolkata. Use only with getUTC* / date-fns. */
export function toIST(d: Date | string | number): Date {
  const src = d instanceof Date ? d : new Date(d);
  const { y, m, d: day, h, mi, s } = parts(src);
  return new Date(Date.UTC(y, m - 1, day, h, mi, s));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a Date in IST. Supports a small subset of date-fns tokens used in this app. */
export function formatIST(d: Date | string | number, pattern: string): string {
  const src = d instanceof Date ? d : new Date(d);
  const { y, m, d: day, h, mi } = parts(src);
  const wall = new Date(Date.UTC(y, m - 1, day));
  const dow = wall.getUTCDay();
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  const map: Record<string, string> = {
    EEEE: DOW_LONG[dow],
    EEE: DOW[dow],
    MMMM: MONTHS_LONG[m - 1],
    MMM: MONTHS[m - 1],
    MM: String(m).padStart(2, "0"),
    dd: String(day).padStart(2, "0"),
    d: String(day),
    yyyy: String(y),
    HH: String(h).padStart(2, "0"),
    mm: String(mi).padStart(2, "0"),
    h: String(h12),
    a: ampm,
    p: `${h12}:${String(mi).padStart(2, "0")} ${ampm}`,
  };
  // Replace longest tokens first.
  const tokens = Object.keys(map).sort((a, b) => b.length - a.length);
  const re = new RegExp(tokens.join("|"), "g");
  return pattern.replace(re, (t) => map[t]);
}

export function isTodayIST(d: Date | string | number) {
  const a = parts(d instanceof Date ? d : new Date(d));
  const b = parts(new Date());
  return a.y === b.y && a.m === b.m && a.d === b.d;
}
export function isTomorrowIST(d: Date | string | number) {
  const tomorrow = new Date(Date.now() + 86400000);
  const a = parts(d instanceof Date ? d : new Date(d));
  const b = parts(tomorrow);
  return a.y === b.y && a.m === b.m && a.d === b.d;
}
