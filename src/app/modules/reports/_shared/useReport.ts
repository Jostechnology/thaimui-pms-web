import { useEffect, useMemo, useState } from 'react';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { exportReportXlsx, previewReport } from '../../../services/reportService';

/**
 * Shared data hook for every report page.
 *
 * Owns pagination + fetch + export. `params` is the report-specific filter
 * object (already cleaned/undefined-stripped by the caller). `enabled` gates
 * the fetch (e.g. when a required date range is not yet picked).
 *
 * Returns `summary`, paginated `rows`, and `extra` — the pass-through keys from
 * compose() (breakdown, gantt, employee_totals, ...). Charts read `extra.breakdown`.
 */
export function useReport<TRow = Record<string, unknown>, TSummary = Record<string, unknown>>(
    code: string,
    params: Record<string, unknown>,
    enabled: boolean = true,
    defaultPerPage: number = 25,
) {
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [rows, setRows] = useState<TRow[]>([]);
    const [summary, setSummary] = useState<TSummary | null>(null);
    const [extra, setExtra] = useState<Record<string, unknown>>({});
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(defaultPerPage);
    const [pages, setPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [exporting, setExporting] = useState(false);

    // Stable identity for the filter object so effects only fire on real change.
    const paramsKey = useMemo(() => JSON.stringify(params), [params]);

    const fetchData = async () => {
        if (!enabled) return;
        setLoading();
        try {
            const res = await previewReport<TRow, TSummary>(code, params, page, perPage);
            if (res.success && res.data) {
                const d = res.data as Record<string, unknown>;
                const pagination = (d.pagination as Record<string, unknown>) || {};
                setRows((d.rows as TRow[]) || []);
                setSummary((d.meta as TSummary) ?? null);
                setPages((pagination.total_pages as number) || 0);
                setTotal((pagination.total as number) || 0);
                const { rows: _r, meta: _m, pagination: _pg, ...rest } = d;
                setExtra(rest);
            } else {
                alertMessage(res.message || 'ดึงข้อมูลรายงานไม่สำเร็จ');
                setRows([]);
                setSummary(null);
                setExtra({});
            }
        } finally {
            setUnLoading();
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, [paramsKey, page, perPage, enabled]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setPage(1); }, [paramsKey]);

    const handleExport = async (filename?: string) => {
        if (!enabled) { alertMessage('กรุณาเลือกตัวกรองที่จำเป็นก่อน'); return; }
        setExporting(true);
        const res = await exportReportXlsx(code, params, filename || `${code}.xlsx`);
        if (!res.success) alertMessage(res.message || 'ส่งออกไฟล์ไม่สำเร็จ');
        setExporting(false);
    };

    return {
        rows, summary, extra,
        page, setPage, perPage, setPerPage, pages, total,
        exporting, handleExport,
        breakdown: (extra.breakdown as Record<string, unknown>) || {},
    };
}
