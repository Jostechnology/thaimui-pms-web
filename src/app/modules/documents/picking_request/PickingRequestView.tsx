import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import { getPickingRequestById } from '../../../services/pickingRequestService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { PickingRequestDetail } from '../../../type_interface/PickingRequestType';

const STATUS_BADGE: Record<string, string> = {
    PENDING: 'badge-light-warning',
    SENT: 'badge-light-primary',
    SUCCESS: 'badge-light-success',
    FAILED: 'badge-light-danger',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'รอดำเนินการ',
    SENT: 'ส่งแล้ว',
    SUCCESS: 'สำเร็จ',
    FAILED: 'ล้มเหลว',
};

const formatDate = (s: string | null) => {
    if (!s) return '-';
    return new Date(s).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const PickingRequestView: React.FC = () => {
    const navigate = useNavigate();
    const { pickingRequestId } = useParams<{ pickingRequestId: string }>();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [pr, setPr] = useState<PickingRequestDetail | null>(null);

    const fetchDetail = async () => {
        setLoading();
        try {
            const res = await getPickingRequestById(Number(pickingRequestId));
            if (res.success && res.data) {
                setPr(res.data);
            } else {
                alertMessage(res.message || 'ไม่สามารถดึงข้อมูลได้');
            }
        } finally {
            setUnLoading();
        }
    };

    useEffect(() => { fetchDetail(); }, [pickingRequestId]);

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            {pr?.picking_request_code || `Picking Request #${pickingRequestId}`}
                        </h1>
                        <div className='d-flex align-items-center gap-3 mt-1'>
                            {pr && (
                                <span className={`badge ${STATUS_BADGE[pr.status] ?? 'badge-light-secondary'} fw-bold fs-8`}>
                                    {STATUS_LABEL[pr.status] ?? pr.status}
                                </span>
                            )}
                            {pr?.sales_order && (
                                <span className='text-muted fw-semibold fs-7'>
                                    <i className='bi bi-receipt me-1'></i>หมายเลขใบสั่งขาย {pr.sales_order.doc_num}
                                </span>
                            )}
                            {pr?.wms_reference && (
                                <span className='text-muted fw-semibold fs-7'>
                                    <i className='bi bi-link-45deg me-1'></i>WMS Reference : {pr.wms_reference}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info card */}
            {pr && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-body py-5'>
                        <div className='row g-4'>
                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>สร้างโดย</span>
                                <span className='fw-semibold text-gray-700 fs-7'>{pr.created_by ?? '-'}</span>
                            </div>
                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>วันที่สร้าง</span>
                                <span className='fw-semibold text-gray-700 fs-7'>{formatDate(pr.created_date)}</span>
                            </div>
                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>อัปเดตโดย</span>
                                <span className='fw-semibold text-gray-700 fs-7'>{pr.updated_by ?? '-'}</span>
                            </div>
                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>วันที่อัปเดต</span>
                                <span className='fw-semibold text-gray-700 fs-7'>{formatDate(pr.updated_date)}</span>
                            </div>

                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>หมายเหตุ</span>
                                <span className='text-gray-700 fs-7'>{pr.remark}</span>
                            </div>

                            <div className='col-md-3'>
                                <span className='text-muted fs-8 fw-bold d-block mb-1'>WMS Reference</span>
                                <span className='fw-semibold text-gray-700 fs-7'>{pr.wms_reference ?? '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Items */}
            <div className='card shadow-sm'>
                <div className='card-header border-0 pt-5'>
                    <div className='card-title'>
                        <span className='card-label fw-bold text-gray-900 fs-5'>
                            <i className='bi bi-box-seam me-2 text-primary'></i>
                            รายการสินค้า
                            {pr && (
                                <span className='badge badge-light-primary fw-bold ms-2'>{pr.items.length}</span>
                            )}
                        </span>
                    </div>
                </div>
                <div className='card-body pt-3'>
                    {!pr ? (
                        <div className='text-center py-10 text-muted'>
                            <span className='spinner-border spinner-border-sm me-2' />กำลังโหลด...
                        </div>
                    ) : pr.items.length === 0 ? (
                        <div className='text-center py-10 text-muted'>ไม่มีรายการ</div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table table-bordered align-middle fs-7 mb-0'>
                                <thead className='table-light'>
                                    <tr className='fw-bold text-gray-700 text-uppercase fs-8'>
                                        <th>สินค้า</th>
                                        <th className='w-80px text-center'>จำนวน</th>
                                        <th className='w-70px text-center'>หน่วย</th>
                                        <th className='w-250px'>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pr.items.map(item => (
                                        <tr key={item.picking_request_item_id}>
                                            <td>
                                                <div className='fw-bold text-gray-800'>{item.item_name}</div>
                                                <div className='text-muted fs-8 mt-1'>{item.item_code}</div>
                                            </td>
                                            <td className='text-center fw-bold text-gray-800'>{item.quantity}</td>
                                            <td className='text-center text-muted'>{item.unit}</td>
                                            <td className='text-gray-600'>{item.remark ?? '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Content>
    );
};

export default PickingRequestView;
