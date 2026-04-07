import React from 'react';
import type { TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { MATERIAL_ITEM_TYPES, type MaterialRow } from '../../../type_interface/ComponentTemplateType';
import type { ComponentMaterialUsage } from '../../../type_interface/WorkOrderType';

const UNIFIED_COLS = [
    { key: 'type', label: 'ประเภท', width: 110 },
    { key: 'detail', label: 'รายละเอียด', width: 260 },
    { key: 'per_set', label: 'ต่อชุด', width: 110 },
    { key: 'set', label: 'ชุด (set)', width: 70 },
    { key: 'total', label: 'จำนวน', width: 90 },
    { key: 'unit', label: 'หน่วย', width: 80 },
];

function getUnit(itemType: string): string {
    if (itemType === 'SLING' || itemType === 'CHAIN') return 'เมตร';
    return 'ตัว';
}

export interface TemplateSectionFormProps {
    section: TemplateSection;
    data: any;
    onUpdate: (data: any) => void;
    // context for header pre-fill and material_table
    workOrderDocNum?: string | null;
    salesItemName?: string;
    salesItemCode?: string;
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
    componentName,
    materialUsages = [],
}) => {
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

            // Determine how many rows to show: use the max of template rows and actual usages
            const rowCount = Math.max(templateRows.length, materialUsages.length);

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
                                {rowCount === 0 ? (
                                    <tr>
                                        <td colSpan={UNIFIED_COLS.length} className='text-center text-muted py-4'>
                                            ไม่มีข้อมูลวัสดุ
                                        </td>
                                    </tr>
                                ) : Array.from({ length: rowCount }).map((_, ri) => {
                                    const tplRow = templateRows[ri];
                                    const usage = materialUsages[ri];
                                    const meta = tplRow
                                        ? MATERIAL_ITEM_TYPES.find(t => t.value === tplRow.itemType)
                                        : null;
                                    return (
                                        <tr key={ri}>
                                            <td className='align-middle text-center'>
                                                {meta ? (
                                                    <>
                                                        <div className='fs-9 text-muted'>{meta.nameTh} ({meta.label})</div>
                                                        <span className='fs-8'>{usage?.material_list?.item_code || ''}</span>
                                                    </>
                                                ) : (
                                                    <span className='text-muted fs-8'>—</span>
                                                )}
                                            </td>
                                            <td className='align-middle fs-8'>
                                                {usage?.material_list?.item_description}
                                            </td>
                                            
                                            <td className='text-center align-middle fs-8'>—</td>
                                            <td className='text-center align-middle fs-8'>—</td>
                                            <td className='text-center align-middle fs-8'>
                                                {usage?.quantity_used != null ? usage.quantity_used : ''}
                                            </td>
                                            <td className='text-center align-middle fs-8'>
                                                {tplRow ? getUnit(tplRow.itemType) : ''}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
