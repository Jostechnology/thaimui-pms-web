import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createPhaseTemplate, updatePhaseTemplate, getPhaseTemplateById } from '../../../services/phaseTemplateService';
import { getAllMachineTypes } from '../../../services/machineTypeService';
import type { MachineTypeItem } from '../../../type_interface/PhaseTemplateType';

interface PhaseItemForm {
    phase_name: string;
    machine_type_id: number | null;
}

const PhaseTemplateCreateEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;

    const [templateName, setTemplateName] = useState('');
    const [phaseItems, setPhaseItems] = useState<PhaseItemForm[]>([{ phase_name: '', machine_type_id: null }]);
    const [machineTypes, setMachineTypes] = useState<MachineTypeItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getAllMachineTypes().then(res => {
            if (res.success && res.data) {
                setMachineTypes(res.data);
            }
        });

        if (isEdit) {
            setLoading(true);
            getPhaseTemplateById(Number(id)).then(res => {
                if (res.success && res.data) {
                    setTemplateName(res.data.template_name || '');
                    if (res.data.items && res.data.items.length > 0) {
                        setPhaseItems(
                            res.data.items.map(item => ({
                                phase_name: item.phase_name,
                                machine_type_id: item.machine_type_id,
                            }))
                        );
                    }
                }
                setLoading(false);
            });
        }
    }, [id]);

    const addPhaseItem = () => {
        setPhaseItems([...phaseItems, { phase_name: '', machine_type_id: null }]);
    };

    const removePhaseItem = (idx: number) => {
        if (phaseItems.length <= 1) return;
        setPhaseItems(phaseItems.filter((_, i) => i !== idx));
    };

    const updatePhaseItem = (idx: number, field: keyof PhaseItemForm, value: any) => {
        const updated = [...phaseItems];
        updated[idx] = { ...updated[idx], [field]: value };
        setPhaseItems(updated);
    };

    const movePhaseItem = (idx: number, direction: 'up' | 'down') => {
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= phaseItems.length) return;
        const updated = [...phaseItems];
        [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
        setPhaseItems(updated);
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!templateName.trim()) errs.template_name = 'กรุณากรอกชื่อ Template';
        phaseItems.forEach((item, idx) => {
            if (!item.phase_name.trim()) errs[`phase_${idx}`] = 'กรุณากรอกชื่อ Phase';
        });
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const payload = {
            template_name: templateName.trim(),
            items: phaseItems.map((item, idx) => ({
                phase_name: item.phase_name.trim(),
                sort_order: idx,
                machine_type_id: item.machine_type_id || null,
            })),
        };

        const confirm = await Swal.fire({
            title: isEdit ? 'ยืนยันการแก้ไข?' : 'ยืนยันการบันทึก?',
            html: `<strong>${templateName}</strong> — ${phaseItems.length} phases`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3085d6',
            reverseButtons: true,
        });
        if (!confirm.isConfirmed) return;

        setIsSubmitting(true);
        try {
            const res = isEdit
                ? await updatePhaseTemplate(Number(id), payload)
                : await createPhaseTemplate(payload);
            if (res.success) {
                await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
                navigate('../phase_template');
            } else {
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.message });
            }
        } catch {
            Swal.fire({ icon: 'error', title: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <Content><div className="text-center py-20"><span className="spinner-border"></span> กำลังโหลด...</div></Content>;
    }

    return (
        <Content>
            <div className="d-flex align-items-center mb-6">
                <button type="button" className="btn btn-sm btn-icon btn-light-primary me-3"
                    onClick={() => navigate('../phase_template')}>
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h3 className="fw-bolder mb-0">{isEdit ? 'แก้ไข Phase Template' : 'สร้าง Phase Template ใหม่'}</h3>
                    <span className="text-muted fs-7">กำหนด Phase และประเภทเครื่องจักรที่ต้องใช้</span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-6">
                    {/* Left side - form */}
                    <div className="col-xl-8">
                        {/* Template Name */}
                        <div className="card mb-6">
                            <div className="card-header border-0 pt-6 pb-0">
                                <div className="card-title">
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-35px me-3">
                                            <span className="symbol-label bg-light-primary">
                                                <i className="bi bi-layers text-primary fs-5"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="fw-bold mb-0">ข้อมูล Template</h4>
                                            <span className="text-muted fs-8">ตั้งชื่อ Template</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">ชื่อ Template</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.template_name ? 'is-invalid' : ''}`}
                                        placeholder="เช่น เทมเพลตสลิง, เทมเพลตลวดสลิง"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                        autoFocus
                                    />
                                    {errors.template_name && <div className="invalid-feedback">{errors.template_name}</div>}
                                </div>
                            </div>
                        </div>

                        {/* Phase Items */}
                        <div className="card mb-6">
                            <div className="card-header border-0 pt-6 pb-0">
                                <div className="card-title">
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-35px me-3">
                                            <span className="symbol-label bg-light-success">
                                                <i className="bi bi-list-ol text-success fs-5"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="fw-bold mb-0">รายการ Phase</h4>
                                            <span className="text-muted fs-8">กำหนด Phase และเครื่องจักรที่ต้องใช้ในแต่ละ Phase</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-toolbar">
                                    <button type="button" className="btn btn-sm btn-light-primary" onClick={addPhaseItem}>
                                        <i className="bi bi-plus-lg me-1"></i> เพิ่ม Phase
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="d-flex flex-column gap-4">
                                    {phaseItems.map((item, idx) => (
                                        <div key={idx} className="border rounded p-4 bg-light">
                                            <div className="d-flex align-items-center mb-3">
                                                <span className="badge badge-circle badge-light-primary me-3 fw-bold fs-6" style={{ width: 32, height: 32 }}>
                                                    {idx + 1}
                                                </span>
                                                <span className="fw-semibold fs-6 flex-grow-1">Phase {idx + 1}</span>
                                                <div className="d-flex gap-1">
                                                    <button type="button" className="btn btn-sm btn-icon btn-light"
                                                        onClick={() => movePhaseItem(idx, 'up')} disabled={idx === 0} title="เลื่อนขึ้น">
                                                        <i className="bi bi-chevron-up"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-light"
                                                        onClick={() => movePhaseItem(idx, 'down')} disabled={idx === phaseItems.length - 1} title="เลื่อนลง">
                                                        <i className="bi bi-chevron-down"></i>
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-light-danger"
                                                        onClick={() => removePhaseItem(idx)} disabled={phaseItems.length <= 1} title="ลบ">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="row g-4">
                                                <div className="col-md-6 fv-row">
                                                    <label className="required fs-7 fw-semibold mb-1">ชื่อ Phase</label>
                                                    <input
                                                        type="text"
                                                        className={`form-control form-control-solid form-control-sm ${errors[`phase_${idx}`] ? 'is-invalid' : ''}`}
                                                        placeholder="เช่น ดึง, ลาก, ตัด"
                                                        value={item.phase_name}
                                                        onChange={e => updatePhaseItem(idx, 'phase_name', e.target.value)}
                                                    />
                                                    {errors[`phase_${idx}`] && <div className="invalid-feedback">{errors[`phase_${idx}`]}</div>}
                                                </div>
                                                <div className="col-md-6 fv-row">
                                                    <label className="fs-7 fw-semibold mb-1">ประเภทเครื่องจักร</label>
                                                    <select
                                                        className="form-select form-select-solid form-select-sm"
                                                        value={item.machine_type_id || ''}
                                                        onChange={e => updatePhaseItem(idx, 'machine_type_id', e.target.value ? Number(e.target.value) : null)}
                                                    >
                                                        <option value="">— ไม่ระบุ —</option>
                                                        {machineTypes.map(mt => (
                                                            <option key={mt.machine_type_id} value={mt.machine_type_id}>
                                                                {mt.type_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="card">
                            <div className="card-body d-flex justify-content-between py-5">
                                <button type="button" className="btn btn-light" onClick={() => navigate('../phase_template')} disabled={isSubmitting}>
                                    <i className="bi bi-x-lg me-1"></i> ยกเลิก
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span><span className="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...</span>
                                    ) : (
                                        <span><i className="bi bi-check-lg me-1"></i> บันทึก Template</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right side - preview */}
                    <div className="col-xl-4">
                        <div className="card" style={{ position: 'sticky', top: '80px' }}>
                            <div className="card-header border-0 pt-6 pb-0">
                                <div className="card-title">
                                    <h4 className="fw-bold mb-0">ตัวอย่าง Template</h4>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <span className="text-muted fs-8 d-block">ชื่อ Template</span>
                                    <span className={`fw-bold fs-5 ${templateName ? 'text-dark' : 'text-gray-400'}`}>
                                        {templateName || '—'}
                                    </span>
                                </div>

                                <div className="separator separator-dashed mb-4"></div>

                                <div className="mb-3">
                                    <span className="text-muted fs-8 d-block mb-2">Phase ({phaseItems.filter(p => p.phase_name.trim()).length} รายการ)</span>
                                </div>

                                {phaseItems.map((item, idx) => (
                                    <div key={idx}
                                        className={`d-flex align-items-center p-3 rounded mb-2 ${item.phase_name.trim() ? 'bg-light-primary' : 'bg-light'}`}>
                                        <span className="badge badge-circle badge-primary me-3 fw-bold" style={{ width: 28, height: 28, fontSize: 12 }}>
                                            {idx + 1}
                                        </span>
                                        <div className="flex-grow-1">
                                            <span className={`fw-semibold fs-7 ${item.phase_name.trim() ? 'text-dark' : 'text-gray-400'}`}>
                                                {item.phase_name.trim() || 'ยังไม่ได้ตั้งชื่อ'}
                                            </span>
                                            {item.machine_type_id && (
                                                <span className="badge badge-light-info ms-2 fs-9">
                                                    {machineTypes.find(mt => mt.machine_type_id === item.machine_type_id)?.type_name || ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </Content>
    );
};

export default PhaseTemplateCreateEdit;
