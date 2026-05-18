import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import { getPickingRequestById } from '../../../services/pickingRequestService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import AdjustItemModal from '../../../modals/picking_request_modal/AdjustItemModal';
import type {
    PickingRequestDetail,
    PickingRequestItemDetail,
} from '../../../type_interface/PickingRequestType';

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

const REASON_LABEL: Record<string, string> = {
    MISCOUNT: 'นับผิด',
    SPILLAGE: 'สูญหาย/เสียหาย',
    CORRECTION: 'แก้ไขรายการ',
    OTHER: 'อื่นๆ',
    REALLOCATE: 'โอนไปรายการอื่น',
};

const SESSION_BADGE: Record<string, string> = {
    PENDING: 'badge-light-secondary',
    INPROGRESS: 'badge-light-warning',
    COMPLETED: 'badge-light-success',
};

const WORK_RUN_BADGE: Record<string, string> = {
    PENDING: 'badge-light-secondary',
    INPROGRESS: 'badge-light-warning',
    PAUSED: 'badge-light-info',
    COMPLETED: 'badge-light-success',
    CANCELLED: 'badge-light-danger',
};

const formatDate = (s: string | null) => {
    if (!s) return '-';
    return new Date(s).toLocaleString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const DeltaBadge: React.FC<{ value: number }> = ({ value }) => {
    if (value === 0) return <span className='text-muted'>0</span>;
    return (
        <span className={`fw-bold ${value > 0 ? 'text-success' : 'text-danger'}`}>
            {value > 0 ? `+${value}` : value}
        </span>
    );
};

const AvailableBadge: React.FC<{ value: number; unit: string }> = ({ value, unit }) => {
    const cls = value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-muted';
    return <span className={`fw-bold ${cls}`}>{value} <span className='fw-normal text-muted fs-8'>{unit}</span></span>;
};

const ItemRow: React.FC<{ item: PickingRequestItemDetail; onAdjust: (item: PickingRequestItemDetail) => void }> = ({ item, onAdjust }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetail = item.adjustments.length > 0 || item.test_result_consumptions.length > 0 || item.work_run_consumptions.length > 0;

    return (
        <>
            <tr className={expanded ? 'table-active' : ''}>
                <td>
                    <div className='fw-bold text-gray-800'>{item.item_name}</div>
                    <div className='text-muted fs-8 mt-1'>{item.item_code}</div>
                </td>
                <td className='text-center fw-bold text-gray-800'>{item.quantity}</td>
                <td className='text-center text-muted'>{item.unit}</td>
                <td className='text-center fw-semibold text-gray-700'>{item.qty_committed}</td>
                <td className='text-center'><DeltaBadge value={item.adj_total} /></td>
                <td className='text-center'><AvailableBadge value={item.qty_available} unit={item.unit} /></td>
                <td className='text-center'>
                    <div className='d-flex justify-content-center gap-1'>
                        <button
                            className='btn btn-icon btn-sm btn-light-warning'
                            title='ปรับปรุงรายการ'
                            onClick={() => onAdjust(item)}
                        >
                            <i className='bi bi-pencil-square fs-6'></i>
                        </button>
                        {hasDetail ? (
                            <button
                                className='btn btn-icon btn-sm btn-light'
                                title='ดูรายละเอียด'
                                onClick={() => setExpanded(p => !p)}
                            >
                                <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} fs-6`}></i>
                            </button>
                        ) : (
                            <span className='d-inline-block' style={{ width: 30 }}></span>
                        )}
                    </div>
                </td>
            </tr>

            {expanded && (
                <tr>
                    <td colSpan={7} className='p-0'>
                        <div className='px-8 py-5 bg-light'>
                            <div className='row g-5'>
                                {/* Adjustments */}
                                {item.adjustments.length > 0 && (
                                    <div className='col-12'>
                                        <div className='fs-8 fw-bold text-muted text-uppercase mb-3'>
                                            <i className='bi bi-pencil-square me-1 text-warning'></i>การปรับปรุง ({item.adjustments.length})
                                        </div>
                                        <div className='table-responsive'>
                                            <table className='table table-bordered align-middle fs-7 mb-0 bg-white'>
                                                <thead className='table-light'>
                                                    <tr className='fw-bold text-gray-700 fs-8'>
                                                        <th className='w-90px text-center'>จำนวนที่ปรับ</th>
                                                        <th className='w-180px'>เหตุผล</th>
                                                        <th className='w-250px'>คู่โอน (Reallocate)</th>
                                                        <th>หมายเหตุ</th>
                                                        <th className='w-120px'>บันทึกโดย</th>
                                                        <th className='w-150px'>วันที่</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.adjustments.map(adj => {
                                                        const isRealloc = adj.reason === 'REALLOCATE';
                                                        const cp = adj.counterparty;
                                                        const direction = adj.delta_qty < 0 ? 'out' : 'in';
                                                        return (
                                                            <tr key={adj.id}>
                                                                <td className='text-center'><DeltaBadge value={adj.delta_qty} /></td>
                                                                <td>
                                                                    <span className={`badge ${isRealloc ? 'badge-light-info' : 'badge-light-secondary'} fw-bold fs-8`}>
                                                                        {isRealloc && (
                                                                            <i className={`bi bi-arrow-${direction === 'out' ? 'right' : 'left'} me-1`}></i>
                                                                        )}
                                                                        {REASON_LABEL[adj.reason] ?? adj.reason}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {isRealloc && cp ? (
                                                                        <div>
                                                                            <div className='fw-bold fs-8'>
                                                                                <i className={`bi bi-arrow-${direction === 'out' ? 'up-right' : 'down-left'} me-1 ${direction === 'out' ? 'text-danger' : 'text-success'}`}></i>
                                                                                {cp.picking_request_id ? (
                                                                                    <a
                                                                                        href={`/documents/picking_request/${cp.picking_request_id}`}
                                                                                        target='_blank'
                                                                                        rel='noopener noreferrer'
                                                                                        className='text-primary text-hover-primary text-decoration-underline'
                                                                                        title='เปิดใบเบิกในแท็บใหม่'
                                                                                    >
                                                                                        {cp.picking_request_code ?? `PR #${cp.picking_request_id}`}
                                                                                        <i className='bi bi-box-arrow-up-right ms-1 fs-9'></i>
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className='text-gray-800'>
                                                                                        {cp.picking_request_code ?? `PRI #${cp.picking_request_item_id}`}
                                                                                    </span>
                                                                                )}
                                                                                {cp.so_order_line_num != null && (
                                                                                    <span className='text-muted fw-normal ms-2'>Line {cp.so_order_line_num}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className='text-muted fs-8 mt-1'>
                                                                                {cp.item_code} — {cp.item_name}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className='text-muted'>-</span>
                                                                    )}
                                                                </td>
                                                                <td className='text-gray-600'>{adj.remark ?? '-'}</td>
                                                                <td className='text-gray-600'>{adj.created_by ?? '-'}</td>
                                                                <td className='text-gray-600'>{formatDate(adj.created_date)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Test Result Consumptions */}
                                {item.test_result_consumptions.length > 0 && (
                                    <div className='col-12'>
                                        <div className='fs-8 fw-bold text-muted text-uppercase mb-3'>
                                            <i className='bi bi-clipboard2-check me-1 text-primary'></i>การใช้ในการทดสอบ ({item.test_result_consumptions.length})
                                        </div>
                                        <div className='table-responsive'>
                                            <table className='table table-bordered align-middle fs-7 mb-0 bg-white'>
                                                <thead className='table-light'>
                                                    <tr className='fw-bold text-gray-700 fs-8'>
                                                        <th>รหัส Test Result</th>
                                                        <th className='w-130px text-center'>สถานะ Session</th>
                                                        <th className='w-110px text-center'>ผลการทดสอบ</th>
                                                        <th className='w-90px text-center'>จัดสรร</th>
                                                        <th className='w-90px text-center'>ใช้จริง</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.test_result_consumptions.map(c => (
                                                        <tr key={c.id}>
                                                            <td>
                                                                <a
                                                                    href={`/quality_control/test_result/${c.test_result.test_result_id}`}
                                                                    target='_blank'
                                                                    rel='noopener noreferrer'
                                                                    className='fw-bold text-primary text-hover-primary text-decoration-underline'
                                                                    title='เปิด Test Result ในแท็บใหม่'
                                                                >
                                                                    {c.test_result.test_result_code}
                                                                    <i className='bi bi-box-arrow-up-right ms-1 fs-9'></i>
                                                                </a>
                                                            </td>
                                                            <td className='text-center'>
                                                                <span className={`badge ${SESSION_BADGE[c.test_result.session_status] ?? 'badge-light-secondary'} fw-bold fs-8`}>
                                                                    {c.test_result.session_status}
                                                                </span>
                                                            </td>
                                                            <td className='text-center'>
                                                                {c.test_result.overall_status ? (
                                                                    <span className={`badge fw-bold fs-8 ${c.test_result.overall_status === 'PASSED' ? 'badge-light-success' : 'badge-light-danger'}`}>
                                                                        {c.test_result.overall_status}
                                                                    </span>
                                                                ) : (
                                                                    <span className='text-muted'>-</span>
                                                                )}
                                                            </td>
                                                            <td className='text-center fw-semibold text-gray-700'>{c.qty_allocated}</td>
                                                            <td className='text-center fw-semibold text-gray-700'>{c.qty_consumed ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Work Run Consumptions */}
                                {item.work_run_consumptions.length > 0 && (
                                    <div className='col-12'>
                                        <div className='fs-8 fw-bold text-muted text-uppercase mb-3'>
                                            <i className='bi bi-diagram-3 me-1 text-info'></i>การใช้ใน Work Run ({item.work_run_consumptions.length})
                                        </div>
                                        <div className='table-responsive'>
                                            <table className='table table-bordered align-middle fs-7 mb-0 bg-white'>
                                                <thead className='table-light'>
                                                    <tr className='fw-bold text-gray-700 fs-8'>
                                                        <th>Lot Number</th>
                                                        <th className='w-100px text-center'>Work Run ID</th>
                                                        <th className='w-130px text-center'>สถานะ</th>
                                                        <th className='w-90px text-center'>จัดสรร</th>
                                                        <th className='w-90px text-center'>ใช้จริง</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.work_run_consumptions.map(c => (
                                                        <tr key={c.id}>
                                                            <td>
                                                                <a
                                                                    href={`/workorder/work_run/${c.work_run.work_run_id}`}
                                                                    target='_blank'
                                                                    rel='noopener noreferrer'
                                                                    className='fw-bold text-primary text-hover-primary text-decoration-underline'
                                                                    title='เปิด Work Run ในแท็บใหม่'
                                                                >
                                                                    {c.work_run.lot_number ?? '-'}
                                                                    <i className='bi bi-box-arrow-up-right ms-1 fs-9'></i>
                                                                </a>
                                                            </td>
                                                            <td className='text-center'>
                                                                <a
                                                                    href={`/workorder/work_run/${c.work_run.work_run_id}`}
                                                                    target='_blank'
                                                                    rel='noopener noreferrer'
                                                                    className='text-primary text-hover-primary text-decoration-underline'
                                                                    title='เปิด Work Run ในแท็บใหม่'
                                                                >
                                                                    #{c.work_run.work_run_id}
                                                                </a>
                                                            </td>
                                                            <td className='text-center'>
                                                                <span className={`badge ${WORK_RUN_BADGE[c.work_run.status] ?? 'badge-light-secondary'} fw-bold fs-8`}>
                                                                    {c.work_run.status}
                                                                </span>
                                                            </td>
                                                            <td className='text-center fw-semibold text-gray-700'>{c.qty_allocated}</td>
                                                            <td className='text-center fw-semibold text-gray-700'>{c.qty_consumed ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const PickingRequestView: React.FC = () => {
    const navigate = useNavigate();
    const { pickingRequestId } = useParams<{ pickingRequestId: string }>();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [pr, setPr] = useState<PickingRequestDetail | null>(null);
    const [adjustTarget, setAdjustTarget] = useState<PickingRequestItemDetail | null>(null);

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

    const openAdjustModal = (item: PickingRequestItemDetail) => {
        setAdjustTarget(item);
    };

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
                                <span className='fw-semibold text-gray-700 fs-7'>{pr.wms_reference ?? <span>ไม่ถูกส่งไป WMS <span className='fw-bold text-info'>(Reallocate)</span></span>}</span>
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
                                        <th className='w-110px text-center'>
                                            <span title='จำนวนที่ถูกนำไปใช้งาน'>Committed</span>
                                        </th>
                                        <th className='w-100px text-center'>
                                            <span title='ผลรวมการปรับปรุง'>Adj. รวม</span>
                                        </th>
                                        <th className='w-110px text-center'>
                                            <span title='จำนวนคงเหลือที่ใช้ได้'>คงเหลือ</span>
                                        </th>
                                        <th className='w-50px'></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pr.items.map(item => (
                                        <ItemRow key={item.picking_request_item_id} item={item} onAdjust={openAdjustModal} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <AdjustItemModal
                show={adjustTarget !== null}
                onHide={() => setAdjustTarget(null)}
                item={adjustTarget}
                onSuccess={fetchDetail}
            />
        </Content>
    );
};

export default PickingRequestView;
