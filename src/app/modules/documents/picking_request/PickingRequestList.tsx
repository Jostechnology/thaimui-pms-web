import React, { useState, useEffect, useRef } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { Modal } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import { getPickingRequestList, updatePickingRequestStatus } from '../../../services/pickingRequestService';
import type { PickingRequest } from '../../../type_interface/PickingRequestType';
import { toDateOnly } from '../../../utils/validate_utils';

const STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['SENT', 'FAILED'],
    SENT: ['SUCCESS', 'FAILED'],
    FAILED: ['PENDING'],
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'รอดำเนินการ',
    SENT: 'ส่งแล้ว',
    SUCCESS: 'สำเร็จ',
    FAILED: 'ล้มเหลว',
};

const STATUS_BADGE: Record<string, string> = {
    PENDING: 'badge-light-warning',
    SENT: 'badge-light-primary',
    SUCCESS: 'badge-light-success',
    FAILED: 'badge-light-danger',
};

interface UpdateStatusForm {
    status: string;
    wms_reference: string;
    remark: string;
}

const PickingRequestList: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [items, setItems] = useState<PickingRequest[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const [keyword, setKeyword] = useState(searchParams.get('search') || '');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get('pageConfig') || '10'));
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;

    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Update status modal
    const [updateTarget, setUpdateTarget] = useState<PickingRequest | null>(null);
    const [updateForm, setUpdateForm] = useState<UpdateStatusForm>({ status: '', wms_reference: '', remark: '' });
    const [updateSaving, setUpdateSaving] = useState(false);

    // Reset to page 1 when filters/keyword change
    const prevRef = useRef({ keyword, statusFilter, pageConfig });
    useEffect(() => {
        const prev = prevRef.current;
        if (
            prev.keyword !== keyword ||
            prev.statusFilter !== statusFilter ||
            prev.pageConfig !== pageConfig
        ) {
            setCurrentPage(1);
            prevRef.current = { keyword, statusFilter, pageConfig };
        }
    }, [keyword, statusFilter, pageConfig]);

    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        setPageConfig,
        keyword,
        setKeyword,
        setSearchTerm,
    });

    const fetchList = async () => {
        if ((startDate && !endDate) || (!startDate && endDate)) return;
        setDataLoading(true);
        setLoading();
        try {
            const result = await getPickingRequestList(
                currentPage,
                pageConfig,
                keyword || undefined,
                statusFilter || undefined,
                undefined,
                toDateOnly(startDate),
                toDateOnly(endDate)
            );
            if (result && result.success) {
                setItems(result.data?.items ?? []);
                setTotalPages(result.pagination?.pages ?? 0);
                setTotalCount(result.pagination?.total ?? 0);
            } else {
                setItems([]);
                setTotalPages(0);
                setTotalCount(0);
            }
        } catch {
            alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [currentPage, keyword, pageConfig, statusFilter, startDate, endDate]);

    const pendingCount = items.filter((i) => i.status === 'PENDING').length;
    const sentCount = items.filter((i) => i.status === 'SENT').length;
    const successCount = items.filter((i) => i.status === 'SUCCESS').length;
    const failedCount = items.filter((i) => i.status === 'FAILED').length;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const openUpdateModal = (item: PickingRequest) => {
        const nextStatuses = STATUS_TRANSITIONS[item.status] ?? [];
        setUpdateTarget(item);
        setUpdateForm({ status: nextStatuses[0] ?? '', wms_reference: item.wms_reference ?? '', remark: '' });
    };

    const handleUpdateSubmit = async () => {
        if (!updateTarget || !updateForm.status) return;
        setUpdateSaving(true);
        try {
            const res = await updatePickingRequestStatus(updateTarget.picking_request_id, {
                status: updateForm.status,
                wms_reference: updateForm.wms_reference.trim() || undefined,
                remark: updateForm.remark.trim() || undefined,
            });
            if (res.success) {
                Swal.fire({ title: 'อัปเดตสถานะสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
                setUpdateTarget(null);
                fetchList();
            } else {
                Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
            }
        } finally {
            setUpdateSaving(false);
        }
    };

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>คำขอเบิก</h1>
                    <span className='text-muted fw-semibold fs-6'>ติดตามและจัดการคำขอเบิกวัสดุทั้งหมดในระบบ</span>
                </div>
                <button
                    className='btn btn-primary fw-bold'
                    onClick={() => navigate('/documents/picking_request/create')}
                >
                    <i className='bi bi-plus-lg me-2'></i>สร้างคำขอเบิก
                </button>
            </div>

            {/* KPI Cards */}
            <div className='row g-5 g-xl-10 mb-10'>
                {[
                    { label: 'ทั้งหมด', count: totalCount, icon: 'bi-box-seam', bg: 'bg-light-primary', color: 'text-primary' },
                    { label: 'รอดำเนินการ', count: pendingCount, icon: 'bi-hourglass-split', bg: 'bg-light-warning', color: 'text-warning' },
                    { label: 'ส่งแล้ว', count: sentCount, icon: 'bi-send-check', bg: 'bg-light-info', color: 'text-info' },
                    { label: 'สำเร็จ', count: successCount, icon: 'bi-check-circle-fill', bg: 'bg-light-success', color: 'text-success' },
                    { label: 'ล้มเหลว', count: failedCount, icon: 'bi-x-circle-fill', bg: 'bg-light-danger', color: 'text-danger' },
                ].map((card) => (
                    <div key={card.label} className='col'>
                        <div className='card card-flush shadow-sm h-100 py-5 px-6 border-0 bg-white'>
                            <div className='d-flex align-items-center'>
                                <div className='symbol symbol-50px me-5'>
                                    <span className={`symbol-label ${card.bg}`}>
                                        <i className={`bi ${card.icon} ${card.color} fs-2x`}></i>
                                    </span>
                                </div>
                                <div className='d-flex flex-column'>
                                    <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{card.count}</span>
                                    <span className='text-gray-500 fw-semibold fs-6 mt-1'>{card.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Card */}
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
                                placeholder='ค้นหา WMS Reference หรือ ID'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>

                    <div className='card-toolbar d-flex align-items-center gap-3'>
                        <DatePicker
                            selectsRange
                            startDate={startDate}
                            endDate={endDate}
                            onChange={(update) => {
                                setDateRange(update as [Date | null, Date | null]);
                                setCurrentPage(1);
                            }}
                            dateFormat="dd/MM/yyyy"
                            isClearable
                            placeholderText="เลือกช่วงวันที่"
                            disabled={dataLoading}
                            customInput={
                                <button className="btn btn-light-primary btn-sm" disabled={dataLoading}>
                                    <i className="fas fa-calendar-alt me-2"></i>
                                    {startDate && endDate
                                        ? `${startDate.toLocaleDateString("th-TH")} - ${endDate.toLocaleDateString("th-TH")}`
                                        : "เลือกช่วงวันที่"}
                                </button>
                            }
                        />
                        <select
                            className='form-select form-select-solid w-160px'
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value=''>สถานะทั้งหมด</option>
                            {Object.entries(STATUS_LABEL).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='w-30px'></th>
                                    <th className='min-w-80px'>หมายเลขใบขอเบิก</th>
                                    <th className='min-w-100px'>ใบสั่งขาย (SO)</th>
                                    <th className='min-w-80px text-center'>รายการ</th>
                                    <th className='min-w-150px'>WMS Reference</th>
                                    <th className='min-w-120px'>สร้างโดย</th>
                                    <th className='min-w-140px'>วันที่สร้าง</th>
                                    <th className='min-w-100px text-center'>สถานะ</th>
                                    <th className='text-end min-w-80px'>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={9} className='text-center p-20'>
                                            <span className='spinner-border spinner-border-sm align-middle me-3'></span>
                                            <span className='text-gray-500'>กำลังดึงข้อมูล...</span>
                                        </td>
                                    </tr>
                                ) : items.length > 0 ? (
                                    items.map((item) => {
                                        const isExpanded = expandedId === item.picking_request_id;
                                        const nextStatuses = STATUS_TRANSITIONS[item.status] ?? [];
                                        return (
                                            <React.Fragment key={item.picking_request_id}>
                                                <tr>
                                                    <td>
                                                        <button
                                                            className='btn btn-icon btn-sm btn-light'
                                                            title={isExpanded ? 'ซ่อนรายการ' : 'ดูรายการ'}
                                                            onClick={() => setExpandedId(isExpanded ? null : item.picking_request_id)}
                                                        >
                                                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} fs-5`}></i>
                                                        </button>
                                                    </td>
                                                    <td className='fw-bold text-gray-800'>{item.picking_request_code || `#${item.picking_request_id}`}</td>
                                                    <td className='text-gray-700 fw-bold'>
                                                        {item.sales_order ? `${item.sales_order.doc_num}` : <span className='text-muted'>-</span>}
                                                    </td>
                                                    <td className='text-center'>
                                                        <span className='badge badge-light-secondary fw-bold'>
                                                            {item.items.length} รายการ
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.wms_reference
                                                            ? <span className='fw-bold text-gray-800'>{item.wms_reference}</span>
                                                            : <span className='fw-bold text-info'>Reallocate</span>}
                                                    </td>
                                                    <td className='text-gray-700'>{item.created_by ?? '-'}</td>
                                                    <td className='text-gray-700'>{formatDate(item.created_date)}</td>
                                                    <td className='text-center'>
                                                        <span className={`badge ${STATUS_BADGE[item.status]} fw-bold px-4 py-2`}>
                                                            {STATUS_LABEL[item.status] ?? item.status}
                                                        </span>
                                                    </td>
                                                    <td className='text-end d-flex justify-content-end gap-1'>
                                                        <button
                                                            className='btn btn-icon btn-sm btn-bg-light btn-color-primary'
                                                            title='ดูรายละเอียด'
                                                            onClick={() => navigate(`/documents/picking_request/${item.picking_request_id}`)}
                                                        >
                                                            <i className='bi bi-eye fs-5'></i>
                                                        </button>
                                                        {nextStatuses.length > 0 && (
                                                            <button
                                                                className='btn btn-icon btn-sm btn-bg-light btn-color-primary'
                                                                title='อัปเดตสถานะ'
                                                                onClick={() => openUpdateModal(item)}
                                                            >
                                                                <i className='bi bi-arrow-repeat fs-4'></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded items sub-table */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={9} className='p-0'>
                                                            <div className='bg-light-secondary px-10 py-5'>
                                                                {item.remark && (
                                                                    <div className='mb-4 text-gray-700 fw-semibold fs-7'>
                                                                        <i className='bi bi-chat-left-text me-2 text-muted'></i>
                                                                        หมายเหตุรวม: {item.remark}
                                                                    </div>
                                                                )}
                                                                <table className='table table-bordered align-middle fs-7 mb-0 bg-white rounded'>
                                                                    <thead className='table-light'>
                                                                        <tr className='fw-bold text-gray-700 text-uppercase fs-8'>
                                                                            <th className='w-120px'>รหัสสินค้า</th>
                                                                            <th>ชื่อสินค้า</th>
                                                                            <th className='w-80px text-center'>จำนวน</th>
                                                                            <th className='w-70px text-center'>หน่วย</th>
                                                                            <th className='w-200px'>หมายเหตุ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {item.items.map((line) => (
                                                                            <tr key={line.picking_request_item_id}>
                                                                                <td className='fw-bold text-gray-700'>{line.item_code}</td>
                                                                                <td className='text-gray-800'>{line.item_name}</td>
                                                                                <td className='text-center fw-bold text-gray-800'>{line.quantity}</td>
                                                                                <td className='text-center text-gray-600'>{line.unit}</td>
                                                                                <td className='text-gray-500'>{line.remark ?? '-'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className='text-center p-20'>
                                            <div className='d-flex flex-column flex-center'>
                                                <i className='bi bi-box-seam fs-3x text-gray-300 mb-4'></i>
                                                <span className='text-gray-500'>ไม่พบข้อมูล Picking Request</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className='d-flex flex-stack flex-wrap pt-10'>
                        <div className='fs-6 fw-semibold text-gray-700'></div>
                        <TablePaginator
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            totalPages={totalPages}
                        />
                    </div>
                </div>
            </div>

            {/* Update Status Modal */}
            <Modal show={updateTarget !== null} onHide={() => setUpdateTarget(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>
                        <i className='bi bi-arrow-repeat me-2 text-primary'></i>
                        อัปเดตสถานะ — {updateTarget?.picking_request_code || `Picking Request #${updateTarget?.picking_request_id}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='mb-5'>
                        <label className='form-label fw-bold required'>สถานะใหม่</label>
                        <select
                            className='form-select form-select-solid'
                            value={updateForm.status}
                            onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                        >
                            {(STATUS_TRANSITIONS[updateTarget?.status ?? ''] ?? []).map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                            ))}
                        </select>
                    </div>
                    <div className='mb-5'>
                        <label className='form-label fw-bold'>WMS Reference (ไม่บังคับ)</label>
                        <input
                            type='text'
                            className='form-control form-control-lg'
                            placeholder='เช่น WMS-2026-00142'
                            value={updateForm.wms_reference}
                            onChange={(e) => setUpdateForm((f) => ({ ...f, wms_reference: e.target.value }))}
                        />
                    </div>
                    <div className='mb-2'>
                        <label className='form-label fw-bold'>หมายเหตุ (ไม่บังคับ)</label>
                        <textarea
                            className='form-control form-control-lg'
                            rows={2}
                            placeholder='หมายเหตุการอัปเดตสถานะ'
                            value={updateForm.remark}
                            onChange={(e) => setUpdateForm((f) => ({ ...f, remark: e.target.value }))}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light fw-bold' onClick={() => setUpdateTarget(null)} disabled={updateSaving}>
                        ยกเลิก
                    </button>
                    <button className='btn btn-primary fw-bold' onClick={handleUpdateSubmit} disabled={updateSaving || !updateForm.status}>
                        {updateSaving
                            ? <><span className='spinner-border spinner-border-sm me-2' />กำลังบันทึก...</>
                            : <><i className='bi bi-check-lg me-2'></i>บันทึก</>}
                    </button>
                </Modal.Footer>
            </Modal>
        </Content>
    );
};

export default PickingRequestList;
