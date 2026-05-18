import React, { useEffect, useState } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import Swal from 'sweetalert2';
import {
    getShiftList,
    createShift,
    updateShift,
    deleteShift,
    getEmployeeShift,
    upsertEmployeeShift,
    deleteEmployeeShift,
} from '../../../services/shiftHolidayService';
import { getEmployeeList } from '../../../services/employee';
import { Shift, Employee, EmployeeShift } from '../../../type_interface/EmployeeType';

const DAY_TOKENS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS_TH: Record<string, string> = {
    MON: 'จ', TUE: 'อ', WED: 'พ', THU: 'พฤ', FRI: 'ศ', SAT: 'ส', SUN: 'อา',
};

const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : '--:--');

const parseWorkDays = (csv?: string): string[] =>
    (csv || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

interface ShiftFormState {
    shift_id?: number;
    name: string;
    start_time: string;
    end_time: string;
    work_days: string[];
    ot_multiplier: number;
    weekend_multiplier: number;
    holiday_multiplier: number;
    is_default: boolean;
}

const emptyShiftForm: ShiftFormState = {
    name: 'DEFAULT',
    start_time: '08:00',
    end_time: '17:00',
    work_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    ot_multiplier: 1.5,
    weekend_multiplier: 2.0,
    holiday_multiplier: 3.0,
    is_default: false,
};

const ShiftManagement: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<ShiftFormState>(emptyShiftForm);
    const [editing, setEditing] = useState<boolean>(false);

    // Employee override section
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [empSearch, setEmpSearch] = useState('');
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [override, setOverride] = useState<EmployeeShift | null>(null);
    const [overrideForm, setOverrideForm] = useState({
        start_time: '08:00',
        end_time: '17:00',
        work_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as string[],
    });

    const fetchShifts = async () => {
        setLoading(true);
        const res = await getShiftList(1, 50, '');
        if (res?.success) {
            const items: Shift[] = res.data?.items || [];
            setShifts(items);
            const def = items.find(s => s.is_default) || items[0];
            if (def) loadIntoForm(def);
        }
        setLoading(false);
    };

    const fetchEmployees = async (search = '') => {
        const res = await getEmployeeList(1, 50, search);
        if (res?.success) {
            setEmployees(res.data?.items || []);
        }
    };

    useEffect(() => { fetchShifts(); fetchEmployees(''); }, []);

    const loadIntoForm = (s: Shift) => {
        setForm({
            shift_id: s.shift_id,
            name: s.name || 'DEFAULT',
            start_time: fmtTime(s.start_time),
            end_time: fmtTime(s.end_time),
            work_days: parseWorkDays(s.work_days),
            ot_multiplier: s.ot_multiplier,
            weekend_multiplier: s.weekend_multiplier,
            holiday_multiplier: s.holiday_multiplier,
            is_default: !!s.is_default,
        });
        setEditing(true);
    };

    const toggleDay = (d: string) => {
        setForm(prev => ({
            ...prev,
            work_days: prev.work_days.includes(d)
                ? prev.work_days.filter(x => x !== d)
                : [...prev.work_days, d],
        }));
    };

    const handleSaveShift = async () => {
        const payload = {
            name: form.name,
            start_time: form.start_time,
            end_time: form.end_time,
            work_days: form.work_days.join(','),
            ot_multiplier: Number(form.ot_multiplier),
            weekend_multiplier: Number(form.weekend_multiplier),
            holiday_multiplier: Number(form.holiday_multiplier),
            is_default: form.is_default,
        };
        const res = editing && form.shift_id
            ? await updateShift(form.shift_id, payload)
            : await createShift(payload);
        if (res?.success) {
            Swal.fire({ icon: 'success', title: 'บันทึกกะการทำงานสำเร็จ', timer: 1500, showConfirmButton: false });
            await fetchShifts();
        } else {
            Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const handleNewShift = () => {
        setForm(emptyShiftForm);
        setEditing(false);
    };

    const handleDeleteShift = async () => {
        if (!form.shift_id) return;
        const ok = await Swal.fire({
            title: 'ลบกะการทำงาน?', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก'
        });
        if (!ok.isConfirmed) return;
        const res = await deleteShift(form.shift_id);
        if (res?.success) {
            Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false });
            setForm(emptyShiftForm);
            setEditing(false);
            await fetchShifts();
        } else {
            Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: res?.error || '' });
        }
    };

    // ── Employee override ──────────────────────────────────────────────
    const handleSelectEmployee = async (emp: Employee) => {
        setSelectedEmp(emp);
        const res = await getEmployeeShift(emp.employee_id);
        if (res?.success && res.data) {
            const ov: EmployeeShift = res.data;
            setOverride(ov);
            setOverrideForm({
                start_time: fmtTime(ov.start_time),
                end_time: fmtTime(ov.end_time),
                work_days: parseWorkDays(ov.work_days),
            });
        } else {
            setOverride(null);
            setOverrideForm({
                start_time: form.start_time,
                end_time: form.end_time,
                work_days: form.work_days,
            });
        }
    };

    const toggleOverrideDay = (d: string) => {
        setOverrideForm(prev => ({
            ...prev,
            work_days: prev.work_days.includes(d)
                ? prev.work_days.filter(x => x !== d)
                : [...prev.work_days, d],
        }));
    };

    const handleSaveOverride = async () => {
        if (!selectedEmp) return;
        const payload = {
            start_time: overrideForm.start_time,
            end_time: overrideForm.end_time,
            work_days: overrideForm.work_days.join(','),
        };
        const res = await upsertEmployeeShift(selectedEmp.employee_id, payload);
        if (res?.success) {
            Swal.fire({ icon: 'success', title: 'บันทึก override สำเร็จ', timer: 1200, showConfirmButton: false });
            await handleSelectEmployee(selectedEmp);
        } else {
            Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const handleClearOverride = async () => {
        if (!selectedEmp || !override) return;
        const ok = await Swal.fire({
            title: 'ลบ shift override?', icon: 'warning',
            text: 'พนักงานจะกลับไปใช้กะ default',
            showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
        });
        if (!ok.isConfirmed) return;
        const res = await deleteEmployeeShift(selectedEmp.employee_id);
        if (res?.success) {
            setOverride(null);
            Swal.fire({ icon: 'success', title: 'ลบ override แล้ว', timer: 1200, showConfirmButton: false });
        }
    };

    return (
        <Content>
            <div className="d-flex flex-wrap flex-stack mb-6">
                <h3 className="fw-bolder my-2">
                    จัดการกะการทำงาน
                    <span className="fs-6 text-gray-400 fw-bold ms-4">Shift &amp; Pay Multipliers</span>
                </h3>
            </div>

            {/* ── Global Shift Configuration ───────────────────────────── */}
            <div className="card mb-7">
                <div className="card-header border-0 pt-6">
                    <h4 className="card-title fw-bold m-0">กะ Default ระบบ</h4>
                    <div className="card-toolbar">
                        <button className="btn btn-sm btn-light-primary me-2" onClick={handleNewShift}>
                            <i className="bi bi-plus-lg"></i> สร้างกะใหม่
                        </button>
                        <select
                            className="form-select form-select-sm w-200px"
                            value={form.shift_id || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                const s = shifts.find(x => x.shift_id === id);
                                if (s) loadIntoForm(s);
                            }}
                        >
                            <option value="">-- เลือกกะ --</option>
                            {shifts.map(s => (
                                <option key={s.shift_id} value={s.shift_id}>
                                    {s.name} {s.is_default ? '(default)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="card-body pt-4">
                    {loading ? (
                        <div className="text-center py-6"><span className="spinner-border text-primary"></span></div>
                    ) : (
                        <>
                            <div className="row g-5 mb-6">
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">ชื่อกะ</label>
                                    <input
                                        className="form-control form-control-lg"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">เวลาเริ่มงาน</label>
                                    <input
                                        type="time"
                                        className="form-control form-control-lg"
                                        value={form.start_time}
                                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">เวลาเลิกงาน</label>
                                    <input
                                        type="time"
                                        className="form-control form-control-lg"
                                        value={form.end_time}
                                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="fs-7 fw-bold mb-2 d-block">วันทำงาน</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    {DAY_TOKENS.map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            className={`btn btn-sm fw-bold ${form.work_days.includes(d) ? 'btn-primary' : 'btn-light'}`}
                                            style={{ minWidth: 55, borderRadius: 20 }}
                                            onClick={() => toggleDay(d)}
                                        >
                                            {DAY_LABELS_TH[d]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="row g-5 mb-6">
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">ตัวคูณ OT (นอกเวลาวันทำงาน)</label>
                                    <input
                                        type="number" step="0.1" min={0}
                                        className="form-control form-control-lg"
                                        value={form.ot_multiplier}
                                        onChange={(e) => setForm({ ...form, ot_multiplier: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">ตัวคูณวันหยุดสุดสัปดาห์</label>
                                    <input
                                        type="number" step="0.1" min={0}
                                        className="form-control form-control-lg"
                                        value={form.weekend_multiplier}
                                        onChange={(e) => setForm({ ...form, weekend_multiplier: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="fs-7 fw-bold mb-2">ตัวคูณวันหยุดนักขัตฤกษ์</label>
                                    <input
                                        type="number" step="0.1" min={0}
                                        className="form-control form-control-lg"
                                        value={form.holiday_multiplier}
                                        onChange={(e) => setForm({ ...form, holiday_multiplier: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="form-check form-switch mb-6">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="isDefault"
                                    checked={form.is_default}
                                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                                />
                                <label className="form-check-label fw-bold" htmlFor="isDefault">ใช้เป็นกะ default ของระบบ</label>
                            </div>

                            <div className="d-flex gap-2">
                                <button className="btn btn-primary fw-bold" onClick={handleSaveShift}>
                                    <i className="bi bi-save2 me-2"></i>{editing ? 'บันทึก' : 'สร้างกะ'}
                                </button>
                                {editing && form.shift_id && (
                                    <button className="btn btn-light-danger fw-bold" onClick={handleDeleteShift}>
                                        <i className="bi bi-trash me-2"></i>ลบกะนี้
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Per-Employee Override ────────────────────────────────── */}
            <div className="card">
                <div className="card-header border-0 pt-6">
                    <h4 className="card-title fw-bold m-0">Override รายบุคคล</h4>
                    <span className="text-muted fs-7">เลือกพนักงานเพื่อกำหนดเวลา/วันทำงานเฉพาะตัว</span>
                </div>
                <div className="card-body pt-4">
                    <div className="row g-5">
                        <div className="col-md-5">
                            <div className="position-relative mb-3">
                                <i className="bi bi-search position-absolute ms-3 fs-5 text-muted" style={{ top: '50%', transform: 'translateY(-50%)' }}></i>
                                <input
                                    className="form-control ps-10"
                                    placeholder="ค้นหาชื่อพนักงาน..."
                                    value={empSearch}
                                    onChange={(e) => { setEmpSearch(e.target.value); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') fetchEmployees(empSearch); }}
                                />
                            </div>
                            <div className="border rounded p-2" style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {employees.length === 0 ? (
                                    <div className="text-muted text-center py-4">ไม่มีข้อมูล</div>
                                ) : employees.map(emp => (
                                    <div
                                        key={emp.employee_id}
                                        className={`p-2 rounded cursor-pointer mb-1 ${selectedEmp?.employee_id === emp.employee_id ? 'bg-light-primary text-primary fw-bold' : 'hover:bg-light'}`}
                                        onClick={() => handleSelectEmployee(emp)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="fs-7 fw-bold">{emp.employee_first_name} {emp.employee_last_name}</div>
                                        <div className="fs-8 text-muted">{emp.citizen_id || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-md-7">
                            {!selectedEmp ? (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-arrow-left fs-2x"></i>
                                    <div className="mt-3">เลือกพนักงานจากรายการด้านซ้าย</div>
                                </div>
                            ) : (
                                <>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div>
                                            <div className="fw-bold fs-5">{selectedEmp.employee_first_name} {selectedEmp.employee_last_name}</div>
                                            <div className={`fs-7 ${override ? 'text-warning' : 'text-muted'}`}>
                                                {override ? 'มี override อยู่' : 'ใช้กะ default'}
                                            </div>
                                        </div>
                                        {override && (
                                            <button className="btn btn-sm btn-light-danger" onClick={handleClearOverride}>
                                                <i className="bi bi-trash me-1"></i>ลบ override
                                            </button>
                                        )}
                                    </div>

                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <label className="fs-7 fw-bold mb-2">เวลาเริ่มงาน</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={overrideForm.start_time}
                                                onChange={(e) => setOverrideForm({ ...overrideForm, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="fs-7 fw-bold mb-2">เวลาเลิกงาน</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={overrideForm.end_time}
                                                onChange={(e) => setOverrideForm({ ...overrideForm, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <label className="fs-7 fw-bold mb-2 d-block">วันทำงาน</label>
                                    <div className="d-flex gap-2 flex-wrap mb-5">
                                        {DAY_TOKENS.map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                className={`btn btn-sm fw-bold ${overrideForm.work_days.includes(d) ? 'btn-primary' : 'btn-light'}`}
                                                style={{ minWidth: 55, borderRadius: 20 }}
                                                onClick={() => toggleOverrideDay(d)}
                                            >
                                                {DAY_LABELS_TH[d]}
                                            </button>
                                        ))}
                                    </div>

                                    <button className="btn btn-primary fw-bold" onClick={handleSaveOverride}>
                                        <i className="bi bi-save2 me-2"></i>บันทึก override
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default ShiftManagement;
