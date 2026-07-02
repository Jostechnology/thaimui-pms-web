import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line, ScatterChart, Scatter, ZAxis,
} from 'recharts';

/** Metronic-ish palette for chart series. */
export const PALETTE = ['#009EF7', '#50CD89', '#FFC700', '#F1416C', '#7239EA', '#00A3FF', '#181C32', '#E4E6EF'];

const tooltipNum = (v: number | string) =>
    typeof v === 'number' ? v.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : v;

/* ------------------------------------------------------------------ */
/* Card wrapper + empty state                                          */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
    title: string;
    subtitle?: string;
    colClass?: string;        // e.g. 'col-xl-4'
    height?: number;
    hasData: boolean;
    children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
    title, subtitle, colClass = 'col-xl-4', height = 300, hasData, children,
}) => (
    <div className={colClass}>
        <div className='card card-flush shadow-sm border-0 h-100'>
            <div className='card-header border-0 pt-6'>
                <h3 className='card-title fw-bold text-gray-900'>{title}</h3>
                {subtitle && <span className='card-toolbar text-muted fs-8'>{subtitle}</span>}
            </div>
            <div className='card-body pt-2'>
                {hasData ? (
                    <ResponsiveContainer width='100%' height={height}>
                        {children as React.ReactElement}
                    </ResponsiveContainer>
                ) : (
                    <div className='text-center text-muted py-20' style={{ height }}>ไม่มีข้อมูล</div>
                )}
            </div>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/* Donut / Pie                                                         */
/* ------------------------------------------------------------------ */

export interface DonutDatum { name: string; value: number; fill?: string }

/** ResponsiveContainer injects width/height into its direct child — forward them to the raw chart. */
interface Sized { width?: number; height?: number }

export const DonutChart: React.FC<{ data: DonutDatum[] } & Sized> = ({ data, width, height }) => (
    <PieChart width={width} height={height}>
        <Pie data={data} cx='50%' cy='45%' innerRadius={60} outerRadius={105} paddingAngle={3} dataKey='value' nameKey='name' stroke='none'>
            {data.map((d, i) => <Cell key={i} fill={d.fill || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => tooltipNum(v as number)} />
        <Legend layout='horizontal' verticalAlign='bottom' align='center' iconType='circle' iconSize={10} wrapperStyle={{ fontSize: 12 }} />
    </PieChart>
);

/* ------------------------------------------------------------------ */
/* Bar (single series, optional per-bar color)                        */
/* ------------------------------------------------------------------ */

export interface BarDatum { name: string; value: number; fill?: string }

/** Map signed {name,value} points to per-bar colored BarDatum (red ↓ / green ↑). */
export const toDivergingBars = (
    data: { name: string; value: number }[],
    neg = '#F1416C',
    pos = '#50CD89',
): BarDatum[] => data.map((d) => ({ name: d.name, value: d.value, fill: d.value < 0 ? neg : pos }));

export const SimpleBarChart: React.FC<{
    data: BarDatum[]; color?: string; layout?: 'horizontal' | 'vertical';
} & Sized> = ({ data, color = '#009EF7', layout = 'horizontal', width, height }) => {
    const vertical = layout === 'vertical';
    return (
        <BarChart width={width} height={height} data={data} layout={layout} margin={{ top: 10, right: 20, left: vertical ? 10 : 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' horizontal={!vertical} vertical={vertical} />
            {vertical
                ? <><XAxis type='number' tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis type='category' dataKey='name' tick={{ fill: '#5e6278', fontSize: 11 }} width={130} axisLine={false} tickLine={false} /></>
                : <><XAxis dataKey='name' tick={{ fill: '#5e6278', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} /></>}
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => tooltipNum(v as number)} />
            <Bar dataKey='value' radius={vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={70}>
                {data.map((d, i) => <Cell key={i} fill={d.fill || color} />)}
            </Bar>
        </BarChart>
    );
};

/* ------------------------------------------------------------------ */
/* Grouped bar (N series)                                              */
/* ------------------------------------------------------------------ */

export interface SeriesDef { key: string; name: string; color: string }

export const GroupedBarChart: React.FC<{
    data: Record<string, unknown>[]; xKey: string; series: SeriesDef[];
} & Sized> = ({ data, xKey, series, width, height }) => (
    <BarChart width={width} height={height} data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' />
        <XAxis dataKey={xKey} tick={{ fill: '#5e6278', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => tooltipNum(v as number)} />
        <Legend iconType='circle' iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40} />)}
    </BarChart>
);

/* ------------------------------------------------------------------ */
/* Trend line (N series)                                               */
/* ------------------------------------------------------------------ */

export const TrendLine: React.FC<{
    data: Record<string, unknown>[]; xKey: string; series: SeriesDef[];
} & Sized> = ({ data, xKey, series, width, height }) => (
    <LineChart width={width} height={height} data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' />
        <XAxis dataKey={xKey} tick={{ fill: '#a1a5b7', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => tooltipNum(v as number)} />
        <Legend iconType='circle' iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => <Line key={s.key} type='monotone' dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
    </LineChart>
);

/* ------------------------------------------------------------------ */
/* Scatter (x vs y)                                                    */
/* ------------------------------------------------------------------ */

export const ScatterCard: React.FC<{
    data: Record<string, unknown>[]; xKey: string; yKey: string; xName: string; yName: string; color?: string;
} & Sized> = ({ data, xKey, yKey, xName, yName, color = '#7239EA', width, height }) => (
    <ScatterChart width={width} height={height} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' />
        <XAxis type='number' dataKey={xKey} name={xName} tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type='number' dataKey={yKey} name={yName} tick={{ fill: '#a1a5b7', fontSize: 11 }} axisLine={false} tickLine={false} />
        <ZAxis range={[60, 60]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => tooltipNum(v as number)} />
        <Scatter data={data} fill={color} />
    </ScatterChart>
);
