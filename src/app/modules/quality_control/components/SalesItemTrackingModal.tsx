import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { getSalesItemTracking } from '../../../services/salesOrderService';
import { formatThaiDate } from '../../../helpers/dataHelpers';
import {
    WORK_ORDER_STATUS_LABEL,
    WORK_ORDER_STATUS_BADGE,
    SALES_ITEM_STATUS_LABEL,
    SALES_ITEM_STATUS_BADGE,
    QC_WORK_ORDER_STATUS_LABEL,
    QC_WORK_ORDER_STATUS_BADGE,
} from '../../../helpers/statusLabels';

interface WorkRun {
    work_run_id: number;
    work_order_id: number;
    quantity: number;
    status: string;
    usable_qty: number | null;
    defect_qty: number | null;
    completion_remark: string | null;
    created_date: string | null;
    wms_pick_reference: string | null;
    lot_number: string
}

interface WorkOrder {
    work_order_id: number;
    work_order_code: string;
    status: string;
    quantity: number;
    work_runs: WorkRun[];
}

interface TestResult {
    test_result_id: number;
    session_status: string;
    claimed_qty: number | null;
    overall_status: string | null;
    created_date: string | null;
}

interface QCWorkOrder {
    qc_work_order_id: number;
    qc_work_order_code: string;
    status: string;
    qc_date: string | null;
    qc_by: string | null;
    quantity: number;
    remark: string | null;
    test_results: TestResult[];
    created_by : string
    created_at : string
}

interface SalesItemTrackingData {
    sales_item_id: number;
    item_code: string;
    item_name: string;
    item_group: string;
    quantity: number;
    item_description: string | null;
    doc_num: number;
    doc_entry: number;
    status: string;
    work_order: WorkOrder | null;
    qc_work_orders: QCWorkOrder[];
}

interface Props {
    show: boolean;
    onHide: () => void;
    salesItemId: number | null;
}

// Builds the { label, css } shape StatusBadge below expects, from the
// shared label/badge lookups in helpers/statusLabels.ts.
const toStatusMap = <T extends string>(
    labels: Record<T, string>,
    badges: Record<T, string>
): Record<string, { label: string; css: string }> =>
    Object.fromEntries(
        (Object.keys(labels) as T[]).map((key) => [key, { label: labels[key], css: badges[key] }])
    );

const WORK_ORDER_STATUS = toStatusMap(WORK_ORDER_STATUS_LABEL, WORK_ORDER_STATUS_BADGE);

const status = toStatusMap(QC_WORK_ORDER_STATUS_LABEL, QC_WORK_ORDER_STATUS_BADGE);

const ITEM_STATUS = toStatusMap(SALES_ITEM_STATUS_LABEL, SALES_ITEM_STATUS_BADGE);

const StatusBadge: React.FC<{ status: string; map: Record<string, { label: string; css: string }> }> = ({ status, map }) => {
    const entry = map[status] || { label: status, css: 'badge-light-dark' };
    return <span className={`badge ${entry.css} fw-bold`}>{entry.label}</span>;
};

const SalesItemTrackingModal: React.FC<Props> = ({ show, onHide, salesItemId }) => {
    const [data, setData] = useState<SalesItemTrackingData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && salesItemId) {
            fetchTracking(salesItemId);
        }
        if (!show) {
            setData(null);
        }
    }, [show, salesItemId]);

    const fetchTracking = async (id: number) => {
        setLoading(true);
        try {
            const res = await getSalesItemTracking(id);
            if (res.success && res.data) {
                setData(res.data);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    if (!salesItemId) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
            <Modal.Header className="border-0 pb-0" closeButton>
                <Modal.Title className="fw-bold fs-3">
                    <i className="bi bi-pin-map text-primary me-2"></i>
                    ติดตามสถานะสินค้า
                    {data && (
                        <span className="text-primary ms-2">{data.item_name}</span>
                    )}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-5 pb-8">
                {loading && (
                    <div className="d-flex align-items-center justify-content-center py-10">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        <span className="text-muted">กำลังโหลดข้อมูล...</span>
                    </div>
                )}

                {!loading && !data && (
                    <div className="text-center text-muted py-10">
                        <i className="bi bi-exclamation-circle fs-2x d-block mb-2"></i>
                        ไม่พบข้อมูล
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* Sales Item Info */}
                        <div className="card border mb-6">
                            <div className="card-body py-4">
                                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                                    <div>
                                        <div className="fw-bold fs-5 text-gray-900 mb-1">
                                            {data.item_name}
                                            <span className="text-muted fw-semibold fs-7 ms-2">{data.item_code}</span>
                                            {data.item_group && <span className="badge badge-light-info ms-2 fs-8">{data.item_group}</span>}
                                        </div>
                                        {data.item_description && (
                                            <div className="text-muted fs-7 mb-1">{data.item_description}</div>
                                        )}
                                        <div className="text-muted fs-7">
                                            ใบสั่งขาย <span className="fw-bold text-gray-700">#{data.doc_num}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={data.status} map={ITEM_STATUS} />
                                </div>
                            </div>
                        </div>

                        {/* Work Order Section */}
                        <div className="mb-6">
                            <h5 className="fw-bold text-gray-800 mb-4">
                                <i className="bi bi-gear text-primary me-2"></i>
                                ใบสั่งผลิต
                            </h5>

                            {!data.work_order ? (
                                <div className="text-muted fs-6 ps-2">
                                    <i className="bi bi-dash-circle me-2"></i>ยังไม่มีใบสั่งผลิต
                                </div>
                            ) : (
                                <div className="card border">
                                    <div className="card-body py-4">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                                            <div>
                                                <a
                                                    href={`/workorder/workorders_view/${data.work_order.work_order_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="fw-bold fs-6 text-primary text-hover-primary"
                                                >
                                                    ใบสั่งผลิต #{data.work_order.work_order_code}
                                                    <i className="bi bi-box-arrow-up-right ms-2 fs-7"></i>
                                                </a>
                                                <span className="text-muted fs-7 ms-3">
                                                    จำนวน <span className="fw-bold text-gray-700">{data.work_order.quantity}</span> ชิ้น
                                                </span>
                                            </div>
                                            <StatusBadge status={data.work_order.status} map={WORK_ORDER_STATUS} />
                                        </div>

                                        {data.work_order.work_runs.length === 0 ? (
                                            <div className="text-muted fs-7 ps-2">ยังไม่มี Work Run</div>
                                        ) : (
                                            <>
                                                <div className="text-muted fw-semibold fs-7 mb-3">Work Runs ({data.work_order.work_runs.length})</div>
                                                <div className="d-flex flex-column gap-2">
                                                    {data.work_order.work_runs.map((run) => (
                                                        <div key={run.work_run_id} className="d-flex align-items-center flex-wrap gap-3 border rounded px-4 py-3">
                                                            <a
                                                                href={`/workorder/work_run/${run.work_run_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="fw-bold fs-7 text-primary text-hover-primary"
                                                            >
                                                                #{run.lot_number}
                                                                <i className="bi bi-box-arrow-up-right ms-1 fs-8"></i>
                                                            </a>
                                                            <StatusBadge status={run.status} map={WORK_ORDER_STATUS} />
                                                            <span className="text-muted fs-8">
                                                                <i className="bi bi-box-seam me-1"></i>qty: {run.quantity}
                                                            </span>
                                                            {run.usable_qty !== null && (
                                                                <span className="text-success fs-8 fw-semibold">
                                                                    <i className="bi bi-check-circle me-1"></i>ใช้ได้ {run.usable_qty}
                                                                </span>
                                                            )}
                                                            {!!run.defect_qty && (
                                                                <span className="text-danger fs-8 fw-semibold">
                                                                    <i className="bi bi-exclamation-circle me-1"></i>เสีย {run.defect_qty}
                                                                </span>
                                                            )}
                                                            {run.completion_remark && (
                                                                <span className="text-muted fs-8">
                                                                    <i className="bi bi-chat-left-text me-1"></i>{run.completion_remark}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* QC Work Orders Section */}
                        <div>
                            <h5 className="fw-bold text-gray-800 mb-4">
                                <i className="bi bi-clipboard2-check text-primary me-2"></i>
                                ใบสั่งเทส ({data.qc_work_orders.length} รายการ)
                            </h5>

                            {data.qc_work_orders.length === 0 ? (
                                <div className="text-muted fs-6 ps-2">
                                    <i className="bi bi-dash-circle me-2"></i>ยังไม่มีใบสั่งเทส
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-4">
                                    {data.qc_work_orders.map((qc) => (
                                        <div key={qc.qc_work_order_id} className="card border">
                                            <div className="card-body py-4">
                                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
                                                    <div>
                                                        <a
                                                            href={`/quality_control/qc_workorders_list/view/${qc.qc_work_order_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="fw-bold fs-6 text-primary text-hover-primary"
                                                        >
                                                            ใบสั่งเทส #{qc.qc_work_order_code}
                                                            <i className="bi bi-box-arrow-up-right ms-2 fs-7"></i>
                                                        </a>
                                                        <span className="text-muted fs-7 ms-3">
                                                            จำนวน <span className="fw-bold text-gray-700">{qc.quantity}</span> ชิ้น
                                                        </span>
                                                    </div>
                                                    <StatusBadge status={qc.status} map={status} />
                                                </div>

                                                <div className="row g-3 text-muted fs-7 mb-3">
                                                    
                                                    {qc.remark && (
                                                        <div className="col-auto">
                                                            <i className="bi bi-chat-left-text me-1"></i>
                                                            หมายเหตุ: <span className="text-gray-700 fw-semibold">{qc.remark}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {qc.test_results.length > 0 && (
                                                    <>
                                                        <div className="text-muted fw-semibold fs-7 mb-2">ผลการทดสอบ ({qc.test_results.length} session)</div>
                                                        <div className="table-responsive">
                                                            <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-2 fs-7 mb-0">
                                                                <thead>
                                                                    <tr className="fw-bold text-muted text-uppercase">
                                                                        <th>#</th>
                                                                        <th>สถานะ Session</th>
                                                                        <th>จำนวน</th>
                                                                        <th>ผลรวม</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {qc.test_results.map((tr, idx) => (
                                                                        <tr key={tr.test_result_id}>
                                                                            <td>
                                                                                <a
                                                                                    href={`/quality_control/test_result/${tr.test_result_id}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="fw-bold text-primary text-hover-primary"
                                                                                >
                                                                                    #{idx + 1}
                                                                                    <i className="bi bi-box-arrow-up-right ms-1 fs-8"></i>
                                                                                </a>
                                                                            </td>
                                                                            <td>
                                                                                {tr.session_status === 'COMPLETED'
                                                                                    ? <span className="badge badge-light-success fw-bold">เสร็จสิ้น</span>
                                                                                    : <span className="badge badge-light-warning fw-bold"><i className="bi bi-hourglass-split me-1"></i>กำลังทดสอบ</span>
                                                                                }
                                                                            </td>
                                                                            <td className="text-gray-700">{tr.claimed_qty ?? '-'} ชิ้น</td>
                                                                            <td>
                                                                                {tr.session_status === 'COMPLETED' && tr.overall_status ? (
                                                                                    <span className={`badge fw-bold ${tr.overall_status === 'PASSED' ? 'badge-light-success' : 'badge-light-danger'}`}>
                                                                                        {tr.overall_status === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-muted">-</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0">
                <button className="btn btn-light btn-active-light-primary fw-bold" onClick={onHide}>
                    ปิด
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default SalesItemTrackingModal;
