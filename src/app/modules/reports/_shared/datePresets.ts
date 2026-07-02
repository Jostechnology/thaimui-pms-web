/**
 * Shared date-range defaults + quick presets for report toolbars.
 *
 * Every report seeds its range from one of these instead of [null, null], so
 * a report opens already showing meaningful data. All dates are local-midnight
 * (the BE widens `to` to end-of-day via convert_end_date).
 */
export type DateRange = [Date | null, Date | null];

const atMidnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** First day of the current month → today. */
export const firstOfMonthToToday = (): DateRange => {
    const now = new Date();
    return [new Date(now.getFullYear(), now.getMonth(), 1), atMidnight(now)];
};

/** A rolling window of the last `n` days ending today (inclusive). */
export const lastNDaysToToday = (n: number): DateRange => {
    const end = atMidnight(new Date());
    const start = new Date(end);
    start.setDate(end.getDate() - (n - 1));
    return [start, end];
};

/** Today only. */
export const todayRange = (): DateRange => {
    const t = atMidnight(new Date());
    return [t, t];
};

export interface DatePreset {
    key: string;
    label: string;
    make: () => DateRange;
}

/** Quick-select buttons rendered next to the range picker. */
export const DATE_PRESETS: DatePreset[] = [
    { key: 'today', label: 'วันนี้', make: todayRange },
    { key: '7d', label: '7 วัน', make: () => lastNDaysToToday(7) },
    { key: '30d', label: '30 วัน', make: () => lastNDaysToToday(30) },
    { key: 'month', label: 'เดือนนี้', make: firstOfMonthToToday },
];
