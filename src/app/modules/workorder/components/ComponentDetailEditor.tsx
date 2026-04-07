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
import type { WorkOrder, ItemComponent } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { downloadComponentDocument } from '../../../services/documentGeneratorService';
import TemplateSectionForm from './TemplateSectionForm';

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
    const [downloading, setDownloading] = useState(false);

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

    // ── Download component document ──
    const handleDownloadDocument = async () => {
        if (!workOrder?.doc_num || !componentId) return;
        setDownloading(true);
        try {
            const res = await downloadComponentDocument(workOrder.work_order_code, Number(componentId));
            if (!res.success) {
                Swal.fire('เกิดข้อผิดพลาด', res.message || 'ไม่สามารถดาวน์โหลดเอกสารได้', 'error');
            }
        } finally {
            setDownloading(false);
        }
    };

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
                <div className='d-flex gap-2'>
                    <button className='btn btn-light-success fw-bold px-5' onClick={handleDownloadDocument} disabled={downloading || !workOrder?.doc_num}>
                        {downloading ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-download me-1'></i>}
                        ดาวน์โหลดเอกสาร
                    </button>
                    <button className='btn btn-primary fw-bold px-6' onClick={handleSave} disabled={saving || !selectedTemplateId}>
                        {saving ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-check-lg me-1'></i>}
                        บันทึก
                    </button>
                </div>
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
                                    <TemplateSectionForm
                                        section={sec}
                                        data={formData[sec.key] || {}}
                                        onUpdate={data => updateSectionData(sec.key, data)}
                                        workOrderDocNum={workOrder?.doc_num}
                                        salesItemName={workOrder?.sales_item?.item_name}
                                        salesItemCode={workOrder?.sales_item?.item_code}
                                        componentName={component?.component_name}
                                        materialUsages={component?.material_usages}
                                    />
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
