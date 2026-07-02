import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, GroupedBarChart } from '../_shared/charts';
import { fmtNum } from '../_shared/filters';
import { lastNDaysToToday } from '../_shared/datePresets';
import { MachinePicker } from '../_shared/ReportPickers';
import { FilterField } from '../_shared/FilterPopover';
import { useReport } from '../_shared/useReport';

interface Row {
    machine_id: number;
    machine_code: string | null;
    machine_name: string | null;
    machine_type: string | null;
    working_hours_per_day: number;
    available_hours: number;
    workrun_hours: number;
    test_hours: number;
    used_hours: number;
    utilization_pct: number;
}

interface Summary {
    machine_count: number;
    total_used_hours: number;
    total_available_hours: number;
    fleet_utilization_pct: number;
}

const MachineUtilizationReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(lastNDaysToToday(7));
    const [startDate, endDate] = dateRange;
    const [machineId, setMachineId] = useState<number | undefined>(undefined);

    const enabled = !!(startDate && endDate);
    const activeFilterCount = machineId ? 1 : 0;

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
        machine_id: machineId,
    }), [startDate, endDate, machineId]);

    const r = useReport<Row, Summary>('machine_utilization', params, enabled);
    const summary = r.summary;

    const utilRanked = (r.breakdown.util_ranked as { machine_code: string; utilization_pct: number }[]) || [];
    const usedVsAvailable = (r.breakdown.used_vs_available as { machine_code: string; used_hours: number; available_hours: number }[]) || [];
    const fleetSplit = (r.breakdown.fleet_split as { name: string; value: number }[]) || [];

    const utilBar = useMemo(
        () => utilRanked.map((x) => ({ name: x.machine_code, value: x.utilization_pct })),
        [utilRanked],
    );
    const fleetPie = useMemo(
        () => fleetSplit.map((x) => ({ name: x.name, value: x.value, fill: x.name === 'ใช้งาน' ? '#50CD89' : '#E4E6EF' })),
        [fleetSplit],
    );

    const cols: Column<Row>[] = [
        { key: 'machine_code', label: 'รหัสเครื่อง', minWidth: 120, render: (x) => <span className='text-gray-800 fw-bold'>{x.machine_code ?? `M#${x.machine_id}`}</span> },
        { key: 'machine_name', label: 'ชื่อ', render: (x) => x.machine_name ?? '-' },
        { key: 'machine_type', label: 'ประเภท', render: (x) => x.machine_type || '-' },
        { key: 'available_hours', label: 'พร้อมใช้', align: 'end', render: (x) => fmtNum(x.available_hours) },
        { key: 'used_hours', label: 'ใช้งาน', align: 'end', render: (x) => fmtNum(x.used_hours) },
        { key: 'utilization_pct', label: 'การใช้งาน %', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.utilization_pct)}</span> },
    ];

    return (
        <ReportShell
            title='รายงานการใช้งานเครื่องจักร'
            description='สรุปการใช้งานเครื่องจักร, ชั่วโมงใช้งาน vs พร้อมใช้ และส่งออก Excel'
            onExport={() => r.handleExport('machine_utilization.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
            activeFilterCount={activeFilterCount}
            onClearFilters={() => setMachineId(undefined)}
            filterPopover={
                <FilterField label='เครื่องจักร'>
                    <MachinePicker value={machineId} onChange={setMachineId} />
                </FilterField>
            }
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนเครื่อง', value: summary.machine_count, icon: 'bi-cpu', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ชั่วโมงใช้งาน', value: summary.total_used_hours, icon: 'bi-clock-history', bg: 'bg-light-success', color: 'text-success' },
                { label: 'ชั่วโมงพร้อมใช้', value: summary.total_available_hours, icon: 'bi-calendar-check', bg: 'bg-light-info', color: 'text-info' },
                { label: 'การใช้งานรวม %', value: summary.fleet_utilization_pct, icon: 'bi-percent', bg: 'bg-light-warning', color: 'text-warning' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='การใช้งาน % (Top 15)' colClass='col-xl-4' hasData={utilBar.length > 0}>
                    <SimpleBarChart data={utilBar} layout='vertical' color='#009EF7' />
                </ChartCard>
                <ChartCard title='ใช้งาน vs พร้อมใช้' colClass='col-xl-4' hasData={usedVsAvailable.length > 0}>
                    <GroupedBarChart data={usedVsAvailable} xKey='machine_code' series={[
                        { key: 'used_hours', name: 'ใช้งาน', color: '#50CD89' },
                        { key: 'available_hours', name: 'พร้อมใช้', color: '#E4E6EF' },
                    ]} />
                </ChartCard>
                <ChartCard title='สัดส่วนการใช้งานรวม' colClass='col-xl-4' hasData={fleetPie.length > 0}>
                    <DonutChart data={fleetPie} />
                </ChartCard>
            </div>

            <ReportTable
                title='การใช้งานเครื่องจักร' columns={cols} rows={r.rows} rowKey={(x) => x.machine_id}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default MachineUtilizationReport;
