import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';

interface SalaryAdjustmentModalProps {
    show: boolean;
    onHide: () => void;
    employee: {
        id: number;
        name: string;
        currentSalary: number;
    } | null;
}

const SalaryAdjustmentModal: React.FC<SalaryAdjustmentModalProps> = ({ show, onHide, employee }) => {
    const [percent, setPercent] = useState<string>('');
    const [newSalary, setNewSalary] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState<string>('');

    useEffect(() => {
        if (employee) {
            setNewSalary(employee.currentSalary.toString());
            setPercent('0');
            setReason('');
            setEffectiveDate(new Date().toISOString().split('T')[0]);
        }
    }, [employee, show]);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const handlePercentChange = (val: string) => {
        setPercent(val);
        const p = parseFloat(val);
        if (!isNaN(p) && employee) {
            const calculated = employee.currentSalary * (1 + (p / 100));
            setNewSalary(calculated.toFixed(0));
        } else if (val === '' && employee) {
            setNewSalary(employee.currentSalary.toString());
        }
    };

    const handleNewSalaryChange = (val: string) => {
        setNewSalary(val);
        const n = parseFloat(val);
        if (!isNaN(n) && employee && employee.currentSalary > 0) {
            const p = ((n - employee.currentSalary) / employee.currentSalary) * 100;
            setPercent(p.toFixed(2));
        }
    };

    const handleSave = () => {
        Swal.fire({
            title: 'ยืนยันการปรับเงินเดือน?',
            text: `ปรับเป็น ${parseFloat(newSalary).toLocaleString()} บาท (มีผล ${effectiveDate})`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'ยืนยัน, บันทึกเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire('สำเร็จ!', 'บันทึกการปรับเงินเดือนเรียบร้อย', 'success');
                onHide();
            }
        });
    };

    if (!employee) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
            <Modal.Header className="border-0 pb-0">
                <Modal.Title className="fw-bold fs-3">
                    <i className="bi bi-wallet2 me-2 text-gray-700"></i>
                    จัดการเงินเดือน: <span className="text-primary">{employee.name}</span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-5 pb-10">
                <div className="row g-10">
                    
                    {/* --- ฝั่งซ้าย: ฟอร์มปรับเงินเดือน --- */}
                    <div className="col-lg-5 border-end-lg border-gray-200 pe-lg-10">
                        <h4 className="fw-bold text-gray-800 mb-5">ปรับเงินเดือนใหม่</h4>

                        {/* Hero Card: เงินเดือนปัจจุบัน (Gradient) */}
                        <div 
                            className="rounded-3 p-8 mb-8 text-center position-relative overflow-hidden shadow-sm"
                            style={{ 
                                background: 'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)',
                                border: '1px solid rgba(255,255,255,0.5)'
                            }}
                        >
                            <div className="text-gray-700 fw-bold fs-6 mb-1 text-uppercase tracking-wider" style={{ opacity: 0.7 }}>เงินเดือนปัจจุบัน</div>
                            <div className="text-gray-900 fw-bolder fs-2tx lh-1">
                                {formatCurrency(employee.currentSalary)} 
                                <span className="fs-3 fw-bold ms-2 text-gray-600">บาท</span>
                            </div>
                        </div>

                        {/* Inputs Row */}
                        <div className="row mb-6">
                            <div className="col-5">
                                <label className="form-label fw-bold text-gray-700 fs-7">ปรับขึ้น/ลง (%)</label>
                                <div className="position-relative">
                                    <input 
                                        type="number" 
                                        className="form-control form-control-solid fw-bold pe-8" 
                                        value={percent}
                                        onChange={(e) => handlePercentChange(e.target.value)}
                                        placeholder="0"
                                    />
                                    <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-gray-500 fw-bold">%</span>
                                </div>
                            </div>
                            <div className="col-7">
                                <label className="form-label fw-bold text-gray-700 fs-7 required">ยอดเงินเดือนใหม่</label>
                                <div className="position-relative">
                                    <input 
                                        type="number" 
                                        className="form-control form-control-solid fw-bold pe-8 border-primary" 
                                        value={newSalary}
                                        onChange={(e) => handleNewSalaryChange(e.target.value)}
                                    />
                                    <span className="position-absolute top-50 end-0 translate-middle-y me-3 text-gray-500 fw-bold">฿</span>
                                </div>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="mb-6">
                            <label className="form-label fw-bold text-gray-700 fs-7 required">มีผลตั้งแต่วันที่</label>
                            <input 
                                type="date" 
                                className="form-control form-control-solid" 
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                            />
                        </div>

                        {/* Reason */}
                        <div className="mb-8">
                            <label className="form-label fw-bold text-gray-700 fs-7">หมายเหตุ / เหตุผล</label>
                            <textarea 
                                className="form-control form-control-solid" 
                                rows={3} 
                                placeholder="เช่น ปรับประจำปี, ผ่านโปร, ปรับตำแหน่ง"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            ></textarea>
                        </div>

                        {/* Save Button */}
                        <button 
                            className="btn btn-primary w-100 py-3 fw-bold fs-6 shadow-sm hover-elevate-up" 
                            onClick={handleSave}
                        >
                            <i className="bi bi-save2 me-2"></i> บันทึกการปรับเงินเดือน
                        </button>
                    </div>

                   <div className="col-lg-7 ps-lg-10">
                        <div className="d-flex align-items-center mb-5">
                            <i className="bi bi-clock-history fs-2 text-gray-400 me-3"></i>
                            <h4 className="fw-bold text-gray-800 m-0">ประวัติการเปลี่ยนแปลง</h4>
                        </div>

                        {/* 1. แก้ไข Class Container: เปลี่ยน overflow-auto เป็น overflow-y-auto overflow-x-hidden */}
                        <div className="card card-flush border border-gray-200 border-dashed rounded-3 h-400px bg-light overflow-y-auto overflow-x-hidden">
                            <div className="card-body p-0">
                                {/* 2. Table Header: เปลี่ยนมาใช้ระบบ Grid (row/col) เพื่อความเป๊ะ */}
                                <div className="row fw-bold text-gray-600 fs-7 text-uppercase p-4 border-bottom bg-white sticky-top mx-0">
                                    <div className="col-3">วันที่บังคับใช้</div>
                                    <div className="col-2 text-end">เดิม</div>
                                    <div className="col-2 text-end text-success">ใหม่</div>
                                    <div className="col-3 text-center">หมายเหตุ</div>
                                    <div className="col-2 text-end">ผู้ทำรายการ</div>
                                </div>

                                {/* Empty State */}
                                {/* <div className="d-flex flex-column flex-center h-100 py-10">
                                    <div className="symbol symbol-70px mb-4 bg-white rounded-circle shadow-sm p-4">
                                        <i className="bi bi-folder2-open fs-2x text-gray-300"></i>
                                    </div>
                                    <div className="fw-bold fs-5 text-gray-800 mb-1">ประวัติการเปลี่ยนแปลง</div>
                                    <div className="fw-semibold fs-7 text-gray-400">ยังไม่มีประวัติการปรับเงินเดือนในระบบ</div>
                                </div> */}

                                {/* 3. Mock Data Row (ตัวอย่าง): ใช้ Grid col-* ให้ตรงกับ Header เป๊ะๆ */}
                                <div className="row border-bottom bg-white p-4 fs-7 align-items-center hover:bg-light mx-0">
                                    <div className="col-3 text-gray-800 fw-bold">18/02/2026</div>
                                    <div className="col-2 text-end text-muted text-decoration-line-through">85,000</div>
                                    <div className="col-2 text-end text-success fw-bold">89,000</div>
                                    <div className="col-3 text-center text-gray-600 text-truncate">ผ่านโปร</div>
                                    <div className="col-2 text-end text-primary">Admin</div>
                                </div>
                                <div className="row border-bottom bg-white p-4 fs-7 align-items-center hover:bg-light mx-0">
                                    <div className="col-3 text-gray-800 fw-bold">01/01/2026</div>
                                    <div className="col-2 text-end text-muted text-decoration-line-through">80,000</div>
                                    <div className="col-2 text-end text-success fw-bold">85,000</div>
                                    <div className="col-3 text-center text-gray-600 text-truncate">ปรับประจำปี</div>
                                    <div className="col-2 text-end text-primary">HR</div>
                                </div>
                                
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