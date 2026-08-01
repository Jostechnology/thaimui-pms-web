import React, { useState, useEffect, useRef } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { useMasterData } from '../../../context/MasterDataContext';
import { getUserAction } from '../../../helpers/pageAccess';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import TableListConfig from '../../../custom_components/TableListConfig';
import SearchComponent from '../../../custom_components/SearchComponent';
import {
    getComponentEditRequests,
    approveComponentEditRequest,
    rejectComponentEditRequest,
} from '../../../services/componentEditRequestService';
import type {
    ComponentEditRequest,
    ComponentEditRequestStatus,
} from '../../../type_interface/ComponentEditRequestType';

const STATUS_LABEL: Record<ComponentEditRequestStatus, string> = {
    PENDING: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ปฏิเสธ',
    CONSUMED: 'แก้ไขแล้ว',
    CANCELLED: 'ยกเลิก',
};

const STATUS_BADGE: Record<ComponentEditRequestStatus, string> = {
    PENDING: 'badge-light-warning',
    APPROVED: 'badge-light-primary',
    REJECTED: 'badge-light-danger',
    CONSUMED: 'badge-light-success',
    CANCELLED: 'badge-light-secondary',
};

const ComponentEditRequestList: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();
    const { masterData } = useMasterData();
    // getUserAction only exposes create/edit/delete/view — the backend's "approve"
    // right has no matching key, so `edit` is what gates อนุมัติ / ปฏิเสธ here.
    const permissions = getUserAction(masterData.actionList, 'WORKORDERS', 'COMPONENT_EDIT');
    const canApprove = permissions.edit;

    const [items, setItems] = useState<ComponentEditRequest[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const [keyword, setKeyword] = useState(searchParams.get('search') || '');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get('pageConfig') || '10'));
    const [statusFilter, setStatusFilter] = useState<ComponentEditRequestStatus | ''>(
        (searchParams.get('status') || '') as ComponentEditRequestStatus | ''
    );

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
        setDataLoading(true);
        setLoading();
        try {
            const result = await getComponentEditRequests(
                currentPage,
                pageConfig,
                keyword || '',
                statusFilter || undefined
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
    }, [currentPage, keyword, pageConfig, statusFilter]);

    const countOf = (status: ComponentEditRequestStatus) =>
        items.filter((i) => i.status === status).length;

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

    const describeTarget = (item: ComponentEditRequest) => {
        const component = item.component_name || `ส่วนประกอบ #${item.item_component_id}`;
        const wo = item.work_order_code || `ใบสั่งผลิต #${item.work_order_id}`;
        return `<div class="text-start fs-7">
            <div><span class="text-muted">ใบสั่งผลิต:</span> <strong>${wo}</strong></div>
            <div><span class="text-muted">ส่วนประกอบ:</span> <strong>${component}</strong></div>
            <div class="mt-2"><span class="text-muted">เหตุผลของผู้ขอ:</span><br/>${item.reason || '-'}</div>
        </div>`;
    };

    const handleApprove = async (item: ComponentEditRequest) => {
        const result = await Swal.fire({
            title: 'อนุมัติคำขอนี้?',
            html: describeTarget(item),
            icon: 'question',
            input: 'textarea',
            inputLabel: 'หมายเหตุ (ไม่บังคับ)',
            inputPlaceholder: 'ระบุหมายเหตุถึงผู้ขอ (ถ้ามี)',
            inputAttributes: { rows: '3' },
            showCancelButton: true,
            confirmButtonText: 'อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#50cd89',
            reverseButtons: true,
        });
        if (!result.isConfirmed) return;

        const remark = (result.value || '').trim();
        setLoading();
        try {
            const res = await approveComponentEditRequest(item.edit_request_id, remark || undefined);
            if (res.success) {
                Swal.fire({
                    title: 'อนุมัติคำขอสำเร็จ',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                fetchList();
            } else {
                // The backend refuses self-approval (ผู้ขอไม่สามารถอนุมัติคำขอของตนเองได้)
                // and returns a Thai 403 message — surface it verbatim, not a generic error.
                Swal.fire('ไม่สามารถอนุมัติได้', res.message || 'เกิดข้อผิดพลาดในการอนุมัติคำขอ', 'error');
            }
        } finally {
            setUnLoading();
        }
    };

    const handleReject = async (item: ComponentEditRequest) => {
        const result = await Swal.fire({
            title: 'ปฏิเสธคำขอนี้?',
            html: describeTarget(item),
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'เหตุผลในการปฏิเสธ (จำเป็น)',
            inputPlaceholder: 'ระบุเหตุผลที่ปฏิเสธคำขอนี้',
            inputAttributes: { rows: '3' },
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'กรุณาระบุเหตุผลในการปฏิเสธ';
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'ปฏิเสธคำขอ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
            reverseButtons: true,
        });
        if (!result.isConfirmed) return;

        const remark = (result.value || '').trim();
        setLoading();
        try {
            const res = await rejectComponentEditRequest(item.edit_request_id, remark);
            if (res.success) {
                Swal.fire({
                    title: 'ปฏิเสธคำขอแล้ว',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
                fetchList();
            } else {
                // Same as approve — the backend blocks reviewing your own request with a Thai message.
                Swal.fire('ไม่สามารถปฏิเสธได้', res.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
            }
        } finally {
            setUnLoading();
        }
    };

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>คำขอแก้ไขเอกสารส่วนประกอบ</h1>
                    <span className='text-muted fw-semibold fs-6'>
                        ตรวจสอบและอนุมัติคำขอแก้ไขเอกสารส่วนประกอบที่ถูกล็อกไว้หลังเริ่มการผลิต
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className='row g-5 g-xl-10 mb-10'>
                {[
                    { label: 'ทั้งหมด', count: totalCount, icon: 'bi-files', bg: 'bg-light-primary', color: 'text-primary' },
                    { label: STATUS_LABEL.PENDING, count: countOf('PENDING'), icon: 'bi-hourglass-split', bg: 'bg-light-warning', color: 'text-warning' },
                    { label: STATUS_LABEL.APPROVED, count: countOf('APPROVED'), icon: 'bi-unlock', bg: 'bg-light-info', color: 'text-info' },
                    { label: STATUS_LABEL.REJECTED, count: countOf('REJECTED'), icon: 'bi-x-circle-fill', bg: 'bg-light-danger', color: 'text-danger' },
                    { label: STATUS_LABEL.CONSUMED, count: countOf('CONSUMED'), icon: 'bi-check-circle-fill', bg: 'bg-light-success', color: 'text-success' },
                    { label: STATUS_LABEL.CANCELLED, count: countOf('CANCELLED'), icon: 'bi-slash-circle', bg: 'bg-light-secondary', color: 'text-gray-600' },
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
                        <div className='w-100 w-md-300px'>
                            <SearchComponent
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                setKeyword={setKeyword}
                                placeholer='ค้นหาใบสั่งผลิต / ส่วนประกอบ / เหตุผล'
                            />
                        </div>
                    </div>

                    <div className='card-toolbar d-flex align-items-center gap-3'>
                        <select
                            className='form-select form-select-solid w-160px'
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ComponentEditRequestStatus | '')}
                        >
                            <option value=''>สถานะทั้งหมด</option>
                            {(Object.keys(STATUS_LABEL) as ComponentEditRequestStatus[]).map((val) => (
                                <option key={val} value={val}>{STATUS_LABEL[val]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-120px'>ใบสั่งผลิต</th>
                                    <th className='min-w-150px'>ส่วนประกอบ</th>
                                    <th className='min-w-90px text-center'>เวอร์ชันฐาน</th>
                                    <th className='min-w-200px'>เหตุผล</th>
                                    <th className='min-w-110px'>ผู้ขอ</th>
                                    <th className='min-w-140px'>วันที่ขอ</th>
                                    <th className='min-w-100px text-center'>สถานะ</th>
                                    <th className='min-w-110px'>ผู้อนุมัติ</th>
                                    <th className='text-end min-w-140px'>จัดการ</th>
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
                                    items.map((item) => (
                                        <tr key={item.edit_request_id}>
                                            <td className='fw-bold text-gray-800'>
                                                {item.work_order_code || `#${item.work_order_id}`}
                                            </td>
                                            <td className='text-gray-800 fw-bold'>
                                                {item.component_name || `ส่วนประกอบ #${item.item_component_id}`}
                                            </td>
                                            <td className='text-center'>
                                                {item.base_version_no !== null ? (
                                                    <span className='badge badge-light-primary fw-bold'>v{item.base_version_no}</span>
                                                ) : (
                                                    <span className='text-muted'>-</span>
                                                )}
                                            </td>
                                            <td className='text-gray-700'>
                                                <span
                                                    className='d-inline-block text-truncate'
                                                    style={{ maxWidth: '280px' }}
                                                    title={item.reason || ''}
                                                >
                                                    {item.reason || '-'}
                                                </span>
                                                {item.review_remark && (
                                                    <div className='text-muted fs-8 mt-1'>
                                                        <i className='bi bi-chat-left-text me-1'></i>
                                                        {item.review_remark}
                                                    </div>
                                                )}
                                            </td>
                                            <td className='text-gray-700'>{item.created_by ?? '-'}</td>
                                            <td className='text-gray-700'>{formatDate(item.created_date)}</td>
                                            <td className='text-center'>
                                                <span className={`badge ${STATUS_BADGE[item.status] ?? 'badge-light-secondary'} fw-bold px-4 py-2`}>
                                                    {STATUS_LABEL[item.status] ?? item.status}
                                                </span>
                                            </td>
                                            <td className='text-gray-700'>
                                                {item.reviewed_by ? (
                                                    <div className='d-flex flex-column'>
                                                        <span className='fw-bold text-gray-800'>{item.reviewed_by}</span>
                                                        <span className='text-muted fs-8'>{formatDate(item.reviewed_date)}</span>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted'>-</span>
                                                )}
                                            </td>
                                            <td className='text-end'>
                                                {item.status === 'PENDING' && canApprove ? (
                                                    <div className='d-flex justify-content-end gap-2'>
                                                        <button
                                                            className='btn btn-sm btn-light-success fw-bold'
                                                            onClick={() => handleApprove(item)}
                                                        >
                                                            <i className='bi bi-check-lg me-1'></i>อนุมัติ
                                                        </button>
                                                        <button
                                                            className='btn btn-sm btn-light-danger fw-bold'
                                                            onClick={() => handleReject(item)}
                                                        >
                                                            <i className='bi bi-x-lg me-1'></i>ปฏิเสธ
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted'>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className='text-center p-20'>
                                            <div className='d-flex flex-column flex-center'>
                                                <i className='bi bi-inbox fs-3x text-gray-300 mb-4'></i>
                                                <span className='text-gray-500'>ไม่พบคำขอแก้ไขเอกสารส่วนประกอบ</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TableListConfig
                        pageConfig={pageConfig}
                        setPageConfig={setPageConfig}
                    />

                    <div className='d-flex flex-stack flex-wrap pt-5'>
                        <div className='fs-6 fw-semibold text-gray-700'></div>
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

export default ComponentEditRequestList;
