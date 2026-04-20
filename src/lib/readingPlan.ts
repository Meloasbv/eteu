/**
 * Computes today's reading from the WEEKS plan based on current date.
 * The plan starts on 24/01/2026 (week 1, Saturday).
 */

const PLAN_START = new Date(2026, 0, 24); // 24 Jan 2026
const DAY_NAMES = ["Sábado", "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export interface TodayReading {
  weekIdx: number;
  weekNum: number;
  dates: string;
  dayIdx: number;
  day: string;
  readings: string[];
}

export function computeTodayReading(weeks: any[]): TodayReading {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - PLAN_START.getTime()) / 86_400_000);

  if (diffDays < 0) {
    // Before the plan starts → show first day
    const w = weeks[0];
    return {
      weekIdx: 0,
      weekNum: w.week,
      dates: w.dates,
      dayIdx: 0,
      day: w.days[0].day,
      readings: w.days[0].r,
    };
  }

  const weekIdx = Math.min(Math.floor(diffDays / 7), weeks.length - 1);
  const dayIdx = diffDays % 7;
  const w = weeks[weekIdx];
  const d = w.days[dayIdx] ?? w.days[0];

  return {
    weekIdx,
    weekNum: w.week,
    dates: w.dates,
    dayIdx,
    day: d.day,
    readings: d.r ?? [],
  };
}

/**
 * Computes a specific reading by date (used for week-calendar picker).
 * Returns null if the date is outside the plan range.
 */
export function computeReadingForDate(weeks: any[], date: Date): TodayReading | null {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(PLAN_START.getFullYear(), PLAN_START.getMonth(), PLAN_START.getDate());
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return null;
  const weekIdx = Math.floor(diffDays / 7);
  if (weekIdx >= weeks.length) return null;
  const dayIdx = diffDays % 7;
  const w = weeks[weekIdx];
  const day = w.days[dayIdx] ?? w.days[0];
  return {
    weekIdx,
    weekNum: w.week,
    dates: w.dates,
    dayIdx,
    day: day.day,
    readings: day.r ?? [],
  };
}

export function todayDayName(): string {
  // Map JS getDay (0=Sun..6=Sat) to plan day order (Sáb..Sex)
  const jsDay = new Date().getDay(); // 0..6
  const map = [1, 2, 3, 4, 5, 6, 0]; // Sun→Domingo(1), Mon→Segunda(2)... Sat→Sábado(0)
  return DAY_NAMES[map[jsDay]];
}

export function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
