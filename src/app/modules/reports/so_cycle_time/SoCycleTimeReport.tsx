import React, { useMemo, useState } from 'react';
import { toDateOnly } from '../../../utils/validate_utils';
import ReportShell from '../_shared/ReportShell';
import KpiCards from '../_shared/KpiCards';
import ReportTable, { Column } from '../_shared/ReportTable';
import { ChartCard, DonutChart, SimpleBarChart } from '../_shared/charts';
import { DateRangeFilter, fmtNum, fmtDate } from '../_shared/filters';
import { useReport } from '../_shared/useReport';

interface Row {
    doc_entry: number;
    doc_num: number | null;
    card_code: string | null;
    card_name: string | null;
    urgency_level: string | null;
    status: string;
    created_date: string | null;
    completed_date: string | null;
    days_elapsed: number;
}

interface Summary {
    total_orders: number;
    completed_orders: number;
    open_orders: number;
    avg_days_to_complete: number;
    max_days_to_complete: number;
    avg_days_open: number;
    max_days_open: number;
}

const SoCycleTimeReport: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;
    const [status, setStatus] = useState('');

    const enabled = !!(startDate && endDate);

    const params = useMemo(() => ({
        from: toDateOnly(startDate) ?? undefined,
        to: toDateOnly(endDate) ?? undefined,
        status: status || undefined,
    }), [startDate, endDate, status]);

    const r = useReport<Row, Summary>('so_cycle_time', params, enabled);
    const summary = r.summary;

    const byStatus = (r.breakdown.by_status as { status: string; count: number; avg_days: number }[]) || [];
    const byUrgency = (r.breakdown.by_urgency as { urgency_level: string; count: number }[]) || [];
    const cycleDistribution = (r.breakdown.cycle_distribution as { bucket: string; count: number }[]) || [];

    const cols: Column<Row>[] = [
        { key: 'doc_num', label: 'เลขที่', render: (x) => <span className='fw-bold text-gray-800'>{x.doc_num ?? '-'}</span> },
        { key: 'card_name', label: 'ลูกค้า', render: (x) => <><span className='text-gray-800'>{x.card_name}</span>{x.card_code && <span className='text-muted d-block fs-8'>{x.card_code}</span>}</> },
        { key: 'urgency_level', label: 'ความเร่งด่วน', render: (x) => x.urgency_level || '-' },
        { key: 'status', label: 'สถานะ', align: 'center', render: (x) => <span className={`badge ${x.status === 'COMPLETED' ? 'badge-light-success' : 'badge-light-primary'} fw-bold`}>{x.status}</span> },
        { key: 'created_date', label: 'สร้างเมื่อ', render: (x) => fmtDate(x.created_date) },
        { key: 'completed_date', label: 'เสร็จเมื่อ', render: (x) => fmtDate(x.completed_date) },
        { key: 'days_elapsed', label: 'วัน', align: 'end', render: (x) => <span className='fw-bold'>{fmtNum(x.days_elapsed)}</span> },
    ];

    return (
        <ReportShell
            title='รายงานรอบเวลาใบสั่งขาย'
            description='สรุประยะเวลาดำเนินการของใบสั่งขาย และส่งออก Excel'
            onExport={() => r.handleExport('so_cycle_time.xlsx')}
            exporting={r.exporting}
            exportDisabled={!enabled}
            filters={<>
                <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setDateRange} placeholder='เลือกช่วงวันที่ (จำเป็น)' />
                <select className='form-select form-select-solid w-160px' value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value=''>ทุกสถานะ</option>
                    <option value='INPROGRESS'>กำลังทำ</option>
                    <option value='COMPLETED'>เสร็จสิ้น</option>
                </select>
            </>}
        >
            {summary && <KpiCards cards={[
                { label: 'จำนวน SO', value: summary.total_orders, icon: 'bi-receipt', bg: 'bg-light-primary', color: 'text-primary' },
                { label: 'เสร็จสิ้น', value: summary.completed_orders, icon: 'bi-check2-all', bg: 'bg-light-success', color: 'text-success' },
                { label: 'เฉลี่ยวันที่เสร็จ', value: summary.avg_days_to_complete, icon: 'bi-hourglass-split', bg: 'bg-light-info', color: 'text-info' },
                { label: 'ยังเปิดอยู่', value: summary.open_orders, icon: 'bi-folder2-open', bg: 'bg-light-warning', color: 'text-warning' },
            ]} />}

            <div className='row g-5 g-xl-8 mb-8'>
                <ChartCard title='เวลาเฉลี่ยตามสถานะ (วัน)' colClass='col-xl-4' hasData={byStatus.length > 0}>
                    <SimpleBarChart data={byStatus.map((x) => ({ name: x.status, value: x.avg_days }))} />
                </ChartCard>
                <ChartCard title='ตามระดับความเร่งด่วน' colClass='col-xl-4' hasData={byUrgency.length > 0}>
                    <DonutChart data={byUrgency.map((x) => ({ name: x.urgency_level, value: x.count }))} />
                </ChartCard>
                <ChartCard title='การกระจายระยะเวลา (วัน)' colClass='col-xl-4' hasData={cycleDistribution.length > 0}>
                    <SimpleBarChart color='#7239EA' data={cycleDistribution.map((x) => ({ name: x.bucket, value: x.count }))} />
                </ChartCard>
            </div>

            <ReportTable
                title='รายการใบสั่งขาย' columns={cols} rows={r.rows} rowKey={(x) => x.doc_entry}
                page={r.page} setPage={r.setPage} pages={r.pages} total={r.total} perPage={r.perPage} setPerPage={r.setPerPage}
            />
        </ReportShell>
    );
};

export default SoCycleTimeReport;
