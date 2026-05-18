/**
 * Helpers to read the split labor cost (base/day/ot) from WorkRunCost or
 * TestResultCost rows. Backend stores them as separate columns; UI reads
 * them in many places.
 */

export interface LaborCostSplit {
    base: number;
    day: number;
    ot: number;
    total: number;
}

interface AnyCost {
    base_labor_cost?: number | null;
    day_labor_cost?: number | null;
    ot_labor_cost?: number | null;
}

export const ZERO_LABOR_SPLIT: LaborCostSplit = { base: 0, day: 0, ot: 0, total: 0 };

export function getLaborSplit(cost?: AnyCost | null): LaborCostSplit {
    if (!cost) return { ...ZERO_LABOR_SPLIT };
    const base = Number(cost.base_labor_cost ?? 0) || 0;
    const day = Number(cost.day_labor_cost ?? 0) || 0;
    const ot = Number(cost.ot_labor_cost ?? 0) || 0;
    return { base, day, ot, total: base + day + ot };
}

export function sumLaborSplits(items: LaborCostSplit[]): LaborCostSplit {
    return items.reduce<LaborCostSplit>(
        (acc, s) => ({
            base: acc.base + s.base,
            day: acc.day + s.day,
            ot: acc.ot + s.ot,
            total: acc.total + s.total,
        }),
        { ...ZERO_LABOR_SPLIT }
    );
}

/**
 * Live preview when cost has not been finalized. Best-effort approximation that
 * does NOT account for shift window, holidays, or weekend multipliers — backend
 * computes the precise figure on completion. Used only when no stored split
 * exists.
 *
 *  base hourly  = base_salary / 30 / 8
 *  day hourly   = day_rate / 8
 *  ot/weekend   = 0 (cannot infer without shift+holiday context)
 */
export function estimateLiveLaborSplit(
    assignments: Array<{
        from_time?: string | null;
        to_time?: string | null;
        employee?: { base_salary?: number; day_rate?: number; ot_hourly_rate?: number } | null;
    }>,
    breaks: Array<{ break_start?: string | null; break_end?: string | null }> = []
): LaborCostSplit {
    const split: LaborCostSplit = { ...ZERO_LABOR_SPLIT };
    const now = Date.now();

    for (const a of assignments || []) {
        if (!a.from_time) continue;
        const start = new Date(a.from_time).getTime();
        const end = a.to_time ? new Date(a.to_time).getTime() : now;
        if (end <= start) continue;

        const breakMs = (breaks || []).reduce((sum, b) => {
            if (!b.break_start) return sum;
            const bs = new Date(b.break_start).getTime();
            const be = b.break_end ? new Date(b.break_end).getTime() : now;
            return sum + Math.max(0, Math.min(end, be) - Math.max(start, bs));
        }, 0);
        const effSec = Math.max(0, (end - start - breakMs) / 1000);
        if (effSec <= 0) continue;

        const emp = a.employee || {};
        const baseHourly = (emp.base_salary || 0) / 30 / 8;
        const dayHourly = (emp.day_rate || 0) / 8;
        split.base += (baseHourly * effSec) / 3600;
        split.day += (dayHourly * effSec) / 3600;
    }
    split.total = split.base + split.day + split.ot;
    return split;
}

export function fmtBaht(n: number, digits = 2): string {
    return `฿${(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
