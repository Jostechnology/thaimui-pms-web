import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSalesOrderList, SalesOrderSummary } from '../../../services/salesOrder';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import TableActionButton from '../../../custom_components/TableActionButton';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';

const SalesOrderList: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [salesOrders, setSalesOrders] = useState<SalesOrderSummary[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalItems, setTotalItems] = useState<number>(0);

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
        setSearchTerm,
    });

    const fetchSalesOrders = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getSalesOrderList(currentPage, pageConfig, keyword);
            if (result && result.success) {
                setSalesOrders(result.data.items || []);
                setTotalPages(result.pagination?.pages ?? 0);
                setTotalItems(result.pagination?.total ?? 0);
            } else {
                setSalesOrders([]);
                setTotalPages(0);
                setTotalItems(0);
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
        fetchSalesOrders();
    }, [currentPage, keyword, pageConfig]);

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>รายการใบสั่งขาย</h1>
                    <span className='text-muted fw-semibold fs-6'>รายการใบสั่งขายทั้งหมดในระบบ</span>
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button
                        type='button'
                        className='btn btn-light-primary fw-bold px-6 shadow-sm'
                        onClick={fetchSalesOrders}
                        disabled={dataLoading}
                    >
                        <i className='bi bi-arrow-clockwise me-2 fs-4'></i> รีเฟรช
                    </button>
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
                                placeholder='ค้นหา Doc Num, ชื่อลูกค้า'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>

                    <div className='card-toolbar d-flex align-items-center gap-3'>
                        <select
                            className='form-select form-select-solid w-100px'
                            value={pageConfig}
                            onChange={(e) => {
                                setPageConfig(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            disabled={dataLoading}
                        >
                            <option value='10'>10</option>
                            <option value='25'>25</option>
                            <option value='50'>50</option>
                            <option value='100'>100</option>
                        </select>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                            <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                                <thead>
                                    <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                        <th className='min-w-100px'>Doc Num</th>
                                        <th className='min-w-100px'>ข้อมูลลูกค้า</th>
                                        <th className='min-w-150px'>ตัวแทนขาย</th>
                                        <th className='min-w-150px'>สาขา</th>
                                        <th className='min-w-200px'>ความคืบหน้า</th>
                                        <th className='min-w-100px text-center'>สถานะ</th>
                                        <th className='min-w-125px text-center'>วันที่สร้าง</th>
                                        <th className='text-end min-w-50px'>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className='text-gray-600 fw-semibold'>
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan={8} className='text-center p-20'>
                                                <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                                <span className="ms-3 text-gray-500">กำลังดึงข้อมูล...</span>
                                            </td>
                                        </tr>
                                    ) : salesOrders.length > 0 ? (
                                        salesOrders.map((so: SalesOrderSummary) => (
                                            <tr key={so.doc_entry}>
                                                <td>
                                                    <span className='text-gray-800 fw-bold fs-6'>หมายเลขใบสั่งขาย {so.doc_num}</span>
                                                    <span className='text-muted fw-semibold d-block fs-8'>Internal Number (doc_entry): {so.doc_entry}</span>
                                                </td>
                                                <td>
                                                    <span className='text-gray-800 fw-bold text-hover-primary fs-6'>{so.card_name}</span>
                                                    <span className='text-muted fw-semibold d-block fs-8'>{so.card_code}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="symbol symbol-30px me-3">
                                                            <span className="symbol-label bg-light-info text-info fw-bold">
                                                                {so.slp_name ? so.slp_name.charAt(0).toUpperCase() : '?'}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-800 fw-bold fs-6">{so.slp_name || '-'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className="bi bi-shop text-primary fs-6"></i>
                                                            <span className="text-gray-800 fw-bold fs-6">{so.bpl_name || '-'}</span>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className="bi bi-building text-muted fs-6"></i>
                                                            {so.branch_name
                                                                ? <span className="text-muted fw-semibold fs-7">{so.branch_name}</span>
                                                                : <span className="text-muted fs-7 fst-italic">ยังไม่ระบุสาขาผลิต</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column gap-3" style={{ minWidth: 200 }}>
                                                        {/* Production */}
                                                        <div className="d-flex flex-column gap-1">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="text-muted fs-8 fw-semibold">
                                                                    <i className="bi bi-gear me-1"></i>ผลิต
                                                                </span>
                                                                <span className="text-gray-700 fw-bold fs-8">
                                                                    {so.produced_qty}/{so.quantity_to_produce} ชิ้น
                                                                </span>
                                                            </div>
                                                            <div className="h-6px rounded bg-light mb-1">
                                                                <div
                                                                    className="h-6px rounded"
                                                                    style={{
                                                                        width: Number(so.quantity_to_produce) > 0 ? `${Math.min(100, Math.round((Number(so.produced_qty) / Number(so.quantity_to_produce)) * 100))}%` : '0%',
                                                                        backgroundColor: Number(so.quantity_to_produce) > 0 && Number(so.produced_qty) >= Number(so.quantity_to_produce) ? '#50cd89' : '#009ef7',
                                                                        transition: 'width 0.3s',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className={`badge ${so.produce_has_workorder >= so.produce_total ? 'badge-light-success' : 'badge-light-warning'} fs-9 w-100 text-start`}>
                                                                <i className={`bi ${so.produce_has_workorder >= so.produce_total ? 'bi-check-circle' : 'bi-exclamation-circle'} me-1`}></i>
                                                                ใบสั่งผลิต {so.produce_has_workorder}/{so.produce_total} รายการ
                                                            </span>
                                                        </div>

                                                        {/* QC */}
                                                        <div className="d-flex flex-column gap-1">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="text-muted fs-8 fw-semibold">
                                                                    <i className="bi bi-clipboard2-check me-1"></i>QC
                                                                </span>
                                                                <span className="text-gray-700 fw-bold fs-8">
                                                                    {so.qc_passed}/{so.qc_count} ผ่าน
                                                                    {so.qc_failed > 0 && (
                                                                        <span className="text-danger ms-1">({so.qc_failed} ไม่ผ่าน)</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="h-6px rounded bg-light d-flex overflow-hidden mb-1">
                                                                {so.qc_count > 0 && so.qc_passed > 0 && (
                                                                    <div
                                                                        className="h-6px"
                                                                        style={{
                                                                            width: `${Math.min(100, Math.round((so.qc_passed / so.qc_count) * 100))}%`,
                                                                            backgroundColor: '#50cd89',
                                                                            transition: 'width 0.3s',
                                                                        }}
                                                                    />
                                                                )}
                                                                {so.qc_count > 0 && so.qc_failed > 0 && (
                                                                    <div
                                                                        className="h-6px"
                                                                        style={{
                                                                            width: `${Math.min(100, Math.round((so.qc_failed / so.qc_count) * 100))}%`,
                                                                            backgroundColor: '#f1416c',
                                                                            transition: 'width 0.3s',
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <span className={`badge ${so.test_has_qcworkorder >= so.test_total ? 'badge-light-success' : 'badge-light-warning'} fs-9 w-100 text-start`}>
                                                                <i className={`bi ${so.test_has_qcworkorder >= so.test_total ? 'bi-check-circle' : 'bi-exclamation-circle'} me-1`}></i>
                                                                ใบสั่งเทส {so.test_has_qcworkorder}/{so.test_total} รายการ
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className='text-center'>
                                                    <span className={`badge ${so.status === 'COMPLETED' ? 'badge-light-success' : 'badge-light-warning'}`}>
                                                        {so.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
                                                    </span>
                                                </td>
                                                <td className='text-center'>
                                                    <span className="text-gray-700 fw-bold">
                                                        {so.created_date ? new Date(so.created_date).toLocaleDateString('th-TH', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        }) : '-'}
                                                    </span>
                                                </td>
                                                <td className='text-end'>
                                                    <TableActionButton
                                                        isEditBtnShow={false}
                                                        isDeleteBtnShow={false}
                                                        handleView={() => navigate(`/sales_order/view/${so.doc_entry}`)}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className='text-center p-20'>
                                                <div className='d-flex flex-column flex-center'>
                                                    <i className='bi bi-search fs-3x text-gray-300 mb-4'></i>
                                                    <span className='text-gray-500'>ไม่พบข้อมูลใบสั่งขายในระบบ</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                    {/* Pagination */}
                    <div className='d-flex flex-stack flex-wrap pt-10'>
                        <span className='fs-6 fw-semibold text-gray-700'>
                            {salesOrders.length > 0
                                ? `แสดง ${((currentPage - 1) * pageConfig) + 1}–${Math.min(currentPage * pageConfig, totalItems)} จาก ${totalItems} รายการ`
                                : ''}
                        </span>
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
};

export default SalesOrderList;
