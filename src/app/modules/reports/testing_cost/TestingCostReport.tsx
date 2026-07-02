import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, TrendLine, ScatterCard, DonutDatum } from '../_shared/charts';
import { fmtNum } from '../_shared/filters';
import { firstOfMonthToToday } from '../_shared/datePresets';
import { useReport } from '../_shared/useReport';

interface Row {
    test_result_id: number;
    test_result_code: string | null;
    qc_work_order_code: string | null;
    item_code: string | null;
    item_name: string | null;
    session_status: string | null;
    overall_status: string | null;
    claimed_qty: number;
    material_cost: number;
    machine_cost: number;
    labor_cost: number;
    total_cost: number;
    unit_cost: number;
    started_at: string | null;
}

interface Summary {
    test_result_count: number;
    total_claimed_qty: number;
    total_material_cost: number;
    total_machine_cost: number;
    total_labor_cost: number;
    total_cost: number;
    avg_unit_cost: number;
}

const TestingCostReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(firstOfMonthToToday());
    const [startDate, endDate] = dateRange;

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
    }), [startDate, endDate]);

    const r = useReport<Row, Summary>('testing_cost', params, enabled);
    const summary = r.summary;

    const costMix = (r.breakdown.cost_mix as { name: string; value: number }[]) || [];
    const byStatus = (r.breakdown.by_status as { status: string; count: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; total_cost: number }[]) || [];
    const costScatter = (r.breakdown.cost_scatter as { name: string; qty: number; unit_cost: number }[]) || [];

    const costMixData: DonutDatum[] = useMemo(() => costMix.map((x) => ({ name: x.name, value: x.value })), [costMix]);
    const byStatusData: DonutDatum[] = useMemo(() => byStatus.map((x) => ({ name: x.status, value: x.count })), [byStatus]);

    const cols: Column<Row>[] = [
        { key: 'test_result_code', label: 'รหัสผลทดสอบ', minWidth: 130, render: (x) => <span className='text-gray-800 fw-bold'>{x.test_result_code ?? `#${x.test_result_id}`}</span> },
        { key: 'item_name', label: 'สินค้า', render: (x) => x.item_name ?? '-' },
        { key: 'overall_status', label: 'สถานะ', align: 'center', render: (x) => x.overall_status == null ? '-' : <span className={`badge ${x.overall_status === 'PASSED' ? 'badge-light-success' : 'badge-light-danger'} fw-bold`}>{x.overall_status}</span> },
        { key: 'claimed_qty', label: 'จำนวน', align: 'end', render: (x) => fmtNum(x.claimed_qty) },
        { key: 'material_cost', label: 'วัตถุดิบ', align: 'end', render: (x) => fmtNum(x.material_cost) },
        { key: 'machine_cost', label: 'เครื่อง', align: 'end', render: (x) => fmtNum(x.machine_cost) },
        { key: 'labor_cost', label: 'ค่าแรง', align: 'end', render: (x) => fmtNum(x.labor_cost) },
        { key: 'total_cost', label: 'รวม', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.total_cost)}</span> },
        { key: 'unit_cost', label: 'ต้นทุน/หน่วย', align: 'end', render: (x) => fmtNum(x.unit_cost) },
    ];

    return (
        <ReportShell
            title='รายงานต้นทุนการทดสอบ'
            description='สรุปต้นทุนการทดสอบ และส่งออก Excel'
            onExport={() => r.handleExport('testing_cost.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนผลทดสอบ', value: summary.test_result_count, icon: 'bi-clipboard-data', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ต้นทุนรวม', value: summary.total_cost, icon: 'bi-cash-stack', bg: 'bg-light-success', color: 'text-success' },
                { label: 'ต้นทุน/หน่วยเฉลี่ย', value: summary.avg_unit_cost, icon: 'bi-tag', bg: 'bg-light-info', color: 'text-info' },
                { label: 'จำนวนที่ทดสอบ', value: summary.total_claimed_qty, icon: 'bi-box', bg: 'bg-light-warning', color: 'text-warning' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='สัดส่วนต้นทุน' colClass='col-xl-4' hasData={costMixData.length > 0}>
                    <DonutChart data={costMixData} />
                </ChartCard>
                <ChartCard title='ตามสถานะ' colClass='col-xl-4' hasData={byStatusData.length > 0}>
                    <DonutChart data={byStatusData} />
                </ChartCard>
                <ChartCard title='แนวโน้มต้นทุนรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[{ key: 'total_cost', name: 'ต้นทุน', color: '#009EF7' }]} />
                </ChartCard>
            </div>

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='จำนวนทดสอบ vs ต้นทุน/หน่วย' colClass='col-12' height={320} hasData={costScatter.length > 0}>
                    <ScatterCard data={costScatter} xKey='qty' yKey='unit_cost' xName='จำนวนที่ทดสอบ' yName='ต้นทุน/หน่วย' color='#7239EA' />
                </ChartCard>
            </div>

            <ReportTable
                title='ต้นทุนการทดสอบ' columns={cols} rows={r.rows} rowKey={(x) => x.test_result_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default TestingCostReport;
