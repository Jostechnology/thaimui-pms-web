import React, { useState, useEffect, useCallback } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import {
    getComponentTemplates,
    getComponentTemplateById,
    getItemComponentSections,
    saveItemComponentSections,
} from '../../../services/componentTemplateService';
import {
    createItemComponentEditRequest,
    cancelComponentEditRequest,
} from '../../../services/componentEditRequestService';
import { getWorkOrderById } from '../../../services/workorder';
import type { WorkOrder, ItemComponent } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { packIntoRows } from '../../../type_interface/ComponentTemplateType';
import { downloadComponentDocument } from '../../../services/documentGeneratorService';
import TemplateSectionForm from './TemplateSectionForm';
import ComponentVersionHistoryModal from './ComponentVersionHistoryModal';

// ─── Form data state: keyed by section_key ──────────────────
type SectionFormData = Record<string, any>;

const EDIT_REQUEST_STATUS_LABEL: Record<string, string> = {
    PENDING: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    CONSUMED: 'ใช้สิทธิ์แล้ว',
    CANCELLED: 'ยกเลิกแล้ว',
};

const EDIT_REQUEST_STATUS_BADGE: Record<string, string> = {
    PENDING: 'badge-light-info',
    APPROVED: 'badge-light-success',
    REJECTED: 'badge-light-danger',
    CONSUMED: 'badge-light-secondary',
    CANCELLED: 'badge-light-secondary',
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

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

    // ── Test-section overrides ──
    // Per-component override of each section's is_test_section flag, keyed by
    // section_key. null = inherit the template's flag for that section.
    // Only entries the user has actually touched (or that were already saved
    // as an explicit override) live here — everything else falls back to the
    // template's own flag via resolveTestSection().
    const [testSectionOverrides, setTestSectionOverrides] = useState<Record<string, boolean | null>>({});

    // Lock / edit-request workflow
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestError, setRequestError] = useState<string | null>(null);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [cancellingRequest, setCancellingRequest] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);

    // ── Lock state ──
    // The component locks as soon as production starts; Production must approve an
    // edit request to unlock it, and that approval is burnt by the next save.
    const locked = component?.is_locked === true;
    const approval = component?.active_edit_request ?? null;
    const hasApproval = approval?.status === 'APPROVED';
    const hasPendingRequest = approval?.status === 'PENDING';
    const canEdit = !locked || hasApproval;

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
                // Rebuild formData + test-section overrides from saved section data
                if (compRes.data.component_template_sections?.length) {
                    const fd: SectionFormData = {};
                    const overrides: Record<string, boolean | null> = {};
                    for (const sd of compRes.data.component_template_sections) {
                        fd[sd.section_key] = sd.data;
                        overrides[sd.section_key] = sd.is_test_section ?? null;
                    }
                    setFormData(fd);
                    setTestSectionOverrides(overrides);
                } else {
                    setTestSectionOverrides({});
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
            if (!res.success && !res.silent) {
                Swal.fire(
                    res.title || 'ดาวน์โหลดเอกสารไม่สำเร็จ',
                    res.message || 'ไม่สามารถดาวน์โหลดเอกสารได้',
                    res.icon || 'error'
                );
            }
        } finally {
            setDownloading(false);
        }
    };

    // ── Update a section's form data ──
    const updateSectionData = (sectionKey: string, data: any) => {
        setFormData(prev => ({ ...prev, [sectionKey]: data }));
    };

    // ── Resolve a section's effective test-section flag ──
    // Rule: override if not null, else the template section's own flag, else false.
    const resolveTestSection = useCallback((sectionKey: string, templateFlag?: boolean | null): boolean => {
        const override = testSectionOverrides[sectionKey];
        if (override !== null && override !== undefined) return override;
        return !!templateFlag;
    }, [testSectionOverrides]);

    const handleToggleTestSection = (sectionKey: string, checked: boolean) => {
        setTestSectionOverrides(prev => ({ ...prev, [sectionKey]: checked }));
    };

    // ── Save ──
    const handleSave = async () => {
        if (!selectedTemplateId || !selectedTemplate) {
            Swal.fire('กรุณาเลือก Template', '', 'warning');
            return;
        }
        if (!canEdit) {
            Swal.fire(
                'ไม่สามารถแก้ไขได้',
                component?.lock_reason || 'เอกสารชิ้นส่วนนี้ถูกล็อกแล้ว กรุณาขออนุมัติแก้ไขจากฝ่ายผลิตก่อน',
                'warning'
            );
            return;
        }

        // Warn before removing the last remaining test section — this deletes the
        // auto-created QC work order, and the backend rejects the save outright if
        // testing has already started against it.
        const hadTestSection = component?.has_test_section === true;
        const willHaveTestSection = selectedTemplate.sections.some((sec: TemplateSection) =>
            resolveTestSection(sec.key, (sec as any).is_test_section)
        );
        if (hadTestSection && !willHaveTestSection) {
            const removalConfirm = await Swal.fire({
                title: 'ยืนยันการลบส่วนของการทดสอบ',
                html:
                    'การบันทึกนี้จะทำให้เอกสารไม่มีส่วนของการทดสอบเหลืออยู่เลย ' +
                    'ซึ่งจะ<b>ลบใบสั่งงาน QC</b> ที่สร้างจากเอกสารนี้โดยอัตโนมัติ<br/><br/>' +
                    'หากมีการเริ่มทดสอบไปแล้ว ระบบจะ<b>ปฏิเสธการบันทึก</b>นี้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันบันทึก',
                cancelButtonText: 'ยกเลิก',
            });
            if (!removalConfirm.isConfirmed) return;
        }

        // Saving against an approved request cuts a new version — the reason is
        // stored on that version row, so make the user spell out what changed.
        let changeReason: string | undefined;
        if (hasApproval) {
            const result = await Swal.fire({
                title: 'ยืนยันการบันทึก',
                input: 'textarea',
                inputLabel: 'เหตุผลในการแก้ไข',
                inputPlaceholder: 'ระบุสิ่งที่แก้ไขในเวอร์ชันนี้...',
                inputAttributes: { rows: '4' },
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ยกเลิก',
                inputValidator: (value: string) =>
                    value && value.trim() ? null : 'กรุณาระบุเหตุผลในการแก้ไข',
            });
            if (!result.isConfirmed) return;
            changeReason = String(result.value || '').trim();
        }

        setSaving(true);
        try {
            const sectionsData = selectedTemplate.sections.map((sec: TemplateSection) => {
                const override = testSectionOverrides[sec.key];
                return {
                    section_type: sec.type,
                    section_key: sec.key,
                    data: formData[sec.key] || {},
                    // send the override when the user has set one, otherwise null (inherit)
                    is_test_section: override === true || override === false ? override : null,
                };
            });

            const res = await saveItemComponentSections(Number(componentId), {
                component_template_id: selectedTemplateId,
                sections_data: sectionsData,
                ...(changeReason ? { change_reason: changeReason } : {}),
            });

            if (res?.success) {
                await Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
                // Re-pull: doc_version bumps and the approval (if any) is now consumed.
                await fetchData();
            } else {
                // A locked save answers 403 with a Thai explanation — show it verbatim.
                Swal.fire('บันทึกไม่สำเร็จ', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Ask production for permission to edit ──
    const openRequestModal = () => {
        setRequestReason('');
        setRequestError(null);
        setShowRequestModal(true);
    };

    const handleSubmitRequest = async () => {
        const reason = requestReason.trim();
        if (!reason) {
            setRequestError('กรุณาระบุเหตุผลในการขอแก้ไข');
            return;
        }
        setSubmittingRequest(true);
        try {
            const res = await createItemComponentEditRequest(Number(componentId), reason);
            if (res?.success) {
                setShowRequestModal(false);
                setRequestReason('');
                setRequestError(null);
                await Swal.fire({
                    title: 'ส่งคำขอแล้ว',
                    text: 'รอฝ่ายผลิตพิจารณาอนุมัติคำขอแก้ไข',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false,
                });
                await fetchData();
            } else {
                Swal.fire('ส่งคำขอไม่สำเร็จ', res?.message || 'ไม่สามารถส่งคำขอแก้ไขได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งคำขอแก้ไขได้', 'error');
        } finally {
            setSubmittingRequest(false);
        }
    };

    // ── Withdraw a pending request ──
    const handleCancelRequest = async () => {
        if (!approval) return;
        const confirm = await Swal.fire({
            title: 'ยกเลิกคำขอแก้ไข?',
            text: 'คำขอนี้จะถูกยกเลิก หากยังต้องการแก้ไขจะต้องยื่นคำขอใหม่',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยกเลิกคำขอ',
            cancelButtonText: 'ปิด',
        });
        if (!confirm.isConfirmed) return;

        setCancellingRequest(true);
        try {
            const res = await cancelComponentEditRequest(approval.edit_request_id);
            if (res?.success) {
                await Swal.fire({ title: 'ยกเลิกคำขอแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
                await fetchData();
            } else {
                Swal.fire('ยกเลิกคำขอไม่สำเร็จ', res?.message || 'ไม่สามารถยกเลิกคำขอได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกคำขอได้', 'error');
        } finally {
            setCancellingRequest(false);
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
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0 d-flex align-items-center gap-3'>
                            <span>แก้ไขรายละเอียด: {component?.component_name || '...'}</span>
                            {component && (
                                <span className='badge badge-light-primary fw-bold px-4 py-2 fs-7'>
                                    เวอร์ชัน {component.doc_version ?? 0}
                                </span>
                            )}
                            {locked && (
                                <span className='badge badge-light-warning fw-bold px-4 py-2 fs-7'>
                                    <i className='bi bi-lock-fill me-1'></i>ล็อก
                                </span>
                            )}
                        </h1>
                        <span className='text-muted fs-7'>ใบสั่งผลิต: {workOrder?.doc_num || '...'}</span>
                    </div>
                </div>
                <div className='d-flex gap-2'>
                    <button
                        className='btn btn-light-primary fw-bold px-5'
                        onClick={() => setShowVersionModal(true)}
                        disabled={!componentId}
                    >
                        <i className='bi bi-clock-history me-1'></i>
                        ประวัติเวอร์ชัน
                    </button>
                    <button className='btn btn-light-success fw-bold px-5' onClick={handleDownloadDocument} disabled={downloading || !workOrder?.doc_num}>
                        {downloading ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-download me-1'></i>}
                        ดาวน์โหลดเอกสาร
                    </button>
                    <button className='btn btn-primary fw-bold px-6' onClick={handleSave} disabled={saving || !selectedTemplateId || !canEdit}>
                        {saving ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-check-lg me-1'></i>}
                        บันทึก
                    </button>
                </div>
            </div>

            {/* Lock / edit-request banner */}
            {locked && !hasPendingRequest && !hasApproval && (
                <div className='alert alert-warning d-flex align-items-start mb-8'>
                    <i className='bi bi-lock-fill fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1'>เอกสารชิ้นส่วนนี้ถูกล็อก</div>
                        <div className='fs-7'>
                            {component?.lock_reason || 'เริ่มการผลิตแล้ว จึงแก้ไขเอกสารไม่ได้จนกว่าฝ่ายผลิตจะอนุมัติคำขอแก้ไข'}
                        </div>
                        {approval?.status === 'REJECTED' && (
                            <div className='fs-7 mt-2'>
                                <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2 me-2`}>
                                    {EDIT_REQUEST_STATUS_LABEL[approval.status]}
                                </span>
                                คำขอล่าสุดไม่ได้รับอนุมัติ
                                {approval.review_remark ? ` — ${approval.review_remark}` : ''}
                            </div>
                        )}
                    </div>
                    <button className='btn btn-sm btn-warning fw-bold ms-3 text-nowrap' onClick={openRequestModal}>
                        <i className='bi bi-pencil-square me-1'></i>
                        ขออนุมัติแก้ไข
                    </button>
                </div>
            )}

            {locked && hasPendingRequest && approval && (
                <div className='alert alert-info d-flex align-items-start mb-8'>
                    <i className='bi bi-hourglass-split fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1 d-flex align-items-center gap-2'>
                            <span>รออนุมัติจากฝ่ายผลิต</span>
                            <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2`}>
                                {EDIT_REQUEST_STATUS_LABEL[approval.status] || approval.status}
                            </span>
                        </div>
                        <div className='fs-7'>เหตุผลที่ขอแก้ไข: {approval.reason}</div>
                        <div className='fs-8 text-muted mt-1'>
                            ยื่นคำขอโดย {approval.created_by || '-'} เมื่อ {formatDateTime(approval.created_date)}
                        </div>
                    </div>
                    <button
                        className='btn btn-sm btn-light-danger fw-bold ms-3 text-nowrap'
                        onClick={handleCancelRequest}
                        disabled={cancellingRequest}
                    >
                        {cancellingRequest
                            ? <span className='spinner-border spinner-border-sm me-1'></span>
                            : <i className='bi bi-x-circle me-1'></i>}
                        ยกเลิกคำขอ
                    </button>
                </div>
            )}

            {locked && hasApproval && approval && (
                <div className='alert alert-success d-flex align-items-start mb-8'>
                    <i className='bi bi-unlock-fill fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1 d-flex align-items-center gap-2'>
                            <span>ฝ่ายผลิตอนุมัติให้แก้ไขแล้ว</span>
                            <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2`}>
                                {EDIT_REQUEST_STATUS_LABEL[approval.status] || approval.status}
                            </span>
                        </div>
                        <div className='fs-7'>
                            อนุมัติโดย {approval.reviewed_by || '-'}
                            {approval.reviewed_date ? ` เมื่อ ${formatDateTime(approval.reviewed_date)}` : ''}
                        </div>
                        {approval.review_remark && (
                            <div className='fs-7 mt-1'>หมายเหตุผู้อนุมัติ: {approval.review_remark}</div>
                        )}
                        <div className='fs-7 fw-bold text-danger mt-2'>
                            <i className='bi bi-exclamation-triangle-fill me-1'></i>
                            สิทธิ์นี้ใช้ได้ครั้งเดียว — <span className='text-decoration-underline'>บันทึกได้ 1 ครั้ง</span> เท่านั้น หลังจากบันทึกเอกสารจะถูกล็อกอีกครั้ง
                        </div>
                    </div>
                </div>
            )}

            {/* Test-section summary */}
            {component?.has_test_section && (
                <div className='alert alert-info d-flex align-items-start mb-8'>
                    <i className='bi bi-clipboard2-check fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1'>เอกสารนี้มีส่วนของการทดสอบ</div>
                        <div className='fs-7'>
                            เอกสารชิ้นส่วนนี้ถือเป็นใบสั่งเทสของสินค้า (ใบสั่งเทส)
                            ระบบจะสร้างใบสั่งงาน QC (QC Work Order) จากเอกสารนี้โดยอัตโนมัติ
                        </div>
                    </div>
                </div>
            )}

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
                        disabled={!canEdit}
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
                            {packIntoRows(selectedTemplate.sections).map((row, ri) => (
                                <div key={ri} className='row g-4'>
                                    {row.map((sec: TemplateSection) => {
                                        const w = (sec as any).width ?? 12;
                                        const isTestSection = resolveTestSection(sec.key, (sec as any).is_test_section);
                                        return (
                                            <div key={sec.key} className={`col-md-${w}`}>
                                                <div className='border rounded p-4 h-100'>
                                                    <div className='d-flex align-items-center justify-content-end gap-3 mb-3'>
                                                        {isTestSection && (
                                                            <span className='badge badge-light-info'>ส่วนของการทดสอบ</span>
                                                        )}
                                                        <div className='form-check form-check-custom form-check-solid form-switch'
                                                            title='ส่วนของการทดสอบ'>
                                                            <input
                                                                className='form-check-input'
                                                                type='checkbox'
                                                                id={`test-section-override-${sec.key}`}
                                                                checked={isTestSection}
                                                                disabled={!canEdit}
                                                                onChange={e => handleToggleTestSection(sec.key, e.target.checked)} />
                                                            <label className='form-check-label fs-8 text-nowrap'
                                                                htmlFor={`test-section-override-${sec.key}`}>
                                                                ส่วนของการทดสอบ
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <TemplateSectionForm
                                                        section={sec}
                                                        data={formData[sec.key] || {}}
                                                        onUpdate={data => updateSectionData(sec.key, data)}
                                                        workOrderDocNum={workOrder?.doc_num}
                                                        salesItemName={workOrder?.sales_item?.item_name}
                                                        salesItemCode={workOrder?.sales_item?.item_code}
                                                        salesItemNum={workOrder?.sales_item?.quantity}
                                                        componentName={component?.component_name}
                                                        materialUsages={component?.material_usages}
                                                        readOnly={!canEdit}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
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

            {/* Ask production to unlock this component */}
            <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold fs-4'>
                        <i className='bi bi-pencil-square me-2 text-primary'></i>
                        ขออนุมัติแก้ไขเอกสาร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='text-muted fs-7 mb-4'>
                        ชิ้นส่วน: {component?.component_name || '-'} (เวอร์ชัน {component?.doc_version ?? 0})
                    </div>
                    <label className='form-label fw-semibold required'>เหตุผลในการขอแก้ไข</label>
                    <textarea
                        className={`form-control ${requestError ? 'is-invalid' : ''}`}
                        rows={4}
                        placeholder='ระบุเหตุผลที่ต้องแก้ไขเอกสารชิ้นส่วนนี้...'
                        value={requestReason}
                        onChange={e => {
                            setRequestReason(e.target.value);
                            if (requestError) setRequestError(null);
                        }}
                    />
                    {requestError && <div className='invalid-feedback d-block'>{requestError}</div>}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type='button'
                        className='btn btn-light fw-bold'
                        onClick={() => setShowRequestModal(false)}
                        disabled={submittingRequest}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type='button'
                        className='btn btn-primary fw-bold'
                        onClick={handleSubmitRequest}
                        disabled={submittingRequest || !requestReason.trim()}
                    >
                        {submittingRequest
                            ? <span className='spinner-border spinner-border-sm me-2'></span>
                            : <i className='bi bi-send me-1'></i>}
                        ส่งคำขอ
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Version history */}
            <ComponentVersionHistoryModal
                show={showVersionModal}
                onHide={() => setShowVersionModal(false)}
                itemComponentId={Number(componentId)}
                currentVersionNo={component?.doc_version}
                componentName={component?.component_name}
            />
        </Content>
    );
};

export default ComponentDetailEditor;
