import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, ScatterCard, DonutDatum } from '../_shared/charts';
import { fmtNum } from '../_shared/filters';
import { firstOfMonthToToday } from '../_shared/datePresets';
import { useReport } from '../_shared/useReport';

interface Row {
    employee_id: number;
    employee_name: string;
    assignments: number;
    work_runs: number;
    hours_worked: number;
    attributed_usable_qty: number;
    attributed_defect_qty: number;
    output_per_hour: number;
}

interface Summary {
    employees: number;
    total_hours: number;
    total_usable_qty: number;
    total_defect_qty: number;
}

const QUALITY_FILL: Record<string, string> = { 'ใช้ได้': '#50CD89', 'ของเสีย': '#F1416C' };

const EmployeeProductivityReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(firstOfMonthToToday());
    const [startDate, endDate] = dateRange;

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
    }), [startDate, endDate]);

    const r = useReport<Row, Summary>('employee_productivity', params, enabled);
    const summary = r.summary;

    const byEmployee = (r.breakdown.by_employee as { employee_name: string; attributed_usable_qty: number; hours_worked: number; output_per_hour: number }[]) || [];
    const outputVsHours = (r.breakdown.output_vs_hours as { name: string; hours_worked: number; output_per_hour: number }[]) || [];
    const qualitySplit = (r.breakdown.quality_split as { name: string; value: number }[]) || [];

    const qualityPie: DonutDatum[] = useMemo(
        () => qualitySplit.map((x) => ({ name: x.name, value: x.value, fill: QUALITY_FILL[x.name] })),
        [qualitySplit],
    );

    const cols: Column<Row>[] = [
        { key: 'employee_name', label: 'พนักงาน', render: (x) => <span className='fw-bold text-gray-800'>{x.employee_name}</span> },
        { key: 'assignments', label: 'จำนวนงาน', align: 'end', render: (x) => fmtNum(x.assignments) },
        { key: 'work_runs', label: 'WorkRun', align: 'end', render: (x) => fmtNum(x.work_runs) },
        { key: 'hours_worked', label: 'ชั่วโมง', align: 'end', render: (x) => fmtNum(x.hours_worked) },
        { key: 'attributed_usable_qty', label: 'ใช้ได้', align: 'end', render: (x) => fmtNum(x.attributed_usable_qty) },
        { key: 'attributed_defect_qty', label: 'ของเสีย', align: 'end', render: (x) => fmtNum(x.attributed_defect_qty) },
        { key: 'output_per_hour', label: 'ผลผลิต/ชม.', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.output_per_hour)}</span> },
    ];

    return (
        <ReportShell
            title='ประสิทธิภาพพนักงาน'
            description='สรุปผลผลิตและคุณภาพงานรายพนักงาน และส่งออก Excel'
            onExport={() => r.handleExport('employee_productivity.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนพนักงาน', value: summary.employees, icon: 'bi-people', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ชั่วโมงรวม', value: summary.total_hours, icon: 'bi-clock-history', bg: 'bg-light-info', color: 'text-info' },
                { label: 'ผลิตได้(ใช้ได้)', value: summary.total_usable_qty, icon: 'bi-check2-circle', bg: 'bg-light-success', color: 'text-success' },
                { label: 'ของเสีย', value: summary.total_defect_qty, icon: 'bi-x-circle', bg: 'bg-light-danger', color: 'text-danger' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='ผลิตได้รายพนักงาน' colClass='col-xl-4' hasData={byEmployee.length > 0}>
                    <SimpleBarChart data={byEmployee.map((x) => ({ name: x.employee_name, value: x.attributed_usable_qty }))} layout='vertical' color='#50CD89' />
                </ChartCard>
                <ChartCard title='ชั่วโมง vs ผลผลิต/ชม.' colClass='col-xl-4' hasData={outputVsHours.length > 0}>
                    <ScatterCard data={outputVsHours} xKey='hours_worked' yKey='output_per_hour' xName='ชั่วโมง' yName='ผลผลิต/ชม.' />
                </ChartCard>
                <ChartCard title='สัดส่วนคุณภาพ' colClass='col-xl-4' hasData={qualityPie.length > 0}>
                    <DonutChart data={qualityPie} />
                </ChartCard>
            </div>

            <ReportTable
                title='ประสิทธิภาพรายพนักงาน' columns={cols} rows={r.rows} rowKey={(x) => x.employee_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default EmployeeProductivityReport;
