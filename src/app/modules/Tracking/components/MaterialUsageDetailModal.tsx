import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { getMaterialUsageDetail } from '../../../services/materialStockService';
import type { MaterialHistoryRecord } from '../../../type_interface/MaterialStockType';

interface MaterialUsageDetailModalProps {
    show: boolean;
    onHide: () => void;
    materialListId: number | null;
    materialName?: string;
}

const MaterialUsageDetailModal: React.FC<MaterialUsageDetailModalProps> = ({
    show,
    onHide,
    materialListId,
    materialName,
}) => {
    const [historyList, setHistoryList] = useState<MaterialHistoryRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && materialListId) {
            fetchDetail(materialListId);
        }
        if (!show) {
            setHistoryList([]);
        }
    }, [show, materialListId]);

    const fetchDetail = async (id: number) => {
        setLoading(true);
        try {
            const res = await getMaterialUsageDetail(id);
            if (res.success && res.data) {
                setHistoryList(res.data);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; css: string }> = {
            READY: { label: 'พร้อม', css: 'badge-light-primary' },
            INPROGRESS: { label: 'กำลังผลิต', css: 'badge-light-warning' },
            WAIT_TEST: { label: 'รอเทส', css: 'badge-light-info' },
            TESTING: { label: 'กำลังเทส', css: 'badge-light-info' },
            COMPLETED: { label: 'เสร็จสิ้น', css: 'badge-light-success' },
        };
        const entry = map[status] || { label: status, css: 'badge-light-dark' };
        return <span className={`badge ${entry.css}`}>{entry.label}</span>;
    };

    const getTransactionTypeBadge = (type: string) => {
        const map: Record<string, { label: string; css: string }> = {
            REMOVE: { label: 'เบิกออก', css: 'badge-light-danger' },
            ADD: { label: 'เพิ่มเข้า', css: 'badge-light-success' },
            ADJUST: { label: 'ปรับยอด', css: 'badge-light-warning' },
        };
        const entry = map[type] || { label: type, css: 'badge-light-dark' };
        return <span className={`badge ${entry.css}`}>{entry.label}</span>;
    };

    if (!materialListId) return null;

    return (
        <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
            <Modal.Header className="border-0 pb-0" closeButton>
                <Modal.Title className="fw-bold fs-3">
                    <i className="bi bi-diagram-3 text-primary me-2"></i>
                    รายละเอียดการใช้วัตถุดิบ: <span className="text-primary">{materialName || ''}</span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-5 pb-8">
                {loading && (
                    <div className="d-flex align-items-center justify-content-center py-10">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        <span className="text-muted">กำลังโหลดข้อมูล...</span>
                    </div>
                )}

                {!loading && historyList.length > 0 && (
                    <>
                        {/* Summary */}
                        <div className="row g-4 mb-7">
                            <div className="col-md-6">
                                <div className="border rounded p-4 text-center h-100">
                                    <div className="text-muted fw-semibold fs-7 mb-1">จำนวนรายการ</div>
                                    <div className="fs-2 fw-bold text-gray-800">{historyList.length}</div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="border rounded p-4 text-center h-100">
                                    <div className="text-muted fw-semibold fs-7 mb-1">จำนวนรวม</div>
                                    <div className="fs-2 fw-bold text-primary">
                                        {historyList.reduce((sum, h) => sum + h.amount, 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div>
                            <h5 className="fw-bold text-gray-800 mb-4">
                                <i className="bi bi-clock-history text-primary me-2"></i>
                                ประวัติการเคลื่อนไหว ({historyList.length} รายการ)
                            </h5>
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr className="fw-bold text-muted fs-7 text-uppercase">
                                            <th>#</th>
                                            <th>ประเภท</th>
                                            <th>เอกสารอ้างอิง</th>
                                            <th className="text-center">จำนวน</th>
                                            <th>ผู้ดำเนินการ</th>
                                            <th>วันที่</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyList.map((record, idx) => (
                                            <tr key={record.transaction_id}>
                                                <td className="text-muted fs-7">{idx + 1}</td>
                                                <td>
                                                    <span className="badge badge-light-info">{record.action_type}</span>
                                                </td>
                                                <td>
                                                    <span className="fw-semibold text-gray-800">
                                                        <i className="bi bi-file-earmark text-info me-1"></i>
                                                        {record.document_code || '-'}
                                                    </span>
                                                </td>
                                                <td className="text-center fw-bold text-primary">{record.amount}</td>
                                                <td className="text-muted fs-7">{record.action_by || '-'}</td>
                                                <td className="text-muted fs-7">{formatDate(record.action_date || '')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="fw-bold bg-light">
                                            <td colSpan={3} className="text-end pe-4">รวม:</td>
                                            <td className="text-center text-primary">
                                                {historyList.reduce((sum, h) => sum + h.amount, 0)}
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {!loading && historyList.length === 0 && (
                    <div className="text-center text-muted py-10">
                        <i className="bi bi-exclamation-circle fs-2x d-block mb-2"></i>
                        ไม่พบข้อมูลประวัติการใช้วัตถุดิบ
                    </div>
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

export default MaterialUsageDetailModal;
