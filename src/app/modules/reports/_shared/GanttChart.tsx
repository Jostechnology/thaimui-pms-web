import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { PALETTE } from './charts';

/** A task as emitted by the BE `gantt[]` array. */
export interface GanttTask {
    id: string;
    name: string;
    employee_name?: string;
    start: string | null;
    end: string | null;
    progress?: number;
}

export type GanttViewMode = 'Day' | 'Week' | 'Month';

const LABEL_FORMAT: Record<GanttViewMode, string> = {
    Day: 'dd MMM HH:mm',
    Week: 'dd MMM',
    Month: 'MMM yyyy',
};

/**
 * Worker-schedule Gantt built on ApexCharts rangeBar (datetime axis).
 * Replaces the unmaintained frappe-gantt-react. Each task becomes a horizontal
 * bar from start→end; bars are grouped/colored by employee.
 */
const GanttChart: React.FC<{ tasks: GanttTask[]; viewMode?: GanttViewMode }> = ({ tasks, viewMode = 'Day' }) => {
    const { series, height } = useMemo(() => {
        // Stable color per employee.
        const employees: string[] = [];
        const colorFor = (emp: string) => {
            let idx = employees.indexOf(emp);
            if (idx === -1) { idx = employees.length; employees.push(emp); }
            return PALETTE[idx % PALETTE.length];
        };

        const data = tasks
            .filter((t) => t.start && t.end)
            .map((t) => {
                const emp = t.employee_name || t.name;
                return {
                    x: t.name,
                    y: [new Date(t.start as string).getTime(), new Date(t.end as string).getTime()],
                    fillColor: colorFor(emp),
                };
            });

        // ~34px per row, clamped.
        const h = Math.min(900, Math.max(220, data.length * 34 + 60));
        return { series: [{ data }], height: h };
    }, [tasks]);

    const options: ApexOptions = {
        chart: { type: 'rangeBar', toolbar: { show: true, tools: { zoom: true, pan: true, reset: true, download: false } }, fontFamily: 'inherit', animations: { enabled: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
        dataLabels: { enabled: false },
        xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: LABEL_FORMAT[viewMode], style: { fontSize: '11px', colors: '#a1a5b7' } } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#5e6278' }, maxWidth: 220 } },
        grid: { borderColor: '#f1f1f4' },
        tooltip: {
            custom: ({ dataPointIndex, w }: any) => {
                const d = w.config.series[0].data[dataPointIndex];
                const [s, e] = d.y;
                const f = (ms: number) => new Date(ms).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                return `<div class="px-3 py-2"><div class="fw-bold">${d.x}</div><div class="text-muted fs-8">${f(s)} → ${f(e)}</div></div>`;
            },
        },
    };

    return <ReactApexChart options={options} series={series} type='rangeBar' height={height} />;
};

export default GanttChart;
