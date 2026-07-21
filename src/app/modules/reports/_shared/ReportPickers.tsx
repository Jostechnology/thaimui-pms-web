import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getEmployeeList } from '../../../services/employee';
import { getMachineList } from '../../../services/machineService';
import { getMachineTypeList } from '../../../services/machineTypeService';
import { getWorkOrderList } from '../../../services/workorder';

/**
 * Searchable, API-backed dropdowns for report filters — replaces the old
 * "type a raw numeric ID" inputs. Modeled on the tms-2 ReportPickers pattern:
 * debounced server search via react-select, single-select, clearable.
 */

export interface EntityOption { value: number; label: string; }

interface PickerProps {
    value?: number;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
}

interface AsyncSelectProps extends PickerProps {
    /** Loads options for the current search term. Debounced by the component. */
    loader: (search: string) => Promise<EntityOption[]>;
    noOptionsText?: string;
}

/** Generic debounced async react-select. Keeps the chosen option's label
 * stable even after the option list changes on a later search. */
export const AsyncEntitySelect: React.FC<AsyncSelectProps> = ({
    value, onChange, placeholder, loader, noOptionsText = 'ไม่พบข้อมูล',
}) => {
    const [options, setOptions] = useState<EntityOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<EntityOption | null>(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        const t = setTimeout(() => {
            loader(search)
                .then((opts) => { if (alive) setOptions(opts); })
                .finally(() => { if (alive) setLoading(false); });
        }, 300);
        return () => { alive = false; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Reset the displayed selection when the parent clears the value.
    useEffect(() => { if (value === undefined) setSelected(null); }, [value]);

    return (
        <Select<EntityOption>
            value={selected}
            options={options}
            isLoading={loading}
            isClearable
            placeholder={placeholder ?? 'เลือก...'}
            noOptionsMessage={() => noOptionsText}
            onInputChange={(s) => setSearch(s)}
            onChange={(opt) => { setSelected(opt as EntityOption | null); onChange((opt as EntityOption | null)?.value); }}
            classNamePrefix='react-select'
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
    );
};

const listItems = (res: any): any[] => {
    const items = res?.data?.items ?? res?.data ?? res?.items ?? [];
    return Array.isArray(items) ? items : [];
};

export const EmployeePicker: React.FC<PickerProps> = (props) => (
    <AsyncEntitySelect
        {...props}
        placeholder={props.placeholder ?? 'เลือกพนักงาน...'}
        noOptionsText='ไม่พบพนักงาน'
        loader={async (search) => {
            const res: any = await getEmployeeList(1, 50, search, 'all');
            return listItems(res).map((e) => ({
                value: e.employee_id,
                label: [e.employee_first_name, e.employee_last_name].filter(Boolean).join(' ').trim()
                    || e.employee_name || `พนักงาน #${e.employee_id}`,
            }));
        }}
    />
);

export const MachinePicker: React.FC<PickerProps> = (props) => (
    <AsyncEntitySelect
        {...props}
        placeholder={props.placeholder ?? 'เลือกเครื่องจักร...'}
        noOptionsText='ไม่พบเครื่องจักร'
        loader={async (search) => {
            const res: any = await getMachineList(1, 50, search);
            return listItems(res).map((m) => ({
                value: m.machine_id,
                label: m.machine_code ? `${m.machine_code} — ${m.machine_name ?? ''}`.trim() : (m.machine_name ?? `เครื่อง #${m.machine_id}`),
            }));
        }}
    />
);

export const MachineTypePicker: React.FC<PickerProps> = (props) => (
    <AsyncEntitySelect
        {...props}
        placeholder={props.placeholder ?? 'เลือกประเภทเครื่องจักร...'}
        noOptionsText='ไม่พบประเภทเครื่องจักร'
        loader={async (search) => {
            const res: any = await getMachineTypeList(1, 50, search);
            return listItems(res).map((t) => ({
                value: t.machine_type_id,
                label: t.type_name ?? `ประเภท #${t.machine_type_id}`,
            }));
        }}
    />
);

export const WorkOrderPicker: React.FC<PickerProps> = (props) => (
    <AsyncEntitySelect
        {...props}
        placeholder={props.placeholder ?? 'เลือกใบสั่งผลิต...'}
        noOptionsText='ไม่พบใบสั่งผลิต'
        loader={async (search) => {
            const res: any = await getWorkOrderList(1, 50, search);
            return listItems(res).map((w) => ({
                value: w.work_order_id,
                label: w.work_order_code
                    ? `${w.work_order_code}${w.doc_num ? ` (${w.doc_num})` : ''}`
                    : (w.doc_num ?? `WO #${w.work_order_id}`),
            }));
        }}
    />
);

// ---- Enum selects (static options; searchable; single or multi) ----

export interface EnumOption { value: string; label: string; }

/** Single-select enum dropdown (searchable). Emits '' when cleared. */
export const EnumSelect: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: EnumOption[];
    placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'ทั้งหมด' }) => {
    const selected = options.find((o) => o.value === value) ?? null;
    return (
        <Select<EnumOption>
            value={selected}
            options={options}
            isClearable
            placeholder={placeholder}
            noOptionsMessage={() => 'ไม่มีตัวเลือก'}
            onChange={(opt) => onChange((opt as EnumOption | null)?.value ?? '')}
            classNamePrefix='react-select'
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
    );
};

/** Multi-select enum dropdown. Emits the selected values as a string[]. */
export const EnumMultiSelect: React.FC<{
    value: string[];
    onChange: (v: string[]) => void;
    options: EnumOption[];
    placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'ทั้งหมด' }) => {
    const selected = options.filter((o) => value.includes(o.value));
    return (
        <Select<EnumOption, true>
            isMulti
            value={selected}
            options={options}
            isClearable
            placeholder={placeholder}
            noOptionsMessage={() => 'ไม่มีตัวเลือก'}
            onChange={(opts) => onChange((opts as EnumOption[]).map((o) => o.value))}
            classNamePrefix='react-select'
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        />
    );
};
