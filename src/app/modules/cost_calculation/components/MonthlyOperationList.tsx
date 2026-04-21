import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { useTableParams } from '../../../hooks/useTableParams';
import { deleteOperationCostMonthly, getOperationCostMonthly } from '../../../services/costCalculation';
import TablePaginator from '../../../custom_components/TablePaginator';
import Swal from 'sweetalert2';


const MonthlyOperationList: React.FC = () => {
    const navigate = useNavigate();
    const [operationCosts, setOperationCosts] = useState<OperationCostData[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const { setLoading, setUnLoading } = useAppLoading();
    const [totalPages, setTotalPages] = useState<number>(0);
    const { alertMessage } = useAlertModal();
    const [searchParams] = useSearchParams();

    // Table Params
    const [keyword, setKeyword] = useState<string>(searchParams.get("search") || "");
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get("pageConfig") || "10"));
    const prevKeywordRef = useRef(keyword);
    const prevPageConfigRef = useRef(pageConfig);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        keyword,
        setKeyword,
        setPageConfig,
        setSearchTerm
    });

    const CustomDateInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
        <div className="d-flex align-items-center position-relative" onClick={onClick} ref={ref}>
            <button className="btn btn-sm btn-light-primary fw-bold" type="button">
                <i className="bi bi-calendar3"></i>
            </button>
            <input
                type="text"
                className="form-control form-control-sm form-control-lg w-150px text-center fw-bold cursor-pointer ms-2"
                value={value}
                readOnly
                placeholder="ทุกเดือน"
            />
        </div>
    ));

    // Build month string from selectedDate (e.g. "2026-03")
    const getMonthParam = (): string => {
        if (!selectedDate) return "";
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    };

    const fetchOperationCosts = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const monthParam = getMonthParam();
            const result = await getOperationCostMonthly(currentPage, pageConfig, keyword, monthParam);
            if (result && result.success) {
                const items = result.data.items || [];
                setOperationCosts(items);
                setTotalPages(result.data.total_pages || 0);
            } else {
                setOperationCosts([]);
                setTotalPages(0);
                alertMessage(result?.message || "ไม่สามารถดึงข้อมูลได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (prevKeywordRef.current !== keyword || prevPageConfigRef.current !== pageConfig) {
            prevKeywordRef.current = keyword;
            prevPageConfigRef.current = pageConfig;
            if (currentPage !== 1) {
                setCurrentPage(1);
                return;
            }
        }
        fetchOperationCosts();
    }, [currentPage, keyword, pageConfig, selectedDate]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2
        }).format(value);
    };

    const calculateTotalCost = (item: OperationCostData) => {
        return (
            (item.depreciation_building_cost || 0) +
            (item.depreciation_util_cost || 0) +
            (item.office_rent_cost || 0) +
            (item.office_supplies_cost || 0) +
            (item.water_cost || 0) +
            (item.electricity_cost || 0) +
            (item.utility_cost || 0)
        );
    };

    const totalAllCosts = operationCosts.reduce(
        (sum, item) => sum + calculateTotalCost(item),
        0
    );
    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบ?",
            text: "คุณต้องการลบการคำนวณต้นทุนนี้หรือไม่?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
        });

        if (result.isConfirmed) {
            setLoading();
            try {
                const res = await deleteOperationCostMonthly(id);
                if (res.success) {
                    Swal.fire("สำเร็จ!", "ลบการคำนวณต้นทุนเรียบร้อยแล้ว", "success");
                    fetchOperationCosts();
                } else {
                    Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถลบข้อมูลได้", "error");
                }
            } catch (error) {
                Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
            } finally {
                setUnLoading();
            }
        }
    };

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>Monthly Operation Costs</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการและติดตามต้นทุนการบริหารรายเดือน</span>
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button
                        className='btn btn-primary fw-bold px-6 shadow-sm'
                        onClick={() => navigate('/cost_calculation/create')}
                    >
                        <i className='bi bi-plus-lg me-2 fs-4'></i> Create Cost
                    </button>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className='row g-5 g-xl-10 mb-10'>
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white hover-elevate-up transition-300'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-primary'>
                                    <i className='bi bi-collection text-primary fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{operationCosts.length}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>รายการต้นทุน</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white hover-elevate-up transition-300'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-warning'>
                                    <i className='bi bi-calculator text-warning fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{formatCurrency(totalAllCosts)}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>ต้นทุนรวมทั้งหมด</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white hover-elevate-up transition-300'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-success'>
                                    <i className='bi bi-graph-up text-success fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>
                                    {operationCosts.length > 0 ? formatCurrency(totalAllCosts / operationCosts.length) : formatCurrency(0)}
                                </span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>ต้นทุนเฉลี่ย</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='card card-flush shadow-sm border-0'>
                <div className='card-header align-items-center py-5 gap-2 gap-md-5'>
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-4'>
                                <span className='path1'></span><span className='path2'></span>
                            </i>
                            <input
                                type='text'
                                className='form-control form-control-lg w-250px ps-12'
                                placeholder='ค้นหาจากวันที่'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>

                    <div className='card-toolbar d-flex align-items-center gap-3'>
                        <div>
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date) => {
                                    setSelectedDate(date);
                                    setCurrentPage(1);
                                }}
                                dateFormat="MMMM yyyy"
                                showMonthYearPicker
                                customInput={<CustomDateInput />}
                                isClearable
                                placeholderText="เลือกเดือน"
                            />
                        </div>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-125px text-center'>วันที่</th>
                                    <th className='min-w-100px text-center'>ค่าเสื่อมอาคาร</th>
                                    <th className='min-w-100px text-center'>ค่าเสื่อมอุปกรณ์</th>
                                    <th className='min-w-100px text-center'>ค่าเช่าสำนักงาน</th>
                                    <th className='min-w-100px text-center'>ค่าวัสดุสำนักงาน</th>
                                    <th className='min-w-100px text-center'>ค่าน้ำ</th>
                                    <th className='min-w-100px text-center'>ค่าไฟฟ้า</th>
                                    <th className='min-w-100px text-center'>ค่าใช้จ่ายอื่นๆ</th>
                                    <th className='min-w-125px text-center'>รวมทั้งสิ้น</th>
                                    <th className='text-end min-w-50px'>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={10} className='text-center p-20'>
                                            <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                            <span className="ms-3 text-gray-500">กำลังดึงข้อมูล...</span>
                                        </td>
                                    </tr>
                                ) : operationCosts.length > 0 ? (
                                    operationCosts.map((item, index) => (
                                        <tr key={index} className="hover:bg-light-primary transition-all">
                                            <td className='text-center'>
                                                <span className="text-gray-700 fw-bold">
                                                    {new Date(item.operation_cost_date).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.depreciation_building_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.depreciation_util_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.office_rent_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.office_supplies_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.water_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.electricity_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="text-gray-700">
                                                    {formatCurrency(item.utility_cost || 0)}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className="badge badge-light-primary fw-bold px-4 py-3">
                                                    {formatCurrency(calculateTotalCost(item))}
                                                </span>
                                            </td>
                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-sm btn-light-info fw-bold me-2'
                                                    onClick={() => navigate(`/cost_calculation/view/${item.operation_cost_monthly_id}`)}
                                                    title="ดูรายละเอียด"
                                                >
                                                    <i className='bi bi-eye fs-5'></i>
                                                </button>
                                                <button
                                                    className='btn btn-sm btn-light-primary fw-bold me-2'
                                                    onClick={() => navigate(`/cost_calculation/edit/${item.operation_cost_monthly_id}`)}
                                                    title="แก้ไข"
                                                >
                                                    <i className='bi bi-pencil-square fs-5'></i>
                                                </button>
                                                <button
                                                    className='btn btn-sm btn-light-danger fw-bold'
                                                    onClick={() => {
                                                        handleDelete(item.operation_cost_monthly_id!);
                                                    }}
                                                    title="ลบ"
                                                >
                                                    <i className='bi bi-trash-fill fs-5'></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className='text-center p-20'>
                                            <span className="text-gray-500">ไม่มีข้อมูล</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className='d-flex flex-stack flex-wrap pt-10'>
                        <div className='fs-6 fw-semibold text-gray-700'>
                            {/* แสดงข้อความจำนวนรายการถ้าต้องการ */}
                        </div>
                        <TablePaginator
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            totalPages={totalPages}
                        />
                    </div>
                </div>
            </div>
        </Content>
    );
}

export default MonthlyOperationList;