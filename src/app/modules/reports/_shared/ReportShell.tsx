import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import { DateRangeFilter } from './filters';
import { DATE_PRESETS, DateRange } from './datePresets';
import { FilterPopover } from './FilterPopover';

interface ReportShellProps {
    title: string;
    description?: string;
    onExport: () => void;
    exporting?: boolean;
    exportDisabled?: boolean;
    children: React.ReactNode;

    // --- Standard filter toolbar (preferred) ---
    /** Current [start, end]; renders the range picker + quick presets when provided. */
    dateRange?: DateRange;
    setDateRange?: (range: DateRange) => void;
    datePlaceholder?: string;
    /** Show the quick-preset buttons (วันนี้ / 7 วัน / 30 วัน / เดือนนี้). Default true. */
    showPresets?: boolean;
    /** Advanced filters rendered inside the "ตัวกรอง" popover. */
    filterPopover?: React.ReactNode;
    /** Count of active advanced filters — shown as a badge on the button. */
    activeFilterCount?: number;
    /** Clears the advanced filters (rendered as "ล้างทั้งหมด" in the popover). */
    onClearFilters?: () => void;

    // --- Legacy inline filter slot (fallback) ---
    filters?: React.ReactNode;
}

/**
 * Standard report chrome: header (title/desc/back/export) + filter toolbar + body.
 * The toolbar shows a date-range picker with quick presets on the left and a
 * "ตัวกรอง" popover (searchable dropdowns / multi-select) on the right.
 * Every report renders KPIs → charts → table as `children`.
 */
const ReportShell: React.FC<ReportShellProps> = ({
    title, description, onExport, exporting, exportDisabled, children,
    dateRange, setDateRange, datePlaceholder, showPresets = true,
    filterPopover, activeFilterCount = 0, onClearFilters,
    filters,
}) => {
    const navigate = useNavigate();
    const [startDate, endDate] = dateRange ?? [null, null];
    const showToolbar = !!setDateRange || !!filterPopover || !!filters;

    return (
        <Content>
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>{title}</h1>
                    {description && <span className='text-muted fw-semibold fs-6'>{description}</span>}
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button className='btn btn-light fw-bold' onClick={() => navigate('/reports/list')}>
                        <i className='bi bi-arrow-left me-2'></i>กลับ
                    </button>
                    <button className='btn btn-success fw-bold' onClick={onExport} disabled={exporting || exportDisabled}>
                        {exporting
                            ? <><span className='spinner-border spinner-border-sm me-2' />กำลังส่งออก...</>
                            : <><i className='bi bi-file-earmark-spreadsheet me-2'></i>ส่งออก Excel</>}
                    </button>
                </div>
            </div>

            {showToolbar && (
                <div className='card card-flush shadow-sm border-0 mb-5'>
                    <div className='card-body py-4 d-flex flex-wrap gap-3 align-items-center'>
                        {setDateRange && (
                            <>
                                {showPresets && (
                                    <div className='btn-group btn-group-sm' role='group'>
                                        {DATE_PRESETS.map((p) => (
                                            <button key={p.key} type='button' className='btn btn-light'
                                                onClick={() => setDateRange(p.make())}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <DateRangeFilter
                                    startDate={startDate} endDate={endDate}
                                    onChange={setDateRange}
                                    placeholder={datePlaceholder}
                                />
                            </>
                        )}
                        {filters}
                        <div className='flex-grow-1' />
                        {filterPopover && (
                            <FilterPopover activeCount={activeFilterCount} onClear={onClearFilters}>
                                {filterPopover}
                            </FilterPopover>
                        )}
                    </div>
                </div>
            )}

            {children}
        </Content>
    );
};

export default ReportShell;
