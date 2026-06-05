import React from 'react';

export interface KpiCard {
    label: string;
    value: number | string;
    icon: string;        // bootstrap icon class, e.g. 'bi-box-seam'
    bg?: string;         // symbol bg, e.g. 'bg-light-primary'
    color?: string;      // icon color, e.g. 'text-primary'
}

const fmt = (v: number | string) =>
    typeof v === 'number' ? v.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : v;

/** Row of metric cards. Pass 3-4 cards. */
const KpiCards: React.FC<{ cards: KpiCard[] }> = ({ cards }) => (
    <div className='row g-5 g-xl-8 mb-8'>
        {cards.map((c) => (
            <div key={c.label} className='col'>
                <div className='card card-flush shadow-sm border-0 h-100'>
                    <div className='card-body d-flex align-items-center py-5 px-5'>
                        <div className='symbol symbol-50px me-4'>
                            <span className={`symbol-label ${c.bg || 'bg-light-primary'} rounded-circle`}>
                                <i className={`bi ${c.icon} ${c.color || 'text-primary'} fs-2x`}></i>
                            </span>
                        </div>
                        <div className='d-flex flex-column'>
                            <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{fmt(c.value)}</span>
                            <span className='text-gray-800 fw-bold fs-7 mt-1'>{c.label}</span>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default KpiCards;
