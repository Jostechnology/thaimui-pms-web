import React, { useEffect } from 'react';
import type { TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { MATERIAL_ITEM_TYPES, type MaterialItemType, type MaterialRow } from '../../../type_interface/ComponentTemplateType';
import type { ComponentMaterialUsage } from '../../../type_interface/WorkOrderType';

// Render mode for template rows that have no matching material from the
// work order. 'dim' keeps the row visible (so the template structure is
// obvious) but grays it out; 'hide' drops the row entirely.
const UNMATCHED_TEMPLATE_ROW_MODE: 'dim' | 'hide' = 'dim';

const UNIFIED_COLS = [
    { key: 'type', label: 'ประเภท', width: 130 },
    { key: 'detail', label: 'รายละเอียด', width: 320 },
    { key: 'per_set', label: 'ต่อชุด', width: 220 },
    { key: 'set', label: 'จำนวนชุด', width: 80 },
    { key: 'total', label: 'จำนวนรวม', width: 120 },
    { key: 'unit', label: 'หน่วย', width: 90 },
];

// ─── Cell schemas per itemType ───────────────────────────────
// (a) hardcoded for now; shape mirrors what TemplateBuilder will store later.
type ScalarField = { key: string; prefix?: string; postfix?: string };
type SubField = { key: string; postfix?: string };
type DynamicArrayDef = { key: string; label: string; subFields: SubField[] };
type SinglePairDef = { key: string; label: string; subFields: SubField[] };

interface CellSchema {
    fields: ScalarField[];
    arrays?: DynamicArrayDef[];
    pairs?: SinglePairDef[];
}

interface TotalSchema { fields: ScalarField[]; }

interface ItemTypeSchema {
    detail: CellSchema;
    per_set: CellSchema;
    total: TotalSchema;
    unitText: string;
}

const SLING_SCHEMA: ItemTypeSchema = {
    detail: {
        fields: [
            { key: 'structure', prefix: 'โครงสร้าง' },
            { key: 'core', prefix: 'แกน' },
            { key: 'brand', prefix: 'ยี่ห้อ' },
            { key: 'grade', prefix: 'เกรด', postfix: 'N/mm²' },
            { key: 'size', prefix: 'ขนาด', postfix: 'mm' },
        ],
    },
    per_set: {
        fields: [],
        arrays: [
            {
                key: 'produced_lengths',
                label: '(ผลิต) ยาว × เส้น/ชุด',
                subFields: [
                    { key: 'length', postfix: 'ม.' },
                    { key: 'count', postfix: 'เส้น/ชุด' },
                ],
            },
        ],
    },
    total: { fields: [{ key: 'meters', }] },
    unitText: 'เมตร',
};

const CHAIN_SCHEMA: ItemTypeSchema = {
    detail: {
        fields: [
            { key: 'manufacturer', prefix: 'ผู้ผลิต' },
            { key: 'size', prefix: 'ขนาด', postfix: 'mm' },
            { key: 'grade', prefix: 'เกรด' },
        ],
        pairs: [
            {
                key: 'actual_weight',
                label: 'น้ำหนักที่ใช้จริง',
                subFields: [
                    { key: 'weight', postfix: 'กก./เส้น' },
                    { key: 'count', postfix: 'เส้น/ชุด' },
                ],
            },
        ],
    },
    per_set: {
        fields: [{ key: 'kilograms', postfix: 'กก.' }],
        arrays: [
            {
                key: 'produced_lengths',
                label: '(ผลิต) ยาว × เส้น/ชุด',
                subFields: [
                    { key: 'length', postfix: 'ม.' },
                    { key: 'count', postfix: 'เส้น/ชุด' },
                ],
            },
        ],
    },
    total: {
        fields: [
            { key: 'meters', },
            { key: 'kilograms', },
        ],
    },
    unitText: 'เมตร / กิโลกรัม',
};

const FERRULE_SCHEMA: ItemTypeSchema = {
    detail: {
        fields: [
            { key: 'description' },
            { key: 'ferrule', prefix: 'ปลอก' },
        ],
    },
    per_set: { fields: [{ key: 'pieces', postfix: 'ตัว' }] },
    total: { fields: [{ key: 'pieces',}] },
    unitText: 'ตัว',
};

const DEFAULT_SCHEMA: ItemTypeSchema = {
    detail: { fields: [{ key: 'description' }] },
    per_set: { fields: [{ key: 'pieces', postfix: 'ตัว' }] },
    total: { fields: [{ key: 'pieces',}] },
    unitText: 'ตัว',
};

function getSchema(itemType: MaterialItemType): ItemTypeSchema {
    if (itemType === 'SLING') return SLING_SCHEMA;
    if (itemType === 'CHAIN') return CHAIN_SCHEMA;
    if (itemType === 'FERRULE') return FERRULE_SCHEMA;
    return DEFAULT_SCHEMA;
}

// ─── Material row autofill helpers ───────────────────────────
function autofillTotal(schema: ItemTypeSchema, quantityUsed?: number): Record<string, string> {
    const out: Record<string, string> = {};
    if (quantityUsed == null) return out;
    // Map quantity_used into the first field of the total schema only.
    // CHAIN's kilograms stays empty (user-typed).
    const first = schema.total.fields[0];
    if (first) out[first.key] = String(quantityUsed);
    return out;
}

// ─── Validation ──────────────────────────────────────────────
// Loose validation: returns an error string when per_set × set !== quantity_used.
// User can still proceed; UI just surfaces the mismatch.
const EPS = 0.0001;

function fmt(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '');
}

function validateRow(
    itemType: MaterialItemType,
    rowData: any,
    salesItemNum: number | undefined,
    quantityUsed: number | undefined,
): string | null {
    if (quantityUsed == null) return null;
    const perSet = rowData?.per_set || {};
    const setRaw = rowData?.set;
    const setCount = Number(setRaw ?? salesItemNum ?? '');
    if (!setCount || Number.isNaN(setCount)) {
        return 'กรุณาระบุจำนวนชุด';
    }

    if (itemType === 'SLING' || itemType === 'CHAIN') {
        const lengths: Array<{ length?: string; count?: string }> = Array.isArray(perSet.produced_lengths)
            ? perSet.produced_lengths
            : [];
        if (lengths.length === 0) {
            return `ยังไม่มีรายการ ยาว × เส้น/ชุด (ต้องรวมได้ ${fmt(quantityUsed)})`;
        }
        const perSetTotal = lengths.reduce((sum, p) => {
            const l = Number(p.length) || 0;
            const c = Number(p.count) || 0;
            return sum + l * c;
        }, 0);
        const computed = perSetTotal * setCount;
        if (Math.abs(computed - quantityUsed) > EPS) {
            return `ผลรวม ${fmt(perSetTotal)} × ${fmt(setCount)} = ${fmt(computed)} ≠ ${fmt(quantityUsed)}`;
        }
        return null;
    }

    // FERRULE / DEFAULT: pieces × set === quantity_used
    const pieces = Number(perSet.pieces);
    if (!pieces || Number.isNaN(pieces)) {
        return `กรุณาระบุจำนวนต่อชุด (ต้องรวมได้ ${fmt(quantityUsed)})`;
    }
    const computed = pieces * setCount;
    if (Math.abs(computed - quantityUsed) > EPS) {
        return `${fmt(pieces)} × ${fmt(setCount)} = ${fmt(computed)} ≠ ${fmt(quantityUsed)}`;
    }
    return null;
}

// ─── Cell editor sub-components ──────────────────────────────
const ScalarRow: React.FC<{
    field: ScalarField;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
}> = ({ field, value, placeholder, onChange }) => (
    <div className='d-flex align-items-center gap-1 mb-1'>
        {field.prefix && <span className='fs-9 text-muted text-nowrap'>{field.prefix}</span>}
        <input
            className='form-control form-control-sm fs-8'
            style={{ minWidth: 60 }}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
        />
        {field.postfix && <span className='fs-9 text-muted text-nowrap'>{field.postfix}</span>}
    </div>
);

const PairRow: React.FC<{
    subFields: SubField[];
    values: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
    onRemove?: () => void;
}> = ({ subFields, values, onChange, onRemove }) => (
    <div className='d-flex align-items-center gap-1 mb-1 flex-wrap'>
        {subFields.map((sf, i) => (
            <React.Fragment key={sf.key}>
                {i > 0 && <span className='fs-9 text-muted'>×</span>}
                <input
                    className='form-control form-control-sm fs-8'
                    style={{ width: 60 }}
                    value={values[sf.key] || ''}
                    onChange={e => onChange({ ...values, [sf.key]: e.target.value })}
                />
                {sf.postfix && <span className='fs-9 text-muted text-nowrap'>{sf.postfix}</span>}
            </React.Fragment>
        ))}
        {onRemove && (
            <button type='button' className='btn btn-sm btn-icon btn-light-danger ms-1'
                style={{ width: 20, height: 20 }} onClick={onRemove}>
                <i className='bi bi-x' style={{ fontSize: '0.7rem' }}></i>
            </button>
        )}
    </div>
);

const CellEditor: React.FC<{
    schema: CellSchema;
    value: any;
    onChange: (next: any) => void;
    defaultValues?: Record<string, string>;
}> = ({ schema, value, onChange, defaultValues = {} }) => {
    const v = value || {};
    const setField = (k: string, val: string) => onChange({ ...v, [k]: val });
    const setArray = (k: string, items: any[]) => onChange({ ...v, [k]: items });
    const setPair = (k: string, pair: any) => onChange({ ...v, [k]: pair });

    return (
        <div>
            {schema.fields.map(f => {
                const dv = defaultValues[f.key] || '';
                const current = v[f.key] ?? dv;
                return (
                    <ScalarRow
                        key={f.key}
                        field={f}
                        value={current}
                        placeholder={dv}
                        onChange={val => setField(f.key, val)}
                    />
                );
            })}
            {schema.arrays?.map(arr => {
                const items: Record<string, string>[] = Array.isArray(v[arr.key]) ? v[arr.key] : [];
                return (
                    <div key={arr.key} className='mt-2 pt-2 border-top'>
                        <div className='fs-9 text-muted mb-1'>{arr.label}</div>
                        {items.length === 0 && (
                            <div className='fs-9 text-muted fst-italic mb-1'>(ยังไม่มีรายการ)</div>
                        )}
                        {items.map((item, idx) => (
                            <PairRow
                                key={idx}
                                subFields={arr.subFields}
                                values={item}
                                onChange={next => {
                                    const copy = items.slice();
                                    copy[idx] = next;
                                    setArray(arr.key, copy);
                                }}
                                onRemove={() => setArray(arr.key, items.filter((_, i) => i !== idx))}
                            />
                        ))}
                        <button type='button' className='btn btn-sm btn-light-primary py-0 px-2 fs-9 mt-1'
                            onClick={() => setArray(arr.key, [...items, {}])}>
                            <i className='bi bi-plus me-1'></i>เพิ่มรายการ
                        </button>
                    </div>
                );
            })}
            {schema.pairs?.map(pair => {
                const pv: Record<string, string> = (v[pair.key] && typeof v[pair.key] === 'object') ? v[pair.key] : {};
                return (
                    <div key={pair.key} className='mt-2 pt-2 border-top'>
                        <div className='fs-9 text-muted mb-1'>{pair.label}</div>
                        <PairRow
                            subFields={pair.subFields}
                            values={pv}
                            onChange={next => setPair(pair.key, next)}
                        />
                    </div>
                );
            })}
        </div>
    );
};


export interface TemplateSectionFormProps {
    section: TemplateSection;
    data: any;
    onUpdate: (data: any) => void;
    // context for header pre-fill and material_table
    workOrderDocNum?: string | null;
    salesItemName?: string;
    salesItemCode?: string;
    salesItemNum?: number;
    componentName?: string;
    materialUsages?: ComponentMaterialUsage[];
}

const TemplateSectionForm: React.FC<TemplateSectionFormProps> = ({
    section,
    data,
    onUpdate,
    workOrderDocNum,
    salesItemName,
    salesItemCode,
    salesItemNum,
    componentName,
    materialUsages = [],
}) => {
    // ── Materialize autofilled defaults into `data` so they're persisted
    // in the JSON sent to backend (set, total[firstField], detail.description,
    // SLING produced_lengths seed). Idempotent: only writes missing keys.
    useEffect(() => {
        if (section.type !== 'material_table') return;
        const templateRows: MaterialRow[] = section.rows && section.rows.length > 0
            ? section.rows
            : (section.itemType
                ? Array.from({ length: Math.max(1, section.defaultRows || 1) }).map((_, i) => ({
                    key: `legacy_${i}`,
                    itemType: section.itemType!,
                    slingLegs: section.slingLegs,
                }))
                : []);
        if (templateRows.length === 0) return;

        const used = new Set<number>();
        const assignments = templateRows.map(tplRow => {
            const m = materialUsages.find(u =>
                !used.has(u.usage_id) && u.material_list?.item_group === tplRow.itemType
            );
            if (m) used.add(m.usage_id);
            return m || null;
        });

        const current = data || {};
        const next: any = { ...current };
        let changed = false;

        templateRows.forEach((tplRow, i) => {
            const usage = assignments[i];
            if (!usage) return;
            const schema = getSchema(tplRow.itemType);
            const prevRow = current[tplRow.key] || {};
            const newRow = { ...prevRow };
            let rowChanged = false;

            // set ← salesItemNum
            if ((newRow.set == null || newRow.set === '') && salesItemNum != null) {
                newRow.set = String(salesItemNum);
                rowChanged = true;
            }

            // total[firstField] ← usage.quantity_used
            const firstTotal = schema.total.fields[0];
            if (firstTotal && usage.quantity_used != null) {
                const prevTotal = newRow.total || {};
                if (prevTotal[firstTotal.key] == null || prevTotal[firstTotal.key] === '') {
                    newRow.total = { ...prevTotal, [firstTotal.key]: String(usage.quantity_used) };
                    rowChanged = true;
                }
            }

            // detail.description ← usage.material_list.item_description
            const hasDescription = schema.detail.fields.some(f => f.key === 'description');
            if (hasDescription && usage.material_list?.item_description) {
                const prevDetail = newRow.detail || {};
                if (prevDetail.description == null || prevDetail.description === '') {
                    newRow.detail = { ...prevDetail, description: usage.material_list.item_description };
                    rowChanged = true;
                }
            }

            // SLING per_set.produced_lengths seed
            if (tplRow.itemType === 'SLING' && tplRow.slingLegs) {
                const prevPerSet = newRow.per_set || {};
                if (!Array.isArray(prevPerSet.produced_lengths)) {
                    newRow.per_set = {
                        ...prevPerSet,
                        produced_lengths: Array.from(
                            { length: Math.max(1, tplRow.slingLegs) },
                            () => ({})
                        ),
                    };
                    rowChanged = true;
                }
            }

            if (rowChanged) {
                next[tplRow.key] = newRow;
                changed = true;
            }
        });

        if (changed) onUpdate(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.key, materialUsages, salesItemNum]);

    switch (section.type) {
        case 'header': {
            const woData: Record<string, string> = {
                'เลขที่ใบสั่งผลิต': String(workOrderDocNum || ''),
                'สินค้า': salesItemName || '',
                'รหัสสินค้า': salesItemCode || '',
                'ชื่อ Component': componentName || '',
            };
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='row g-3'>
                        {section.fields.map(f => {
                            const autoVal = woData[f.label] || '';
                            const val = data[f.key] ?? autoVal;
                            return (
                                <div key={f.key} className={`col-md-${12 / (section.columns || 4)}`}>
                                    <label className='form-label fw-semibold fs-7'>{f.label}</label>
                                    <input
                                        className='form-control form-control-sm bg-light-primary'
                                        value={val}
                                        readOnly
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        case 'material_table': {
            // Derive template rows (new format) or fall back to legacy single-type
            const templateRows: MaterialRow[] = section.rows && section.rows.length > 0
                ? section.rows
                : (section.itemType
                    ? Array.from({ length: Math.max(1, section.defaultRows || 1) }).map((_, i) => ({
                        key: `legacy_${i}`,
                        itemType: section.itemType!,
                        slingLegs: section.slingLegs,
                    }))
                    : []);

            const tableData = data || {};

            // Update one cell of one row (by rowKey).
            const updateRowCell = (rowKey: string, cellKey: string, cellValue: any) => {
                const prevRow = tableData[rowKey] || {};
                onUpdate({
                    ...tableData,
                    [rowKey]: { ...prevRow, [cellKey]: cellValue },
                });
            };

            // ── Match materials to template rows by item_group ──
            // Walk template rows in order; for each, claim the first unclaimed
            // material whose item_group matches the row's itemType. This avoids
            // forcing a wrong-type material into a row, and lets template rows
            // with no match stay visible (per UNMATCHED_TEMPLATE_ROW_MODE).
            const usedUsageIds = new Set<number>();
            const rowAssignments: (ComponentMaterialUsage | null)[] = templateRows.map(tplRow => {
                const match = materialUsages.find(u =>
                    !usedUsageIds.has(u.usage_id)
                    && u.material_list?.item_group === tplRow.itemType
                );
                if (match) usedUsageIds.add(match.usage_id);
                return match || null;
            });
            const unmatchedUsages = materialUsages.filter(u => !usedUsageIds.has(u.usage_id));

            const visibleRows: { tplRow: MaterialRow; usage: ComponentMaterialUsage | null }[] =
                templateRows
                    .map((tplRow, i) => ({ tplRow, usage: rowAssignments[i] }))
                    .filter(({ usage }) => UNMATCHED_TEMPLATE_ROW_MODE === 'dim' || usage != null);

            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='table-responsive'>
                        <table className='table table-bordered table-sm mb-0'>
                            <thead className='bg-light'>
                                <tr>
                                    {UNIFIED_COLS.map(c => (
                                        <th key={c.key} className='fw-bold fs-8 text-center'
                                            style={{ minWidth: c.width }}>{c.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={UNIFIED_COLS.length} className='text-center text-muted py-4'>
                                            ไม่มีข้อมูลวัสดุ
                                        </td>
                                    </tr>
                                ) : visibleRows.map(({ tplRow, usage }) => {
                                    const isUnmatched = usage == null;
                                    const meta = MATERIAL_ITEM_TYPES.find(t => t.value === tplRow.itemType);
                                    const schema = getSchema(tplRow.itemType);
                                    const rowData = tableData[tplRow.key] || {};

                                    // Seed produced_lengths array (in per_set) on first render for
                                    // SLING based on slingLegs from the template.
                                    let perSetValue = rowData.per_set;
                                    if (
                                        tplRow.itemType === 'SLING'
                                        && (!perSetValue || !Array.isArray(perSetValue.produced_lengths))
                                        && tplRow.slingLegs
                                    ) {
                                        perSetValue = {
                                            ...(perSetValue || {}),
                                            produced_lengths: Array.from(
                                                { length: Math.max(1, tplRow.slingLegs) },
                                                () => ({})
                                            ),
                                        };
                                    }

                                    const totalAutofill = autofillTotal(schema, usage?.quantity_used);
                                    const detailDefaults: Record<string, string> = {
                                        description: usage?.material_list?.item_description || '',
                                    };
                                    const setAutofill = salesItemNum ? String(salesItemNum) : '';

                                    // Build a row snapshot that includes seeded per_set / autofilled set
                                    // so validation reflects what the user actually sees.
                                    const rowSnapshot = {
                                        ...rowData,
                                        per_set: perSetValue,
                                        set: rowData.set ?? setAutofill,
                                    };
                                    const rowError = validateRow(
                                        tplRow.itemType,
                                        rowSnapshot,
                                        salesItemNum,
                                        usage?.quantity_used,
                                    );

                                    return (
                                        <tr
                                            key={tplRow.key}
                                            style={isUnmatched ? { opacity: 0.55, background: '#fafafa' } : undefined}
                                        >
                                            {/* ประเภท: type badge + item code */}
                                            <td className='align-middle text-center'>
                                                {meta && (
                                                    <div className='fs-9 text-muted'>{meta.nameTh} ({meta.label})</div>
                                                )}
                                                {usage?.material_list?.item_code ? (
                                                    <div className='fs-8 fw-semibold mt-1'>{usage.material_list.item_code}</div>
                                                ) : isUnmatched ? (
                                                    <div className='fs-9 text-warning mt-1'>
                                                        <i className='bi bi-info-circle me-1'></i>
                                                        ไม่พบวัสดุที่ตรงกับ template
                                                    </div>
                                                ) : null}
                                            </td>
                                            {/* รายละเอียด: schema-driven editor */}
                                            <td className='align-middle'>
                                                <CellEditor
                                                    schema={schema.detail}
                                                    value={rowData.detail}
                                                    defaultValues={detailDefaults}
                                                    onChange={next => updateRowCell(tplRow.key, 'detail', next)}
                                                />
                                            </td>
                                            {/* ต่อชุด */}
                                            <td className='align-middle'>
                                                <CellEditor
                                                    schema={schema.per_set}
                                                    value={perSetValue}
                                                    onChange={next => updateRowCell(tplRow.key, 'per_set', next)}
                                                />
                                            </td>
                                            {/* ชุด (set) */}
                                            <td className='align-middle text-center'>
                                                <input
                                                    className='form-control form-control-sm fs-8 text-center'
                                                    value={rowData.set ?? setAutofill}
                                                    placeholder={setAutofill}
                                                    onChange={e => updateRowCell(tplRow.key, 'set', e.target.value)}
                                                />
                                            </td>
                                            {/* จำนวน */}
                                            <td className='align-middle'>
                                                <CellEditor
                                                    schema={{ fields: schema.total.fields }}
                                                    value={rowData.total}
                                                    defaultValues={totalAutofill}
                                                    onChange={next => updateRowCell(tplRow.key, 'total', next)}
                                                />
                                                {rowError && (
                                                    <div className='text-danger fs-9 mt-1'>
                                                        <i className='bi bi-exclamation-triangle-fill me-1'></i>
                                                        {rowError}
                                                    </div>
                                                )}
                                            </td>
                                            {/* หน่วย: static */}
                                            <td className='text-center align-middle fs-8'>
                                                {schema.unitText}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {unmatchedUsages.length > 0 && (
                        <div className='alert alert-warning d-flex align-items-start mt-3 py-2 px-3 mb-0'>
                            <i className='bi bi-exclamation-triangle-fill text-warning fs-5 me-2 mt-1'></i>
                            <div className='fs-8'>
                                <div className='fw-semibold mb-1'>
                                    วัสดุที่ไม่อยู่ใน template ({unmatchedUsages.length} รายการ)
                                </div>
                                <div className='text-muted'>
                                    {unmatchedUsages.map(u => (
                                        <span key={u.usage_id} className='me-2'>
                                            <span className='badge badge-light-warning fs-9 me-1'>
                                                {u.material_list?.item_group || '—'}
                                            </span>
                                            {u.material_list?.item_code} — {u.material_list?.item_name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        case 'key_value':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='row g-3'>
                        {section.fields.map(f => (
                            <div key={f.key} className={`col-md-${12 / (section.columns || 2)}`}>
                                <label className='form-label fw-semibold fs-7'>
                                    {f.label} {f.unit && <span className='text-muted'>({f.unit})</span>}
                                </label>
                                <input
                                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                    className='form-control form-control-sm'
                                    value={data[f.key] || f.defaultValue || ''}
                                    onChange={e => onUpdate({ ...data, [f.key]: e.target.value })}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'checkbox_group':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='row g-2'>
                        {section.items.map(item => (
                            <div key={item.key} className={`col-md-${12 / (section.columns || 2)}`}>
                                <div className='d-flex align-items-center gap-2'>
                                    <div className='form-check'>
                                        <input
                                            className='form-check-input'
                                            type='checkbox'
                                            checked={data[item.key]?.checked || false}
                                            onChange={e => onUpdate({
                                                ...data,
                                                [item.key]: { ...data[item.key], checked: e.target.checked },
                                            })}
                                        />
                                        <label className='form-check-label fs-7'>{item.label}</label>
                                    </div>
                                    {item.hasTextField && (
                                        <input
                                            className='form-control form-control-sm ms-2'
                                            style={{ maxWidth: 200 }}
                                            placeholder={item.textFieldLabel || ''}
                                            value={data[item.key]?.text || ''}
                                            onChange={e => onUpdate({
                                                ...data,
                                                [item.key]: { ...data[item.key], text: e.target.value },
                                            })}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'image_select':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='d-flex flex-wrap gap-3'>
                        {section.options.map(opt => (
                            <div key={opt.key}
                                className={`d-flex flex-column align-items-center gap-2 p-3 border rounded ${(data.selected || []).includes(opt.key) ? 'border-primary bg-light-primary' : ''}`}
                                style={{ cursor: 'pointer', minWidth: 100 }}
                                onClick={() => {
                                    if (section.multiple) {
                                        const selected = data.selected || [];
                                        const newSelected = selected.includes(opt.key)
                                            ? selected.filter((k: string) => k !== opt.key)
                                            : [...selected, opt.key];
                                        onUpdate({ ...data, selected: newSelected });
                                    } else {
                                        onUpdate({ ...data, selected: [opt.key] });
                                    }
                                }}>
                                {opt.imageUrl ? (
                                    <img src={opt.imageUrl} alt={opt.label}
                                        style={{ width: 60, height: 60, objectFit: 'contain' }} />
                                ) : (
                                    <div className='border rounded bg-white d-flex align-items-center justify-content-center'
                                        style={{ width: 60, height: 60 }}>
                                        <i className='bi bi-image text-muted fs-4'></i>
                                    </div>
                                )}
                                <span className='fs-8 text-center'>{opt.label}</span>
                                <div className={`border rounded d-flex align-items-center justify-content-center ${(data.selected || []).includes(opt.key) ? 'bg-primary border-primary' : 'border-dark'}`}
                                    style={{ width: 18, height: 18, minWidth: 18 }}>
                                    {(data.selected || []).includes(opt.key) && (
                                        <i className='bi bi-check text-white' style={{ fontSize: '0.7rem' }}></i>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'fixed_row_table':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='table-responsive'>
                        <table className='table table-bordered table-sm mb-0'>
                            <thead>
                                <tr className='bg-light'>
                                    <th className='fw-bold text-center' style={{ minWidth: 160 }}>รายการ</th>
                                    {section.columns.map(col => (
                                        <th key={col.key} className='fw-bold text-center'
                                            style={{ width: col.width || '120px' }}>{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {section.rows.map(row => (
                                    <tr key={row.key}>
                                        <td className='fw-semibold' style={{ whiteSpace: 'nowrap' }}>{row.label}</td>
                                        {section.columns.map(col => {
                                            const cell = row.cells.find(c => c.columnKey === col.key);
                                            const cellKey = `${row.key}_${col.key}`;
                                            return (
                                                <td key={col.key} className='text-center align-middle'>
                                                    {cell?.cellType === 'text' ? (
                                                        <input
                                                            className='form-control form-control-sm text-center'
                                                            value={data[cellKey] || ''}
                                                            onChange={e => onUpdate({ ...data, [cellKey]: e.target.value })}
                                                        />
                                                    ) : (
                                                        <div className='form-check d-flex justify-content-center m-0'>
                                                            <input
                                                                className='form-check-input'
                                                                type='checkbox'
                                                                checked={data[cellKey] || false}
                                                                onChange={e => onUpdate({ ...data, [cellKey]: e.target.checked })}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

        case 'signature':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <div className='row g-3'>
                        {section.fields.map(f => (
                            <div key={f.key} className={`col-md-${Math.max(3, Math.floor(12 / section.fields.length))}`}>
                                <div className='text-center'>
                                    <div className='border-bottom border-dark mb-2' style={{ height: 60 }}></div>
                                    <input
                                        className='form-control form-control-sm text-center'
                                        placeholder={f.label}
                                        value={data[f.key] || ''}
                                        onChange={e => onUpdate({ ...data, [f.key]: e.target.value })}
                                    />
                                    {f.role && <span className='fs-9 text-muted'>{f.role}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'note':
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    <textarea
                        className='form-control'
                        rows={3}
                        placeholder={section.placeholder || 'กรอกหมายเหตุ...'}
                        value={data.text || ''}
                        onChange={e => onUpdate({ text: e.target.value })}
                    />
                </div>
            );

        case 'image_upload': {
            const images: string[] = data.images || [];
            const maxImages = section.maxImages || 5;
            const handleUpload = (file: File | null) => {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    onUpdate({ ...data, images: [...images, ev.target?.result as string] });
                };
                reader.readAsDataURL(file);
            };
            return (
                <div>
                    <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                    {section.description && <div className='text-muted fs-8 mb-3'>{section.description}</div>}
                    <div className='d-flex flex-wrap gap-3 mb-3'>
                        {images.map((img, idx) => (
                            <div key={idx} className='position-relative'>
                                <img src={img} alt={`upload-${idx}`} className='border rounded'
                                    style={{ width: 100, height: 100, objectFit: 'contain', background: '#f9f9f9' }} />
                                <button className='btn btn-sm btn-icon btn-danger position-absolute'
                                    style={{ top: -6, right: -6, width: 20, height: 20, padding: 0 }}
                                    onClick={() => onUpdate({ ...data, images: images.filter((_, i) => i !== idx) })}>
                                    <i className='bi bi-x' style={{ fontSize: '0.7rem' }}></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    {images.length < maxImages && (
                        <label className='btn btn-sm btn-light-primary'>
                            <i className='bi bi-camera me-1'></i>เลือกรูปภาพ ({images.length}/{maxImages})
                            <input type='file' accept='image/*' className='d-none'
                                onChange={e => handleUpload(e.target.files?.[0] || null)} />
                        </label>
                    )}
                </div>
            );
        }

        case 'spacer':
            return <div style={{ height: section.height || 20 }}></div>;

        default:
            return <div className='text-muted'>ไม่รู้จัก section type</div>;
    }
};

export default TemplateSectionForm;
