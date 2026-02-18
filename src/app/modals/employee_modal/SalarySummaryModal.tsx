import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';

interface Props {
    show: boolean;
    onHide: () => void;
    employee: any;
}

const SalarySummaryModal: React.FC<Props> = ({ show, onHide, employee }) => {
    const [activeTab, setActiveTab] = useState<'income' | 'advance'>('income');

    const formatCurrency = (amount: number) => amount?.toLocaleString('en-US', { minimumFractionDigits: 2 });

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">สรุปรายได้: {employee?.employee_name}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-light-light p-8">
                {/* --- 4 Summary Cards --- */}
                <div className="row g-5 mb-8">
                    {/* ฐานเงินเดือน */}
                    <div className="col-md-6">
                        <div className="card shadow-sm border-0 h-100">
                            <div className="card-body py-4 px-5">
                                <span className="text-gray-500 fw-semibold fs-7 d-block">ฐานเงินเดือน</span>
                                <span className="text-gray-900 fw-bold fs-2">{formatCurrency(employee?.base_salary || 0)} บาท</span>
                            </div>
                        </div>
                    </div>
                    {/* รายได้วิ่งงาน */}
                    <div className="col-md-6">
                        <div className="card shadow-sm border-0 h-100">
                            <div className="card-body py-4 px-5">
                                <span className="text-gray-500 fw-semibold fs-7 d-block">รายได้จากการวิ่งงาน</span>
                                <span className="text-gray-900 fw-bold fs-2">{formatCurrency(employee?.performance_income || 0)} บาท</span>
                            </div>
                        </div>
                    </div>
                    {/* ยอดหัก */}
                    <div className="col-md-6">
                        <div className="card shadow-sm border-0 bg-light-danger h-100">
                            <div className="card-body py-4 px-5">
                                <span className="text-danger fw-semibold fs-7 d-block">ยอดหักทั้งหมด</span>
                                <span className="text-danger fw-bold fs-2">({formatCurrency(employee?.deductions || 0)}) บาท</span>
                            </div>
                        </div>
                    </div>
                    {/* รายได้สุทธิ */}
                    <div className="col-md-6">
                        <div className="card shadow-sm border-0 bg-light-primary h-100">
                            <div className="card-body py-4 px-5">
                                <span className="text-primary fw-semibold fs-7 d-block">รายได้สุทธิ</span>
                                <span className="text-primary fw-bold fs-2">{formatCurrency(employee?.net_income || 0)} บาท</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Tabs --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-header border-0 pt-5">
                        <ul className="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bold">
                            <li className="nav-item mt-2">
                                <button 
                                    className={`nav-link text-active-primary ms-0 me-10 py-5 ${activeTab === 'income' ? 'active' : ''}`} 
                                    onClick={() => setActiveTab('income')}
                                >
                                    รายละเอียดรายรับ
                                </button>
                            </li>
                            <li className="nav-item mt-2">
                                <button 
                                    className={`nav-link text-active-primary ms-0 me-10 py-5 ${activeTab === 'advance' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('advance')}
                                >
                                    รายการเบิกล่วงหน้า
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="card-body">
                        {activeTab === 'income' ? (
                            <div className="d-flex flex-column gap-3">
                                {/* Mock Data Items */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-gray-600 fw-bold">รวมค่าเบี้ยเลี้ยง:</span>
                                    <span className="text-gray-800 fw-bold">0.00 บาท</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-gray-600 fw-bold">รวมค่าเที่ยว:</span>
                                    <span className="text-gray-800 fw-bold">0.00 บาท</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-gray-600 fw-bold">รวมค่าดรอป:</span>
                                    <span className="text-gray-800 fw-bold">0.00 บาท</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                ไม่มีรายการเบิกล่วงหน้า
                            </div>
                        )}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-light" onClick={onHide}>ปิด</button>
            </Modal.Footer>
        </Modal>
    );
};

export default SalarySummaryModal;