import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAlertModal } from '../../../context/ModalContext';
import { getQCWorkOrderList, deleteQCWorkOrder } from '../../../services/qcWorkOrderService';
import { useTableParams } from '../../../hooks/useTableParams';
import { useSearchParams } from 'react-router-dom';
import TablePaginator from '../../../custom_components/TablePaginator';
import { getUserAction } from '../../../helpers/pageAccess';
import { useMasterData } from '../../../context/MasterDataContext';

interface QCWorkOrderData {
    qc_work_order_id: number;
    work_order_id: number;
    qc_status: string;
    qc_date: string | null;
    qc_by: string | null;
    remark: string | null;
    created_date: string;
    updated_date: string | null;
}

const QC_STATUS_OPTIONS = [
    { value: "", label: "ทั้งหมด" },
    { value: "PENDING", label: "รอดำเนินการ" },
    { value: "INPROGRESS", label: "กำลังดำเนินการ" },
    { value: "PASSED", label: "ผ่าน QC" },
    { value: "FAILED", label: "ไม่ผ่าน QC" },
];

const QCWorkOrdersList: React.FC = () => {
    const navigate = useNavigate();
    const [qcWorkOrders, setQCWorkOrders] = useState<QCWorkOrderData[]>([]);
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

    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        keyword,
        setKeyword,
        setPageConfig,
        setSearchTerm
    });

    const fetchQCWorkOrders = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getQCWorkOrderList(currentPage, pageConfig, keyword, statusFilter);
            if (result && result.success) {
                setQCWorkOrders(result.data.items);
                setTotalPages(result.data.total_pages);
            } else {
                setQCWorkOrders([]);
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
        fetchQCWorkOrders();
    }, [currentPage, keyword, pageConfig, statusFilter]);

    const getStatusBadge = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'PASSED') return 'badge-light-success';
        if (s === 'INPROGRESS') return 'badge-light-warning';
        if (s === 'FAILED') return 'badge-light-danger';
        if (s === 'PENDING') return 'badge-light-primary';
        return 'badge-light-secondary';
    };

    const getStatusLabel = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'PASSED') return 'ผ่าน';
        if (s === 'INPROGRESS') return 'กำลังดำเนินการ';
        if (s === 'FAILED') return 'ไม่ผ่าน';
        if (s === 'PENDING') return 'รอดำเนินการ';
        return status || '-';
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: "ยืนยันการลบ?",
            text: "คุณต้องการลบ QC Work Order นี้หรือไม่?",
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
                const res = await deleteQCWorkOrder(id);
                if (res.success) {
                    Swal.fire("สำเร็จ!", "ลบ QC Work Order เรียบร้อยแล้ว", "success");
                    fetchQCWorkOrders();
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

    const { masterData } = useMasterData()
    const actionList = masterData.actionList
    const allowedActions = getUserAction(actionList, "QC", "QC_WORKORDERS")

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>Quality Control Work Orders</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการและติดตามใบสั่งเทส QC</span>
                </div>
                {allowedActions.create && <div className='d-flex align-items-center gap-2'>
                    <button
                        className='btn btn-primary fw-bold px-6 shadow-sm'
                        onClick={() => navigate("create")}
                    >
                        <i className='bi bi-plus-lg me-2 fs-4'></i> สร้างใบสั่งเทส QC
                    </button>
                </div>}
            </div>

            {/* KPI Cards Section */}
            <div className='row g-5 g-xl-10 mb-10'>
                <div className='col-md-3'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-primary'>
                                    <i className='bi bi-list-task text-primary fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{qcWorkOrders.length}</span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>รายการในหน้านี้</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-warning'>
                                    <i className='bi bi-hourglass-split text-warning fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>
                                    {qcWorkOrders.filter(q => q.qc_status === 'PENDING').length}
                                </span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>รอดำเนินการ</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-success'>
                                    <i className='bi bi-check-circle text-success fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>
                                    {qcWorkOrders.filter(q => q.qc_status === 'PASSED').length}
                                </span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>ผ่าน QC</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                        <div className='d-flex align-items-center'>
                            <div className='symbol symbol-50px me-5'>
                                <span className='symbol-label bg-light-danger'>
                                    <i className='bi bi-x-circle text-danger fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>
                                    {qcWorkOrders.filter(q => q.qc_status === 'FAILED').length}
                                </span>
                                <span className='text-gray-500 fw-semibold fs-6 mt-1'>ไม่ผ่าน QC</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Management Card */}
            <div className='card card-flush shadow-sm border-0'>
                <div className='card-header align-items-center py-5 gap-2 gap-md-5'>
                    {/* Search */}
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-4'>
                                <span className='path1'></span><span className='path2'></span>
                            </i>
                            <input
                                type='text'
                                className='form-control form-control-solid w-250px ps-12'
                                placeholder='ค้นหาโดย ผู้ตรวจ, หมายเหตุ...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>

                    {/* Status filter */}
                    <div className='card-toolbar'>
                        <div className='d-flex justify-content-end align-items-center gap-3'>
                            <div className='fw-bold text-gray-700'>Status:</div>
                            <select
                                className='form-select form-select-solid w-150px'
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                {QC_STATUS_OPTIONS.map((status) => (
                                    <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                            </select>

                            <button
                                className='btn btn-icon btn-light-primary btn-sm'
                                onClick={() => {
                                    setSearchTerm("");
                                    setKeyword("");
                                    setStatusFilter("");
                                }}
                            >
                                <i className='bi bi-arrow-clockwise fs-3'></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-80px'>ID</th>
                                    <th className='min-w-125px text-center'>QC STATUS</th>
                                    <th className='min-w-125px text-center'>QC DATE</th>
                                    <th className='min-w-125px'>QC BY</th>
                                    <th className='min-w-200px'>REMARK</th>
                                    <th className='min-w-125px text-center'>CREATED</th>
                                    <th className='text-end min-w-100px'>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={7} className='text-center p-20'>
                                            <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                            <span className="ms-3 text-gray-500">กำลังดึงข้อมูล...</span>
                                        </td>
                                    </tr>
                                ) : qcWorkOrders.length > 0 ? (
                                    qcWorkOrders.map((item) => (
                                        <tr key={item.qc_work_order_id} className="hover:bg-light-primary transition-all">
                                            <td>
                                                <span className='text-gray-800 fw-bold fs-6'>#{item.qc_work_order_id}</span>
                                            </td>


                                            <td className='text-center'>
                                                <span className={`badge ${getStatusBadge(item.qc_status)} fw-bold px-4 py-3`}>
                                                    {getStatusLabel(item.qc_status)}
                                                </span>
                                            </td>

                                            <td className='text-center'>
                                                <span className="text-gray-700 fw-bold">
                                                    {item.qc_date ? new Date(item.qc_date).toLocaleDateString('th-TH', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    }) : '-'}
                                                </span>
                                            </td>

                                            <td>
                                                <span className='text-gray-800 fw-semibold'>{item.qc_by || '-'}</span>
                                            </td>

                                            <td>
                                                <span className='text-muted fs-7 text-truncate d-inline-block' style={{ maxWidth: '200px' }}>
                                                    {item.remark || '-'}
                                                </span>
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

                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-info me-1'
                                                    title="View Details"
                                                    onClick={() => navigate(`view/${item.qc_work_order_id}`)}
                                                >
                                                    <i className='bi bi-eye fs-3'></i>
                                                </button>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-primary me-1'
                                                    title="Edit"
                                                    onClick={() => navigate(`edit/${item.qc_work_order_id}`)}
                                                >
                                                    <i className='bi bi-pencil-square fs-3'></i>
                                                </button>
                                                {allowedActions.delete && (
                                                    <button
                                                        className='btn btn-sm btn-icon btn-bg-light btn-color-danger'
                                                        title="Delete"
                                                        onClick={() => handleDelete(item.qc_work_order_id)}
                                                    >
                                                        <i className='bi bi-trash fs-3'></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className='text-center p-20'>
                                            <div className='d-flex flex-column flex-center'>
                                                <i className='bi bi-search fs-3x text-gray-300 mb-4'></i>
                                                <span className='text-gray-500'>ไม่พบข้อมูล QC Work Order ในระบบ</span>
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

export default QCWorkOrdersList;