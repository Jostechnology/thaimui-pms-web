import React, { useEffect, useState } from 'react';
import { Employee, EmployeeStatus } from '../../type_interface/EmployeeType';
import { createEmployee, updateEmployee } from '../../services/employee';
import { useAlertModal } from '../../context/ModalContext';

interface Props {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    employee?: Employee | null; // If present, we are in Edit mode
}

const AddEditEmployeeModal: React.FC<Props> = ({ show, onHide, onSuccess, employee }) => {
    const { openAlertModal } = useAlertModal();
    const [loading, setLoading] = useState(false);
    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [citizenId, setCitizenId] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<string>('ทำงานอยู่'); // Default status (Thai)
    const [salary_base, setSalaryBase] = useState<number | string>('');

    const isEditMode = !!employee;
    useEffect(() => {
        if (show) {
            if (employee) {
                // Edit Mode: Prefill data
                setFirstName(employee.employee_first_name || '');
                setLastName(employee.employee_last_name || '');
                setEmail(employee.email || '');
                setPhone(employee.phone_number || '');
                setCitizenId(employee.citizen_id || '');
                setAddress(employee.address || '');
                setStatus(employee.status || 'ทำงานอยู่');
                setSalaryBase(employee.salary_base || '');
            } else {
                // Add Mode: Reset form
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

    };

    const validate = () => {
        if (!firstName || !lastName || !citizenId) {
            openAlertModal("กรุณากรอกข้อมูลสำคัญ (ชื่อ, นามสกุล, เลขบัตร) ให้ครบถ้วน", () => { }, false);
            return false;
        }
        // No user creation required here anymore
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            let targetUserId = employee?.user_id;

            // No automatic user creation — user_id left as-is (may be undefined for new employees)

            // 2. Create/Update Employee
            const employeePayload = {
                employee_first_name: firstName,
                employee_last_name: lastName,
                citizen_id: citizenId,
                phone_number: phone,
                email: email,
                address: address,
                status: status,
                salary_base: salary_base ? Number(salary_base) : 0,
                user_id: targetUserId,
                ...(isEditMode ? { employee_id: employee?.employee_id } : {})
            };

            let res;
            if (isEditMode) {
                // The update API expects employee_id in the payload or URL dePENDING on implementation.
                // Based on service: updateEmployee takes data. Let's check service implementation again to be sure key is passing correctly.
                // Service: updateEmployee(data) -> PUT /update_employee -> Controller: update_employee(data) -> Service: update_employee(data.get("employee_id"), data) is NOT how backend is written
                // Backend: update_employee(data) -> data = request.get_json() -> update_employee(data).
                // Backend Service implementation: def update_employee(data): employee_id = data.get("employee_id") ...
                // Wait, let me double check backend service update_employee signature.
                // Checked previously: def update_employee(data): ... employee = Employee.query.get(data.get("employee_id")) ...
                // So sending employee_id in body is correct.
                res = await updateEmployee({ ...employeePayload, employee_id: employee?.employee_id });
            } else {
                res = await createEmployee(employeePayload);
            }

            if (res && res.success) {
                openAlertModal(isEditMode ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มพนักงานสำเร็จ", () => {
                    onSuccess();
                    onHide();
                }, true);
            } else {
                openAlertModal(res?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", () => { }, false);
            }

        } catch (e) {
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
                        <form id="kt_modal_add_employee_form" className="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>


                            {/* Employee Info Section */}
                            <h3 className="mb-5 text-primary">ข้อมูลพนักงาน (Employee Info)</h3>
                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">ชื่อ</label>
                                    <input type="text" className="form-control form-control-solid" placeholder="ชื่อจริง" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">นามสกุล</label>
                                    <input type="text" className="form-control form-control-solid" placeholder="นามสกุล" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">เลขบัตรประชาชน</label>
                                    <input type="text" className="form-control form-control-solid" placeholder="เลขบัตรประชาชน 13 หลัก" value={citizenId} onChange={e => setCitizenId(e.target.value)} maxLength={13} />
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">เบอร์โทรศัพท์</label>
                                    <input type="text" className="form-control form-control-solid" placeholder="เบอร์โทรศัพท์ติดต่อ" value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                            </div>

                            <div className="fv-row mb-8">
                                <label className="fs-6 fw-semibold mb-2">อีเมล</label>
                                <input type="email" className="form-control form-control-solid" placeholder="Ex. example@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>

                            <div className="fv-row mb-8">
                                <label className="fs-6 fw-semibold mb-2">ที่อยู่</label>
                                <textarea className="form-control form-control-solid" rows={3} placeholder="ที่อยู่ปัจจุบัน" value={address} onChange={e => setAddress(e.target.value)}></textarea>
                            </div>

                            <div className="row g-9 mb-8">
                                <div className="col-md-6 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">สถานะพนักงาน</label>
                                    <select className="form-select form-select-solid" value={status} onChange={e => setStatus(e.target.value)}>
                                        {Object.values(EmployeeStatus).map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">ฐานเงินเดือน</label>
                                    <input type="number" className="form-control form-control-solid" placeholder="0.00" value={salary_base} onChange={e => setSalaryBase(e.target.value)} />
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
