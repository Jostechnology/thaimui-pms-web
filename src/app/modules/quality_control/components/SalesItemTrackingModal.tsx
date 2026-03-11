import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { getSalesItemTracking } from '../../../services/salesOrderService';
import { formatThaiDate } from '../../../helpers/dataHelpers';

interface WorkPhase {
    phase_name: string;
    phase_status: string;
}

interface CurrentPhase {
    phase_name: string;
    phase_status: string;
}

interface WorkOrder {
    work_order_id: number;
    status: string;
    quantity: number;
    current_phase: CurrentPhase | null;
    work_phases: WorkPhase[];
}

interface TestResult {
    overall_status: string;
    test_date: string | null;
    tested_by: string | null;
    test_result_items: unknown[];
}

interface QCWorkOrder {
    qc_work_order_id: number;
    qc_status: string;
    qc_date: string | null;
    qc_by: string | null;
    quantity: number;
    remark: string | null;
    test_results: TestResult[];
}

interface SalesItemTrackingData {
    sales_item_id: number;
    item_code: string;
    item_name: string;
    item_num: number;
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

const WORK_ORDER_STATUS: Record<string, { label: string; css: string }> = {
    READY: { label: 'รอเริ่ม', css: 'badge-light-primary' },
    INPROGRESS: { label: 'กำลังผลิต', css: 'badge-light-warning' },
    WAIT_TEST: { label: 'รอเทส', css: 'badge-light-info' },
    TESTING: { label: 'กำลังเทส', css: 'badge-light-info' },
    COMPLETED: { label: 'เสร็จสิ้น', css: 'badge-light-success' },
};

const QC_STATUS: Record<string, { label: string; css: string }> = {
    PENDING: { label: 'รอดำเนินการ', css: 'badge-light-primary' },
    INPROGRESS: { label: 'กำลังดำเนินการ', css: 'badge-light-warning' },
    PASSED: { label: 'ผ่าน', css: 'badge-light-success' },
    FAILED: { label: 'ไม่ผ่าน', css: 'badge-light-danger' },
};

const ITEM_STATUS: Record<string, { label: string; css: string }> = {
    READY: { label: 'รอเริ่ม', css: 'badge-light-primary' },
    INPROGRESS: { label: 'กำลังดำเนินการ', css: 'badge-light-warning' },
    WAIT_TEST: { label: 'รอเทส', css: 'badge-light-info' },
    TESTING: { label: 'กำลังเทส', css: 'badge-light-info' },
    COMPLETED: { label: 'เสร็จสิ้น', css: 'badge-light-success' },
};

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
                                                <span className="fw-bold text-gray-900 fs-6">
                                                    ใบสั่งผลิต #{data.work_order.work_order_id}
                                                </span>
                                                <span className="text-muted fs-7 ms-3">
                                                    จำนวน <span className="fw-bold text-gray-700">{data.work_order.quantity}</span> ชิ้น
                                                </span>
                                            </div>
                                            <StatusBadge status={data.work_order.status} map={WORK_ORDER_STATUS} />
                                        </div>

                                        {data.work_order.current_phase && (
                                            <div className="d-flex align-items-center gap-2 mb-4 ps-2 border-start border-3 border-primary">
                                                <div>
                                                    <div className="text-muted fs-7 mb-1">ขั้นตอนปัจจุบัน</div>
                                                    <div className="fw-bold text-gray-800">
                                                        {data.work_order.current_phase.phase_name}
                                                    </div>
                                                </div>
                                                <div className="ms-4">
                                                    <StatusBadge status={data.work_order.current_phase.phase_status} map={WORK_ORDER_STATUS} />
                                                </div>
                                            </div>
                                        )}

                                        {data.work_order.work_phases.length > 0 && (
                                            <>
                                                <div className="text-muted fw-semibold fs-7 mb-3">ขั้นตอนทั้งหมด</div>
                                                <div className="d-flex flex-wrap gap-3">
                                                    {data.work_order.work_phases.map((phase, idx) => (
                                                        <div key={idx} className="d-flex align-items-center gap-2 border rounded px-3 py-2">
                                                            <span className="text-gray-700 fw-semibold fs-7">{phase.phase_name}</span>
                                                            <StatusBadge status={phase.phase_status} map={WORK_ORDER_STATUS} />
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
                                                        <span className="fw-bold text-gray-900 fs-6">
                                                            ใบสั่งเทส #{qc.qc_work_order_id}
                                                        </span>
                                                        <span className="text-muted fs-7 ms-3">
                                                            จำนวน <span className="fw-bold text-gray-700">{qc.quantity}</span> ชิ้น
                                                        </span>
                                                    </div>
                                                    <StatusBadge status={qc.qc_status} map={QC_STATUS} />
                                                </div>

                                                <div className="row g-3 text-muted fs-7 mb-3">
                                                    <div className="col-auto">
                                                        <i className="bi bi-person me-1"></i>
                                                        ผู้ตรวจ: <span className="text-gray-700 fw-semibold">{qc.qc_by || '-'}</span>
                                                    </div>
                                                    <div className="col-auto">
                                                        <i className="bi bi-calendar me-1"></i>
                                                        วันที่: <span className="text-gray-700 fw-semibold">{qc.qc_date ? formatThaiDate(qc.qc_date) : '-'}</span>
                                                    </div>
                                                    {qc.remark && (
                                                        <div className="col-auto">
                                                            <i className="bi bi-chat-left-text me-1"></i>
                                                            หมายเหตุ: <span className="text-gray-700 fw-semibold">{qc.remark}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {qc.test_results.length > 0 && (
                                                    <>
                                                        <div className="text-muted fw-semibold fs-7 mb-2">ผลการทดสอบ</div>
                                                        <div className="table-responsive">
                                                            <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-2 fs-7 mb-0">
                                                                <thead>
                                                                    <tr className="fw-bold text-muted text-uppercase">
                                                                        <th>#</th>
                                                                        <th>ผลรวม</th>
                                                                        <th>ผู้ทดสอบ</th>
                                                                        <th>วันที่ทดสอบ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {qc.test_results.map((tr, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="text-muted">{idx + 1}</td>
                                                                            <td>
                                                                                <span className={`badge fw-bold ${tr.overall_status === 'PASSED' ? 'badge-light-success' : 'badge-light-danger'}`}>
                                                                                    {tr.overall_status === 'PASSED' ? 'ผ่าน' : 'ไม่ผ่าน'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="text-gray-700">{tr.tested_by || '-'}</td>
                                                                            <td className="text-muted">{tr.test_date ? formatThaiDate(tr.test_date) : '-'}</td>
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
