import React, { useMemo, useState } from 'react';
import TablePaginator from '../../../custom_components/TablePaginator';

export interface Column<T> {
    key: string;
    label: string;
    align?: 'start' | 'center' | 'end';
    minWidth?: number;
    render?: (row: T) => React.ReactNode;
    /** Disable click-to-sort on this column. */
    noSort?: boolean;
    /** Custom value used for sorting (defaults to row[key]). */
    sortValue?: (row: T) => number | string | null | undefined;
}

interface ReportTableProps<T> {
    title: string;
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => React.Key;
    // pagination (optional — omit to render a static table)
    page?: number;
    setPage?: (p: number) => void;
    pages?: number;
    total?: number;
    perPage?: number;
    setPerPage?: (n: number) => void;
    toolbarExtra?: React.ReactNode;
    /** Enable click-to-sort on column headers (sorts the loaded rows). Default true. */
    sortable?: boolean;
}

const alignClass = (a?: string) => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start');

const compareVals = (a: unknown, b: unknown): number => {
    const an = a === null || a === undefined || a === '';
    const bn = b === null || b === undefined || b === '';
    if (an && bn) return 0;
    if (an) return -1;
    if (bn) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'th', { numeric: true });
};

/** Generic report detail table + paginator driven by column defs. */
function ReportTable<T>({
    title, columns, rows, rowKey, page, setPage, pages, total, perPage, setPerPage, toolbarExtra,
    sortable = true,
}: ReportTableProps<T>) {
    const paginated = page !== undefined && setPage !== undefined;
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const toggleSort = (col: Column<T>) => {
        if (!sortable || col.noSort) return;
        if (sortKey === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(col.key); setSortDir('asc'); }
    };

    const sortedRows = useMemo(() => {
        if (!sortable || !sortKey) return rows;
        const col = columns.find((c) => c.key === sortKey);
        if (!col) return rows;
        const val = (r: T) => (col.sortValue ? col.sortValue(r) : (r as Record<string, unknown>)[col.key]);
        const sorted = [...rows].sort((a, b) => compareVals(val(a), val(b)));
        if (sortDir === 'desc') sorted.reverse();
        return sorted;
    }, [rows, columns, sortKey, sortDir, sortable]);

    return (
        <div className='card card-flush shadow-sm border-0'>
            <div className='card-header border-0 pt-6'>
                <h3 className='card-title fw-bold text-gray-900'>{title}</h3>
                <div className='card-toolbar d-flex align-items-center gap-3'>
                    {setPerPage && (
                        <select className='form-select form-select-sm form-select-solid w-100px'
                            value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                            <option value='25'>25</option>
                            <option value='50'>50</option>
                            <option value='100'>100</option>
                        </select>
                    )}
                    {toolbarExtra}
                    {total !== undefined && <span className='text-muted fs-7'>{total.toLocaleString('th-TH')} รายการ</span>}
                </div>
            </div>
            <div className='card-body pt-0'>
                <div className='table-responsive'>
                    <table className='table align-middle table-row-dashed fs-7 gy-3'>
                        <thead>
                            <tr className='text-start text-muted fw-bold fs-8 text-uppercase gs-0 border-bottom border-gray-200'>
                                {columns.map((c) => {
                                    const canSort = sortable && !c.noSort;
                                    const active = sortKey === c.key;
                                    return (
                                        <th key={c.key}
                                            className={`${alignClass(c.align)} ${c.minWidth ? `min-w-${c.minWidth}px` : ''} ${canSort ? 'cursor-pointer user-select-none' : ''}`}
                                            onClick={() => toggleSort(c)}>
                                            {c.label}
                                            {canSort && (
                                                <i className={`bi ms-1 ${active ? (sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up text-gray-400'}`}></i>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className='text-gray-700 fw-semibold'>
                            {sortedRows.length > 0 ? sortedRows.map((r) => (
                                <tr key={rowKey(r)}>
                                    {columns.map((c) => (
                                        <td key={c.key} className={alignClass(c.align)}>
                                            {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr><td colSpan={columns.length} className='text-center py-15 text-muted'>ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {paginated && (
                    <div className='d-flex flex-stack flex-wrap pt-8'>
                        <span className='fs-7 text-muted'>
                            {total && total > 0 ? `แสดง ${((page - 1) * (perPage || 25)) + 1}–${Math.min(page * (perPage || 25), total)} จาก ${total} รายการ` : ''}
                        </span>
                        <TablePaginator currentPage={page} setCurrentPage={setPage as React.Dispatch<React.SetStateAction<number>>} totalPages={pages || 0} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReportTable;
