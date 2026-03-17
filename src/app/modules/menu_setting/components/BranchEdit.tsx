import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getBranchList, updateBranch } from '../../../services/branchService';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

// ─── Type สำหรับ Validation Error ────────────────────────────
type FormErrors = {
    branch_code?: string;
    branch_name?: string;
};

const BranchEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const branchId = Number(id);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // ─── Form State ──────────────────────────────────────────────
    const [formData, setFormData] = useState({
        branch_code: '',
        branch_name: '',
    });

    // ─── เก็บค่าเดิมเพื่อเปรียบเทียบ ────────────────────────────
    const [originalData, setOriginalData] = useState({
        branch_code: '',
        branch_name: '',
    });

    // ─── Validation State ────────────────────────────────────────
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // ─── ดึงข้อมูลสาขาเดิมมาแสดง ────────────────────────────────
    useEffect(() => {
        const fetchBranch = async () => {
            setIsLoading(true);
            const res = await getBranchList();
            if (res.success) {
                const branch = res.data.find((b: any) => b.branch_id === branchId);
                if (branch) {
                    const data = {
                        branch_code: branch.branch_code,
                        branch_name: branch.branch_name,
                    };
                    setFormData(data);
                    setOriginalData(data);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบข้อมูลสาขา',
                        text: 'ไม่พบสาขาที่ต้องการแก้ไข',
                        confirmButtonColor: '#d33',
                    }).then(() => navigate('/setting/branch_list'));
                }
            }
            setIsLoading(false);
        };
        fetchBranch();
    }, [branchId]);

    // ─── ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่ ────────────────────
    const hasChanges = formData.branch_code !== originalData.branch_code ||
                       formData.branch_name !== originalData.branch_name;

    // ─── Validate ───────────────────────────────────────────────
    const validate = (data: typeof formData): FormErrors => {
        const errs: FormErrors = {};
        if (!data.branch_code.trim()) {
            errs.branch_code = 'กรุณากรอกรหัสสาขา';
        } else if (data.branch_code.length > 20) {
            errs.branch_code = 'รหัสสาขาต้องไม่เกิน 20 ตัวอักษร';
        }
        if (!data.branch_name.trim()) {
            errs.branch_name = 'กรุณากรอกชื่อสาขา';
        } else if (data.branch_name.length > 100) {
            errs.branch_name = 'ชื่อสาขาต้องไม่เกิน 100 ตัวอักษร';
        }
        return errs;
    };

    // ─── Handle Change (พร้อม real-time validation) ──────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);

        if (touched[name]) {
            const newErrors = validate(newData);
            setErrors(prev => ({
                ...prev,
                [name]: newErrors[name as keyof FormErrors]
            }));
        }
    };

    // ─── Handle Blur (mark as touched) ──────────────────────────
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const newErrors = validate(formData);
        setErrors(prev => ({
            ...prev,
            [name]: newErrors[name as keyof FormErrors]
        }));
    };

    // ─── Handle Submit ──────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark ทุก field เป็น touched
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(k => allTouched[k] = true);
        setTouched(allTouched);

        const validationErrors = validate(formData);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'กรอกข้อมูลไม่ครบ',
                text: 'กรุณาตรวจสอบข้อมูลที่มีเครื่องหมายแดง แล้วลองอีกครั้ง',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        // ─── Confirmation Dialog ────────────────────────────────
        const confirm = await Swal.fire({
            title: 'ยืนยันการแก้ไข?',
            html: `
                <div class="text-start fs-6">
                    <p class="mb-2"><strong>รหัสสาขา:</strong> ${formData.branch_code}</p>
                    <p class="mb-0"><strong>ชื่อสาขา:</strong> ${formData.branch_name}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ย้อนกลับแก้ไข',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d9d9d9',
            reverseButtons: true,
        });

        if (!confirm.isConfirmed) return;

        setIsSubmitting(true);

        try {
            const res = await updateBranch(branchId, formData);

            if (res.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'แก้ไขสำเร็จ!',
                    text: `สาขา "${formData.branch_name}" ถูกอัปเดตเรียบร้อยแล้ว`,
                    confirmButtonColor: '#3085d6',
                    timer: 2000,
                    timerProgressBar: true,
                });
                navigate('/setting/branch_list');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: res.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง',
                    confirmButtonColor: '#d33',
                });
            }
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว',
                text: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
                confirmButtonColor: '#d33',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Helper: สร้าง class สำหรับ input ที่มี error / success ──
    const fieldClass = (fieldName: string) => {
        if (!touched[fieldName]) return 'form-control form-control-solid';
        if (errors[fieldName as keyof FormErrors]) return 'form-control form-control-solid is-invalid';
        return 'form-control form-control-solid is-valid';
    };

    // ─── คำนวณ Progress ของฟอร์ม ───────────────────────────────
    const filledCount = [
        formData.branch_code,
        formData.branch_name,
    ].filter(v => v.trim() !== '').length;
    const totalFields = 2;
    const progressPercent = Math.round((filledCount / totalFields) * 100);

    if (isLoading) {
        return (
            <Content>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            </Content>
        );
    }

    return (
        <Content>
            {/* ─── Breadcrumb / Back Navigation ─────────────── */}
            <div className="d-flex align-items-center mb-6">
                <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light-primary me-3"
                    onClick={() => navigate('/setting/branch_list')}
                    title="กลับไปหน้ารายการสาขา"
                >
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h3 className="fw-bolder mb-0">แก้ไขข้อมูลสาขา</h3>
                    <span className="text-muted fs-7">แก้ไขข้อมูลสาขาที่มีอยู่ในระบบ</span>
                </div>
            </div>

            <div className="row g-6">

                {/* ══════════════ ฝั่งซ้าย: ฟอร์มหลัก ══════════════ */}
                <div className="col-xl-8">
                    <form onSubmit={handleSubmit} id="branch-edit-form">

                        {/* ── Section 1: ข้อมูลสาขา ─────────────────── */}
                        <div className="card mb-6">
                            <div className="card-header border-0 pt-6 pb-0">
                                <div className="card-title">
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-35px me-3">
                                            <span className="symbol-label bg-light-warning">
                                                <i className="bi bi-pencil-square text-warning fs-5"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="fw-bold mb-0">ข้อมูลสาขา</h4>
                                            <span className="text-muted fs-8">แก้ไขข้อมูลสาขาตามต้องการ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="row mb-6">
                                    <div className="col-md-6 fv-row mb-6 mb-md-0">
                                        <label className="required fs-6 fw-semibold mb-2">รหัสสาขา</label>
                                        <input
                                            type="text"
                                            className={fieldClass('branch_code')}
                                            placeholder="เช่น BKK-01, CNX-01"
                                            name="branch_code"
                                            value={formData.branch_code}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            maxLength={20}
                                            autoFocus
                                        />
                                        {touched.branch_code && errors.branch_code && (
                                            <div className="invalid-feedback">{errors.branch_code}</div>
                                        )}
                                        <div className="d-flex justify-content-between mt-1">
                                            <span className="form-text text-muted">รหัสสำหรับระบุตัวตนสาขา ต้องไม่ซ้ำกัน</span>
                                            <span className={`fs-8 ${formData.branch_code.length > 15 ? 'text-warning' : 'text-muted'}`}>
                                                {formData.branch_code.length}/20
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-md-6 fv-row">
                                        <label className="required fs-6 fw-semibold mb-2">ชื่อสาขา</label>
                                        <input
                                            type="text"
                                            className={fieldClass('branch_name')}
                                            placeholder="เช่น สาขากรุงเทพฯ (สำนักงานใหญ่)"
                                            name="branch_name"
                                            value={formData.branch_name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            maxLength={100}
                                        />
                                        {touched.branch_name && errors.branch_name && (
                                            <div className="invalid-feedback">{errors.branch_name}</div>
                                        )}
                                        <div className="d-flex justify-content-between mt-1">
                                            <span className="form-text text-muted">ชื่อสาขาที่จะแสดงในระบบ</span>
                                            <span className={`fs-8 ${formData.branch_name.length > 80 ? 'text-warning' : 'text-muted'}`}>
                                                {formData.branch_name.length}/100
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Action Buttons ── */}
                        <div className="card">
                            <div className="card-body d-flex justify-content-between align-items-center py-5">
                                <button
                                    type="button"
                                    className="btn btn-light btn-active-light-danger"
                                    onClick={async () => {
                                        if (hasChanges) {
                                            const result = await Swal.fire({
                                                title: 'ย้อนกลับ?',
                                                text: 'ข้อมูลที่แก้ไขไว้จะหายไป ต้องการย้อนกลับหรือไม่?',
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonText: 'ย้อนกลับ',
                                                cancelButtonText: 'อยู่หน้านี้ต่อ',
                                                confirmButtonColor: '#d33',
                                                cancelButtonColor: '#3085d6',
                                                reverseButtons: true,
                                            });
                                            if (!result.isConfirmed) return;
                                        }
                                        navigate('/setting/branch_list');
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <i className="bi bi-x-lg me-1"></i> ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-warning"
                                    disabled={isSubmitting || !hasChanges || Object.keys(validate(formData)).length > 0}
                                >
                                    {isSubmitting ? (
                                        <span className="d-flex align-items-center">
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            กำลังบันทึก...
                                        </span>
                                    ) : (
                                        <span>
                                            <i className="bi bi-check-lg me-1"></i> บันทึกการแก้ไข
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>

                {/* ══════════════ ฝั่งขวา: Summary Panel ══════════════ */}
                <div className="col-xl-4">
                    <div className="card" style={{ position: 'sticky', top: '80px' }}>
                        <div className="card-header border-0 pt-6 pb-0">
                            <div className="card-title">
                                <h4 className="fw-bold mb-0">สรุปข้อมูล</h4>
                            </div>
                        </div>
                        <div className="card-body">
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted fs-7">ความสมบูรณ์ของฟอร์ม</span>
                                    <span className="fw-bold fs-7">{progressPercent}%</span>
                                </div>
                                <div className="progress h-8px">
                                    <div
                                        className={`progress-bar bg-${progressPercent === 100 ? 'success' : progressPercent >= 50 ? 'primary' : 'warning'}`}
                                        role="progressbar"
                                        style={{ width: `${progressPercent}%`, transition: 'width 0.4s ease' }}
                                    ></div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="separator separator-dashed mb-5"></div>

                            {/* ─ Branch Code ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.branch_code ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-hash fs-6 ${formData.branch_code ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">รหัสสาขา</span>
                                    <span className={`fw-bold fs-6 ${formData.branch_code ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.branch_code || '—'}
                                    </span>
                                    {formData.branch_code !== originalData.branch_code && originalData.branch_code && (
                                        <span className="text-muted fs-9 d-block">
                                            <i className="bi bi-arrow-right-short"></i> เดิม: {originalData.branch_code}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ─ Branch Name ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.branch_name ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-building fs-6 ${formData.branch_name ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ชื่อสาขา</span>
                                    <span className={`fw-bold fs-6 ${formData.branch_name ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.branch_name || '—'}
                                    </span>
                                    {formData.branch_name !== originalData.branch_name && originalData.branch_name && (
                                        <span className="text-muted fs-9 d-block">
                                            <i className="bi bi-arrow-right-short"></i> เดิม: {originalData.branch_name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="separator separator-dashed mb-5"></div>

                            {/* ─ Change Status ─ */}
                            <div className="fs-7">
                                {hasChanges ? (
                                    <div className="d-flex align-items-center text-warning">
                                        <i className="bi bi-exclamation-circle-fill me-2 text-warning"></i>
                                        มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                                    </div>
                                ) : (
                                    <div className="d-flex align-items-center text-muted">
                                        <i className="bi bi-check-circle me-2"></i>
                                        ยังไม่มีการเปลี่ยนแปลง
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </Content>
    );
};

export default BranchEdit;
