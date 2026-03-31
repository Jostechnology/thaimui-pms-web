import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAlertModal } from '../../../context/ModalContext';
import { getWorkOrderList } from '../../../services/workorder';
import { useTableParams } from '../../../hooks/useTableParams';
import { useSearchParams } from 'react-router-dom';
import TablePaginator from '../../../custom_components/TablePaginator'; // สมมติว่ามี Component นี้อยู่แล้ว
import { WorkOrderStatusEnum } from '../../../type_interface/WorkOrderType';
import DatePicker from "react-datepicker";
// 1. ปรับ Interface ให้ตรงกับข้อมูลจริงใน ER Diagram
interface WorkRunSummary {
    work_run_id: number;
    status: string;
    quantity: number;
    current_phase_id: number | null;
}

interface WorkorderData {
    work_order_id: number;
    doc_num: string;
    quantity: number;
    sales_item: {
        item_name: string;
        item_description: string;
    } | null;
    status: string;
    created_date: string;
    work_runs: WorkRunSummary[];
}

const WorkorderList: React.FC = () => {
    const navigate = useNavigate();
    const [workorders, setWorkorders] = useState<WorkorderData[]>([]);
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
    const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") || "");

    const normalizeStatusKey = (s?: string | null) => {
        if (!s) return '';
        const str = s.toString();
        if (/[ก-๙]/.test(str)) {
            if (str.includes('พร้อม')) return 'READY';
            if (str.includes('กำลัง') || str.includes('ดำเนิน') || str.includes('ดําเนิน')) return 'INPROGRESS';
            if (str.includes('เสร็จ')) return 'COMPLETED';
            return str.toUpperCase().replace(/\s+/g, '_');
        }
        return str.toUpperCase().replace(/\s+/g, '_');
    };

    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const statusThaiMap: Record<string, string> = {
        READY: 'พร้อม',
        INPROGRESS: 'กำลังดำเนินงาน',
        WAIT_TEST: 'รอทดสอบ',
        TESTING: 'กำลังทดสอบ',
        COMPLETED: 'เสร็จสิ้น'
    };

    const phaseStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        PAUSED: 'ระงับ/หยุดชั่วคราว',
        COMPLETED: 'เสร็จสิ้น'
    };

    const workingCount = workorders.filter(w => normalizeStatusKey(w.status) === 'INPROGRESS').length;
    const COMPLETEDCount = workorders.filter(w => normalizeStatusKey(w.status) === 'COMPLETED').length;
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
                className="form-control form-control-sm form-control-solid w-150px text-center fw-bold cursor-pointer ms-2"
                value={value}
                readOnly
                placeholder="ทุกเดือน"
            />
        </div>
    ));
    const fetchWorkorders = async () => {
        setDataLoading(true);
        setLoading();
        try {
            let monthParam = "";
            if (selectedDate) {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                monthParam = `${year}-${month}`;
            }
            const result = await getWorkOrderList(currentPage, pageConfig, keyword, statusFilter, monthParam);
            if (result && result.success) {
                // SERVER MAY NOT APPLY FILTER — apply client-side fallback filter
                let items = result.data.items || [];
                const filterParam = normalizeStatusKey(statusFilter) || '';
                if (filterParam) {
                    items = items.filter((it: any) => normalizeStatusKey(it.status) === filterParam);
                }
                setWorkorders(items);
                setTotalPages(result.pagination?.pages ?? 0);
            } else {
                setWorkorders([]);
                setTotalPages(0);
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
        fetchWorkorders();
    }, [currentPage, keyword, pageConfig, statusFilter, selectedDate]);

    const getStatusBadge = (status: string) => {
        const display = statusThaiMap[status] || (status || '').toString().normalize('NFC');
        if (display.includes('เสร็จ')) {
            return 'badge-light-success';
        }
        if (/ก.*ลัง/.test(display) || /ด.*เนิน/.test(display)) {
            return 'badge-light-warning';
        }
        if (display.includes('พร้อม')) {
            return 'badge-light-primary';
        }
        return 'badge-light-secondary';
    };

    const getPhaseBadge = (status: string) => {
        const display = phaseStatusThaiMap[status] || (status || '').toString().normalize('NFC');
        if (display.includes('เสร็จ')) {
            return 'badge-light-success';
        }
        if (/ก.*ลัง/.test(display) || /ดำเนิน/.test(display)) {
            return 'badge-light-warning';
        }
        if (display.includes('ระงับ') || display.includes('หยุด')) {
            return 'badge-light-dark';
        }
        if (display.includes('รอ')) {
            return 'badge-light-secondary';
        }
        return 'badge-light-secondary';
    };

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>ใบสั่งผลิต</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการและติดตามกระบวนการผลิตทั้งหมดในระบบ</span>
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button
                        className='btn btn-primary fw-bold px-6 shadow-sm'
                        onClick={() => navigate('/workorder/workorders_create')}
                    >
                        <i className='bi bi-plus-lg me-2 fs-4'></i> สร้างใบสั่งผลิต
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
                                    <i className='bi bi-list-task text-primary fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{workorders.length}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>รายการคำสั่งทั้งหมด</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Working Orders  */}
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white hover-elevate-up transition-300'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-warning'>
                                    <i className='bi bi-gear-wide-connected text-warning fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{workingCount}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>กำลังดำเนินงาน</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: COMPLETED Orders */}
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white hover-elevate-up transition-300'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-success'>
                                    <i className='bi bi-check-circle-fill text-success fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{COMPLETEDCount}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>เสร็จสิ้น</span>
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
                                className='form-control form-control-solid w-250px ps-12'
                                placeholder='ค้นหาจากรหัสใบสั่งผลิต'
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
                        <select
                            className='form-select form-select-solid w-150px'
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value=''>สถานะทั้งหมด</option>
                            {Object.values(WorkOrderStatusEnum).map((value) => (
                                <option key={value} value={value}>
                                    {statusThaiMap[value] || value}
                                </option>
                            ))}
                        </select>

                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-100px'>รหัสใบสั่งผลิต</th>
                                    <th className='min-w-125px'>สินค้า</th>
                                    <th className='min-w-100px'>รายละเอียด</th>
                                    <th className='min-w-125px text-center'>วันที่สร้าง</th>
                                    <th className='min-w-125px text-center'>สถานะ</th>
                                    <th className='text-end min-w-50px'>จัดการใบสั่งผลิต</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={6} className='text-center p-20'>
                                            <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                            <span className="ms-3 text-gray-500">กำลังดึงข้อมูล...</span>
                                        </td>
                                    </tr>
                                ) : workorders.length > 0 ? (
                                    workorders.map((item, index) => (
                                        <tr key={index} className="hover:bg-light-primary transition-all">
                                            <td className='text-center'>
                                                <div className="d-flex align-items-center">
                                                    <span className='text-gray-800 fw-bold fs-6'>{item.work_order_code}</span>
                                                </div>
                                            </td>

                                            <td className='text-start'>
                                                    <span className='text-gray-800 fw-bold text-hover-primary fs-6'>
                                                        {item.sales_item?.item_name || 'N/A'}
                                                    </span>
                                            </td>

                                            <td className='text-center'>
                                                <div className="d-flex align-items-center">
                                                    <span className='text-muted fs-7 text-truncate' style={{ maxWidth: '180px' }}>
                                                        {item.sales_item?.item_description || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className='text-center'>
                                                <span className="text-gray-700 fw-bold">
                                                    {item.created_date ? new Date(item.created_date).toLocaleDateString('th-TH', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    }) : '-'}
                                                </span>
                                            </td>

                                            <td className='text-center'>
                                                <span className={`badge ${getStatusBadge(item.status)} fw-bold px-4 py-3`}>
                                                    {statusThaiMap[item.status] || item.status || 'Waiting'}
                                                </span>
                                            </td>

                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-info me-1'
                                                    title="View Order"
                                                    onClick={() => navigate(`/workorder/workorders_view/${item.work_order_id}`)}
                                                >
                                                    <i className='bi bi-eye fs-3'></i>
                                                </button>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-primary me-1'
                                                    title="Manage Order"
                                                    onClick={() => navigate(`/workorder/workorders_detail/${item.work_order_id}`)}
                                                >
                                                    <i className='bi bi-gear fs-3'></i>
                                                </button>
                                            </td>
                                            
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className='text-center p-20'>
                                            <div className='d-flex flex-column flex-center'>
                                                <i className='bi bi-search fs-3x text-gray-300 mb-4'></i>
                                                <span className='text-gray-500'>ไม่พบข้อมูลใบสั่งผลิตในระบบ</span>
                                            </div>
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

export default WorkorderList;