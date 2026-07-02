import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, TrendLine } from '../_shared/charts';
import { fmtNum, fmtDate } from '../_shared/filters';
import { lastNDaysToToday } from '../_shared/datePresets';
import { useReport } from '../_shared/useReport';

interface Row {
    work_run_id: number;
    lot_number: string | null;
    item_code: string | null;
    item_name: string | null;
    planned_qty: number;
    usable_qty: number;
    defect_qty: number;
    consumed_defect_qty: number;
    outstanding_defect_qty: number;
    has_rework: boolean;
    defect_rate_pct: number;
    completed_date: string | null;
}

interface Summary {
    workrun_count: number;
    total_planned_qty: number;
    total_usable_qty: number;
    total_defect_qty: number;
    total_outstanding_defect_qty: number;
    runs_with_rework: number;
    defect_rate_pct: number;
}

const WorkrunDefectsReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(lastNDaysToToday(30));
    const [startDate, endDate] = dateRange;

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
    }), [startDate, endDate]);

    const r = useReport<Row, Summary>('workrun_defects', params, enabled);
    const summary = r.summary;

    const reworkSplit = (r.breakdown.rework_split as { name: string; value: number }[]) || [];
    const byItem = (r.breakdown.by_item as { label: string; defect_qty: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; defect_qty: number }[]) || [];

    const reworkPie = useMemo(
        () => reworkSplit.map((x) => ({ name: x.name, value: x.value, fill: x.name.includes('คงค้าง') ? '#F1416C' : '#50CD89' })),
        [reworkSplit],
    );
    const itemBar = useMemo(
        () => byItem.map((x) => ({ name: x.label, value: x.defect_qty })),
        [byItem],
    );

    const cols: Column<Row>[] = [
        { key: 'lot_number', label: 'ล็อต', minWidth: 130, render: (x) => <span className='text-gray-800 fw-bold'>{x.lot_number ?? `WR#${x.work_run_id}`}</span> },
        { key: 'item_name', label: 'สินค้า', render: (x) => x.item_name ?? '-' },
        { key: 'planned_qty', label: 'แผน', align: 'end', render: (x) => fmtNum(x.planned_qty) },
        { key: 'usable_qty', label: 'ใช้ได้', align: 'end', render: (x) => fmtNum(x.usable_qty) },
        { key: 'defect_qty', label: 'ของเสีย', align: 'end', render: (x) => <span className='text-danger fw-bold'>{fmtNum(x.defect_qty)}</span> },
        { key: 'outstanding_defect_qty', label: 'คงค้าง', align: 'end', render: (x) => fmtNum(x.outstanding_defect_qty) },
        { key: 'has_rework', label: 'Rework', align: 'center', render: (x) => x.has_rework ? <span className='badge badge-light-success'>มี</span> : <span className='badge badge-light-secondary'>ไม่มี</span> },
        { key: 'defect_rate_pct', label: 'อัตรา %', align: 'end', render: (x) => fmtNum(x.defect_rate_pct) },
        { key: 'completed_date', label: 'เสร็จเมื่อ', render: (x) => fmtDate(x.completed_date) },
    ];

    return (
        <ReportShell
            title='รายงานของเสีย WorkRun'
            description='สรุปของเสียรายล็อต, สถานะ rework และส่งออก Excel'
            onExport={() => r.handleExport('workrun_defects.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวน WorkRun', value: summary.workrun_count, icon: 'bi-gear', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ของเสียรวม', value: summary.total_defect_qty, icon: 'bi-exclamation-triangle', bg: 'bg-light-danger', color: 'text-danger' },
                { label: 'อัตราของเสีย %', value: summary.defect_rate_pct, icon: 'bi-percent', bg: 'bg-light-warning', color: 'text-warning' },
                { label: 'คงค้าง rework', value: summary.total_outstanding_defect_qty, icon: 'bi-arrow-repeat', bg: 'bg-light-info', color: 'text-info' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='สถานะ Rework' colClass='col-xl-4' hasData={reworkPie.length > 0}>
                    <DonutChart data={reworkPie} />
                </ChartCard>
                <ChartCard title='ของเสียรายล็อต (Top 15)' colClass='col-xl-4' hasData={itemBar.length > 0}>
                    <SimpleBarChart data={itemBar} layout='vertical' color='#F1416C' />
                </ChartCard>
                <ChartCard title='แนวโน้มของเสียรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[
                        { key: 'defect_qty', name: 'ของเสีย', color: '#F1416C' },
                    ]} />
                </ChartCard>
            </div>

            <ReportTable
                title='ของเสียรายล็อต' columns={cols} rows={r.rows} rowKey={(x) => x.work_run_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default WorkrunDefectsReport;
