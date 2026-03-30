import React, { useState, useEffect, useCallback } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import {
    getComponentTemplates,
    getComponentTemplateById,
    getItemComponentSections,
    saveItemComponentSections,
} from '../../../services/componentTemplateService';
import { getWorkOrderById } from '../../../services/workorder';
import type { WorkOrder, ItemComponent, ComponentMaterialUsage } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';

// ─── Form data state: keyed by section_key ──────────────────
type SectionFormData = Record<string, any>;

const ComponentDetailEditor: React.FC = () => {
    const navigate = useNavigate();
    const { workOrderId, componentId } = useParams<{ workOrderId: string; componentId: string }>();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [component, setComponent] = useState<ItemComponent | null>(null);

    // Template selection
    const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);

    // Form data
    const [formData, setFormData] = useState<SectionFormData>({});
    const [saving, setSaving] = useState(false);

    // ── Fetch work order + component ──
    const fetchData = useCallback(async () => {
        setLoading();
        try {
            const [woRes, compRes, tplRes] = await Promise.all([
                getWorkOrderById(Number(workOrderId)),
                getItemComponentSections(Number(componentId)),
                getComponentTemplates(1, 100, ''),
            ]);

            if (woRes?.success && woRes.data) {
                setWorkOrder(woRes.data);
            }

            if (compRes?.success && compRes.data) {
                setComponent(compRes.data);
                if (compRes.data.component_template_id) {
                    setSelectedTemplateId(compRes.data.component_template_id);
                }
                // Rebuild formData from saved section data
                if (compRes.data.component_template_sections?.length) {
                    const fd: SectionFormData = {};
                    for (const sd of compRes.data.component_template_sections) {
                        fd[sd.section_key] = sd.data;
                    }
                    setFormData(fd);
                }
            }

            if (tplRes?.success && tplRes.data?.items) {
                setTemplates(tplRes.data.items);
            }
        } catch {
            alertMessage('ไม่สามารถดึงข้อมูลได้');
        } finally {
            setUnLoading();
        }
    }, [workOrderId, componentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Load template when selected ──
    useEffect(() => {
        if (!selectedTemplateId) {
            setSelectedTemplate(null);
            return;
        }
        (async () => {
            const res = await getComponentTemplateById(selectedTemplateId);
            if (res?.success && res.data) {
                setSelectedTemplate(res.data);
            }
        })();
    }, [selectedTemplateId]);

    // ── Update a section's form data ──
    const updateSectionData = (sectionKey: string, data: any) => {
        setFormData(prev => ({ ...prev, [sectionKey]: data }));
    };

    // ── Save ──
    const handleSave = async () => {
        if (!selectedTemplateId || !selectedTemplate) {
            Swal.fire('กรุณาเลือก Template', '', 'warning');
            return;
        }
        setSaving(true);
        try {
            const sectionsData = selectedTemplate.sections.map((sec: TemplateSection) => ({
                section_type: sec.type,
                section_key: sec.key,
                data: formData[sec.key] || {},
            }));

            const res = await saveItemComponentSections(Number(componentId), {
                component_template_id: selectedTemplateId,
                sections_data: sectionsData,
            });

            if (res?.success) {
                Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || '', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render each section form ────────────────────────────────
    const renderSectionForm = (section: TemplateSection) => {
        const data = formData[section.key] || {};

        switch (section.type) {
            case 'header': {
                // Read-only: pre-fill from work order data
                const woData: Record<string, string> = {};
                if (workOrder) {
                    woData['เลขที่ใบสั่งผลิต'] = String(workOrder.doc_num || '');
                    woData['สินค้า'] = workOrder.sales_item?.item_name || '';
                    woData['รหัสสินค้า'] = workOrder.sales_item?.item_code || '';
                    woData['ชื่อ Component'] = component?.component_name || '';
                }
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='row g-3'>
                            {section.fields.map(f => {
                                // Try to match to WO data by label
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

            case 'table': {
                // Read-only material table
                const materials = component?.material_usages || [];
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='table-responsive'>
                            <table className='table table-bordered table-sm'>
                                <thead>
                                    <tr className='bg-light'>
                                        {section.columns.map(col => (
                                            <th key={col.key} className='fw-bold fs-8'>{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {materials.length > 0 ? materials.map((usage: ComponentMaterialUsage, idx: number) => (
                                        <tr key={usage.usage_id}>
                                            {section.columns.map(col => {
                                                let cellVal = '';
                                                const label = col.label.toLowerCase();
                                                if (label.includes('ชื่อ') || label.includes('name')) cellVal = usage.material_list?.item_name || '';
                                                else if (label.includes('รหัส') || label.includes('code')) cellVal = usage.material_list?.item_code || '';
                                                else if (label.includes('จำนวน') || label.includes('qty')) cellVal = String(usage.quantity_used || '');
                                                else if (label.includes('ราคา') || label.includes('price') || label.includes('หน่วย')) cellVal = String(usage.material_list?.unit_price);
                                                else if (label.includes('รายละเอียด') || label.includes('desc')) cellVal = usage.material_list?.item_description || '';
                                                else if (label.includes('ลำดับ') || label.includes('#') || label.includes('no')) cellVal = String(idx + 1);
                                                return <td key={col.key} className='fs-8'>{cellVal}</td>;
                                            })}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={section.columns.length} className='text-center text-muted py-4'>ไม่มีข้อมูลวัสดุ</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            }

            case 'key_value': {
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
                                        onChange={e => updateSectionData(section.key, { ...data, [f.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'checkbox_group': {
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
                                                onChange={e => updateSectionData(section.key, {
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
                                                onChange={e => updateSectionData(section.key, {
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
            }

            case 'image_select': {
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='d-flex flex-wrap gap-3'>
                            {section.options.map((opt) => (
                                <div key={opt.key}
                                    className={`d-flex flex-column align-items-center gap-2 p-3 border rounded ${(data.selected || []).includes(opt.key) ? 'border-primary bg-light-primary' : ''}`}
                                    style={{ cursor: 'pointer', minWidth: 100 }}
                                    onClick={() => {
                                        if (section.multiple) {
                                            const selected = data.selected || [];
                                            const newSelected = selected.includes(opt.key)
                                                ? selected.filter((k: string) => k !== opt.key)
                                                : [...selected, opt.key];
                                            updateSectionData(section.key, { ...data, selected: newSelected });
                                        } else {
                                            updateSectionData(section.key, { ...data, selected: [opt.key] });
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
            }

            case 'fixed_row_table': {
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
                                                                onChange={e => updateSectionData(section.key, { ...data, [cellKey]: e.target.value })}
                                                            />
                                                        ) : (
                                                            <div className='form-check d-flex justify-content-center m-0'>
                                                                <input
                                                                    className='form-check-input'
                                                                    type='checkbox'
                                                                    checked={data[cellKey] || false}
                                                                    onChange={e => updateSectionData(section.key, { ...data, [cellKey]: e.target.checked })}
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
            }

            case 'signature': {
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
                                            onChange={e => updateSectionData(section.key, { ...data, [f.key]: e.target.value })}
                                        />
                                        {f.role && <span className='fs-9 text-muted'>{f.role}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'note': {
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <textarea
                            className='form-control'
                            rows={3}
                            placeholder={section.placeholder || 'กรอกหมายเหตุ...'}
                            value={data.text || ''}
                            onChange={e => updateSectionData(section.key, { text: e.target.value })}
                        />
                    </div>
                );
            }

            case 'image_upload': {
                const images: string[] = data.images || [];
                const maxImages = section.maxImages || 5;

                const handleUpload = (file: File | null) => {
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const newImages = [...images, ev.target?.result as string];
                        updateSectionData(section.key, { ...data, images: newImages });
                    };
                    reader.readAsDataURL(file);
                };

                const removeImage = (idx: number) => {
                    const newImages = images.filter((_, i) => i !== idx);
                    updateSectionData(section.key, { ...data, images: newImages });
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
                                        onClick={() => removeImage(idx)}>
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

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            แก้ไขรายละเอียด: {component?.component_name || '...'}
                        </h1>
                        <span className='text-muted fs-7'>ใบสั่งผลิต: {workOrder?.doc_num || '...'}</span>
                    </div>
                </div>
                <button className='btn btn-primary fw-bold px-6' onClick={handleSave} disabled={saving || !selectedTemplateId}>
                    {saving ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-check-lg me-1'></i>}
                    บันทึก
                </button>
            </div>

            {/* Template Selection */}
            <div className='card shadow-sm mb-6'>
                <div className='card-header border-0 pt-5 pb-3'>
                    <h3 className='fw-bold text-gray-900 fs-5 mb-0'>
                        <i className='bi bi-file-earmark-text me-2 text-primary'></i>
                        เลือก Template
                    </h3>
                </div>
                <div className='card-body pt-0 pb-5'>
                    <select
                        className='form-select form-select-sm'
                        value={selectedTemplateId || ''}
                        onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setSelectedTemplateId(val);
                            if (!val) setFormData({});
                        }}
                    >
                        <option value=''>-- กรุณาเลือก Template --</option>
                        {templates.map(t => (
                            <option key={t.component_template_id} value={t.component_template_id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Template Form */}
            {selectedTemplate && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-header border-0 pt-5 pb-3'>
                        <h3 className='fw-bold text-gray-900 fs-5 mb-0'>
                            <i className='bi bi-pencil-square me-2 text-primary'></i>
                            {selectedTemplate.name}
                        </h3>
                    </div>
                    <div className='card-body pt-0 pb-6'>
                        <div className='d-flex flex-column gap-6'>
                            {selectedTemplate.sections.map((sec: TemplateSection) => (
                                <div key={sec.key} className='border rounded p-4'>
                                    {renderSectionForm(sec)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* No template selected */}
            {!selectedTemplateId && (
                <div className='card shadow-sm'>
                    <div className='card-body py-12 text-center'>
                        <i className='bi bi-file-earmark-text fs-3x text-gray-300 d-block mb-4'></i>
                        <span className='text-gray-500 fw-semibold fs-5'>กรุณาเลือก Template เพื่อเริ่มกรอกข้อมูล</span>
                    </div>
                </div>
            )}
        </Content>
    );
};

export default ComponentDetailEditor;
