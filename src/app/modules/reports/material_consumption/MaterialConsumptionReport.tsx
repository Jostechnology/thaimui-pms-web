import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart, DonutDatum, BarDatum } from '../_shared/charts';
import { fmtNum } from '../_shared/filters';
import { firstOfMonthToToday } from '../_shared/datePresets';
import { useReport } from '../_shared/useReport';

interface Row {
    item_code: string;
    item_name: string | null;
    unit: string | null;
    qty_workrun: number;
    qty_testresult: number;
    total_qty: number;
}

interface Summary {
    unique_items: number;
    total_qty_workrun: number;
    total_qty_testresult: number;
    total_qty: number;
}

const MaterialConsumptionReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(firstOfMonthToToday());
    const [startDate, endDate] = dateRange;

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
    }), [startDate, endDate]);

    const r = useReport<Row, Summary>('material_consumption', params, enabled);
    const summary = r.summary;

    const byItem = (r.breakdown.by_item as { item_code: string; total_qty: number }[]) || [];
    const sourceSplit = (r.breakdown.source_split as { name: string; value: number }[]) || [];

    const byItemData: BarDatum[] = useMemo(() => byItem.map((x) => ({ name: x.item_code, value: x.total_qty })), [byItem]);
    const sourceSplitData: DonutDatum[] = useMemo(() => sourceSplit.map((x) => ({ name: x.name, value: x.value })), [sourceSplit]);

    const cols: Column<Row>[] = [
        { key: 'item_code', label: 'รหัส', minWidth: 120, render: (x) => <span className='text-gray-800 fw-bold'>{x.item_code}</span> },
        { key: 'item_name', label: 'ชื่อ', render: (x) => x.item_name ?? '-' },
        { key: 'unit', label: 'หน่วย', render: (x) => x.unit ?? '-' },
        { key: 'qty_workrun', label: 'WorkRun', align: 'end', render: (x) => fmtNum(x.qty_workrun) },
        { key: 'qty_testresult', label: 'ทดสอบ', align: 'end', render: (x) => fmtNum(x.qty_testresult) },
        { key: 'total_qty', label: 'รวม', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.total_qty)}</span> },
    ];

    return (
        <ReportShell
            title='รายงานการใช้วัตถุดิบ'
            description='สรุปการใช้วัตถุดิบในการผลิตและการทดสอบ และส่งออก Excel'
            onExport={() => r.handleExport('material_consumption.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            dateRange={dateRange}
            setDateRange={setDateRange}
            datePlaceholder='เลือกช่วงวันที่ (จำเป็น)'
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวนวัตถุดิบ', value: summary.unique_items, icon: 'bi-boxes', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'ใช้รวม', value: summary.total_qty, icon: 'bi-bag-check', bg: 'bg-light-success', color: 'text-success' },
                { label: 'ใช้ใน WorkRun', value: summary.total_qty_workrun, icon: 'bi-gear', bg: 'bg-light-info', color: 'text-info' },
                { label: 'ใช้ในการทดสอบ', value: summary.total_qty_testresult, icon: 'bi-clipboard-data', bg: 'bg-light-warning', color: 'text-warning' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='การใช้วัตถุดิบ (Top 15)' colClass='col-xl-6' hasData={byItemData.length > 0}>
                    <SimpleBarChart data={byItemData} layout='vertical' color='#50CD89' />
                </ChartCard>
                <ChartCard title='แหล่งที่ใช้' colClass='col-xl-6' hasData={sourceSplitData.length > 0}>
                    <DonutChart data={sourceSplitData} />
                </ChartCard>
            </div>

            <ReportTable
                title='การใช้วัตถุดิบรายรายการ' columns={cols} rows={r.rows} rowKey={(x) => x.item_code}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default MaterialConsumptionReport;
