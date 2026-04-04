import React, { useEffect, useState } from 'react';
import { Employee, EmployeeStatus } from '../../type_interface/EmployeeType';
import { createEmployee, updateEmployee } from '../../services/employee';
import { useAlertModal } from '../../context/ModalContext';
import { validateRequired, validateEmail, validatePhone, validateCitizenId, validateNonNegativeNumber } from '../../utils/validate_utils';
import { formatPhoneInput, formatTaxInput, handleCommaNumberInput, parseCommaNumber, formatWithCommas } from '../../utils/input_format_utils';

interface Props {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    employee?: Employee | null;
}

const AddEditEmployeeModal: React.FC<Props> = ({ show, onHide, onSuccess, employee }) => {
    const { openAlertModal } = useAlertModal();
    const [loading, setLoading] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [citizenId, setCitizenId] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<string>('ทำงานอยู่');
    const [salary_base, setSalaryBase] = useState<number | string>('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = !!employee;

    useEffect(() => {
        if (show) {
            if (employee) {
                setFirstName(employee.employee_first_name || '');
                setLastName(employee.employee_last_name || '');
                setEmail(employee.email || '');
                setPhone(employee.phone_number || '');
                setCitizenId(employee.citizen_id || '');
                setAddress(employee.address || '');
                setStatus(employee.status || 'ทำงานอยู่');
                setSalaryBase(employee.salary_base ? formatWithCommas(employee.salary_base) : '');
            } else {
                resetForm();
            }
        }
    }, [show, employee]);

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setCitizenId('');
        setAddress('');
        setStatus('ทำงานอยู่');
        setSalaryBase('');
        setErrors({});
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        const firstNameErr = validateRequired(firstName, 'ชื่อ');
        if (firstNameErr) newErrors.firstName = firstNameErr;

        const lastNameErr = validateRequired(lastName, 'นามสกุล');
        if (lastNameErr) newErrors.lastName = lastNameErr;

        const citizenIdErr = validateRequired(citizenId, 'เลขบัตรประชาชน')
            ?? validateCitizenId(citizenId);
        if (citizenIdErr) newErrors.citizenId = citizenIdErr;

        const phoneErr = validatePhone(phone);
        if (phoneErr) newErrors.phone = phoneErr;

        const emailErr = validateEmail(email);
        if (emailErr) newErrors.email = emailErr;

        if (salary_base !== '') {
            const salaryErr = validateNonNegativeNumber(salary_base, 'ฐานเงินเดือน');
            if (salaryErr) newErrors.salary_base = salaryErr;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const employeePayload = {
                employee_first_name: firstName,
                employee_last_name: lastName,
                citizen_id: citizenId,
                phone_number: phone,
                email: email,
                address: address,
                status: status,
                salary_base: salary_base ? parseCommaNumber(String(salary_base)) : 0,
                user_id: employee?.user_id,
                ...(isEditMode ? { employee_id: employee?.employee_id } : {})
            };

            const res = isEditMode
                ? await updateEmployee({ ...employeePayload, employee_id: employee?.employee_id })
                : await createEmployee(employeePayload);

            if (res && res.success) {
                openAlertModal(isEditMode ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มพนักงานสำเร็จ", () => {
                    onSuccess();
                    onHide();
                }, true);
            } else {
                openAlertModal(res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", () => { }, false);
            }
        } catch {
            openAlertModal("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ", () => { }, false);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered mw-900px">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="fw-bold">{isEditMode ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
                        <div className="btn btn-icon btn-sm btn-active-icon-primary" onClick={onHide}>
                            <i className="bi bi-x fs-1"></i>
                        </div>
                    </div>

                    <div className="modal-body scroll-y mx-5 mx-xl-10 my-7">
                        <form className="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

                            <h3 className="mb-5 text-primary">ข้อมูลพนักงาน</h3>
                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">ชื่อ</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.firstName ? "is-invalid" : ""}`}
                                        placeholder="ชื่อจริง"
                                        value={firstName}
                                        onChange={e => { setFirstName(e.target.value); clearError('firstName'); }}
                                    />
                                    {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">นามสกุล</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.lastName ? "is-invalid" : ""}`}
                                        placeholder="นามสกุล"
                                        value={lastName}
                                        onChange={e => { setLastName(e.target.value); clearError('lastName'); }}
                                    />
                                    {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                                </div>
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">เลขบัตรประชาชน</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.citizenId ? "is-invalid" : ""}`}
                                        placeholder="เลขบัตรประชาชน 13 หลัก"
                                        value={citizenId}
                                        onChange={e => { setCitizenId(formatTaxInput(e.target.value)); clearError('citizenId'); }}
                                        maxLength={13}
                                    />
                                    {errors.citizenId && <div className="invalid-feedback">{errors.citizenId}</div>}
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.phone ? "is-invalid" : ""}`}
                                        placeholder="เบอร์โทรศัพท์ติดต่อ"
                                        value={phone}
                                        onChange={e => { setPhone(formatPhoneInput(e.target.value)); clearError('phone'); }}
                                        maxLength={10}
                                    />
                                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                                </div>
                            </div>

                            <div className="fv-row mb-8">
                                <label className="fs-6 fw-semibold mb-2">อีเมล</label>
                                <input
                                    type="text"
                                    className={`form-control form-control-solid ${errors.email ? "is-invalid" : ""}`}
                                    placeholder="Ex. example@email.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); clearError('email'); }}
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            <div className="fv-row mb-8">
                                <label className="fs-6 fw-semibold mb-2">ที่อยู่</label>
                                <textarea
                                    className="form-control form-control-solid"
                                    rows={3}
                                    placeholder="ที่อยู่ปัจจุบัน"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                />
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">สถานะพนักงาน</label>
                                    <select
                                        className="form-select form-select-solid"
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                    >
                                        {Object.values(EmployeeStatus).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">ฐานเงินเดือน</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-solid ${errors.salary_base ? "is-invalid" : ""}`}
                                        placeholder="0"
                                        value={salary_base}
                                        onChange={e => {
                                            const { displayValue } = handleCommaNumberInput(e.target.value);
                                            setSalaryBase(displayValue);
                                            clearError('salary_base');
                                        }}
                                    />
                                    {errors.salary_base && <div className="invalid-feedback">{errors.salary_base}</div>}
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="modal-footer flex-center">
                        <button type="reset" className="btn btn-light me-3" onClick={onHide} disabled={loading}>ยกเลิก</button>
                        <button type="submit" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                            <span className="indicator-label">{loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEditEmployeeModal;
