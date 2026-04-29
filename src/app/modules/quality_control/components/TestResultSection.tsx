import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Modal } from "react-bootstrap";
import {
    createTestResult,
    getTestResultsByQCWorkOrder,
} from "../../../services/testResultService";
import { getWorkRunsBySalesItem } from "../../../services/workRunService";
import { formatIntegerInput } from "../../../utils/input_format_utils";

interface WorkRunAllocation {
    work_run_id: number;
    qty_from_run: number;
}

interface Props {
    qcWorkOrderId: number;
    quantity: number;
    salesItemDescription?: string;
    salesItemId?: number;
    testResultsPre: any[];
    qcItems?: any[];
}

interface ClaimForm {
    claimed_qty: number;
    work_runs: WorkRunAllocation[];
    remark: string;
}

interface WorkRunOption {
    work_run_id: number;
    status: string;
    quantity: number;
    tested_qty: number;
    untested_qty: number;
    usable_qty: number;
}

const SessionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === "COMPLETED") return <span className="badge badge-light-success fw-bold px-3 py-2">เสร็จสิ้น</span>;
    if (status === "INPROGRESS") return <span className="badge badge-light-warning fw-bold px-3 py-2">กำลังทดสอบ</span>;
    if (status === "PENDING") return <span className="badge badge-light-secondary fw-bold px-3 py-2">รอเริ่ม</span>;
    return <span className="badge badge-light-secondary fw-bold px-3 py-2">{status}</span>;
};

const OverallStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
    if (!status) return null;
    return (
        <span className={`badge fw-bold px-3 py-2 ${status === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
            {status}
        </span>
    );
};

const TestResultSection: React.FC<Props> = ({
    qcWorkOrderId,
    quantity,
    salesItemId,
    testResultsPre,
}) => {
    const navigate = useNavigate();
    const [testResults, setTestResults] = useState<any[]>(testResultsPre);
    const [loading, setLoading] = useState(false);

    // Claim form
    const [showClaimForm, setShowClaimForm] = useState(false);
    const [claimSaving, setClaimSaving] = useState(false);
    const [claimForm, setClaimForm] = useState<ClaimForm>({ claimed_qty: quantity, work_runs: [], remark: "" });
    const [availableWorkRuns, setAvailableWorkRuns] = useState<WorkRunOption[]>([]);
    const [loadingWorkRuns, setLoadingWorkRuns] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);

    const reloadResults = async () => {
        setLoading(true);
        try {
            const res = await getTestResultsByQCWorkOrder(qcWorkOrderId);
            if (res.success) setTestResults(Array.isArray(res.data) ? res.data : []);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenClaimForm = async () => {
        setClaimForm({ claimed_qty: quantity, work_runs: [], remark: "" });
        setClaimError(null);
        setShowClaimForm(true);
        if (salesItemId) {
            setLoadingWorkRuns(true);
            try {
                const res = await getWorkRunsBySalesItem(salesItemId);
                setAvailableWorkRuns(res.success && Array.isArray(res.data) ? res.data : []);
            } finally {
                setLoadingWorkRuns(false);
            }
        }
    };

    const toggleWorkRunAllocation = (workRunId: number) => {
        setClaimError(null);
        setClaimForm(prev => {
            const exists = prev.work_runs.find(a => a.work_run_id === workRunId);
            if (exists) return { ...prev, work_runs: prev.work_runs.filter(a => a.work_run_id !== workRunId) };
            return { ...prev, work_runs: [...prev.work_runs, { work_run_id: workRunId, qty_from_run: 1 }] };
        });
    };

    const setAllocationQty = (workRunId: number, qty: number) => {
        setClaimError(null);
        setClaimForm(prev => ({ ...prev, work_runs: prev.work_runs.map(a => a.work_run_id === workRunId ? { ...a, qty_from_run: qty } : a) }));
    };

    const handleClaim = async () => {
        if (claimForm.claimed_qty <= 0) { Swal.fire("แจ้งเตือน", "จำนวนต้องมากกว่า 0", "warning"); return; }
        if (claimForm.work_runs.length > 0) {
            const total = claimForm.work_runs.reduce((s, a) => s + a.qty_from_run, 0);
            if (total !== claimForm.claimed_qty) {
                setClaimError(`จำนวนรวมจาก Work Run (${total}) ต้องเท่ากับจำนวนที่ขอทดสอบ (${claimForm.claimed_qty})`);
                return;
            }
        }
        setClaimError(null);
        setClaimSaving(true);
        try {
            const payload: any = { claimed_qty: claimForm.claimed_qty, remark: claimForm.remark || undefined };
            if (claimForm.work_runs.length > 0) payload.work_run_sources = claimForm.work_runs;
            const res = await createTestResult(qcWorkOrderId, payload);
            if (res.success) {
                setShowClaimForm(false);
                Swal.fire({ title: "สร้าง Session สำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
                reloadResults();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถสร้างได้", "error");
            }
        } finally {
            setClaimSaving(false);
        }
    };

    return (
        <div>
            <div className="card border-0 shadow-sm">
                {/* Header */}
                <div className="card-header bg-white border-bottom border-gray-200 d-flex justify-content-between align-items-center py-4 px-6">
                    <div className="d-flex align-items-center gap-3">
                        <h5 className="mb-0 fw-bold text-gray-800">ผลการทดสอบ (Test Results)</h5>
                        {testResults.length > 0 && <span className="badge badge-light-primary fw-bold">{testResults.length}</span>}
                    </div>
                    <button className="btn btn-sm btn-primary fw-bold" onClick={handleOpenClaimForm}>
                        <i className="bi bi-plus-lg me-1" />สร้างการทดสอบ
                    </button>
                </div>

                <div className="card-body p-6">
                    {loading ? (
                        <div className="text-center py-6 text-muted">
                            <span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...
                        </div>
                    ) : testResults.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <i className="bi bi-clipboard2-x fs-2x d-block mb-3 text-gray-400" />
                            ยังไม่มีผลการทดสอบ
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {testResults.map((tr: any, idx: number) => {
                                const isCompleted = tr.session_status === "COMPLETED";
                                const workRunSources: any[] = tr.work_run_sources ?? [];
                                return (
                                    <div
                                        key={tr.test_result_id}
                                        className={`border rounded cursor-pointer overflow-hidden`}
                                        onClick={() => navigate(`/quality_control/test_result/${tr.test_result_id}`)}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)';
                                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f4ff';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9fafb';
                                        }}
                                    >
                                        <div className="d-flex align-items-center justify-content-between px-5 py-3 bg-light">
                                            <div className="d-flex flex-column gap-2">
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="fw-bold text-gray-700 fs-6">
                                                        {tr.test_result_code || `ครั้งที่ ${idx + 1}`}
                                                    </span>
                                                    <SessionStatusBadge status={tr.session_status} />
                                                </div>
                                                <div className="d-flex align-items-center gap-3 flex-wrap">
                                                    <span className="text-muted fs-7">
                                                        <i className="bi bi-box-seam me-1" />{tr.claimed_qty ?? quantity} ชิ้น
                                                    </span>
                                                    {workRunSources.length > 0 && (
                                                        <span className="d-flex gap-1 flex-wrap">
                                                            {workRunSources.map((src: any) => {
                                                                const badgeCls = src.work_run?.status === "COMPLETED" ? "badge-light-success"
                                                                    : src.work_run?.status === "INPROGRESS" ? "badge-light-warning"
                                                                        : "badge-light-secondary";
                                                                return (
                                                                    <span key={src.work_run_id} className={`fs-8`}>
                                                                        {src.work_run?.lot_number || `WR#${src.work_run_id}`} · {src.qty_from_run} ชิ้น
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    )}
                                                    {isCompleted && tr.test_date && (
                                                        <span className="text-muted fs-7">
                                                            <i className="bi bi-calendar3 me-1" />{tr.test_date.split("T")[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="fw-bold flex-shrink-0">
                                                <i className="bi bi-chevron-right text-muted" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal show={showClaimForm} onHide={() => !claimSaving && setShowClaimForm(false)} centered size="xl">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-clipboard-plus me-2" />เริ่ม Session ทดสอบใหม่
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-6">
                    <div className="row g-4 mb-5">
                        <div className="col-md-3">
                            <label className="form-label fw-bold required">จำนวนที่ขอทดสอบ</label>
                            <input
                                type="text"
                                className="form-control"
                                value={claimForm.claimed_qty === 0 ? "" : String(claimForm.claimed_qty)}
                                onChange={e => {
                                    const s = formatIntegerInput(e.target.value);
                                    setClaimForm(p => ({ ...p, claimed_qty: s === "" ? 0 : Number(s) }));
                                }}
                            />
                        </div>
                        <div className="col-md-9">
                            <label className="form-label fw-bold">หมายเหตุ</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="หมายเหตุ (ถ้ามี)"
                                value={claimForm.remark}
                                onChange={e => setClaimForm(p => ({ ...p, remark: e.target.value }))}
                            />
                        </div>
                    </div>

                    {salesItemId && (
                        <div className="mb-5">
                            <label className="form-label fw-bold">Work Runs ที่เกี่ยวข้อง</label>
                            {loadingWorkRuns ? (
                                <div className="text-muted fs-7 py-2"><span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...</div>
                            ) : availableWorkRuns.length === 0 ? (
                                <div className="text-muted fs-7 py-2">ไม่มี Work Run สำหรับรายการนี้</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered align-middle fs-7 mb-0">
                                        <thead className="table-light">
                                            <tr className="fw-bold text-gray-700 text-center">
                                                <th className="w-50px">เลือก</th>
                                                <th className="text-start">Work Run</th>
                                                <th className="w-110px">สถานะ</th>
                                                <th className="w-80px">ทั้งหมด</th>
                                                <th className="w-80px">เทสแล้ว</th>
                                                <th className="w-80px">คงเหลือ</th>
                                                <th className="w-130px">นำมาทดสอบ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {availableWorkRuns.map(wr => {
                                                const allocation = claimForm.work_runs.find(a => a.work_run_id === wr.work_run_id);
                                                const isChecked = !!allocation;
                                                return (
                                                    <tr key={wr.work_run_id} className={isChecked ? "table-active" : ""}>
                                                        <td className="text-center">
                                                            <input type="checkbox" className="form-check-input" checked={isChecked} onChange={() => toggleWorkRunAllocation(wr.work_run_id)} />
                                                        </td>
                                                        <td className="fw-bold">Work Run #{wr.work_run_id}</td>
                                                        <td className="text-center">
                                                            <span className={`badge fw-bold ${wr.status === "COMPLETED" ? "badge-light-success" : "badge-light-warning"}`}>{wr.status}</span>
                                                        </td>
                                                        <td className="text-center">{wr.quantity}</td>
                                                        <td className="text-center">{wr.tested_qty}</td>
                                                        <td className="text-center fw-bold text-primary">{wr.untested_qty}</td>
                                                        <td className="text-center">
                                                            {isChecked ? (
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm text-center"
                                                                    value={allocation!.qty_from_run === 0 ? "" : String(allocation!.qty_from_run)}
                                                                    onChange={e => { const s = formatIntegerInput(e.target.value); setAllocationQty(wr.work_run_id, s === "" ? 0 : Number(s)); }}
                                                                />
                                                            ) : (
                                                                <span className="text-muted">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {claimForm.work_runs.length > 0 && (() => {
                        const total = claimForm.work_runs.reduce((s, a) => s + a.qty_from_run, 0);
                        const diff = claimForm.claimed_qty - total;
                        return (
                            <div className={`mb-4 px-4 py-2 rounded d-flex align-items-center gap-2 ${diff !== 0 ? "bg-light-danger text-danger" : "bg-light-success text-success"}`}>
                                <i className={`bi ${diff !== 0 ? "bi-exclamation-triangle" : "bi-check-circle"} fw-bold`} />
                                <span className="fw-bold fs-7">รวม: {total} / {claimForm.claimed_qty}{diff > 0 ? ` (ขาด ${diff})` : diff < 0 ? ` (เกิน ${Math.abs(diff)})` : ""}</span>
                            </div>
                        );
                    })()}

                    {claimError && (
                        <div className="alert alert-danger py-2 px-4 mb-0 fs-7">
                            <i className="bi bi-exclamation-circle me-2" />{claimError}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light fw-bold" onClick={() => setShowClaimForm(false)} disabled={claimSaving}>ยกเลิก</button>
                    <button className="btn btn-primary fw-bold" onClick={handleClaim} disabled={claimSaving}>
                        {claimSaving ? <><span className="spinner-border spinner-border-sm me-2" />กำลังสร้าง...</> : <><i className="bi bi-play-fill me-2" />สร้างการทดสอบ</>}
                    </button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TestResultSection;
