import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, GroupedBarChart, DonutDatum, toDivergingBars } from '../_shared/charts';
import { fmtNum, fmtDate } from '../_shared/filters';
import { firstOfMonthToToday } from '../_shared/datePresets';
import { EnumMultiSelect } from '../_shared/ReportPickers';
import { FilterField } from '../_shared/FilterPopover';
import { useReport } from '../_shared/useReport';

type Status = 'PENDING' | 'SENT' | 'SUCCESS' | 'FAILED';

interface Row {
    picking_request_id: number;
    picking_request_code: string | null;
    doc_num: number | null;
    status: Status;
    wms_reference: string | null;
    is_reallocation: boolean;
    items_count: number;
    qty_requested: number;
    qty_received: number;
    qty_delta: number;
    short_picks: number;
    created_date: string | null;
}

interface Summary {
    total_requests: number;
    total_items: number;
    total_qty_requested: number;
    total_qty_received: number;
    short_pick_lines: number;
}

const STATUS_LABEL: Record<Status, string> = { PENDING: 'รอดำเนินการ', SENT: 'ส่งแล้ว', SUCCESS: 'สำเร็จ', FAILED: 'ล้มเหลว' };
const STATUS_OPTIONS = (['PENDING', 'SENT', 'SUCCESS', 'FAILED'] as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const STATUS_BADGE: Record<Status, string> = { PENDING: 'badge-light-warning', SENT: 'badge-light-primary', SUCCESS: 'badge-light-success', FAILED: 'badge-light-danger' };
const STATUS_COLOR: Record<Status, string> = { PENDING: '#FFC700', SENT: '#009EF7', SUCCESS: '#50CD89', FAILED: '#F1416C' };

const PickingRequestsReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(firstOfMonthToToday());
    const [startDate, endDate] = dateRange;
    const [statusFilter, setStatusFilter] = useState<Status[]>([]);

    // valid only when range is empty or fully picked
    const enabled = !((startDate && !endDate) || (!startDate && endDate));
    const activeFilterCount = statusFilter.length ? 1 : 0;

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
        status: statusFilter.length ? statusFilter.join(',') : undefined,
    }), [startDate, endDate, statusFilter]);

    const r = useReport<Row, Summary>('picking_requests', params, enabled);
    const summary = r.summary;

    const byStatus = (r.breakdown.by_status as { status: Status; count: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; qty_requested: number; qty_received: number }[]) || [];
    const deltaTop = (r.breakdown.delta_top as { name: string; value: number }[]) || [];

    const statusPie: DonutDatum[] = useMemo(
        () => byStatus.filter((s) => s.count > 0).map((s) => ({ name: STATUS_LABEL[s.status] ?? s.status, value: s.count, fill: STATUS_COLOR[s.status] })),
        [byStatus],
    );
    const qtyBar = useMemo(() => summary ? [
        { name: 'ขอเบิก', value: summary.total_qty_requested, fill: '#009EF7' },
        { name: 'รับจริง', value: summary.total_qty_received, fill: '#50CD89' },
    ] : [], [summary]);

    const cols: Column<Row>[] = [
        { key: 'picking_request_code', label: 'เลขที่ใบขอเบิก', minWidth: 130, render: (x) => <><span className='text-gray-800 fw-bold'>{x.picking_request_code ?? `#${x.picking_request_id}`}</span>{x.is_reallocation && <span className='badge badge-light-info ms-2 fs-9'>Reallocate</span>}</> },
        { key: 'doc_num', label: 'SO', render: (x) => x.doc_num ?? '-' },
        { key: 'status', label: 'สถานะ', align: 'center', render: (x) => <span className={`badge ${STATUS_BADGE[x.status]} fw-bold`}>{STATUS_LABEL[x.status]}</span> },
        { key: 'items_count', label: 'รายการ', align: 'end', render: (x) => fmtNum(x.items_count) },
        { key: 'qty_requested', label: 'ขอเบิก', align: 'end', render: (x) => fmtNum(x.qty_requested) },
        { key: 'qty_received', label: 'รับจริง', align: 'end', render: (x) => fmtNum(x.qty_received) },
        { key: 'qty_delta', label: 'ส่วนต่าง', align: 'end', render: (x) => <span className={`fw-bold ${x.qty_delta < 0 ? 'text-danger' : x.qty_delta > 0 ? 'text-success' : 'text-gray-700'}`}>{x.qty_delta > 0 ? `+${x.qty_delta}` : x.qty_delta}</span> },
        { key: 'short_picks', label: 'ขาด', align: 'end', render: (x) => <span className={`fw-bold ${x.short_picks > 0 ? 'text-danger' : 'text-gray-500'}`}>{fmtNum(x.short_picks)}</span> },
        { key: 'wms_reference', label: 'WMS Ref', render: (x) => x.wms_reference ?? <span className='text-muted'>-</span> },
        { key: 'created_date', label: 'วันที่สร้าง', render: (x) => fmtDate(x.created_date) },
    ];

    return (
        <ReportShell
            title='รายงาน Picking Requests'
            description='สรุปคำขอเบิก, ส่วนต่างจากการตรวจรับ และส่งออก Excel'
            onExport={() => r.handleExport('picking_requests.xlsx')}
            exporting={r.exporting}
            dateRange={dateRange}
            setDateRange={setDateRange}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setStatusFilter([])}
            filterPopover={
                <FilterField label='สถานะ (เลือกได้หลายอัน)'>
                    <EnumMultiSelect
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v as Status[])}
                        options={STATUS_OPTIONS}
                    />
                </FilterField>
            }
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนใบขอเบิก', value: summary.total_requests, icon: 'bi-box-seam', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'รวมรายการสินค้า', value: summary.total_items, icon: 'bi-list-ul', bg: 'bg-light-info', color: 'text-info' },
                { label: 'รวมยอดรับจริง', value: summary.total_qty_received, icon: 'bi-check2-square', bg: 'bg-light-success', color: 'text-success' },
                { label: 'รายการที่รับไม่ครบ', value: summary.short_pick_lines, icon: 'bi-exclamation-triangle', bg: summary.short_pick_lines > 0 ? 'bg-light-danger' : 'bg-light-secondary', color: summary.short_pick_lines > 0 ? 'text-danger' : 'text-gray-600' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='สัดส่วนตามสถานะ' colClass='col-xl-4' hasData={statusPie.length > 0}>
                    <DonutChart data={statusPie} />
                </ChartCard>
                <ChartCard title='ขอเบิก vs รับจริง' colClass='col-xl-4' hasData={!!summary && (summary.total_qty_requested + summary.total_qty_received) > 0}>
                    <SimpleBarChart data={qtyBar} />
                </ChartCard>
                <ChartCard title='แนวโน้มรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <GroupedBarChart data={byDay} xKey='day' series={[
                        { key: 'qty_requested', name: 'ขอเบิก', color: '#009EF7' },
                        { key: 'qty_received', name: 'รับจริง', color: '#50CD89' },
                    ]} />
                </ChartCard>
            </div>

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='ส่วนต่างรับจริง vs ขอเบิก ราย SO (Top 15)' colClass='col-12' height={340} hasData={deltaTop.length > 0}>
                    <SimpleBarChart data={toDivergingBars(deltaTop)} layout='vertical' />
                </ChartCard>
            </div>

            <ReportTable
                title='รายการ Picking Requests' columns={cols} rows={r.rows} rowKey={(x) => x.picking_request_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default PickingRequestsReport;
