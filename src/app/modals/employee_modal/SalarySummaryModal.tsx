import React from 'react';
import { Modal } from 'react-bootstrap';

interface SalarySummaryModalProps {
    show: boolean;
    onHide: () => void;
    employee: any; 
}

const SalarySummaryModal: React.FC<SalarySummaryModalProps> = ({ show, onHide, employee }) => {
    if (!employee) return null;
    const formatCurrency = (amount: number) => {
        return (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const incomeItems = [
        { label: 'เงินเดือนพื้นฐาน', amount: employee.base_salary || 0 },
        { label: 'ค่าตำแหน่ง', amount: 0 },
        { label: 'เบี้ยขยัน', amount: 0 },
    ];

    const deductionItems = [
        { label: 'ประกันสังคม', amount: 750 },
        { label: 'ภาษี ณ ที่จ่าย', amount: 0 },
        { label: 'สาย/ขาดงาน', amount: 0 },
    ];

    const totalIncome = incomeItems.reduce((acc, item) => acc + item.amount, 0);
    const totalDeduction = deductionItems.reduce((acc, item) => acc + item.amount, 0);
    const netIncome = totalIncome - totalDeduction;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold fs-3">
                    <i className="bi bi-receipt-cutoff me-2 text-primary"></i>
                    รายละเอียดเงินเดือน: <span className="text-gray-800">{employee.employee_first_name} {employee.employee_last_name}</span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-5 pb-10">
                <div className="row g-5">
                    {/* ฝั่งรายได้ */}
                    <div className="col-md-6">
                        <div className="card h-100 border border-dashed border-success bg-light-success bg-opacity-10">
                            <div className="card-header min-h-50px border-0 px-4">
                                <h4 className="card-title fw-bold text-success fs-5">รายได้ (Income)</h4>
                            </div>
                            <div className="card-body p-4 pt-0">
                                {incomeItems.map((item, idx) => (
                                    <div key={idx} className="d-flex justify-content-between mb-3 border-bottom border-gray-300 border-dashed pb-2">
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="fw-bold text-gray-800">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                <div className="d-flex justify-content-between mt-4">
                                    <span className="fw-bold text-success fs-6">รวมรายได้</span>
                                    <span className="fw-bolder text-success fs-5">{formatCurrency(totalIncome)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ฝั่งรายการหัก */}
                    <div className="col-md-6">
                        <div className="card h-100 border border-dashed border-danger bg-light-danger bg-opacity-10">
                            <div className="card-header min-h-50px border-0 px-4">
                                <h4 className="card-title fw-bold text-danger fs-5">รายการหัก (Deduction)</h4>
                            </div>
                            <div className="card-body p-4 pt-0">
                                {deductionItems.map((item, idx) => (
                                    <div key={idx} className="d-flex justify-content-between mb-3 border-bottom border-gray-300 border-dashed pb-2">
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="fw-bold text-danger">-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                <div className="d-flex justify-content-between mt-4">
                                    <span className="fw-bold text-danger fs-6">รวมรายการหัก</span>
                                    <span className="fw-bolder text-danger fs-5">-{formatCurrency(totalDeduction)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* สรุปยอดสุทธิ */}
                <div className="separator separator-dashed my-8"></div>
                
                <div className="d-flex flex-center flex-column">
                    <span className="text-gray-500 fw-bold fs-6 mb-1 text-uppercase tracking-wider">รายได้สุทธิ (Net Income)</span>
                    <div className="d-flex align-items-center">
                        <span className="fs-3x fw-bolder text-primary lh-1">{formatCurrency(netIncome)}</span>
                        <span className="fs-2 fw-bold text-gray-400 ms-2">THB</span>
                    </div>
                </div>

            </Modal.Body>
        </Modal>
    );
};

export default SalarySummaryModal;