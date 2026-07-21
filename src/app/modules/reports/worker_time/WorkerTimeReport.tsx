import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import GanttChart, { GanttTask, GanttViewMode } from '../_shared/GanttChart';
import { ChartCard, SimpleBarChart, TrendLine, BarDatum } from '../_shared/charts';
import { fmtNum, fmtDateTime } from '../_shared/filters';
import { lastNDaysToToday } from '../_shared/datePresets';
import { EmployeePicker, WorkOrderPicker, EnumMultiSelect } from '../_shared/ReportPickers';
import { FilterField, BoolFilter } from '../_shared/FilterPopover';
import { WORKRUN_STATUS_OPTIONS } from '../_shared/reportEnums';
import { useReport } from '../_shared/useReport';

interface Row {
    assignment_id: number;
    employee_id: number;
    employee_name: string;
    work_run_id: number;
    lot_number: string | null;
    from_time: string | null;
    to_time: string | null;
    gross_hours: number;
    break_hours: number;
    net_hours: number;
    open: boolean;
}

interface EmployeeTotal {
    employee_id: number;
    employee_name: string;
    assignments: number;
    work_runs: number;
    gross_hours: number;
    net_hours: number;
}

interface Summary {
    assignments_count: number;
    unique_employees: number;
    total_gross_hours: number;
    total_net_hours: number;
    open_assignments: number;
}

const WorkerTimeReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(lastNDaysToToday(7));
    const [startDate, endDate] = dateRange;
    const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
    const [workOrderId, setWorkOrderId] = useState<number | undefined>(undefined);
    const [workrunStatus, setWorkrunStatus] = useState<string[]>([]);
    const [openOnly, setOpenOnly] = useState(false);
    const [viewMode, setViewMode] = useState<GanttViewMode>('Day');

    const requiredOk = !!(startDate && endDate);
    const activeFilterCount = (employeeId ? 1 : 0) + (workOrderId ? 1 : 0) + (workrunStatus.length ? 1 : 0) + (openOnly ? 1 : 0);

    const params = useMemo(() => {
        const out: Record<string, unknown> = {};
        const f = toDateOnly(startDate); const t = toDateOnly(endDate);
        if (f) out.from = f;
        if (t) out.to = t;
        if (employeeId) out.employee_id = employeeId;
        if (workOrderId) out.work_order_id = workOrderId;
        if (workrunStatus.length) out.workrun_status = workrunStatus.join(',');
        if (openOnly) out.open_only = true;
        return out;
    }, [startDate, endDate, employeeId, workOrderId, workrunStatus, openOnly]);

    const clearFilters = () => { setEmployeeId(undefined); setWorkOrderId(undefined); setWorkrunStatus([]); setOpenOnly(false); };

    const r = useReport<Row, Summary>('worker_time', params, requiredOk, 50);
    const summary = r.summary;
    const gantt = (r.extra.gantt as GanttTask[]) || [];
    const totals = (r.extra.employee_totals as EmployeeTotal[]) || [];
    const byDay = (r.breakdown.by_day_hours as { day: string; net_hours: number }[]) || [];

    const empBar: BarDatum[] = useMemo(
        () => totals.slice(0, 15).map((t) => ({ name: t.employee_name, value: t.net_hours })),
        [totals],
    );

    const totalsCols: Column<EmployeeTotal>[] = [
        { key: 'employee_name', label: 'พนักงาน', render: (t) => <span className='fw-bold text-gray-800'>{t.employee_name}</span> },
        { key: 'assignments', label: 'จำนวนงาน', align: 'end', render: (t) => fmtNum(t.assignments) },
        { key: 'work_runs', label: 'WorkRun', align: 'end', render: (t) => fmtNum(t.work_runs) },
        { key: 'gross_hours', label: 'ชั่วโมงรวม', align: 'end', render: (t) => fmtNum(t.gross_hours) },
        { key: 'net_hours', label: 'ชั่วโมงสุทธิ', align: 'end', render: (t) => <span className='fw-bold'>{fmtNum(t.net_hours)}</span> },
    ];

    const cols: Column<Row>[] = [
        { key: 'employee_name', label: 'พนักงาน', render: (x) => <span className='fw-bold text-gray-800'>{x.employee_name}</span> },
        { key: 'lot_number', label: 'Lot / WorkRun', render: (x) => x.lot_number || `WR#${x.work_run_id}` },
        { key: 'from_time', label: 'เริ่ม', render: (x) => fmtDateTime(x.from_time) },
        { key: 'to_time', label: 'สิ้นสุด', render: (x) => x.open ? <span className='badge badge-light-warning'>กำลังทำ</span> : fmtDateTime(x.to_time) },
        { key: 'gross_hours', label: 'ชั่วโมงรวม', align: 'end', render: (x) => fmtNum(x.gross_hours) },
        { key: 'break_hours', label: 'พัก', align: 'end', render: (x) => fmtNum(x.break_hours) },
        { key: 'net_hours', label: 'สุทธิ', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.net_hours)}</span> },
    ];

    return (
        <ReportShell
            title='เวลาทำงานของพนักงาน'
            description='Gantt + ตารางบันทึกการมอบหมายงานต่อ WorkRun'
            onExport={() => r.handleExport('worker_time.xlsx')}
            exporting={r.exporting}
            exportDisabled={!requiredOk}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            filters={
                <select className='form-select form-select-sm form-select-solid w-110px'
                    value={viewMode} onChange={(e) => setViewMode(e.target.value as GanttViewMode)}>
                    <option value='Day'>วัน</option>
                    <option value='Week'>สัปดาห์</option>
                    <option value='Month'>เดือน</option>
                </select>
            }
            filterPopover={<>
                <FilterField label='พนักงาน'>
                    <EmployeePicker value={employeeId} onChange={setEmployeeId} />
                </FilterField>
                <FilterField label='ใบสั่งผลิต (Work Order)'>
                    <WorkOrderPicker value={workOrderId} onChange={setWorkOrderId} />
                </FilterField>
                <FilterField label='สถานะ WorkRun (เลือกได้หลายอัน)'>
                    <EnumMultiSelect value={workrunStatus} onChange={setWorkrunStatus} options={WORKRUN_STATUS_OPTIONS} />
                </FilterField>
                <BoolFilter label='เฉพาะงานที่ยังไม่ปิด' checked={openOnly} onChange={setOpenOnly} />
            </>}
        >
            {summary && <KpiCards cards={[
                { label: 'การมอบหมายงาน', value: summary.assignments_count, icon: 'bi-list-task', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'จำนวนพนักงาน', value: summary.unique_employees, icon: 'bi-people', bg: 'bg-light-info', color: 'text-info' },
                { label: 'ชั่วโมงสุทธิรวม', value: summary.total_net_hours, icon: 'bi-clock-history', bg: 'bg-light-success', color: 'text-success' },
                { label: 'งานที่ยังไม่ปิด', value: summary.open_assignments, icon: 'bi-exclamation-circle', bg: summary.open_assignments > 0 ? 'bg-light-warning' : 'bg-light-secondary', color: summary.open_assignments > 0 ? 'text-warning' : 'text-gray-600' },
            ]} />}

            {/* Gantt */}
            <div className='card card-flush shadow-sm border-0 mb-8'>
                <div className='card-header border-0 pt-6'>
                    <h3 className='card-title fw-bold text-gray-900'>ตารางเวลาแบบ Gantt</h3>
                    <span className='card-toolbar text-muted fs-8'>* ลากเพื่อ pan, scroll เพื่อ zoom</span>
                </div>
                <div className='card-body pt-2'>
                    {gantt.length > 0
                        ? <GanttChart tasks={gantt} viewMode={viewMode} />
                        : <div className='text-center py-15 text-muted'>{requiredOk ? 'ไม่มีข้อมูลในช่วงเวลานี้' : 'กรุณาเลือกช่วงวันที่'}</div>}
                </div>
            </div>

            {/* Charts */}
            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='ชั่วโมงสุทธิรายพนักงาน' colClass='col-xl-6' hasData={empBar.length > 0}>
                    <SimpleBarChart data={empBar} layout='vertical' color='#50CD89' />
                </ChartCard>
                <ChartCard title='ชั่วโมงสุทธิรายวัน' colClass='col-xl-6' hasData={byDay.length > 0}>
                    <TrendLine data={byDay} xKey='day' series={[{ key: 'net_hours', name: 'ชั่วโมงสุทธิ', color: '#009EF7' }]} />
                </ChartCard>
            </div>

            <div className='mb-8'>
                <ReportTable title='สรุปรายพนักงาน' columns={totalsCols} rows={totals} rowKey={(t) => t.employee_id} />
            </div>

            <ReportTable
                title='การมอบหมายงานทั้งหมด' columns={cols} rows={r.rows} rowKey={(x) => x.assignment_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default WorkerTimeReport;
