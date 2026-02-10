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
    doc_num: string;      // DocNum (ORDR)
    item_name: string;    // จาก Sales_Items
    item_description: string;
    priority: string;     // High, Normal, Low
    due_date: string;
    work_order_status: string; // Designing, Working, etc.
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
                // Mapping ข้อมูลจาก API (Items) เข้าสู่ State
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
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>Work Orders</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการและติดตามกระบวนการผลิตทั้งหมดในระบบ</span>
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button className='btn btn-primary fw-bold px-6' onClick={() => Swal.fire('สร้างใบสั่งงาน', 'เตรียมเปิดฟอร์ม...', 'success')}>
                        <i className='bi bi-plus-lg me-2'></i> Create Order
                    </button>
                </div>
            </div>

            {/* KPI Cards (Static values for now, but can be dynamic) */}
            <div className='row g-5 g-xl-10 mb-8'>
                {/* ตัวอย่างการทำ Card สรุป (ใช้ยอดรวมจาก API หรือ Dashboard แยกก็ได้) */}
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6'>
                        <span className='fs-2hx fw-bold text-gray-900'>{workorders.length}</span>
                        <span className='text-gray-500 fw-semibold fs-6'>Active on current page</span>
                    </div>
                </div>
            </div>

            {/* Table Management Card */}
            <div className='card shadow-sm'>
                <div className='card-header border-0 pt-6'>
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                            <input
                                type='text'
                                className='form-control form-control-solid w-250px ps-13'
                                placeholder='Search by DocNum...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>
                </div>

                <div className='card-body py-4'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0'>
                                    <th className='min-w-125px'>DOCNUM</th>
                                    <th className='min-w-200px'>PRODUCT NAME</th>
                                    <th className='min-w-100px text-center'>PRIORITY</th>
                                    <th className='min-w-125px text-center'>DUE DATE</th>
                                    <th className='min-w-125px text-center'>STATUS</th>
                                    <th className='text-end min-w-100px'>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr><td colSpan={6} className='text-center p-10'>กำลังดึงข้อมูล...</td></tr>
                                ) : workorders.length > 0 ? (
                                    workorders.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <span 
                                                    className='text-primary fw-bold cursor-pointer hover-primary'
                                                    onClick={() => navigate(`/workorder/workorders_detail/${item.doc_num}`)}
                                                >
                                                    {item.doc_num}
                                                </span>
                                            </td>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-40px me-3'>
                                                        <div className='symbol-label bg-light-primary'>
                                                            <i className='bi bi-box-seam text-primary fs-2'></i>
                                                        </div>
                                                    </div>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-gray-800 fw-bold fs-6'>{item.item_name}</span>
                                                        <span className='text-muted fs-7 truncate w-150px'>{item.item_description}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='text-center'>
                                                <span className={`badge ${item.priority === 'High' ? 'badge-light-danger' : 'badge-light-info'} fw-bold`}>
                                                    {item.priority || 'Normal'}
                                                </span>
                                            </td>
                                            <td className='text-center'>{item.due_date || '-'}</td>
                                            <td className='text-center'>
                                                <span className={`badge ${getStatusBadge(item.work_order_status)} fw-bold px-4 py-3`}>
                                                    {item.work_order_status}
                                                </span>
                                            </td>
                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-light btn-active-light-primary btn-sm fw-bold'
                                                    onClick={() => navigate(`/workorder/workorders_detail/${item.doc_num}`)}
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className='text-center p-10'>ไม่พบข้อมูลใบสั่งงาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className='d-flex justify-content-end mt-5'>
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