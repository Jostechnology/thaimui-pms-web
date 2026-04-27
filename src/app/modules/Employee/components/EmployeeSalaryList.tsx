import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useSearchParams } from 'react-router-dom';
import { useAlertModal } from '../../../context/ModalContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import SalaryAdjustmentModal from '../../../modals/salary_model/SalaryAdjustmentModal';
import SalarySummaryModal from '../../../modals/salary_model/SalarySummaryModal';
import { EmployeeStatus, EmployeeStatusLabel } from '../../../type_interface/EmployeeType';
import { getEmployeeSalaryList } from '../../../services/employee';

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
    const { setLoading, setUnLoading } = useAppLoading();
    const [searchParams] = useSearchParams();

    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(0);

    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
    const [keyword, setKeyword] = useState<string>(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get('page') || '1'));
    const [pageConfig, setPageConfig] = useState<number>(parseInt(searchParams.get('pageConfig') || '10'));

    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState<any>(null);

    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        setPageConfig,
        keyword,
        setKeyword,
        setSearchTerm,
    });

    const fetchData = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const res = await getEmployeeSalaryList(currentPage, pageConfig, keyword);
            if (res && res.success && res.data && res.data.items) {
                setEmployees(res.data.items);
                setTotalPages(res.pagination?.pages ?? 0);
            } else {
                setEmployees([]);
                setTotalPages(0);
            }
        } catch (error) {
            console.error(error);
            setEmployees([]);
            setTotalPages(0);
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentPage, pageConfig, keyword]);

    const handleOpenAdjustModal = (emp: EmployeeData) => {
        setSelectedEmp(emp);
        setShowAdjustModal(true);
    };

    const formatCurrency = (amount: number | undefined | null) => {
        return (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getThaiStatus = (status?: string | null) => {
        if (!status) return '-';
        if ((EmployeeStatusLabel as any)[status]) return (EmployeeStatusLabel as any)[status];
        if ((EmployeeStatus as any)[status]) {
            const enumValue = (EmployeeStatus as any)[status];
            return (EmployeeStatusLabel as any)[enumValue] || enumValue;
        }
        const found = Object.values(EmployeeStatus).find((v: string) => v.toLowerCase() === status.toLowerCase());
        if (found) return (EmployeeStatusLabel as any)[found] || found;
        return status;
    };

    return (
        <Content>
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>จัดการรายได้สุทธิพนักงาน</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการข้อมูลเงินเดือนพนักงานทั้งหมดในระบบ</span>
                </div>
            </div>
        <div className="card card-flush shadow-sm">
            <div className="card-header align-items-center py-5 gap-2 gap-md-5">
                <div className="card-toolbar">
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <div className="d-flex align-items-center position-relative">
                            <span className="svg-icon svg-icon-1 position-absolute ms-4">
                                <i className="bi bi-search fs-3"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control form-control-lg w-250px ps-14"
                                placeholder="ค้นหาจากชื่อพนักงาน..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>
                </div>
            </div>

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
                            {dataLoading ? (
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
                                        <td className="text-success fw-bold fs-6">
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

                <div className="d-flex flex-stack flex-wrap pt-10">
                    <div className="d-flex align-items-center me-5">
                        <span className="text-muted fw-bold me-2">จำนวนรายการ</span>
                        <select
                            className="form-select form-select-sm form-select-solid w-75px"
                            value={pageConfig}
                            onChange={(e) => { setPageConfig(Number(e.target.value)); setCurrentPage(1); }}
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                    <TablePaginator
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                    />
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
        </Content>
    );
}

export default EmployeeSalaryList;
