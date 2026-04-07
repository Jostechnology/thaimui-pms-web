import React, { useState, useEffect, useCallback } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import {
    getComponentTemplateById,
    createComponentTemplate,
    updateComponentTemplate,
} from '../../../services/componentTemplateService';
import Swal from 'sweetalert2';
import type {
    TemplateSection,
    HeaderSection,
    TableSection,
    KeyValueSection,
    CheckboxGroupSection,
    ImageSelectSection,
    SignatureSection,
    NoteSection,
    SpacerSection,
    FixedRowTableSection,
    ImageUploadSection,
    SectionType,
    MaterialItemType,
    MaterialRow,
} from '../../../type_interface/ComponentTemplateType';
import { MATERIAL_ITEM_TYPES } from '../../../type_interface/ComponentTemplateType';

// ─── Helpers ─────────────────────────────────────────────────
let _keyCounter = 0;
const genKey = (prefix: string) => `${prefix}_${Date.now()}_${++_keyCounter}`;

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
    header: 'Header / ข้อมูลหัว',
    material_table: 'ตารางวัสดุที่ใช้',
    fixed_row_table: 'ตารางแถวคงที่',
    key_value: 'ฟิลด์ Key-Value',
    checkbox_group: 'กลุ่ม Checkbox',
    image_select: 'ตัวเลือกรูปภาพ',
    signature: 'ลายเซ็น',
    note: 'หมายเหตุ',
    spacer: 'เว้นระยะ',
    image_upload: 'เพิ่มรูปภาพ',
};

const SECTION_TYPE_ICONS: Record<SectionType, string> = {
    header: 'bi-card-heading',
    material_table: 'bi-table',
    fixed_row_table: 'bi-list-check',
    key_value: 'bi-input-cursor-text',
    checkbox_group: 'bi-check2-square',
    image_select: 'bi-image',
    signature: 'bi-pen',
    note: 'bi-chat-left-text',
    spacer: 'bi-arrows-expand',
    image_upload: 'bi-camera',
};

function createDefaultSection(type: SectionType): TemplateSection {
    const key = genKey(type);
    switch (type) {
        case 'header':
            return {
                type: 'header', key, title: 'Header',
                columns: 4,
                fields: [
                    { key: genKey('hf'), label: 'เลขที่ใบสั่งผลิต', type: 'text' },
                    { key: genKey('hf'), label: 'สินค้า', type: 'text' },
                    { key: genKey('hf'), label: 'รหัสสินค้า', type: 'text' },
                    { key: genKey('hf'), label: 'ชื่อ Component', type: 'text' }
                ],
            };
        case 'material_table':
            return {
                type: 'material_table', key, title: 'วัสดุที่ใช้ (Materials)',
                rows: [
                    { key: genKey('mr'), itemType: 'SLING', slingLegs: 2 },
                    { key: genKey('mr'), itemType: 'FERRULE' },
                    { key: genKey('mr'), itemType: 'THIMBLE' },
                ],
                columns: [
                    { key: genKey('tc'), label: 'ชื่อวัสดุ', type: 'text' },
                    { key: genKey('tc'), label: 'รหัสวัสดุ', type: 'text' },
                    { key: genKey('tc'), label: 'รายละเอียด', type: 'text' },
                    { key: genKey('tc'), label: 'จำนวน', type: 'number' },
                    { key: genKey('tc'), label: 'หน่วย', type: 'text' },
                ],
            };
        case 'key_value':
            return {
                type: 'key_value', key, title: 'ข้อมูลเพิ่มเติม',
                columns: 4,
                fields: [
                    { key: genKey('kv'), label: 'ยาว', type: 'number', unit: 'เมตร' },
                    { key: genKey('kv'), label: 'W.L.L.', type: 'number', unit: 'Tonnes' },
                ],
            };
        case 'checkbox_group':
            return {
                type: 'checkbox_group', key, title: 'รายการตรวจสอบ',
                columns: 2,
                items: [
                    { key: genKey('cb'), label: 'ปล่อยว่าง' },
                    { key: genKey('cb'), label: 'บีดปลายเหลม' },
                    { key: genKey('cb'), label: 'อัดปลอก' },
                    { key: genKey('cb'), label: 'อื่นๆ', hasTextField: true, textFieldLabel: 'ระบุ' },
                ],
            };
        case 'image_select':
            return {
                type: 'image_select', key, title: 'แบบชุดประกอบ',
                multiple: false,
                options: [
                    { key: genKey('img'), label: 'แบบที่ 1' },
                    { key: genKey('img'), label: 'แบบที่ 2' },
                    { key: genKey('img'), label: 'แบบที่ 3' },
                ],
            };
        case 'signature':
            return {
                type: 'signature', key, title: 'ลายเซ็น',
                fields: [
                    { key: genKey('sig'), label: 'ผู้เบิก', role: 'ผู้เบิก' },
                    { key: genKey('sig'), label: 'ผู้อนุมัติ', role: 'ผู้อนุมัติ' },
                    { key: genKey('sig'), label: 'ผู้ตรวจเช็ค', role: 'ผู้ตรวจเช็ค' },
                ],
            };
        case 'note':
            return {
                type: 'note', key, title: 'หมายเหตุ',
                placeholder: 'กรอกหมายเหตุ...',
            };
        case 'fixed_row_table': {
            const col1Key = genKey('frc');
            const col2Key = genKey('frc');
            return {
                type: 'fixed_row_table', key, title: 'รายการตรวจสอบ',
                columns: [
                    { key: col1Key, label: 'ปลายด้านบน' },
                    { key: col2Key, label: 'ปลายด้านล่าง' },
                ],
                rows: [
                    { key: genKey('frr'), label: '1. ปล่อยว่าง', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '2. บีดปลายเหลม', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '3. อัดปลอก', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '4. ใส่หัวใจ', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '5. ถักหัว', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '6. ทำห่วง ยาว (cm.)', cells: [{ columnKey: col1Key, cellType: 'text' }, { columnKey: col2Key, cellType: 'text' }] },
                    { key: genKey('frr'), label: '7. อัด STUD', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '8. หล่อหัว', cells: [{ columnKey: col1Key, cellType: 'checkbox' }, { columnKey: col2Key, cellType: 'checkbox' }] },
                    { key: genKey('frr'), label: '9. ย้ำตุ่ม (d x L) (mm)', cells: [{ columnKey: col1Key, cellType: 'text' }, { columnKey: col2Key, cellType: 'text' }] },
                    { key: genKey('frr'), label: '10. อื่นๆ', cells: [{ columnKey: col1Key, cellType: 'text' }, { columnKey: col2Key, cellType: 'text' }] },
                ],
            };
        }
        case 'image_upload':
            return {
                type: 'image_upload', key, title: 'รูปภาพประกอบ',
                maxImages: 5,
                description: 'กรุณาแนบรูปภาพ',
            };
        case 'spacer':
            return { type: 'spacer', key, height: 20 };
    }
}

// ─── Section Editor Components ───────────────────────────────

const HeaderSectionEditor: React.FC<{
    section: HeaderSection;
    onChange: (s: HeaderSection) => void;
}> = ({ section, onChange }) => {
    const updateField = (idx: number, patch: any) => {
        const fields = [...section.fields];
        fields[idx] = { ...fields[idx], ...patch };
        onChange({ ...section, fields });
    };
    const addField = () => {
        onChange({
            ...section,
            fields: [...section.fields, { key: genKey('hf'), label: 'ฟิลด์ใหม่', type: 'text' }],
        });
    };
    const removeField = (idx: number) => {
        onChange({ ...section, fields: section.fields.filter((_, i) => i !== idx) });
    };

    return (
        <div>
            <div className='row g-3 mb-3'>
                <div className='col-md-8'>
                    <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                    <input className='form-control form-control-sm' value={section.title}
                        onChange={e => onChange({ ...section, title: e.target.value })} />
                </div>
                <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-7'>จำนวนคอลัมน์</label>
                    <select
                        className='form-select form-select-sm'
                        value={section.columns || 4}
                        onChange={e => onChange({ ...section, columns: parseInt(e.target.value) })}
                    >
                        <option value={1}>1 คอลัมน์</option>
                        <option value={2}>2 คอลัมน์</option>
                        <option value={3}>3 คอลัมน์</option>
                        <option value={4}>4 คอลัมน์</option>
                        <option value={6}>6 คอลัมน์</option>
                    </select>
                </div>
            </div>
            <label className='form-label fw-semibold fs-7'>ฟิลด์</label>
            {section.fields.map((f, idx) => (
                <div key={f.key} className='d-flex gap-2 mb-2 align-items-center'>
                    <input className='form-control form-control-sm' placeholder='ชื่อฟิลด์'
                        value={f.label} onChange={e => updateField(idx, { label: e.target.value })} />
                    <select className='form-select form-select-sm w-auto'
                        value={f.type} onChange={e => updateField(idx, { type: e.target.value })}>
                        <option value='text'>ข้อความ</option>
                        <option value='number'>ตัวเลข</option>
                        <option value='date'>วันที่</option>
                    </select>
                    <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeField(idx)}>
                        <i className='bi bi-x-lg'></i>
                    </button>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mt-1' onClick={addField}>
                <i className='bi bi-plus me-1'></i>เพิ่มฟิลด์
            </button>
        </div>
    );
};

const TableSectionEditor: React.FC<{
    section: TableSection;
    onChange: (s: TableSection) => void;
}> = ({ section, onChange }) => {
    const rows: MaterialRow[] = section.rows && section.rows.length > 0
        ? section.rows
        : (section.itemType ? [{ key: genKey('mr'), itemType: section.itemType, slingLegs: section.slingLegs }] : []);

    const setRows = (next: MaterialRow[]) => onChange({ ...section, rows: next });

    const updateRow = (idx: number, patch: Partial<MaterialRow>) => {
        const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
        setRows(next);
    };
    const addRow = () => setRows([...rows, { key: genKey('mr'), itemType: 'FERRULE' }]);
    const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
    const moveRow = (idx: number, dir: -1 | 1) => {
        const j = idx + dir;
        if (j < 0 || j >= rows.length) return;
        const next = [...rows];
        [next[idx], next[j]] = [next[j], next[idx]];
        setRows(next);
    };

    return (
        <div>
            <div className='row g-3 mb-3'>
                <div className='col-md-12'>
                    <label className='form-label fw-semibold fs-7'>ชื่อตาราง</label>
                    <input className='form-control form-control-sm' value={section.title}
                        onChange={e => onChange({ ...section, title: e.target.value })} />
                </div>
            </div>

            <label className='form-label fw-semibold fs-7'>แถววัสดุ (กำหนดประเภทต่อแถว)</label>
            <div className='border rounded p-2 bg-light-primary'>
                {rows.length === 0 && (
                    <div className='text-muted fs-8 text-center py-2'>ยังไม่มีแถว — กดปุ่มด้านล่างเพื่อเพิ่ม</div>
                )}
                {rows.map((row, idx) => (
                    <div key={row.key} className='d-flex gap-2 mb-2 align-items-center bg-white p-2 rounded border'>
                        <span className='badge badge-light-dark fs-8' style={{ width: 28 }}>{idx + 1}</span>
                        <select
                            className='form-select form-select-sm'
                            style={{ maxWidth: 260 }}
                            value={row.itemType}
                            onChange={e => updateRow(idx, { itemType: e.target.value as MaterialItemType })}
                        >
                            {MATERIAL_ITEM_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label} — {t.nameTh}</option>
                            ))}
                        </select>
                        {row.itemType === 'SLING' && (
                            <div className='d-flex align-items-center gap-1'>
                                <span className='fs-8 text-muted'>ขา</span>
                                <input
                                    type='number'
                                    min={1}
                                    className='form-control form-control-sm'
                                    style={{ width: 70 }}
                                    value={row.slingLegs || 1}
                                    onChange={e => updateRow(idx, { slingLegs: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        )}
                        <div className='ms-auto d-flex gap-1'>
                            <button className='btn btn-sm btn-icon btn-light' disabled={idx === 0}
                                onClick={() => moveRow(idx, -1)} title='ขึ้น'>
                                <i className='bi bi-arrow-up'></i>
                            </button>
                            <button className='btn btn-sm btn-icon btn-light' disabled={idx === rows.length - 1}
                                onClick={() => moveRow(idx, 1)} title='ลง'>
                                <i className='bi bi-arrow-down'></i>
                            </button>
                            <button className='btn btn-sm btn-icon btn-light-danger'
                                onClick={() => removeRow(idx)} title='ลบ'>
                                <i className='bi bi-x-lg'></i>
                            </button>
                        </div>
                    </div>
                ))}
                <button className='btn btn-sm btn-light-primary mt-1' onClick={addRow}>
                    <i className='bi bi-plus me-1'></i>เพิ่มแถววัสดุ
                </button>
            </div>
            <div className='form-text fs-8 mt-2'>
                <i className='bi bi-info-circle me-1'></i>
                ตารางเดียวรวมหลายประเภทได้ — ช่องในแต่ละแถวจะถูกกำหนดตามประเภทของแถวนั้น ๆ
                (SLING มีความยาวแยกตามจำนวนขา, CHAIN มีหน่วย ม. และ กก., ที่เหลือใช้รูปแบบ FERRULE)
            </div>
        </div>
    );
};

const KeyValueSectionEditor: React.FC<{
    section: KeyValueSection;
    onChange: (s: KeyValueSection) => void;
}> = ({ section, onChange }) => {
    const updateField = (idx: number, patch: any) => {
        const fields = [...section.fields];
        fields[idx] = { ...fields[idx], ...patch };
        onChange({ ...section, fields });
    };
    const addField = () => {
        onChange({
            ...section,
            fields: [...section.fields, { key: genKey('kv'), label: 'ฟิลด์ใหม่', type: 'text' }],
        });
    };
    const removeField = (idx: number) => {
        onChange({ ...section, fields: section.fields.filter((_, i) => i !== idx) });
    };

    return (
        <div>
            <div className='row g-3 mb-3'>
                <div className='col-md-8'>
                    <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                    <input className='form-control form-control-sm' value={section.title}
                        onChange={e => onChange({ ...section, title: e.target.value })} />
                </div>
                <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-7'>จำนวนคอลัมน์</label>
                    <select
                        className='form-select form-select-sm'
                        value={section.columns || 4}
                        onChange={e => onChange({ ...section, columns: parseInt(e.target.value) })}
                    >
                        <option value={1}>1 คอลัมน์</option>
                        <option value={2}>2 คอลัมน์</option>
                        <option value={3}>3 คอลัมน์</option>
                        <option value={4}>4 คอลัมน์</option>
                        <option value={6}>6 คอลัมน์</option>
                    </select>
                </div>
            </div>
            <label className='form-label fw-semibold fs-7'>ฟิลด์</label>
            {section.fields.map((f, idx) => (
                <div key={f.key} className='d-flex gap-2 mb-2 align-items-center'>
                    <input className='form-control form-control-sm' placeholder='Label'
                        value={f.label} onChange={e => updateField(idx, { label: e.target.value })} />
                    <select className='form-select form-select-sm w-auto'
                        value={f.type} onChange={e => updateField(idx, { type: e.target.value })}>
                        <option value='text'>ข้อความ</option>
                        <option value='number'>ตัวเลข</option>
                        <option value='date'>วันที่</option>
                    </select>
                    <input className='form-control form-control-sm' placeholder='หน่วย'
                        style={{ width: '80px' }}
                        value={f.unit || ''} onChange={e => updateField(idx, { unit: e.target.value })} />
                    <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeField(idx)}>
                        <i className='bi bi-x-lg'></i>
                    </button>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mt-1' onClick={addField}>
                <i className='bi bi-plus me-1'></i>เพิ่มฟิลด์
            </button>
        </div>
    );
};

const CheckboxGroupSectionEditor: React.FC<{
    section: CheckboxGroupSection;
    onChange: (s: CheckboxGroupSection) => void;
}> = ({ section, onChange }) => {
    const updateItem = (idx: number, patch: any) => {
        const items = [...section.items];
        items[idx] = { ...items[idx], ...patch };
        onChange({ ...section, items });
    };
    const addItem = () => {
        onChange({
            ...section,
            items: [...section.items, { key: genKey('cb'), label: 'รายการใหม่' }],
        });
    };
    const removeItem = (idx: number) => {
        onChange({ ...section, items: section.items.filter((_, i) => i !== idx) });
    };

    return (
        <div>
            <div className='row g-3 mb-3'>
                <div className='col-md-8'>
                    <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                    <input className='form-control form-control-sm' value={section.title}
                        onChange={e => onChange({ ...section, title: e.target.value })} />
                </div>
                <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-7'>จำนวนคอลัมน์</label>
                    <select
                        className='form-select form-select-sm'
                        value={section.columns || 4}
                        onChange={e => onChange({ ...section, columns: parseInt(e.target.value) })}
                    >
                        <option value={1}>1 คอลัมน์</option>
                        <option value={2}>2 คอลัมน์</option>
                        <option value={3}>3 คอลัมน์</option>
                        <option value={4}>4 คอลัมน์</option>
                        <option value={6}>6 คอลัมน์</option>
                    </select>
                </div>
            </div>
            <label className='form-label fw-semibold fs-7'>รายการ Checkbox</label>
            {section.items.map((item, idx) => (
                <div key={item.key} className='d-flex gap-2 mb-2 align-items-center'>
                    <input className='form-control form-control-sm' placeholder='ชื่อรายการ'
                        value={item.label} onChange={e => updateItem(idx, { label: e.target.value })} />
                    <div className='form-check form-check-sm'>
                        <input className='form-check-input' type='checkbox'
                            checked={item.hasTextField || false}
                            onChange={e => updateItem(idx, { hasTextField: e.target.checked })} />
                        <label className='form-check-label fs-8 text-nowrap'>มีช่องกรอก</label>
                    </div>
                    <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeItem(idx)}>
                        <i className='bi bi-x-lg'></i>
                    </button>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mt-1' onClick={addItem}>
                <i className='bi bi-plus me-1'></i>เพิ่มรายการ
            </button>
        </div>
    );
};

const ImageSelectSectionEditor: React.FC<{
    section: ImageSelectSection;
    onChange: (s: ImageSelectSection) => void;
}> = ({ section, onChange }) => {
    const updateOpt = (idx: number, patch: any) => {
        const options = [...section.options];
        options[idx] = { ...options[idx], ...patch };
        onChange({ ...section, options });
    };
    const addOpt = () => {
        onChange({
            ...section,
            options: [...section.options, { key: genKey('img'), label: 'ตัวเลือกใหม่' }],
        });
    };
    const removeOpt = (idx: number) => {
        onChange({ ...section, options: section.options.filter((_, i) => i !== idx) });
    };

    const handleFileSelect = (idx: number, file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            updateOpt(idx, { imageUrl: e.target?.result as string });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <div className='row g-3 mb-3'>
                <div className='col-md-8'>
                    <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                    <input className='form-control form-control-sm' value={section.title}
                        onChange={e => onChange({ ...section, title: e.target.value })} />
                </div>
                <div className='col-md-4'>
                    <div className='form-check form-check-sm mt-8'>
                        <input className='form-check-input' type='checkbox'
                            checked={section.multiple || false}
                            onChange={e => onChange({ ...section, multiple: e.target.checked })} />
                        <label className='form-check-label fs-7'>เลือกได้หลายรายการ</label>
                    </div>
                </div>
            </div>
            <label className='form-label fw-semibold fs-7'>ตัวเลือกรูปภาพ</label>
            {section.options.map((opt, idx) => (
                <div key={opt.key} className='mb-3'>
                    <div className='d-flex gap-2 mb-1 align-items-center'>
                        <input className='form-control form-control-sm' placeholder='ชื่อตัวเลือก'
                            value={opt.label} onChange={e => updateOpt(idx, { label: e.target.value })} />
                        <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeOpt(idx)}>
                            <i className='bi bi-x-lg'></i>
                        </button>
                    </div>
                    <div className='d-flex gap-2 align-items-center'>
                        {opt.imageUrl ? (
                            <img src={opt.imageUrl} alt={opt.label} className='border rounded'
                                style={{ width: 48, height: 48, objectFit: 'contain', background: '#f9f9f9' }} />
                        ) : (
                            <div className='border rounded bg-light d-flex align-items-center justify-content-center'
                                style={{ width: 48, height: 48, minWidth: 48 }}>
                                <i className='bi bi-image text-muted'></i>
                            </div>
                        )}
                        <label className='btn btn-sm btn-light-primary'>
                            <i className='bi bi-upload me-1'></i>เลือกรูป
                            <input type='file' accept='image/*' className='d-none'
                                onChange={e => handleFileSelect(idx, e.target.files?.[0] || null)} />
                        </label>
                        {opt.imageUrl && (
                            <button className='btn btn-sm btn-light-danger'
                                onClick={() => updateOpt(idx, { imageUrl: '' })}>
                                <i className='bi bi-trash me-1'></i>ลบรูป
                            </button>
                        )}
                    </div>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mt-1' onClick={addOpt}>
                <i className='bi bi-plus me-1'></i>เพิ่มตัวเลือก
            </button>
        </div>
    );
};

const SignatureSectionEditor: React.FC<{
    section: SignatureSection;
    onChange: (s: SignatureSection) => void;
}> = ({ section, onChange }) => {
    const updateField = (idx: number, patch: any) => {
        const fields = [...section.fields];
        fields[idx] = { ...fields[idx], ...patch };
        onChange({ ...section, fields });
    };
    const addField = () => {
        onChange({
            ...section,
            fields: [...section.fields, { key: genKey('sig'), label: 'ลายเซ็นใหม่', role: '' }],
        });
    };
    const removeField = (idx: number) => {
        onChange({ ...section, fields: section.fields.filter((_, i) => i !== idx) });
    };

    return (
        <div>
            <div className='mb-3'>
                <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                <input className='form-control form-control-sm' value={section.title}
                    onChange={e => onChange({ ...section, title: e.target.value })} />
            </div>
            <label className='form-label fw-semibold fs-7'>ช่องลายเซ็น</label>
            {section.fields.map((f, idx) => (
                <div key={f.key} className='d-flex gap-2 mb-2 align-items-center'>
                    <input className='form-control form-control-sm' placeholder='ชื่อ'
                        value={f.label} onChange={e => updateField(idx, { label: e.target.value })} />
                    <input className='form-control form-control-sm' placeholder='ตำแหน่ง/บทบาท'
                        value={f.role || ''} onChange={e => updateField(idx, { role: e.target.value })} />
                    <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeField(idx)}>
                        <i className='bi bi-x-lg'></i>
                    </button>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mt-1' onClick={addField}>
                <i className='bi bi-plus me-1'></i>เพิ่มช่องลายเซ็น
            </button>
        </div>
    );
};

const NoteSectionEditor: React.FC<{
    section: NoteSection;
    onChange: (s: NoteSection) => void;
}> = ({ section, onChange }) => (
    <div>
        <div className='mb-3'>
            <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
            <input className='form-control form-control-sm' value={section.title}
                onChange={e => onChange({ ...section, title: e.target.value })} />
        </div>
        <div>
            <label className='form-label fw-semibold fs-7'>Placeholder</label>
            <input className='form-control form-control-sm'
                value={section.placeholder || ''}
                onChange={e => onChange({ ...section, placeholder: e.target.value })} />
        </div>
    </div>
);

const SpacerSectionEditor: React.FC<{
    section: SpacerSection;
    onChange: (s: SpacerSection) => void;
}> = ({ section, onChange }) => (
    <div>
        <label className='form-label fw-semibold fs-7'>ความสูง (px)</label>
        <input type='number' className='form-control form-control-sm' min={5} max={200}
            value={section.height || 20}
            onChange={e => onChange({ ...section, height: parseInt(e.target.value) || 20 })} />
    </div>
);

const ImageUploadSectionEditor: React.FC<{
    section: ImageUploadSection;
    onChange: (s: ImageUploadSection) => void;
}> = ({ section, onChange }) => (
    <div>
        <div className='mb-3'>
            <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
            <input className='form-control form-control-sm' value={section.title}
                onChange={e => onChange({ ...section, title: e.target.value })} />
        </div>
        <div className='mb-3'>
            <label className='form-label fw-semibold fs-7'>คำอธิบาย (แสดงให้ผู้ใช้เห็น)</label>
            <input className='form-control form-control-sm' placeholder='เช่น กรุณาแนบรูปภาพ'
                value={section.description || ''}
                onChange={e => onChange({ ...section, description: e.target.value })} />
        </div>
        <div>
            <label className='form-label fw-semibold fs-7'>จำนวนรูปสูงสุด</label>
            <input type='number' className='form-control form-control-sm' min={1} max={20}
                value={section.maxImages || 5}
                onChange={e => onChange({ ...section, maxImages: parseInt(e.target.value) || 5 })} />
        </div>
    </div>
);

const FixedRowTableSectionEditor: React.FC<{
    section: FixedRowTableSection;
    onChange: (s: FixedRowTableSection) => void;
}> = ({ section, onChange }) => {
    // ── Column helpers ──
    const updateCol = (idx: number, patch: Partial<{ label: string; width: string }>) => {
        const columns = [...section.columns];
        columns[idx] = { ...columns[idx], ...patch };
        onChange({ ...section, columns });
    };
    const addCol = () => {
        const newColKey = genKey('frc');
        const columns = [...section.columns, { key: newColKey, label: 'คอลัมน์ใหม่' }];
        const rows = section.rows.map(r => ({
            ...r,
            cells: [...r.cells, { columnKey: newColKey, cellType: 'checkbox' as const }],
        }));
        onChange({ ...section, columns, rows });
    };
    const removeCol = (idx: number) => {
        const removedKey = section.columns[idx].key;
        const columns = section.columns.filter((_, i) => i !== idx);
        const rows = section.rows.map(r => ({
            ...r,
            cells: r.cells.filter(c => c.columnKey !== removedKey),
        }));
        onChange({ ...section, columns, rows });
    };

    // ── Row helpers ──
    const updateRow = (idx: number, patch: Partial<{ label: string }>) => {
        const rows = [...section.rows];
        rows[idx] = { ...rows[idx], ...patch };
        onChange({ ...section, rows });
    };
    const addRow = () => {
        const newRow = {
            key: genKey('frr'),
            label: `${section.rows.length + 1}. รายการใหม่`,
            cells: section.columns.map(col => ({ columnKey: col.key, cellType: 'checkbox' as const })),
        };
        onChange({ ...section, rows: [...section.rows, newRow] });
    };
    const removeRow = (idx: number) => {
        onChange({ ...section, rows: section.rows.filter((_, i) => i !== idx) });
    };
    const moveRow = (idx: number, dir: -1 | 1) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= section.rows.length) return;
        const rows = [...section.rows];
        [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
        onChange({ ...section, rows });
    };

    // ── Cell type helper ──
    const updateCellType = (rowIdx: number, colKey: string, cellType: 'checkbox' | 'text') => {
        const rows = [...section.rows];
        const cells = rows[rowIdx].cells.map(c =>
            c.columnKey === colKey ? { ...c, cellType } : c
        );
        rows[rowIdx] = { ...rows[rowIdx], cells };
        onChange({ ...section, rows });
    };

    return (
        <div>
            {/* Section title */}
            <div className='mb-3'>
                <label className='form-label fw-semibold fs-7'>ชื่อ Section</label>
                <input className='form-control form-control-sm' value={section.title}
                    onChange={e => onChange({ ...section, title: e.target.value })} />
            </div>

            {/* Columns */}
            <label className='form-label fw-semibold fs-7'>คอลัมน์ข้อมูล (หัวตาราง)</label>
            {section.columns.map((col, idx) => (
                <div key={col.key} className='d-flex gap-2 mb-2 align-items-center'>
                    <input className='form-control form-control-sm' placeholder='ชื่อคอลัมน์'
                        value={col.label} onChange={e => updateCol(idx, { label: e.target.value })} />
                    <input className='form-control form-control-sm' placeholder='ความกว้าง'
                        style={{ width: '90px' }}
                        value={col.width || ''} onChange={e => updateCol(idx, { width: e.target.value })} />
                    <button className='btn btn-sm btn-icon btn-light-danger'
                        disabled={section.columns.length <= 1}
                        onClick={() => removeCol(idx)}>
                        <i className='bi bi-x-lg'></i>
                    </button>
                </div>
            ))}
            <button className='btn btn-sm btn-light-primary mb-4' onClick={addCol}>
                <i className='bi bi-plus me-1'></i>เพิ่มคอลัมน์
            </button>

            {/* Rows */}
            <label className='form-label fw-semibold fs-7 d-block'>แถว (รายการ)</label>
            <div className='border rounded p-3 bg-light-primary bg-opacity-10'>
                {section.rows.map((row, ri) => (
                    <div key={row.key} className='card shadow-sm mb-2'>
                        <div className='card-body py-2 px-3'>
                            <div className='d-flex gap-2 align-items-center mb-2'>
                                <input className='form-control form-control-sm fw-semibold' placeholder='ชื่อแถว'
                                    value={row.label} onChange={e => updateRow(ri, { label: e.target.value })} />
                                <button className='btn btn-sm btn-icon btn-light' title='ขึ้น'
                                    disabled={ri === 0} onClick={() => moveRow(ri, -1)}>
                                    <i className='bi bi-chevron-up'></i>
                                </button>
                                <button className='btn btn-sm btn-icon btn-light' title='ลง'
                                    disabled={ri === section.rows.length - 1} onClick={() => moveRow(ri, 1)}>
                                    <i className='bi bi-chevron-down'></i>
                                </button>
                                <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => removeRow(ri)}>
                                    <i className='bi bi-x-lg'></i>
                                </button>
                            </div>
                            <div className='d-flex flex-wrap gap-3'>
                                {section.columns.map(col => {
                                    const cell = row.cells.find(c => c.columnKey === col.key);
                                    return (
                                        <div key={col.key} className='d-flex align-items-center gap-1'>
                                            <span className='fs-8 text-muted text-nowrap'>{col.label}:</span>
                                            <select className='form-select form-select-sm py-0'
                                                style={{ width: '100px', height: '28px', fontSize: '0.8rem' }}
                                                value={cell?.cellType || 'checkbox'}
                                                onChange={e => updateCellType(ri, col.key, e.target.value as 'checkbox' | 'text')}>
                                                <option value='checkbox'>Checkbox</option>
                                                <option value='text'>ข้อความ</option>
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
                <button className='btn btn-sm btn-light-primary mt-1' onClick={addRow}>
                    <i className='bi bi-plus me-1'></i>เพิ่มแถว
                </button>
            </div>
        </div>
    );
};

// ─── Section Preview Components ──────────────────────────────

const HeaderSectionPreview: React.FC<{ section: HeaderSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='row g-2'>
            {section.fields.map(f => (
                <div key={f.key} className={`col-${12 / (section.columns || 4)}`}>
                    <div className='bg-light rounded p-2'>
                        <span className='text-muted fs-8 d-block'>{f.label}</span>
                        <span className='text-gray-400 fs-7 fst-italic'>
                            {f.type === 'date' ? 'dd/mm/yyyy' : f.type === 'number' ? '0' : '...'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ── Material table preview (mixed item types, one row each) ──
const blank = (w = 50) => (
    <span className='d-inline-block border-bottom border-dark' style={{ minWidth: w, height: 12 }} />
);

/**
 * Unified columns that apply across all item types. Per-type specifics
 * (SLING legs, CHAIN 2-unit totals, FERRULE ปลอก) live inside the
 * "รายละเอียด" cell, rendered inline based on each row's itemType.
 */
const UNIFIED_COLS = [
    { key: 'type', label: 'ประเภท', width: 110 },
    { key: 'detail', label: 'รายละเอียด', width: 320 },
    { key: 'per_set', label: 'ต่อชุด', width: 280 },
    { key: 'set', label: 'ชุด (set)', width: 70 },
    { key: 'total', label: 'จำนวน', width: 90 },
    { key: 'unit', label: 'หน่วย', width: 80 },
];

const RowDetailCell: React.FC<{ row: MaterialRow }> = ({ row }) => {
    if (row.itemType === 'SLING') {
        return (
            <div className='fs-8 d-flex flex-column gap-1'>
                <div>ลวดสลิง {blank(90)} ยี่ห้อ {blank(75)}</div>
                <div>โครงสร้าง {blank(60)} แกน {blank(45)} เกลียว {blank(55)}</div>
                <div>ขนาด {blank(40)} mm เกรด {blank(45)} N/mm²</div>
                
                {/* <div>ความยาวที่คิดราคา/ใช้จริง {blank(40)} ม. × {blank(25)} เส้น/ชุด</div> */}
            </div>
        );
    }
    if (row.itemType === 'CHAIN') {
        return (
            <div className='fs-8 d-flex flex-column gap-1'>
                <div>ผู้ผลิต {blank(70)} · ขนาด {blank(40)} mm · เกรด {blank(45)}</div>
                <div>(ผลิต) ยาว {blank(40)} ม. × {blank(25)} เส้น/ชุด</div>
                <div>ยาวที่คิดราคา/ใช้จริง {blank(40)} ม. × {blank(25)} เส้น/ชุด</div>
                <div>น้ำหนักที่ใช้จริง {blank(40)} กก./เส้น × {blank(25)} เส้น/ชุด</div>
            </div>
        );
    }
    if (row.itemType === 'FERRULE') {
        return (
            <div className='fs-8 d-flex flex-column gap-1'>
                <div>{blank(200)}</div>
            </div>
        );
    }
    // Default FERRULE-like layout for every other category
    return (
        <div className='fs-8'>
            {blank(220)}
        </div>
    );
};

const RowPerSetCell: React.FC<{ row: MaterialRow }> = ({ row }) => {
    if (row.itemType === 'CHAIN') {
        // Chain has two per-set values (meters & kilograms)
        return (
            <div className='d-flex flex-column gap-1 fs-8'>
                <div>{blank(50)} ม.</div>
                <div>{blank(50)} กก.</div>
            </div>
        );
    }
    if (row.itemType === 'SLING') {
        const legs = Math.max(1, row.slingLegs || 1);
        return  <div className='d-flex flex-column gap-1 fs-8'>
                    {Array.from({ length: legs }).map((_, i) => (
                        <div key={i}>(ผลิต) ขา {i + 1} ยาว {blank(40)} ม. × {blank(25)} เส้น/ชุด</div>
                    ))}
                </div>
    }
    return <div className='fs-8'>
                ปลอก {blank(60)} <br />
                จำนวน {blank(60)}
            </div>;
};

const RowTotalCell: React.FC<{ row: MaterialRow }> = ({ row }) => {
    if (row.itemType === 'CHAIN') {
        return (
            <div className='d-flex flex-column gap-1 fs-8'>
                <div>{blank(60)}</div>
                <div>{blank(60)}</div>
            </div>
        );
    }
    return <div className='fs-8'>{blank(60)}</div>;
};

const RowUnitCell: React.FC<{ row: MaterialRow }> = ({ row }) => {
    if (row.itemType === 'CHAIN') {
        return (
            <div className='d-flex flex-column gap-1 fs-8'>
                <div>เมตร</div>
                <div>กิโลกรัม</div>
            </div>
        );
    }
    if (row.itemType === 'SLING') return <div className='fs-8'>เมตร</div>;
    return <div className='fs-8'>ตัว</div>;
};

const TableSectionPreview: React.FC<{ section: TableSection }> = ({ section }) => {
    // Back-compat: derive rows from legacy single-itemType sections
    const rows: MaterialRow[] = section.rows && section.rows.length > 0
        ? section.rows
        : (section.itemType
            ? Array.from({ length: Math.max(1, section.defaultRows || 1) }).map((_, i) => ({
                key: `legacy_${i}`,
                itemType: section.itemType as MaterialItemType,
                slingLegs: section.slingLegs,
            }))
            : []);

    return (
        <div>
            <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
            <div className='table-responsive'>
                <table className='table table-bordered table-sm mb-0'>
                    <thead className='bg-light'>
                        <tr>
                            {UNIFIED_COLS.map(c => (
                                <th key={c.key} className='fs-8 fw-bold text-center'
                                    style={{ minWidth: c.width }}>{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={UNIFIED_COLS.length}
                                    className='text-center text-muted fs-8 py-3'>
                                    ยังไม่มีแถว — เพิ่มแถวใน Editor ด้านข้าง
                                </td>
                            </tr>
                        ) : rows.map((row, ri) => {
                            const meta = MATERIAL_ITEM_TYPES.find(t => t.value === row.itemType);
                            return (
                                <tr key={row.key}>
                                    <td className='align-middle text-center'>
                                        <div className='fs-9 text-muted'>{meta?.nameTh} ({meta?.label})</div>
                                        <span className='fs-8'>{blank(100)}</span>
                                    </td>
                                    <td className='align-middle'><RowDetailCell row={row} /></td>
                                    <td className='text-center align-middle'><RowPerSetCell row={row} /></td>
                                    <td className='text-center align-middle fs-8'>{blank(40)}</td>
                                    <td className='text-center align-middle'><RowTotalCell row={row} /></td>
                                    <td className='text-center align-middle'><RowUnitCell row={row} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const KeyValueSectionPreview: React.FC<{ section: KeyValueSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='row g-2'>
            {section.fields.map(f => (
                <div key={f.key} className={`col-${12 / (section.columns || 4)}`}>
                    <div className='d-flex align-items-center bg-light rounded p-2'>
                        <span className='text-muted fs-8 me-2'>{f.label}:</span>
                        <span className='border-bottom border-dark flex-grow-1 text-center text-gray-400 fs-8'>
                            ...
                        </span>
                        {f.unit && <span className='text-muted fs-8 ms-2'>{f.unit}</span>}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CheckboxGroupSectionPreview: React.FC<{ section: CheckboxGroupSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='row g-2'>
            {section.items.map(item => (
                <div key={item.key} className={`col-${12 / (section.columns || 2)}`}>
                    <div className='d-flex align-items-center'>
                        <div className='border rounded me-2' style={{ width: 16, height: 16, minWidth: 16 }}></div>
                        <span className='fs-8'>{item.label}</span>
                        {item.hasTextField && (
                            <span className='border-bottom border-dark flex-grow-1 ms-2 text-gray-400 fs-8'>...</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ImageSelectSectionPreview: React.FC<{ section: ImageSelectSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='d-flex flex-wrap gap-3'>
            {section.options.map(opt => (
                <div key={opt.key} className='text-center'>
                    <div className='border rounded bg-light d-flex align-items-center justify-content-center mb-1'
                        style={{ width: 80, height: 80 }}>
                        {opt.imageUrl ? (
                            <img src={opt.imageUrl} alt={opt.label}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                            <i className='bi bi-image text-muted fs-1'></i>
                        )}
                    </div>
                    <div className='d-flex align-items-center justify-content-center gap-1'>
                        <div className='border rounded' style={{ width: 14, height: 14 }}></div>
                        <span className='fs-9'>{opt.label}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SignatureSectionPreview: React.FC<{ section: SignatureSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='row g-3'>
            {section.fields.map(f => (
                <div key={f.key} className={`col-${Math.max(3, Math.floor(12 / section.fields.length))}`}>
                    <div className='text-center'>
                        <div className='border-bottom border-dark mb-2' style={{ height: 50 }}></div>
                        <span className='fs-8 fw-semibold d-block'>{f.label}</span>
                        {f.role && <span className='fs-9 text-muted'>{f.role}</span>}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const NoteSectionPreview: React.FC<{ section: NoteSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='border rounded p-3 bg-light'>
            <span className='text-muted fs-8 fst-italic'>{section.placeholder || 'กรอกหมายเหตุ...'}</span>
        </div>
    </div>
);

const SpacerSectionPreview: React.FC<{ section: SpacerSection }> = ({ section }) => (
    <div style={{ height: section.height || 20 }} className='d-flex align-items-center justify-content-center'>
        <span className='text-muted fs-9'>— เว้นระยะ {section.height || 20}px —</span>
    </div>
);

const ImageUploadSectionPreview: React.FC<{ section: ImageUploadSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        {section.description && (
            <div className='text-muted fs-8 mb-3'>{section.description}</div>
        )}
        <div className='border border-dashed rounded p-4 text-center bg-light'>
            <i className='bi bi-cloud-arrow-up fs-1 text-primary d-block mb-2'></i>
            <span className='text-muted fs-7 d-block'>กดเพื่อเลือกรูปภาพ หรือลากไฟล์มาวาง</span>
            <span className='text-muted fs-8'>สูงสุด {section.maxImages || 5} รูป</span>
        </div>
    </div>
);

const FixedRowTableSectionPreview: React.FC<{ section: FixedRowTableSection }> = ({ section }) => (
    <div>
        <div className='fw-bold fs-6 mb-3 border-bottom pb-2'>{section.title}</div>
        <div className='table-responsive'>
            <table className='table table-bordered table-sm mb-0' style={{ fontSize: '0.8rem' }}>
                <thead>
                    <tr className='bg-light'>
                        <th className='fw-bold text-center' style={{ minWidth: '160px' }}>รายการ</th>
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
                                return (
                                    <td key={col.key} className='text-center align-middle'>
                                        {cell?.cellType === 'text' ? (
                                            <div className='border-bottom border-dark mx-2' style={{ minWidth: 60, height: 18 }}></div>
                                        ) : (
                                            <div className='d-flex justify-content-center'>
                                                <div className='border border-dark rounded'
                                                    style={{ width: 15, height: 15 }}></div>
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

function renderSectionEditor(section: TemplateSection, onChange: (s: TemplateSection) => void) {
    switch (section.type) {
        case 'header': return <HeaderSectionEditor section={section} onChange={onChange} />;
        case 'material_table': return <TableSectionEditor section={section} onChange={onChange} />;
        case 'key_value': return <KeyValueSectionEditor section={section} onChange={onChange} />;
        case 'checkbox_group': return <CheckboxGroupSectionEditor section={section} onChange={onChange} />;
        case 'image_select': return <ImageSelectSectionEditor section={section} onChange={onChange} />;
        case 'signature': return <SignatureSectionEditor section={section} onChange={onChange} />;
        case 'note': return <NoteSectionEditor section={section} onChange={onChange} />;
        case 'spacer': return <SpacerSectionEditor section={section} onChange={onChange} />;
        case 'fixed_row_table': return <FixedRowTableSectionEditor section={section} onChange={onChange} />;
        case 'image_upload': return <ImageUploadSectionEditor section={section} onChange={onChange} />;
        default: return <div className='text-muted'>Unknown section type</div>;
    }
}

function renderSectionPreview(section: TemplateSection) {
    switch (section.type) {
        case 'header': return <HeaderSectionPreview section={section} />;
        case 'material_table': return <TableSectionPreview section={section} />;
        case 'key_value': return <KeyValueSectionPreview section={section} />;
        case 'checkbox_group': return <CheckboxGroupSectionPreview section={section} />;
        case 'image_select': return <ImageSelectSectionPreview section={section} />;
        case 'signature': return <SignatureSectionPreview section={section} />;
        case 'note': return <NoteSectionPreview section={section} />;
        case 'spacer': return <SpacerSectionPreview section={section} />;
        case 'fixed_row_table': return <FixedRowTableSectionPreview section={section} />;
        case 'image_upload': return <ImageUploadSectionPreview section={section} />;
        default: return null;
    }
}

// ─── Main TemplateBuilder Component ──────────────────────────
const TemplateBuilder: React.FC = () => {
    const navigate = useNavigate();
    const { templateId } = useParams<{ templateId: string }>();
    const isEdit = !!templateId;

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [templateName, setTemplateName] = useState('');
    const [sections, setSections] = useState<TemplateSection[]>([]);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // ─── Load existing template if editing ───
    useEffect(() => {
        if (isEdit) {
            (async () => {
                setLoading();
                try {
                    const res = await getComponentTemplateById(Number(templateId));
                    if (res && res.success && res.data) {
                        setTemplateName(res.data.name || '');
                        setSections(res.data.sections || []);
                    } else {
                        alertMessage('ไม่สามารถดึงข้อมูล Template ได้');
                        navigate('/workorder/workorders_template');
                    }
                } catch {
                    alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
                } finally {
                    setUnLoading();
                }
            })();
        }
    }, [templateId]);

    // ─── Section CRUD ───
    const addSection = (type: SectionType) => {
        const newSection = createDefaultSection(type);
        setSections(prev => [...prev, newSection]);
        setExpandedIdx(sections.length);
    };

    const updateSection = useCallback((idx: number, updated: TemplateSection) => {
        setSections(prev => prev.map((s, i) => i === idx ? updated : s));
    }, []);

    const removeSection = (idx: number) => {
        setSections(prev => prev.filter((_, i) => i !== idx));
        if (expandedIdx === idx) setExpandedIdx(null);
        else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
    };

    const moveSection = (idx: number, dir: -1 | 1) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= sections.length) return;
        const arr = [...sections];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        setSections(arr);
        if (expandedIdx === idx) setExpandedIdx(newIdx);
        else if (expandedIdx === newIdx) setExpandedIdx(idx);
    };

    const duplicateSection = (idx: number) => {
        const original = sections[idx];
        const copy = JSON.parse(JSON.stringify(original));
        copy.key = genKey(copy.type);
        setSections(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    };

    // ─── Save ───
    const handleSave = async () => {
        if (!templateName.trim()) {
            Swal.fire('กรุณากรอกชื่อ Template', '', 'warning');
            return;
        }
        if (sections.length === 0) {
            Swal.fire('กรุณาเพิ่ม Section อย่างน้อย 1 รายการ', '', 'warning');
            return;
        }

        setSubmitting(true);
        setLoading();
        try {
            const payload = { name: templateName.trim(), sections };
            let res;
            if (isEdit) {
                res = await updateComponentTemplate(Number(templateId), payload);
            } else {
                res = await createComponentTemplate(payload);
            }
            if (res && res.success) {
                Swal.fire({
                    title: isEdit ? 'อัปเดต Template สำเร็จ' : 'สร้าง Template สำเร็จ',
                    icon: 'success', timer: 1500, showConfirmButton: false,
                }).then(() => navigate('/workorder/workorders_template'));
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึก Template ได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setUnLoading();
            setSubmitting(false);
        }
    };

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-6'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate('/workorder/workorders_template')}
                        className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            {isEdit ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}
                        </h1>
                        <span className='text-muted fw-semibold fs-7'>Sandbox สำหรับออกแบบ Template</span>
                    </div>
                </div>
                <div className='d-flex gap-2'>
                    <button className='btn btn-light fw-bold'
                        onClick={() => navigate('/workorder/workorders_template')}>ยกเลิก</button>
                    <button className='btn btn-primary fw-bold px-6' onClick={handleSave} disabled={submitting}>
                        <i className='bi bi-check-lg me-1'></i>
                        {submitting ? 'กำลังบันทึก...' : (isEdit ? 'อัปเดต' : 'บันทึก')}
                    </button>
                </div>
            </div>

            <div className='row g-6'>
                {/* LEFT — Editor */}
                <div className='col-lg-6'>
                    {/* Template Name */}
                    <div className='card shadow-sm mb-5'>
                        <div className='card-body py-4'>
                            <label className='form-label fw-bold fs-6'>ชื่อ Template</label>
                            <input className='form-control form-control-solid'
                                placeholder='เช่น ใบสั่งผลิต ชุดประกอบสลิง'
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)} />
                        </div>
                    </div>

                    {/* Add Section Toolbar */}
                    <div className='card shadow-sm mb-5'>
                        <div className='card-header border-0 py-4'>
                            <h3 className='card-title fw-bold fs-5 mb-0'>
                                <i className='bi bi-plus-circle me-2 text-primary'></i>เพิ่ม Section
                            </h3>
                        </div>
                        <div className='card-body pt-0 pb-4'>
                            <div className='d-flex flex-wrap gap-2'>
                                {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map(type => (
                                    <button key={type}
                                        className='btn btn-sm btn-outline btn-outline-dashed btn-outline-primary'
                                        onClick={() => addSection(type)}>
                                        <i className={`bi ${SECTION_TYPE_ICONS[type]} me-1`}></i>
                                        {SECTION_TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sections List */}
                    {sections.length === 0 ? (
                        <div className='card shadow-sm'>
                            <div className='card-body text-center py-15 text-muted'>
                                <i className='bi bi-layers fs-1 d-block mb-3'></i>
                                <span className='fs-6'>ยังไม่มี Section — กดปุ่มด้านบนเพื่อเพิ่ม</span>
                            </div>
                        </div>
                    ) : (
                        sections.map((section, idx) => (
                            <div key={section.key} className='card shadow-sm mb-4'>
                                {/* Section Header */}
                                <div className='card-header border-0 py-3 d-flex align-items-center justify-content-between'
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                                    <div className='d-flex align-items-center'>
                                        <span className='badge badge-light-primary me-3 fw-bold'>
                                            {idx + 1}
                                        </span>
                                        <i className={`bi ${SECTION_TYPE_ICONS[section.type]} me-2 text-primary`}></i>
                                        <span className='fw-bold fs-6'>
                                            {SECTION_TYPE_LABELS[section.type]}
                                            {('title' in section && section.title) && (
                                                <span className='text-muted fw-normal ms-2'>— {(section as any).title}</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className='d-flex gap-1' onClick={e => e.stopPropagation()}>
                                        <button className='btn btn-sm btn-icon btn-light' title='ขึ้น'
                                            disabled={idx === 0} onClick={() => moveSection(idx, -1)}>
                                            <i className='bi bi-chevron-up'></i>
                                        </button>
                                        <button className='btn btn-sm btn-icon btn-light' title='ลง'
                                            disabled={idx === sections.length - 1} onClick={() => moveSection(idx, 1)}>
                                            <i className='bi bi-chevron-down'></i>
                                        </button>
                                        <button className='btn btn-sm btn-icon btn-light-info' title='คัดลอก'
                                            onClick={() => duplicateSection(idx)}>
                                            <i className='bi bi-copy'></i>
                                        </button>
                                        <button className='btn btn-sm btn-icon btn-light-danger' title='ลบ'
                                            onClick={() => removeSection(idx)}>
                                            <i className='bi bi-trash'></i>
                                        </button>
                                    </div>
                                </div>
                                {/* Section Body (collapsible) */}
                                {expandedIdx === idx && (
                                    <div className='card-body border-top pt-4'>
                                        {renderSectionEditor(section, (updated) => updateSection(idx, updated))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* RIGHT — Preview */}
                <div className='col-lg-6'>
                    <div className='card shadow-sm' style={{ position: 'sticky', top: 20 }}>
                        <div className='card-header border-0 py-4'>
                            <h3 className='card-title fw-bold fs-5 mb-0'>
                                <i className='bi bi-eye me-2 text-success'></i>ตัวอย่าง Template
                            </h3>
                        </div>
                        <div className='card-body pt-0'>
                            {sections.length === 0 ? (
                                <div className='text-center py-15 text-muted'>
                                    <i className='bi bi-file-earmark fs-1 d-block mb-3'></i>
                                    <span className='fs-6'>เพิ่ม Section เพื่อดู Preview</span>
                                </div>
                            ) : (
                                <div className='border rounded p-4 bg-white'>
                                    {/* Template Title */}
                                    <div className='text-center mb-4'>
                                        <h4 className='fw-bold'>{templateName || 'ชื่อ Template'}</h4>
                                    </div>
                                    {sections.map((section, idx) => (
                                        <div key={section.key}
                                            className={`mb-4 ${expandedIdx === idx ? 'border border-primary rounded p-3' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                                            {renderSectionPreview(section)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default TemplateBuilder;
