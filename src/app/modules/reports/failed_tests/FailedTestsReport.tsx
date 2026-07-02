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
    test_result_id: number;
    test_result_code: string | null;
    qc_work_order_code: string | null;
    item_code: string | null;
    item_name: string | null;
    claimed_qty: number;
    failed_qty: number;
    passed_qty: number;
    failed_units: number;
    started_at: string | null;
    remark: string | null;
}

interface Summary {
    failed_tests: number;
    total_claimed_qty: number;
    total_failed_items: number;
    fail_rate_pct: number;
}

const FailedTestsReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(lastNDaysToToday(30));
    const [startDate, endDate] = dateRange;

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
    }), [startDate, endDate]);

    const r = useReport<Row, Summary>('failed_tests', params, enabled);
    const summary = r.summary;

    const passFail = (r.breakdown.pass_fail as { name: string; value: number }[]) || [];
    const byItem = (r.breakdown.by_item as { item_code: string; failed_qty: number; claimed_qty: number }[]) || [];
    const byDay = (r.breakdown.by_day as { day: string; failed_qty: number; claimed_qty: number }[]) || [];

    const passFailPie = useMemo(
        () => passFail.map((x) => ({ name: x.name, value: x.value, fill: x.name === 'ผ่าน' ? '#50CD89' : '#F1416C' })),
        [passFail],
    );
    const itemBar = useMemo(
        () => byItem.map((x) => ({ name: x.item_code, value: x.failed_qty })),
        [byItem],
    );

    const cols: Column<Row>[] = [
        { key: 'test_result_code', label: 'รหัสผลทดสอบ', minWidth: 130, render: (x) => <span className='text-gray-800 fw-bold'>{x.test_result_code ?? `#${x.test_result_id}`}</span> },
        { key: 'item_name', label: 'สินค้า', render: (x) => x.item_name ?? '-' },
        { key: 'claimed_qty', label: 'ทดสอบ', align: 'end', render: (x) => fmtNum(x.claimed_qty) },
        { key: 'failed_qty', label: 'ตก', align: 'end', render: (x) => <span className='text-danger fw-bold'>{fmtNum(x.failed_qty)}</span> },
        { key: 'passed_qty', label: 'ผ่าน', align: 'end', render: (x) => fmtNum(x.passed_qty) },
        { key: 'started_at', label: 'เริ่มเมื่อ', render: (x) => fmtDate(x.started_at) },
    ];

    return (
        <ReportShell
            title='รายงานการทดสอบที่ไม่ผ่าน'
            description='สรุปผลการทดสอบที่ไม่ผ่าน, อัตราตก และส่งออก Excel'
            onExport={() => r.handleExport('failed_tests.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
        >
            {summary && <KpiCards cards={[
                { label: 'การทดสอบที่ไม่ผ่าน', value: summary.failed_tests, icon: 'bi-x-octagon', bg: 'bg-light-danger', color: 'text-danger' },
                { label: 'ชิ้นที่ตก', value: summary.total_failed_items, icon: 'bi-exclamation-triangle', bg: 'bg-light-warning', color: 'text-warning' },
                { label: 'อัตราตก %', value: summary.fail_rate_pct, icon: 'bi-percent', bg: 'bg-light-info', color: 'text-info' },
                { label: 'จำนวนที่ทดสอบ', value: summary.total_claimed_qty, icon: 'bi-box', bg: 'bg-light-primary', color: 'text-primary' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='ผ่าน vs ไม่ผ่าน' colClass='col-xl-4' hasData={passFailPie.length > 0}>
                    <DonutChart data={passFailPie} />
                </ChartCard>
                <ChartCard title='ชิ้นที่ตกรายสินค้า (Top 15)' colClass='col-xl-4' hasData={itemBar.length > 0}>
                    <SimpleBarChart data={itemBar} layout='vertical' color='#F1416C' />
                </ChartCard>
                <ChartCard title='แนวโน้มรายวัน' colClass='col-xl-4' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[
                        { key: 'claimed_qty', name: 'ทดสอบ', color: '#009EF7' },
                        { key: 'failed_qty', name: 'ตก', color: '#F1416C' },
                    ]} />
                </ChartCard>
            </div>

            <ReportTable
                title='รายการทดสอบที่ไม่ผ่าน' columns={cols} rows={r.rows} rowKey={(x) => x.test_result_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default FailedTestsReport;
