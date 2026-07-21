import React, { useEffect, useRef, useState } from 'react';
import { Employee, EmployeeStatus } from '../../type_interface/EmployeeType';
import { createEmployee, updateEmployee, setEmployeePhoto, deleteEmployeePhoto } from '../../services/employee';
import { useAlertModal } from '../../context/ModalContext';
import { validateRequired, validateEmail, validatePhone, validateCitizenId, validateNonNegativeNumber } from '../../utils/validate_utils';
import { formatPhoneInput, formatTaxInput, handleCommaNumberInput, parseCommaNumber, formatWithCommas } from '../../utils/input_format_utils';
import { fileToResizedDataUrl } from '../../utils/image_utils';

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
    const [baseSalary, setBaseSalary] = useState<number | string>('');
    const [dayRate, setDayRate] = useState<number | string>('');
    const [otHourlyRate, setOtHourlyRate] = useState<number | string>('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Photo: photoDataUrl = รูปใหม่ที่เลือก (base64), photoRemoved = ผู้ใช้กดลบรูปเดิม
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

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
                setBaseSalary(employee.base_salary ? formatWithCommas(employee.base_salary) : '');
                setDayRate(employee.day_rate ? formatWithCommas(employee.day_rate) : '');
                setOtHourlyRate(employee.ot_hourly_rate ? formatWithCommas(employee.ot_hourly_rate) : '');
                setPhotoDataUrl(null);
                setPhotoRemoved(false);
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
        setBaseSalary('');
        setDayRate('');
        setOtHourlyRate('');
        setErrors({});
        setPhotoDataUrl(null);
        setPhotoRemoved(false);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const dataUrl = await fileToResizedDataUrl(file);
            setPhotoDataUrl(dataUrl);
            setPhotoRemoved(false);
        } catch {
            openAlertModal('ไม่สามารถอ่านไฟล์รูปได้', () => { }, false);
        }
    };

    const previewPhotoUrl = photoDataUrl || (!photoRemoved ? employee?.photo_url : null);

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

        if (baseSalary !== '') {
            const err = validateNonNegativeNumber(baseSalary, 'เงินเดือนฐาน');
            if (err) newErrors.base_salary = err;
        }
        if (dayRate !== '') {
            const err = validateNonNegativeNumber(dayRate, 'ค่าแรงรายวัน');
            if (err) newErrors.day_rate = err;
        }
        if (otHourlyRate !== '') {
            const err = validateNonNegativeNumber(otHourlyRate, 'ค่า OT ต่อชั่วโมง');
            if (err) newErrors.ot_hourly_rate = err;
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
                base_salary: baseSalary ? parseCommaNumber(String(baseSalary)) : 0,
                day_rate: dayRate ? parseCommaNumber(String(dayRate)) : 0,
                ot_hourly_rate: otHourlyRate ? parseCommaNumber(String(otHourlyRate)) : 0,
                user_id: employee?.user_id,
                ...(isEditMode ? { employee_id: employee?.employee_id } : {})
            };

            const res = isEditMode
                ? await updateEmployee({ ...employeePayload, employee_id: employee?.employee_id })
                : await createEmployee(employeePayload);

            if (res && res.success) {
                // Sync photo after the employee row exists (create returns the new id)
                const employeeId = isEditMode ? employee!.employee_id : res.data?.employee_id;
                if (employeeId) {
                    if (photoDataUrl) {
                        const photoRes = await setEmployeePhoto(employeeId, photoDataUrl);
                        if (!photoRes?.success) {
                            openAlertModal('บันทึกข้อมูลสำเร็จ แต่อัปโหลดรูปไม่สำเร็จ', () => { onSuccess(); onHide(); }, false);
                            return;
                        }
                    } else if (photoRemoved && employee?.photo_url) {
                        await deleteEmployeePhoto(employeeId);
                    }
                }
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

                            {/* Photo */}
                            <div className="d-flex align-items-center mb-8 gap-5">
                                <div
                                    className="symbol symbol-100px symbol-circle"
                                    style={{ cursor: 'pointer' }}
                                    title="คลิกเพื่อเลือกรูป"
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    {previewPhotoUrl
                                        ? <img src={previewPhotoUrl} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        : (
                                            <span className="symbol-label bg-light-primary text-primary fw-bold fs-1">
                                                {firstName ? firstName.charAt(0) : <i className="bi bi-person fs-1"></i>}
                                            </span>
                                        )}
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-sm btn-light-primary fw-bold" onClick={() => photoInputRef.current?.click()}>
                                            <i className="bi bi-camera me-1"></i>{previewPhotoUrl ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
                                        </button>
                                        {previewPhotoUrl && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-danger fw-bold"
                                                onClick={() => { setPhotoDataUrl(null); setPhotoRemoved(true); }}
                                            >
                                                <i className="bi bi-trash3 me-1"></i>ลบรูป
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-muted fs-8">รูปพนักงานจะแสดงในหน้าคอนโซลหน้างาน</span>
                                </div>
                                <input ref={photoInputRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoSelect} />
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">ชื่อ</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg ${errors.firstName ? "is-invalid" : ""}`}
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
                                        className={`form-control form-control-lg ${errors.lastName ? "is-invalid" : ""}`}
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
                                        className={`form-control form-control-lg ${errors.citizenId ? "is-invalid" : ""}`}
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
                                        className={`form-control form-control-lg ${errors.phone ? "is-invalid" : ""}`}
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
                                    className={`form-control form-control-lg ${errors.email ? "is-invalid" : ""}`}
                                    placeholder="Ex. example@email.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); clearError('email'); }}
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            <div className="fv-row mb-8">
                                <label className="fs-6 fw-semibold mb-2">ที่อยู่</label>
                                <textarea
                                    className="form-control form-control-lg"
                                    rows={3}
                                    placeholder="ที่อยู่ปัจจุบัน"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                />
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-12 fv-row">
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
                            </div>

                            <h3 className="mb-5 text-primary">ค่าตอบแทน</h3>
                            <div className="row g-9 mb-8">
                                <div className="col-md-4 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">เงินเดือนฐาน (บาท/เดือน)</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg ${errors.base_salary ? "is-invalid" : ""}`}
                                        placeholder="0"
                                        value={baseSalary}
                                        onChange={e => {
                                            const { displayValue } = handleCommaNumberInput(e.target.value);
                                            setBaseSalary(displayValue);
                                            clearError('base_salary');
                                        }}
                                    />
                                    <div className="form-text">จ่ายประจำทุกเดือนแม้ไม่มีงาน</div>
                                    {errors.base_salary && <div className="invalid-feedback">{errors.base_salary}</div>}
                                </div>
                                <div className="col-md-4 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">ค่าแรงรายวัน (บาท/วัน)</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg ${errors.day_rate ? "is-invalid" : ""}`}
                                        placeholder="0"
                                        value={dayRate}
                                        onChange={e => {
                                            const { displayValue } = handleCommaNumberInput(e.target.value);
                                            setDayRate(displayValue);
                                            clearError('day_rate');
                                        }}
                                    />
                                    <div className="form-text">จ่ายเมื่อมาทำงานในเวลาปกติ</div>
                                    {errors.day_rate && <div className="invalid-feedback">{errors.day_rate}</div>}
                                </div>
                                <div className="col-md-4 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">ค่า OT (บาท/ชั่วโมง)</label>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg ${errors.ot_hourly_rate ? "is-invalid" : ""}`}
                                        placeholder="0"
                                        value={otHourlyRate}
                                        onChange={e => {
                                            const { displayValue } = handleCommaNumberInput(e.target.value);
                                            setOtHourlyRate(displayValue);
                                            clearError('ot_hourly_rate');
                                        }}
                                    />
                                    <div className="form-text">นอกเวลา/วันหยุดจะคูณตัวคูณตามกะ</div>
                                    {errors.ot_hourly_rate && <div className="invalid-feedback">{errors.ot_hourly_rate}</div>}
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
