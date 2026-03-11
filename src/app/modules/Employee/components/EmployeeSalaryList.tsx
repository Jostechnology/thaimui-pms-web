import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAlertModal } from '../../../context/ModalContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import SalaryAdjustmentModal from '../../../modals/salary_model/SalaryAdjustmentModal';
import SalarySummaryModal from '../../../modals/salary_model/SalarySummaryModal';
import { EmployeeStatus, EmployeeStatusLabel } from '../../../type_interface/EmployeeType';
import { getEmployeeSalaryList } from '../../../services/employee';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Interface ของข้อมูลพนักงาน (รองรับฟิลด์ต่างๆ ที่ระบบอาจส่งมา)
export interface EmployeeData {
    employee_id: number;
    employee_first_name: string;
    employee_last_name: string;
    citizen_id?: string;
    email?: string;
    phone_number?: string;
    address?: string | null;
    status?: string;
    is_active?: boolean;
    user_id?: number;
    base_salary?: number;
    salary_base?: number;
}

const EmployeeSalaryList: React.FC = () => {
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);

    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const [selectedEmp, setSelectedEmp] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // let monthParam = "";
            // if (selectedDate) {
            //     const year = selectedDate.getFullYear();
            //     const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            //     monthParam = `${year}-${month}`;
            // }
            const res = await getEmployeeSalaryList(searchTerm);
            if (res && res.success && res.data && res.data.items) {
                setEmployees(res.data.items);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error(error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedDate]);

    const handleOpenAdjustModal = (emp: EmployeeData) => {
        // เปิดโมดอลเพื่อปรับเงินเดือน (บันทึก employee สำหรับส่งเข้า modal)
        console.log("เปิดโมดอลปรับเงินเดือน:", emp);
        setSelectedEmp(emp);
        setShowAdjustModal(true);
    };
    // ฟังก์ชันตัวอย่างสำหรับเปิดหน้าสรุป (ยังไม่ใช้งาน)
    // const handleOpenSummaryModal = (emp: EmployeeData) => {
    //     console.log("เปิดหน้าสรุปเงินเดือน:", emp);
    //     setSelectedEmp(emp);
    //     setShowSummaryModal(true);
    // };
    // ตัวอย่าง custom input ของ DatePicker (ยังคงเป็นคอมเมนต์)
    // const CustomDateInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
    //     <div className="d-flex align-items-center position-relative my-1" onClick={onClick} ref={ref}>
    //         <button className="btn btn-sm btn-light-primary fw-bold me-2">
    //             <i className="bi bi-calendar3 me-1"></i> เลือกเดือน
    //         </button>
    //         <input
    //             type="text"
    //             className="form-control form-control-sm form-control-solid w-150px text-center fw-bold cursor-pointer"
    //             value={value}
    //             readOnly
    //             placeholder="เลือกเดือน"
    //         />
    //     </div>
    // ));

    const formatCurrency = (amount: number | undefined | null) => {
        return (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getThaiStatus = (status?: string | null) => {
        if (!status) return '-';
        // กรณี backend ส่งค่าเป็นชื่อค่า enum ตัวอย่าง: 'UNEMPLOYED'
        if ((EmployeeStatusLabel as any)[status]) return (EmployeeStatusLabel as any)[status];
        // กรณี backend ส่งค่าเป็นคีย์ของ enum เช่น 'UNEMPLOYED'
        if ((EmployeeStatus as any)[status]) {
            const enumValue = (EmployeeStatus as any)[status];
            return (EmployeeStatusLabel as any)[enumValue] || enumValue;
        }
        // ลองจับคู่แบบไม่สนตัวพิมพ์ (case-insensitive) กับค่า enum
        const found = Object.values(EmployeeStatus).find((v: string) => v.toLowerCase() === status.toLowerCase());
        if (found) return (EmployeeStatusLabel as any)[found] || found;
        return status;
    };

    return (
        <div className="card card-flush shadow-sm">
            <div className="card-header align-items-center py-5 gap-2 gap-md-5">
                <div className="card-title">
                    <h3 className="card-label fw-bold fs-3 mb-1">
                        จัดการรายได้สุทธิพนักงาน
                    </h3>
                </div>

                <div className="card-toolbar">
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {/* <div className="d-flex align-items-center">
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date) => setSelectedDate(date)}
                                dateFormat="MMMM yyyy" // Display format: "February 2026"
                                showMonthYearPicker // Show only month and year
                                customInput={<CustomDateInput />}
                            />
                        </div> */}

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
                                <th className="min-w-100px">ชื่อพนักงาน</th>
                                <th className="min-w-100px">เงินเดือน</th>
                                <th className="min-w-100px text-center rounded-end">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="fw-semibold text-gray-600">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10">
                                        <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : employees.length > 0 ? (
                                employees.map((item) => (
                                    <tr key={item.employee_id} className="hover:bg-light-primary transition-all">
                                        <td className="ps-4 text-gray-800 fw-bold">{item.employee_id}</td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="symbol symbol-35px me-3">
                                                    <span className="symbol-label bg-light-primary text-primary fw-bold">
                                                        {item.employee_first_name ? item.employee_first_name.charAt(0) : '-'}
                                                    </span>
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <span className="text-gray-800 fw-bold">
                                                        {item.employee_first_name} {item.employee_last_name}
                                                    </span>
                                                    <span className="text-muted fs-8">
                                                        {getThaiStatus(item.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className=" text-success fw-bold fs-6">
                                            {formatCurrency(item.base_salary || item.salary_base)}
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <button
                                                    className="btn btn-icon btn-sm btn-light-warning shadow-sm"
                                                    title="ปรับเงินเดือน"
                                                    onClick={() => handleOpenAdjustModal(item)}
                                                >
                                                    <i className="bi bi-calculator fs-4"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-muted">
                                        ไม่พบข้อมูลพนักงาน
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- Footer Section (Pagination) --- */}
                <div className="d-flex flex-stack flex-wrap pt-10">
                    <div className="fs-6 fw-semibold text-gray-700"></div>

                    <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center me-5">
                            <span className="text-muted fw-bold me-2">จำนวนรายการ</span>
                            <select
                                className="form-select form-select-sm form-select-solid w-75px"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>

                        <ul className="pagination">
                            <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><i className="previous"></i></button>
                            </li>
                            <li className="page-item active">
                                <a href="#" className="page-link">{currentPage}</a>
                            </li>
                            <li className="page-item next">
                                <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><i className="next"></i></button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <SalaryAdjustmentModal
                show={showAdjustModal}
                onHide={() => {
                    setShowAdjustModal(false);
                    fetchData();
                }}
                employee={selectedEmp ? {
                    id: selectedEmp.employee_id,
                    name: `${selectedEmp.employee_first_name} ${selectedEmp.employee_last_name}`,
                    currentSalary: selectedEmp.base_salary || selectedEmp.salary_base || 0
                } : null}
            />
            <SalarySummaryModal
                show={showSummaryModal}
                onHide={() => setShowSummaryModal(false)}
                employee={selectedEmp}
            />
        </div>
    );
}

export default EmployeeSalaryList;