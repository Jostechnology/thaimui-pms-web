import React from 'react';
import { Dropdown } from 'react-bootstrap';

/**
 * "ตัวกรอง" button that opens a popover of advanced filters — same UX as tms-2.
 * `autoClose="outside"` keeps it open while the user tweaks controls inside;
 * it closes only on an outside click. The button shows a count badge of how
 * many filters are currently active.
 */
interface FilterPopoverProps {
    activeCount?: number;
    onClear?: () => void;
    children: React.ReactNode;
}

interface ToggleProps {
    onClick?: (e: React.MouseEvent) => void;
    activeCount: number;
}

const FilterToggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ onClick, activeCount }, ref) => (
        <button
            ref={ref}
            type='button'
            onClick={(e) => { e.preventDefault(); onClick?.(e); }}
            className='btn btn-sm btn-light d-inline-flex align-items-center position-relative'
        >
            <i className='bi bi-sliders me-2'></i>
            ตัวกรอง
            {activeCount > 0 && (
                <span className='badge rounded-pill bg-primary ms-2' style={{ minWidth: 22 }}>{activeCount}</span>
            )}
        </button>
    ),
);
FilterToggle.displayName = 'FilterToggle';

export const FilterPopover: React.FC<FilterPopoverProps> = ({ activeCount = 0, onClear, children }) => (
    <Dropdown autoClose='outside' align='end'>
        <Dropdown.Toggle as={FilterToggle} activeCount={activeCount} />
        <Dropdown.Menu className='p-4 shadow-sm' style={{ minWidth: 340, maxWidth: 420 }}>
            <div className='d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom'>
                <h6 className='fw-bold mb-0'>ตัวกรอง</h6>
                {onClear && (
                    <button className='btn btn-link btn-sm text-muted p-0' onClick={onClear}>
                        <i className='bi bi-x-lg me-1'></i>ล้างทั้งหมด
                    </button>
                )}
            </div>
            {children}
        </Dropdown.Menu>
    </Dropdown>
);

/** Consistent labeled wrapper for each control inside the popover. */
export const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className='mb-3'>
        <label className='fs-8 fw-semibold mb-1 text-muted d-block'>{label}</label>
        {children}
    </div>
);

/** A single boolean toggle (switch) filter row. */
export const BoolFilter: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className='form-check form-switch form-check-custom form-check-solid mb-3 cursor-pointer'>
        <input className='form-check-input' type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className='form-check-label fs-8 fw-semibold text-muted ms-2'>{label}</span>
    </label>
);

export default FilterPopover;
