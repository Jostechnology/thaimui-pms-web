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

// 1. ปรับ Interface ให้ตรงกับข้อมูลจริงใน ER Diagram
interface WorkorderData {
    work_order_id: number;
    doc_num: string;
    status: string;
    created_date: string;
    current_phase: {
        work_phase_id: number;
        phase_name: string;
        phase_status: string;
        start_date: string;
        end_date: string | null;
        employee_list: any[];
        sales_item_list: any[];
    } | null;
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


    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        keyword,
        setKeyword,
        setPageConfig,
        setSearchTerm
    });

    const fetchWorkorders = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getWorkOrderList(currentPage, pageConfig, keyword);
            if (result && result.success) {
                setWorkorders(result.data.items);
                setTotalPages(result.data.total_pages);
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
    }, [currentPage, keyword, pageConfig]);

    // Helper: ฟังก์ชันเลือกสี Badge ตามสถานะ
    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'finished' || s === 'completed') return 'badge-light-success';
        if (s === 'working' || s === 'picking') return 'badge-light-warning';
        if (s === 'designing') return 'badge-light-primary';
        return 'badge-light-secondary';
    };

    return (
    <Content>
        {/* Header Section */}
        <div className='d-flex flex-stack mb-10'>
            <div className='d-flex flex-column'>
                <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>Work Orders</h1>
                <span className='text-muted fw-semibold fs-6'>จัดการและติดตามกระบวนการผลิตทั้งหมดในระบบ</span>
            </div>
            <div className='d-flex align-items-center gap-2'>
                <button 
                    className='btn btn-primary fw-bold px-6 shadow-sm' 
                    onClick={() => Swal.fire('สร้างใบสั่งงาน', 'เตรียมเปิดฟอร์ม...', 'success')}
                >
                    <i className='bi bi-plus-lg me-2 fs-4'></i> Create Order
                </button>
            </div>
        </div>

        {/* KPI Cards Section */}
        <div className='row g-5 g-xl-10 mb-10'>
            <div className='col-md-4'>
                <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                    <div className='d-flex align-items-center'>
                        <div className='symbol symbol-50px me-5'>
                            <span className='symbol-label bg-light-primary'>
                                <i className='bi bi-list-task text-primary fs-2x'></i>
                            </span>
                        </div>
                        <div className='d-flex flex-column'>
                            <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{workorders.length}</span>
                            <span className='text-gray-500 fw-semibold fs-6 mt-1'>Active on current page</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Table Management Card */}
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
                            placeholder='Search by DocNum...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                        />
                    </div>
                </div>
            </div>

            <div className='card-body pt-0'>
                <div className='table-responsive'>
                    <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                        <thead>
                            <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                <th className='min-w-150px'>DOCNUM</th>
                                <th className='min-w-200px'>PRODUCT & DETAIL</th>
                                <th className='min-w-150px text-center'>CURRENT PHASE</th>
                                <th className='min-w-125px text-center'>CREATED DATE</th>
                                <th className='min-w-125px text-center'>PHASE STATUS</th>
                                <th className='text-end min-w-100px'>ACTIONS</th>
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
                                        {/* 1. DOCNUM */}
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <span className='text-gray-800 fw-bold fs-6'>{item.doc_num}</span>
                                            </div>
                                        </td>

                                        {/* 2. PRODUCT NAME & DESCRIPTION */}
                                        <td>
                                            <div className='d-flex flex-column'>
                                                <span className='text-gray-800 fw-bold text-hover-primary mb-1 fs-6'>
                                                    {item.current_phase?.sales_item_list?.[0]?.item_name || 'N/A'}
                                                </span>
                                                <span className='text-muted fs-7 text-truncate' style={{maxWidth: '180px'}}>
                                                    {item.current_phase?.sales_item_list?.[0]?.item_description || '-'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* 3. CURRENT PHASE NAME */}
                                        <td className='text-center'>
                                            <div className="badge badge-light-dark fw-bold px-4 py-2">
                                                {item.current_phase?.phase_name || 'No Active Phase'}
                                            </div>
                                        </td>

                                        {/* 4. CREATED DATE */}
                                        <td className='text-center'>
                                            <span className="text-gray-700 fw-bold">
                                                {item.created_date ? new Date(item.created_date).toLocaleDateString('th-TH', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                }) : '-'}
                                            </span>
                                        </td>

                                        {/* 5. PHASE STATUS */}
                                        <td className='text-center'>
                                            <span className={`badge ${
                                                item.current_phase?.phase_status === 'Pending' ? 'badge-light-warning' : 
                                                item.current_phase?.phase_status === 'Active' ? 'badge-light-primary' : 
                                                'badge-light-secondary'
                                            } fw-bold px-4 py-3`}>
                                                {item.current_phase?.phase_status || 'Waiting'}
                                            </span>
                                        </td>

                                        {/* 6. ACTIONS */}
                                        <td className='text-end'>
                                            <button
                                                className='btn btn-sm btn-icon btn-bg-light btn-color-primary me-1'
                                                title="Manage Order"
                                                onClick={() => navigate(`/workorder/workorders_detail/${item.doc_num}`)}
                                            >
                                                <i className='bi bi-pencil-square fs-3'></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className='text-center p-20'>
                                        <div className='d-flex flex-column flex-center'>
                                            <i className='bi bi-search fs-3x text-gray-300 mb-4'></i>
                                            <span className='text-gray-500'>ไม่พบข้อมูลใบสั่งงานในระบบ</span>
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