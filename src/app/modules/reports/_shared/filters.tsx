import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/** Shared date-range picker styled as a Metronic button. */
export const DateRangeFilter: React.FC<{
    startDate: Date | null;
    endDate: Date | null;
    onChange: (range: [Date | null, Date | null]) => void;
    placeholder?: string;
}> = ({ startDate, endDate, onChange, placeholder = 'เลือกช่วงวันที่' }) => (
    <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={(u) => onChange(u as [Date | null, Date | null])}
        dateFormat='dd/MM/yyyy'
        isClearable
        placeholderText={placeholder}
        customInput={
            <button className='btn btn-light-primary btn-sm'>
                <i className='fas fa-calendar-alt me-2'></i>
                {startDate && endDate
                    ? `${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`
                    : placeholder}
            </button>
        }
    />
);

/** Number formatter used across report tables/cards. */
export const fmtNum = (n: number | null | undefined) =>
    n === null || n === undefined ? '-' : n.toLocaleString('th-TH', { maximumFractionDigits: 2 });

export const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const fmtDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
