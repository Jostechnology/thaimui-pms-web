import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createMachineType, updateMachineType, getMachineTypeById } from '../../../services/machineTypeService';

const MachineTypeCreateEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;

    const [formData, setFormData] = useState({ type_name: '', type_description: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            getMachineTypeById(Number(id)).then(res => {
                if (res.success && res.data) {
                    setFormData({
                        type_name: res.data.type_name || '',
                        type_description: res.data.type_description || '',
                    });
                }
                setLoading(false);
            });
        }
    }, [id]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formData.type_name.trim()) errs.type_name = 'กรุณากรอกชื่อประเภท';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const confirm = await Swal.fire({
            title: isEdit ? 'ยืนยันการแก้ไข?' : 'ยืนยันการบันทึก?',
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
                ? await updateMachineType(Number(id), formData)
                : await createMachineType(formData);
            if (res.success) {
                await Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
                navigate('/machine/machine_type_list');
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
        return <Content><div className="text-center py-20"><span className="spinner-border"></span></div></Content>;
    }

    return (
        <Content>
            <div className="d-flex align-items-center mb-6">
                <button type="button" className="btn btn-sm btn-icon btn-light-primary me-3"
                    onClick={() => navigate('/machine/machine_type_list')}>
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h3 className="fw-bolder mb-0">{isEdit ? 'แก้ไขประเภทเครื่องจักร' : 'เพิ่มประเภทเครื่องจักรใหม่'}</h3>
                    <span className="text-muted fs-7">กรอกข้อมูลประเภทเครื่องจักร</span>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row mb-6">
                            <div className="col-md-6 fv-row">
                                <label className="required fs-6 fw-semibold mb-2">ชื่อประเภท</label>
                                <input
                                    type="text"
                                    className={`form-control form-control-solid ${errors.type_name ? 'is-invalid' : ''}`}
                                    placeholder="เช่น เครื่องดึง, เครื่องลาก"
                                    value={formData.type_name}
                                    onChange={e => setFormData({ ...formData, type_name: e.target.value })}
                                    autoFocus
                                />
                                {errors.type_name && <div className="invalid-feedback">{errors.type_name}</div>}
                            </div>
                        </div>

                        <div className="row mb-6">
                            <div className="col-md-8 fv-row">
                                <label className="fs-6 fw-semibold mb-2">รายละเอียด</label>
                                <textarea
                                    className="form-control form-control-solid"
                                    rows={3}
                                    placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                                    value={formData.type_description}
                                    onChange={e => setFormData({ ...formData, type_description: e.target.value })}
                                    maxLength={255}
                                />
                            </div>
                        </div>

                        <div className="d-flex justify-content-between pt-4">
                            <button type="button" className="btn btn-light"
                                onClick={() => navigate('/machine/machine_type_list')} disabled={isSubmitting}>
                                <i className="bi bi-x-lg me-1"></i> ยกเลิก
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <span><span className="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...</span>
                                ) : (
                                    <span><i className="bi bi-check-lg me-1"></i> บันทึกข้อมูล</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Content>
    );
};

export default MachineTypeCreateEdit;
