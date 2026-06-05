import React from 'react';
import TablePaginator from '../../../custom_components/TablePaginator';

export interface Column<T> {
    key: string;
    label: string;
    align?: 'start' | 'center' | 'end';
    minWidth?: number;
    render?: (row: T) => React.ReactNode;
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
}

const alignClass = (a?: string) => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start');

/** Generic report detail table + paginator driven by column defs. */
function ReportTable<T>({
    title, columns, rows, rowKey, page, setPage, pages, total, perPage, setPerPage, toolbarExtra,
}: ReportTableProps<T>) {
    const paginated = page !== undefined && setPage !== undefined;
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
                                {columns.map((c) => (
                                    <th key={c.key} className={`${alignClass(c.align)} ${c.minWidth ? `min-w-${c.minWidth}px` : ''}`}>{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className='text-gray-700 fw-semibold'>
                            {rows.length > 0 ? rows.map((r) => (
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
