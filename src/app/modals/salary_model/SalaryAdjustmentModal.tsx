import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { getEmployeeSalaryHistory, updateEmployeeSalary } from '../../services/employee';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../Add_salary_modal_style.css';
import { validateRequired, validateNonNegativeNumber } from '../../utils/validate_utils';
import { handleCommaNumberInput, formatWithCommas, parseCommaNumber } from '../../utils/input_format_utils';

interface SalaryAdjustmentModalProps {
    show: boolean;
    onHide: () => void;
    employee: {
        id: number;
        name: string;
        currentBase: number;
        currentDay: number;
        currentOt: number;
    } | null;
}

const SalaryAdjustmentModal: React.FC<SalaryAdjustmentModalProps> = ({ show, onHide, employee }) => {
    const [newBase, setNewBase] = useState<string>('');
    const [newDay, setNewDay] = useState<string>('');
    const [newOt, setNewOt] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState<boolean>(false);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        if (employee) {
            setNewBase(formatWithCommas(employee.currentBase || 0));
            setNewDay(formatWithCommas(employee.currentDay || 0));
            setNewOt(formatWithCommas(employee.currentOt || 0));
            setReason('');
            setEffectiveDate(new Date().toISOString().split('T')[0]);
            setErrors({});
            setSelectedDate(null);
        }
    }, [employee, show]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!employee) return setHistory([]);
            setHistoryLoading(true);
            try {
                let monthParam = "";
                if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    monthParam = `${year}-${month}`;
                }

                const res = await getEmployeeSalaryHistory(employee.id, monthParam);

                if (res && res.success && res.data && Array.isArray(res.data.items)) {
                    setHistory(res.data.items);
                } else {
                    setHistory([]);
                }
            } catch (err) {
                console.error('Failed to fetch salary history', err);
                setHistory([]);
            } finally {
                setHistoryLoading(false);
            }
        };

        if (show) {
            fetchHistory();
        }
    }, [employee, selectedDate, show]);

    const formatCurrency = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const onRateChange = (setter: (v: string) => void, errKey: string) => (val: string) => {
        const { displayValue } = handleCommaNumberInput(val);
        setter(displayValue);
        if (errors[errKey]) {
            setErrors(prev => { const next = { ...prev }; delete next[errKey]; return next; });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const baseErr = validateNonNegativeNumber(newBase, 'เงินเดือนฐาน');
        if (baseErr) newErrors.newBase = baseErr;
        const dayErr = validateNonNegativeNumber(newDay, 'ค่าแรงรายวัน');
        if (dayErr) newErrors.newDay = dayErr;
        const otErr = validateNonNegativeNumber(newOt, 'ค่า OT ต่อชั่วโมง');
        if (otErr) newErrors.newOt = otErr;
        const dateErr = validateRequired(effectiveDate, 'วันที่มีผล');
        if (dateErr) newErrors.effectiveDate = dateErr;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) return;
        const nb = parseCommaNumber(newBase);
        const nd = parseCommaNumber(newDay);
        const no = parseCommaNumber(newOt);
        Swal.fire({
            title: 'ยืนยันการปรับค่าตอบแทน?',
            html: `เงินเดือนฐาน: <b>${nb.toLocaleString()}</b> ฿/เดือน<br/>` +
                  `ค่าแรงรายวัน: <b>${nd.toLocaleString()}</b> ฿/วัน<br/>` +
                  `ค่า OT: <b>${no.toLocaleString()}</b> ฿/ชม.<br/>` +
                  `มีผล: ${effectiveDate}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'ยืนยัน, บันทึกเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                (async () => {
                    try {
                        const payload = {
                            new_base_salary: nb,
                            new_day_rate: nd,
                            new_ot_hourly_rate: no,
                            effective_date: `${effectiveDate}T07:00:00`,
                            remark: reason || ''
                        };
                        const res = await updateEmployeeSalary(employee!.id, payload);
                        if (res && res.success) {
                            Swal.fire('สำเร็จ!', 'บันทึกการปรับค่าตอบแทนเรียบร้อย', 'success');
                            onHide();
                        } else {
                            Swal.fire('ผิดพลาด', res?.error || 'ไม่สามารถบันทึกได้', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
                    }
                })();
            }
        });
    };

    const CustomDateInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
        <div className="d-flex align-items-center position-relative" ref={ref}>
            <button
                className="btn btn-sm btn-light-primary fw-bold me-2"
                type="button"
                onClick={onClick}
            >
                <i className="bi bi-calendar3"></i> เลือกเดือน
            </button>
            <input
                type="text"
                className="form-control form-control-sm form-control-lg w-125px text-center fw-bold cursor-pointer"
                value={value || ""}
                readOnly
                placeholder="ดูทั้งหมด"
                onClick={onClick}
            />
        </div>
    ));

    if (!employee) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
            <Modal.Header className="border-0 pb-0" closeButton>
                <Modal.Title className="fw-bold fs-3">
                    <i className="bi bi-wallet2 me-2 text-gray-700"></i>
                    จัดการค่าตอบแทน: <span className="text-primary">{employee.name}</span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-5 pb-10">
                <div className="row g-10">

                    {/* --- ฝั่งซ้าย: ฟอร์มปรับค่าตอบแทน --- */}
                    <div className="col-lg-5 border-end-lg border-gray-200 pe-lg-10">
                        <h4 className="fw-bold text-gray-800 mb-5">ปรับค่าตอบแทนใหม่</h4>

                        <div className="rounded-3 p-5 mb-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)' }}>
                            <div className="row text-center">
                                <div className="col-4">
                                    <div className="text-gray-700 fw-bold fs-8 text-uppercase mb-1" style={{ opacity: 0.7 }}>เงินเดือนฐาน</div>
                                    <div className="text-gray-900 fw-bolder fs-4">{formatCurrency(employee.currentBase)} <span className="fs-8">฿/เดือน</span></div>
                                </div>
                                <div className="col-4">
                                    <div className="text-gray-700 fw-bold fs-8 text-uppercase mb-1" style={{ opacity: 0.7 }}>ค่าแรงรายวัน</div>
                                    <div className="text-gray-900 fw-bolder fs-4">{formatCurrency(employee.currentDay)} <span className="fs-8">฿/วัน</span></div>
                                </div>
                                <div className="col-4">
                                    <div className="text-gray-700 fw-bold fs-8 text-uppercase mb-1" style={{ opacity: 0.7 }}>ค่า OT</div>
                                    <div className="text-gray-900 fw-bolder fs-4">{formatCurrency(employee.currentOt)} <span className="fs-8">฿/ชม.</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-gray-700 fs-7">เงินเดือนฐานใหม่ (บาท/เดือน)</label>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className={`form-control form-control-lg fw-bold pe-8 ${errors.newBase ? "is-invalid" : ""}`}
                                    value={newBase}
                                    onChange={(e) => onRateChange(setNewBase, 'newBase')(e.target.value)}
                                />
                                <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-gray-500 fw-bold">฿</span>
                            </div>
                            {errors.newBase && <div className="invalid-feedback d-block">{errors.newBase}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-gray-700 fs-7">ค่าแรงรายวันใหม่ (บาท/วัน)</label>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className={`form-control form-control-lg fw-bold pe-8 ${errors.newDay ? "is-invalid" : ""}`}
                                    value={newDay}
                                    onChange={(e) => onRateChange(setNewDay, 'newDay')(e.target.value)}
                                />
                                <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-gray-500 fw-bold">฿</span>
                            </div>
                            {errors.newDay && <div className="invalid-feedback d-block">{errors.newDay}</div>}
                        </div>

                        <div className="mb-6">
                            <label className="form-label fw-bold text-gray-700 fs-7">ค่า OT ใหม่ (บาท/ชั่วโมง)</label>
                            <div className="position-relative">
                                <input
                                    type="text"
                                    className={`form-control form-control-lg fw-bold pe-8 ${errors.newOt ? "is-invalid" : ""}`}
                                    value={newOt}
                                    onChange={(e) => onRateChange(setNewOt, 'newOt')(e.target.value)}
                                />
                                <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-gray-500 fw-bold">฿</span>
                            </div>
                            {errors.newOt && <div className="invalid-feedback d-block">{errors.newOt}</div>}
                        </div>

                        <div className="mb-6">
                            <label className="form-label fw-bold text-gray-700 fs-7 required">มีผลตั้งแต่วันที่</label>
                            <input
                                type="date"
                                className={`form-control form-control-lg ${errors.effectiveDate ? "is-invalid" : ""}`}
                                value={effectiveDate}
                                onChange={(e) => { setEffectiveDate(e.target.value); if (errors.effectiveDate) setErrors(prev => { const next = { ...prev }; delete next.effectiveDate; return next; }); }}
                            />
                            {errors.effectiveDate && <div className="invalid-feedback">{errors.effectiveDate}</div>}
                        </div>

                        <div className="mb-8">
                            <label className="form-label fw-bold text-gray-700 fs-7">หมายเหตุ / เหตุผล</label>
                            <textarea className="form-control form-control-lg" rows={3} placeholder="เช่น ปรับประจำปี, ผ่านโปร, ปรับตำแหน่ง" value={reason} onChange={(e) => setReason(e.target.value)}></textarea>
                        </div>

                        <button className="btn btn-primary w-100 py-3 fw-bold fs-6 shadow-sm hover-elevate-up" onClick={handleSave}>
                            <i className="bi bi-save2 me-2"></i> บันทึกการปรับค่าตอบแทน
                        </button>
                    </div>

                    {/* --- ฝั่งขวา: ประวัติการเปลี่ยนแปลง --- */}
                    <div className="col-lg-7 ps-lg-10">
                        <div className="d-flex justify-content-between align-items-center mb-5">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-clock-history fs-2 text-gray-400 me-3"></i>
                                <h4 className="fw-bold text-gray-800 m-0">ประวัติการเปลี่ยนแปลง</h4>
                            </div>
                            <div style={{ zIndex: 99 }}>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    dateFormat="MMMM yyyy"
                                    showMonthYearPicker
                                    customInput={<CustomDateInput />}
                                    isClearable
                                    portalId="root"
                                />
                            </div>
                        </div>

                        <div className="card card-flush border border-gray-200 border-dashed rounded-3 h-450px bg-light overflow-y-auto overflow-x-hidden">
                            <div className="card-body p-0">
                                <div className="row fw-bold text-gray-600 fs-8 text-uppercase p-3 border-bottom bg-white sticky-top mx-0">
                                    <div className="col-2">วันที่</div>
                                    <div className="col-2 text-end">ฐานเดิม / ใหม่</div>
                                    <div className="col-2 text-end">รายวันเดิม / ใหม่</div>
                                    <div className="col-2 text-end">OT เดิม / ใหม่</div>
                                    <div className="col-2 text-center">หมายเหตุ</div>
                                    <div className="col-2 text-end">ผู้ทำรายการ</div>
                                </div>

                                {historyLoading ? (
                                    <div className="d-flex justify-content-center p-6">
                                        <span className="spinner-border text-primary"></span>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="d-flex flex-column flex-center h-100 py-10">
                                        <div className="fw-bold fs-5 text-gray-800 mb-1">ไม่พบประวัติ</div>
                                        <div className="fw-semibold fs-7 text-gray-400">
                                            {selectedDate ? "ไม่มีการปรับค่าตอบแทนในเดือนที่เลือก" : "ยังไม่มีประวัติการปรับค่าตอบแทน"}
                                        </div>
                                    </div>
                                ) : (
                                    history.map((h, idx) => (
                                        <div key={h.salary_history_id || idx} className="row border-bottom bg-white p-3 fs-8 align-items-center hover:bg-light mx-0">
                                            <div className="col-2 text-gray-800 fw-bold">{new Date(h.effective_date).toLocaleDateString('th-TH')}</div>
                                            <div className="col-2 text-end">
                                                <div className="text-muted text-decoration-line-through">{(h.old_base_salary || 0).toLocaleString()}</div>
                                                <div className="text-success fw-bold">{(h.new_base_salary || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="col-2 text-end">
                                                <div className="text-muted text-decoration-line-through">{(h.old_day_rate || 0).toLocaleString()}</div>
                                                <div className="text-success fw-bold">{(h.new_day_rate || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="col-2 text-end">
                                                <div className="text-muted text-decoration-line-through">{(h.old_ot_hourly_rate || 0).toLocaleString()}</div>
                                                <div className="text-success fw-bold">{(h.new_ot_hourly_rate || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="col-2 text-center text-gray-600 text-truncate">{h.remark || '-'}</div>
                                            <div className="col-2 text-end text-primary">{h.updated_by || '-'}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0">
                <button className="btn btn-light btn-active-light-primary fw-bold" onClick={onHide}>
                    ปิดหน้าต่าง
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default SalaryAdjustmentModal;
