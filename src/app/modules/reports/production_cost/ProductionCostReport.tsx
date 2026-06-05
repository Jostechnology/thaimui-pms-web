import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, TrendLine, DonutDatum, BarDatum } from '../_shared/charts';
import { DateRangeFilter, fmtNum, fmtDate } from '../_shared/filters';
import { useReport } from '../_shared/useReport';

interface Row {
    work_run_id: number;
    lot_number: string | null;
    item_code: string | null;
    item_name: string | null;
    status: string | null;
    planned_qty: number;
    usable_qty: number;
    material_cost: number;
    machine_cost: number;
    labor_cost: number;
    total_cost: number;
    unit_cost: number;
    completed_date: string | null;
}

interface Summary {
    workrun_count: number;
    total_planned_qty: number;
    total_usable_qty: number;
    total_material_cost: number;
    total_machine_cost: number;
    total_labor_cost: number;
    total_cost: number;
    avg_unit_cost: number;
}

const ProductionCostReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;
    const [workOrderId, setWorkOrderId] = useState('');

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
        work_order_id: workOrderId ? Number(workOrderId) : undefined,
    }), [startDate, endDate, workOrderId]);

    const r = useReport<Row, Summary>('production_cost', params, enabled);
    const summary = r.summary;

    const costMix = (r.breakdown.cost_mix as { name: string; value: number }[]) || [];
    const byWorkrun = (r.breakdown.by_workrun as { label: string; total_cost: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; total_cost: number }[]) || [];

    const costMixData: DonutDatum[] = useMemo(() => costMix.map((x) => ({ name: x.name, value: x.value })), [costMix]);
    const byWorkrunData: BarDatum[] = useMemo(() => byWorkrun.map((x) => ({ name: x.label, value: x.total_cost })), [byWorkrun]);

    const cols: Column<Row>[] = [
        { key: 'lot_number', label: 'ล็อต', minWidth: 120, render: (x) => <span className='text-gray-800 fw-bold'>{x.lot_number ?? `WR#${x.work_run_id}`}</span> },
        { key: 'item_name', label: 'สินค้า', render: (x) => x.item_name ?? '-' },
        { key: 'status', label: 'สถานะ', align: 'center', render: (x) => <span className='badge badge-light-info fw-bold'>{x.status ?? '-'}</span> },
        { key: 'planned_qty', label: 'แผน', align: 'end', render: (x) => fmtNum(x.planned_qty) },
        { key: 'usable_qty', label: 'ใช้ได้', align: 'end', render: (x) => fmtNum(x.usable_qty) },
        { key: 'material_cost', label: 'วัตถุดิบ', align: 'end', render: (x) => fmtNum(x.material_cost) },
        { key: 'machine_cost', label: 'เครื่องจักร', align: 'end', render: (x) => fmtNum(x.machine_cost) },
        { key: 'labor_cost', label: 'ค่าแรง', align: 'end', render: (x) => fmtNum(x.labor_cost) },
        { key: 'total_cost', label: 'รวม', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.total_cost)}</span> },
        { key: 'unit_cost', label: 'ต้นทุน/หน่วย', align: 'end', render: (x) => fmtNum(x.unit_cost) },
    ];

    return (
        <ReportShell
            title='รายงานต้นทุนการผลิต'
            description='สรุปต้นทุนการผลิตรายล็อต และส่งออก Excel'
            onExport={() => r.handleExport('production_cost.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            filters={<>
                <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setDateRange} placeholder='เลือกช่วงวันที่ (จำเป็น)' />
                <input
                    type='number'
                    className='form-control form-control-sm form-control-solid w-180px'
                    placeholder='Filter Work Order ID'
                    value={workOrderId}
                    onChange={(e) => setWorkOrderId(e.target.value)}
                />
            </>}
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวน WorkRun', value: summary.workrun_count, icon: 'bi-gear', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ต้นทุนรวม', value: summary.total_cost, icon: 'bi-cash-stack', bg: 'bg-light-success', color: 'text-success' },
                { label: 'ต้นทุน/หน่วยเฉลี่ย', value: summary.avg_unit_cost, icon: 'bi-tag', bg: 'bg-light-info', color: 'text-info' },
                { label: 'ผลิตได้ (ใช้ได้)', value: summary.total_usable_qty, icon: 'bi-check2-circle', bg: 'bg-light-warning', color: 'text-warning' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='สัดส่วนต้นทุน' colClass='col-xl-4' hasData={costMixData.length > 0}>
                    <DonutChart data={costMixData} />
                </ChartCard>
                <ChartCard title='ต้นทุนรายล็อต (Top 15)' colClass='col-xl-4' hasData={byWorkrunData.length > 0}>
                    <SimpleBarChart data={byWorkrunData} layout='vertical' />
                </ChartCard>
                <ChartCard title='แนวโน้มต้นทุนรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[{ key: 'total_cost', name: 'ต้นทุน', color: '#009EF7' }]} />
                </ChartCard>
            </div>

            <ReportTable
                title='ต้นทุนการผลิตรายล็อต' columns={cols} rows={r.rows} rowKey={(x) => x.work_run_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default ProductionCostReport;
