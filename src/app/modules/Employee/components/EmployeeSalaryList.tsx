import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAlertModal } from '../../../context/ModalContext'; // สมมติว่ามี
import { useAppLoading } from '../../../context/AppLoadingContext'; // สมมติว่ามี
import SalaryAdjustmentModal from '../../../modals/employee_modal/SalaryAdjustmentModal';
import SalarySummaryModal from '../../../modals/employee_modal/SalarySummaryModal';
interface SalaryRecord {
    id: number;
    employee_code: string;
    employee_name: string;
    trip_count: number;
    base_salary: number;
    performance_income: number;
    deductions: number;
    net_income: number;
}

const EmployeeSalaryList: React.FC = () => {
    // State สำหรับจัดการข้อมูลและการแสดงผล
    const [salaryData, setSalaryData] = useState<SalaryRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>("February 2026");
    const [currentPage, setCurrentPage] = useState<number>(1);

    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<SalaryRecord | null>(null);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<any>(null); // เก็บข้อมูลพนักงานที่ถูกเลือก
    const itemsPerPage = 10;

    const handleOpenSalaryModal = (emp: any) => {
        setSelectedEmp({
            id: emp.id,
            name: `${emp.employee_code} ${emp.employee_name}`,
            currentSalary: emp.base_salary
        });
        setShowSalaryModal(true);
    };
    const handleOpenSummaryModal = (emp: SalaryRecord) => {
        setSelectedEmployee(emp);
        setShowSummaryModal(true);
    };

    // 2. Mock Data (สร้างข้อมูลปลอมให้เหมือนในรูปภาพ)
    useEffect(() => {
        const mockData: SalaryRecord[] = [
            { id: 1, employee_code: "1", employee_name: "900 789", trip_count: 0, base_salary: 89000.00, performance_income: 0.00, deductions: 0.00, net_income: 89000.00 },
            { id: 2, employee_code: "94", employee_name: "tesr 123", trip_count: 0, base_salary: 25000.00, performance_income: 0.00, deductions: 0.00, net_income: 25000.00 },
            { id: 3, employee_code: "95", employee_name: "test test_bank", trip_count: 0, base_salary: 2500.00, performance_income: 0.00, deductions: 0.00, net_income: 2500.00 },
            { id: 4, employee_code: "96", employee_name: "test_siam test_siam", trip_count: 0, base_salary: 0.00, performance_income: 0.00, deductions: 0.00, net_income: 0.00 },
            { id: 5, employee_code: "99", employee_name: "test_siam_2 test_siam_2", trip_count: 0, base_salary: 28000.00, performance_income: 0.00, deductions: 0.00, net_income: 28000.00 },
            { id: 6, employee_code: "2", employee_name: "ทดลองพนักงาน ทดลองพนักงาน", trip_count: 0, base_salary: 0.00, performance_income: 0.00, deductions: 0.00, net_income: 0.00 },
            { id: 7, employee_code: "39", employee_name: "นางสาวสุดารัตน์ จันทราภรณ์", trip_count: 0, base_salary: 10000.00, performance_income: 0.00, deductions: 0.00, net_income: 10000.00 },
            { id: 8, employee_code: "24", employee_name: "นางสาวอะทิตติยา ล้วนสุคนธ์", trip_count: 0, base_salary: 10000.00, performance_income: 0.00, deductions: 0.00, net_income: 10000.00 },
            { id: 9, employee_code: "68", employee_name: "นายกรวิชญ์ ผาดี", trip_count: 0, base_salary: 10000.00, performance_income: 0.00, deductions: 0.00, net_income: 10000.00 },
            { id: 10, employee_code: "71", employee_name: "นายกิตติชัย วงศ์ธรรมนิยม", trip_count: 0, base_salary: 17000.00, performance_income: 0.00, deductions: 0.00, net_income: 17000.00 },
        ];
        setSalaryData(mockData);
    }, []);

    // Helper: จัดรูปแบบตัวเลข (Currency)
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper: จัดรูปแบบยอดหัก (สีแดง + วงเล็บ)
    const renderDeduction = (amount: number) => {
        return (
            <span className="text-danger">
                ({formatCurrency(amount)})
            </span>
        );
    };

    return (
        <div className="card card-flush shadow-sm">
            {/* --- Header Section --- */}
            <div className="card-header align-items-center py-5 gap-2 gap-md-5">
                <div className="card-title">
                    <h3 className="card-label fw-bold fs-3 mb-1">
                        จัดการรายได้สุทธิพนักงาน
                    </h3>
                </div>

                <div className="card-toolbar">
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {/* ปุ่มเลือกเดือน */}
                        <div className="d-flex align-items-center">
                            <button className="btn btn-sm btn-light-primary fw-bold me-2">
                                <i className="bi bi-calendar3 me-1"></i> เลือกเดือน
                            </button>
                            <input
                                type="text"
                                className="form-control form-control-sm form-control-solid w-150px text-center fw-bold"
                                value={selectedMonth}
                                readOnly
                            />
                        </div>

                        {/* ช่องค้นหา */}
                        <div className="d-flex align-items-center position-relative">
                            <span className="svg-icon svg-icon-1 position-absolute ms-4">
                                <i className="bi bi-search fs-3"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control form-control-solid w-250px ps-14"
                                placeholder="ค้นหาจากชื่อพนักงาน..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Body Section (Table) --- */}
            <div className="card-body pt-0">
                <div className="table-responsive">
                    <table className="table align-middle table-row-dashed fs-6 gy-5">
                        <thead>
                            <tr className="text-start text-gray-800 fw-bold fs-7 text-uppercase gs-0 bg-light">
                                <th className="min-w-100px ps-4 rounded-start">รหัสพนักงาน</th>
                                <th className="min-w-200px">ชื่อพนักงาน</th>
                                <th className="min-w-100px text-center">จำนวนเที่ยว</th>
                                <th className="min-w-100px text-end">เงินเดือน</th>
                                <th className="min-w-100px text-end">รายได้วิ่งงาน</th>
                                <th className="min-w-100px text-end">ยอดหัก</th>
                                <th className="min-w-100px text-end">รายได้สุทธิ</th>
                                <th className="min-w-100px text-center rounded-end">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="fw-semibold text-gray-600">
                            {salaryData.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="ps-4">{item.employee_code}</td>
                                    <td>
                                        <span className="text-gray-800 fw-bold">{item.employee_name}</span>
                                    </td>
                                    <td className="text-center">{item.trip_count}</td>
                                    <td className="text-end text-gray-800">{formatCurrency(item.base_salary)}</td>
                                    <td className="text-end text-gray-800">{formatCurrency(item.performance_income)}</td>
                                    <td className="text-end">
                                        {renderDeduction(item.deductions)}
                                    </td>
                                    <td className="text-end">
                                        <span className="text-primary fw-bold fs-6">
                                            {formatCurrency(item.net_income)}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-2">
                                            <button
                                                className="btn btn-icon btn-sm btn-light-primary"
                                                title="รายละเอียดการเงิน"
                                                onClick={() => handleOpenSummaryModal(item)}
                                            >
                                                <i className="bi bi-cash-coin fs-4"></i>
                                            </button>
                                            <button
                                                className="btn btn-icon btn-sm btn-light-warning"
                                                title="ปรับเงินเดือน"
                                                onClick={() => handleOpenSalaryModal(item)}
                                            >
                                                <i className="bi bi-calculator fs-4"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- Footer Section (Pagination) --- */}
                <div className="d-flex flex-stack flex-wrap pt-10">
                    <div className="fs-6 fw-semibold text-gray-700">
                    </div>

                    <div className="d-flex align-items-center">
                        {/* Pagination Items Per Page */}
                        <div className="d-flex align-items-center me-5">
                            <span className="text-muted fw-bold me-2">จำนวนรายการ</span>
                            <select
                                className="form-select form-select-sm form-select-solid w-75px"
                                value={itemsPerPage}
                                onChange={() => { }}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>

                        {/* Pagination Controls */}
                        <ul className="pagination">
                            <li className="page-item previous disabled">
                                <a href="#" className="page-link"><i className="previous"></i></a>
                            </li>
                            <li className="page-item active">
                                <a href="#" className="page-link">1</a>
                            </li>
                            <li className="page-item">
                                <a href="#" className="page-link">2</a>
                            </li>
                            <li className="page-item">
                                <a href="#" className="page-link">3</a>
                            </li>
                            <li className="page-item disabled">
                                <a href="#" className="page-link">...</a>
                            </li>
                            <li className="page-item">
                                <a href="#" className="page-link">9</a>
                            </li>
                            <li className="page-item next">
                                <a href="#" className="page-link"><i className="next"></i></a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            {selectedEmployee && (
                <>
                    <SalaryAdjustmentModal
                        show={showSalaryModal}
                        onHide={() => setShowSalaryModal(false)}
                        employee={selectedEmp}
                    />
                    <SalarySummaryModal
                        show={showSummaryModal}
                        onHide={() => setShowSummaryModal(false)}
                        employee={selectedEmployee}
                    />
                </>
            )}
        </div>
    );
}

export default EmployeeSalaryList;