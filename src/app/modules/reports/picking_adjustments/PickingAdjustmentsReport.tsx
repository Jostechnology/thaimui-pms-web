import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, TrendLine, toDivergingBars } from '../_shared/charts';
import { fmtDate } from '../_shared/filters';
import { firstOfMonthToToday } from '../_shared/datePresets';
import { EnumMultiSelect } from '../_shared/ReportPickers';
import { FilterField } from '../_shared/FilterPopover';
import { useReport } from '../_shared/useReport';

const REASON_OPTIONS = [
    { value: 'MISCOUNT', label: 'นับผิด' },
    { value: 'SPILLAGE', label: 'ของหก' },
    { value: 'CORRECTION', label: 'แก้ไข' },
    { value: 'REALLOCATE', label: 'ย้าย' },
    { value: 'OTHER', label: 'อื่นๆ' },
];

interface Row {
    adjustment_id: number;
    picking_request_code: string | null;
    item_code: string | null;
    item_name: string | null;
    delta_qty: number;
    reason: string;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
}

interface Summary {
    adjustments_count: number;
    total_delta_qty: number;
    miscount: number;
    spillage: number;
    correction: number;
    reallocate: number;
    other: number;
}

const PickingAdjustmentsReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(firstOfMonthToToday());
    const [startDate, endDate] = dateRange;
    const [reason, setReason] = useState<string[]>([]);

    const enabled = !!(startDate && endDate);
    const activeFilterCount = reason.length ? 1 : 0;

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
        reason: reason.length ? reason.join(',') : undefined,
    }), [startDate, endDate, reason]);

    const r = useReport<Row, Summary>('picking_adjustments', params, enabled);
    const summary = r.summary;

    const byReason = (r.breakdown.by_reason as { reason: string; count: number; delta_sum: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; count: number; delta_sum: number }[]) || [];

    const cols: Column<Row>[] = [
        { key: 'picking_request_code', label: 'เลขที่ใบขอเบิก', minWidth: 130, render: (x) => <span className='text-gray-800 fw-bold'>{x.picking_request_code ?? `#${x.adjustment_id}`}</span> },
        { key: 'item_name', label: 'สินค้า', render: (x) => <><span className='text-gray-800'>{x.item_name}</span>{x.item_code && <span className='text-muted d-block fs-8'>{x.item_code}</span>}</> },
        { key: 'delta_qty', label: 'ส่วนต่าง', align: 'end', render: (x) => <span className={`fw-bold ${x.delta_qty < 0 ? 'text-danger' : x.delta_qty > 0 ? 'text-success' : 'text-gray-700'}`}>{x.delta_qty > 0 ? `+${x.delta_qty}` : x.delta_qty}</span> },
        { key: 'reason', label: 'เหตุผล', render: (x) => <span className='badge badge-light-primary'>{x.reason}</span> },
        { key: 'remark', label: 'หมายเหตุ', render: (x) => x.remark || '-' },
        { key: 'created_date', label: 'วันที่', render: (x) => fmtDate(x.created_date) },
    ];

    return (
        <ReportShell
            title='รายงานการปรับยอด Picking'
            description='สรุปการปรับยอดสินค้าในการเบิก แยกตามเหตุผล และส่งออก Excel'
            onExport={() => r.handleExport('picking_adjustments.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setReason([])}
            filterPopover={
                <FilterField label='เหตุผล (เลือกได้หลายอัน)'>
                    <EnumMultiSelect value={reason} onChange={setReason} options={REASON_OPTIONS} />
                </FilterField>
            }
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนการปรับ', value: summary.adjustments_count, icon: 'bi-pencil-square', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ส่วนต่างสุทธิ', value: summary.total_delta_qty, icon: 'bi-arrow-left-right', bg: 'bg-light-info', color: 'text-info' },
                { label: 'นับผิด', value: summary.miscount, icon: 'bi-exclamation-triangle', bg: 'bg-light-warning', color: 'text-warning' },
                { label: 'ของหก', value: summary.spillage, icon: 'bi-droplet', bg: 'bg-light-danger', color: 'text-danger' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='สัดส่วนตามเหตุผล' colClass='col-xl-4' hasData={byReason.length > 0}>
                    <DonutChart data={byReason.map((x) => ({ name: x.reason, value: x.count }))} />
                </ChartCard>
                <ChartCard title='ส่วนต่างตามเหตุผล' colClass='col-xl-4' hasData={byReason.length > 0}>
                    <SimpleBarChart data={toDivergingBars(byReason.map((x) => ({ name: x.reason, value: x.delta_sum })))} />
                </ChartCard>
                <ChartCard title='แนวโน้มรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[{ key: 'count', name: 'จำนวน', color: '#009EF7' }]} />
                </ChartCard>
            </div>

            <ReportTable
                title='รายการปรับยอด' columns={cols} rows={r.rows} rowKey={(x) => x.adjustment_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default PickingAdjustmentsReport;
