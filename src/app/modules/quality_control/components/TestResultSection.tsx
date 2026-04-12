import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    createTestResult,
    getTestResultsByQCWorkOrder,
    finalizeTestResult,
    deleteTestResult,
} from "../../../services/testResultService";
import { getWorkRunsBySalesItem } from "../../../services/workRunService";
import type { QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";
import { formatIntegerInput, toDecimalInput } from "../../../utils/input_format_utils";

interface WorkRunOption {
    work_run_id: number;
    status: string;
    quantity: number;
    tested_qty: number;
    untested_qty: number;
    usable_qty: number;
    work_order_id?: number;
}

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
    qcItems?: QCWorkOrderItem[];
}

interface ClaimForm {
    claimed_qty: number;
    work_runs: WorkRunAllocation[];
    remark: string;
}

interface FinalizeItemForm {
    unit_number: number;
    serial_no: string;
    wll_measured: string;
    load_test_value: string;
    description: string;
    result: "PASSED" | "FAILED";
    remark: string;
}

interface FinalizeForm {
    test_date: string;
    tested_by: string;
    test_method: string;
    standard_reference: string;
    overall_status: "PASSED" | "FAILED";
    remark: string;
    items: FinalizeItemForm[];
}

const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const buildFinalizeItems = (qty: number, description: string): FinalizeItemForm[] =>
    Array.from({ length: qty }, (_, i) => ({
        unit_number: i + 1,
        serial_no: "",
        wll_measured: "",
        load_test_value: "",
        description,
        result: "PASSED",
        remark: "",
    }));

const defaultFinalizeForm = (qty: number, description: string): FinalizeForm => ({
    test_date: getTodayLocal(),
    tested_by: "",
    test_method: "",
    standard_reference: "",
    overall_status: "PASSED",
    remark: "",
    items: buildFinalizeItems(qty, description),
});

const SessionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === "COMPLETED") return <span className="badge badge-light-success fw-bold px-3 py-2">เสร็จสิ้น</span>;
    if (status === "INPROGRESS") return <span className="badge badge-light-warning fw-bold px-3 py-2"><i className="bi bi-hourglass-split me-1"></i>กำลังทดสอบ</span>;
    return <span className="badge badge-light-secondary fw-bold px-3 py-2">{status}</span>;
};

const OverallStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
    if (!status) return <span className="text-muted fs-7">-</span>;
    return (
        <span className={`badge fw-bold px-3 py-2 ${status === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
            {status === "PASSED" ? "PASSED" : "FAILED"}
        </span>
    );
};

const TestResultSection: React.FC<Props> = ({
    qcWorkOrderId,
    quantity,
    salesItemDescription = "",
    salesItemId,
    testResultsPre,
}) => {
    const [testResults, setTestResults] = useState<any[]>(testResultsPre);
    const [loading, setLoading] = useState(false);
    const [showClaimForm, setShowClaimForm] = useState(false);
    const [claimSaving, setClaimSaving] = useState(false);
    const [claimForm, setClaimForm] = useState<ClaimForm>({
        claimed_qty: quantity,
        work_runs: [],
        remark: "",
    });

    const [availableWorkRuns, setAvailableWorkRuns] = useState<WorkRunOption[]>([]);
    const [loadingWorkRuns, setLoadingWorkRuns] = useState(false);

    // Finalize state — keyed by test_result_id
    const [finalizingId, setFinalizingId] = useState<number | null>(null);
    const [finalizeForm, setFinalizeForm] = useState<FinalizeForm | null>(null);
    const [finalizeSaving, setFinalizeSaving] = useState(false);

    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        reloadResults();
    }, []);

    const reloadResults = async () => {
        setLoading(true);
        try {
            const res = await getTestResultsByQCWorkOrder(qcWorkOrderId);
            if (res.success) setTestResults(Array.isArray(res.data) ? res.data : []);
        } finally {
            setLoading(false);
        }
    };

    // ─── Phase 1: Claim ───────────────────────────────────────────
    const handleOpenClaimForm = async () => {
        setClaimForm({ claimed_qty: quantity, work_runs: [], remark: "" });
        setShowClaimForm(true);

        if (salesItemId) {
            setLoadingWorkRuns(true);
            try {
                const res = await getWorkRunsBySalesItem(salesItemId);
                if (res.success && Array.isArray(res.data)) {
                    setAvailableWorkRuns(res.data);
                } else {
                    setAvailableWorkRuns([]);
                }
            } finally {
                setLoadingWorkRuns(false);
            }
        }
    };

    const toggleWorkRunAllocation = (workRunId: number) => {
        setClaimForm((prev) => {
            const exists = prev.work_runs.find((a) => a.work_run_id === workRunId);
            if (exists) {
                return { ...prev, work_runs: prev.work_runs.filter((a) => a.work_run_id !== workRunId) };
            }
            return { ...prev, work_runs: [...prev.work_runs, { work_run_id: workRunId, qty_from_run: 1 }] };
        });
    };

    const setAllocationQty = (workRunId: number, qty: number) => {
        setClaimForm((prev) => ({
            ...prev,
            work_runs: prev.work_runs.map((a) =>
                a.work_run_id === workRunId ? { ...a, qty_from_run: qty } : a
            ),
        }));
    };

    const handleClaim = async () => {
        if (claimForm.claimed_qty <= 0) {
            Swal.fire("แจ้งเตือน", "จำนวนต้องมากกว่า 0", "warning");
            return;
        }
        setClaimSaving(true);
        try {
            const payload: any = {
                claimed_qty: claimForm.claimed_qty,
                remark: claimForm.remark || undefined,
            };
            if (claimForm.work_runs.length > 0) {
                payload.work_run_sources = claimForm.work_runs;
            }

            const res = await createTestResult(qcWorkOrderId, payload);
            if (res.success) {
                setShowClaimForm(false);
                Swal.fire({ title: "เริ่มทดสอบแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
                reloadResults();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถเริ่มทดสอบได้", "error");
            }
        } finally {
            setClaimSaving(false);
        }
    };

    // ─── Phase 2: Finalize ────────────────────────────────────────
    const handleOpenFinalize = (tr: any) => {
        setFinalizingId(tr.test_result_id);
        setFinalizeForm(defaultFinalizeForm(tr.claimed_qty ?? quantity, salesItemDescription));
        setExpandedId(null);
    };

    const handleFinalizeItemChange = (idx: number, field: keyof FinalizeItemForm, value: string) => {
        setFinalizeForm((prev) => {
            if (!prev) return prev;
            const items = [...prev.items];
            items[idx] = { ...items[idx], [field]: value };
            return { ...prev, items };
        });
    };

    const handleFinalizeFormChange = (field: keyof Omit<FinalizeForm, "items">, value: string) => {
        setFinalizeForm((prev) => prev ? { ...prev, [field]: value } : prev);
    };

    const handleFinalize = async () => {
        if (!finalizeForm || finalizingId === null) return;
        setFinalizeSaving(true);
        try {
            const payload = {
                ...finalizeForm,
                items: finalizeForm.items.map((it) => ({
                    ...it,
                    wll_measured: it.wll_measured === "" ? null : parseFloat(it.wll_measured),
                    load_test_value: it.load_test_value === "" ? null : parseFloat(it.load_test_value),
                })),
            };
            const res = await finalizeTestResult(finalizingId, payload);
            if (res.success) {
                setFinalizingId(null);
                setFinalizeForm(null);
                Swal.fire({ title: "บันทึกผลสำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
                reloadResults();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถบันทึกผลได้", "error");
            }
        } finally {
            setFinalizeSaving(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        const confirm = await Swal.fire({
            title: "ยืนยันการลบ?",
            text: "Session ที่กำลังทดสอบนี้จะถูกยกเลิก",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#d33",
        });
        if (!confirm.isConfirmed) return;
        const res = await deleteTestResult(id);
        if (res.success) {
            Swal.fire({ title: "ยกเลิกแล้ว", icon: "success", timer: 1200, showConfirmButton: false });
            if (finalizingId === id) { setFinalizingId(null); setFinalizeForm(null); }
            reloadResults();
        } else {
            Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถลบได้", "error");
        }
    };

    return (
        <div className="mt-8">
            <div className="card border-0 shadow-sm">
                {/* Header */}
                <div className="card-header bg-white border-bottom border-gray-200 d-flex justify-content-between align-items-center py-4 px-6">
                    <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-clipboard2-check fs-2 text-primary"></i>
                        <h5 className="mb-0 fw-bold text-gray-800">ผลการทดสอบ (Test Results)</h5>
                        {testResults.length > 0 && (
                            <span className="badge badge-light-primary fw-bold">{testResults.length}</span>
                        )}
                    </div>
                    {!showClaimForm && (
                        <button className="btn btn-sm btn-primary fw-bold" onClick={handleOpenClaimForm}>
                            <i className="bi bi-plus-lg me-1"></i>เริ่มทดสอบใหม่
                        </button>
                    )}
                </div>

                <div className="card-body p-6">
                    {/* ── Phase 1: Claim Form ─────────────────────────── */}
                    {showClaimForm && (
                        <div className="border border-primary border-dashed rounded p-6 mb-6 bg-light-primary">
                            <h6 className="fw-bold text-primary mb-5">
                                <i className="bi bi-clipboard-plus me-2"></i>เริ่ม Session ทดสอบใหม่
                            </h6>
                            <div className="row g-4 mb-5">
                                <div className="col-md-3">
                                    <label className="form-label fw-bold required">จำนวนที่ขอทดสอบ (Claimed Qty)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={claimForm.claimed_qty === 0 ? '' : String(claimForm.claimed_qty)}
                                        onChange={(e) => {
                                            const s = formatIntegerInput(e.target.value);
                                            setClaimForm((p) => ({ ...p, claimed_qty: s === '' ? 0 : Number(s) }));
                                        }}
                                    />
                                    <div className="form-text text-muted">จำนวนที่จะ "จองไว้" สำหรับทดสอบ</div>
                                </div>
                                <div className="col-md-9">
                                    <label className="form-label fw-bold">หมายเหตุเบื้องต้น</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="หมายเหตุ (ถ้ามี)"
                                        value={claimForm.remark}
                                        onChange={(e) => setClaimForm((p) => ({ ...p, remark: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Work Run Allocations */}
                            {salesItemId && (
                                <div className="mb-5">
                                    <label className="form-label fw-bold">Work Runs ที่เกี่ยวข้อง</label>
                                    {loadingWorkRuns ? (
                                        <div className="text-muted fs-7 py-2">
                                            <span className="spinner-border spinner-border-sm me-2" />กำลังโหลด Work Runs...
                                        </div>
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
                                                        <th className="w-80px">นำมาทดสอบแล้ว</th>
                                                        <th className="w-80px">ใช้งานได้</th>
                                                        <th className="w-130px">นำมาทดสอบ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {availableWorkRuns.map((wr) => {
                                                        const allocation = claimForm.work_runs.find((a) => a.work_run_id === wr.work_run_id);
                                                        const isChecked = !!allocation;
                                                        const hasEnough = wr.untested_qty > 0;
                                                        return (
                                                            <tr key={wr.work_run_id} className={isChecked ? "table-active" : ""}>
                                                                <td className="text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input"
                                                                        checked={isChecked}
                                                                        onChange={() => toggleWorkRunAllocation(wr.work_run_id)}
                                                                    />
                                                                </td>
                                                                <td className="fw-bold">Work Run #{wr.work_run_id}</td>
                                                                <td className="text-center">
                                                                    <span className={`badge fw-bold ${wr.status === "COMPLETED" ? "badge-light-success" : "badge-light-warning"}`}>
                                                                        {wr.status}
                                                                    </span>
                                                                </td>
                                                                <td className="text-center">{wr.quantity}</td>
                                                                <td className="text-center">
                                                                    <span className={``}>
                                                                        {wr.tested_qty}
                                                                    </span>
                                                                </td>
                                                                <td className="text-center fw-bold text-primary">{wr.untested_qty}
                                                                    {!hasEnough && <i className="bi bi-exclamation-triangle ms-1 text-warning"></i>}
                                                                </td>
                                                                <td className="text-center">
                                                                    {isChecked ? (
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={allocation!.qty_from_run === 0 ? '' : String(allocation!.qty_from_run)}
                                                                            onChange={(e) => {
                                                                                const s = formatIntegerInput(e.target.value);
                                                                                setAllocationQty(wr.work_run_id, s === '' ? 0 : Number(s));
                                                                            }}
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

                            <div className="d-flex justify-content-end gap-3">
                                <button className="btn btn-light fw-bold" onClick={() => setShowClaimForm(false)} disabled={claimSaving}>
                                    ยกเลิก
                                </button>
                                <button className="btn btn-primary fw-bold" onClick={handleClaim} disabled={claimSaving}>
                                    {claimSaving
                                        ? <><span className="spinner-border spinner-border-sm me-2" />กำลังสร้าง...</>
                                        : <><i className="bi bi-play-fill me-2"></i>เริ่มทดสอบ</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Results List ────────────────────────────────── */}
                    {loading ? (
                        <div className="text-center py-6 text-muted">
                            <span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...
                        </div>
                    ) : testResults.length === 0 ? (
                        !showClaimForm && (
                            <div className="text-center py-8 text-muted">
                                <i className="bi bi-clipboard2-x fs-2x d-block mb-3 text-gray-400"></i>
                                ยังไม่มีผลการทดสอบ
                            </div>
                        )
                    ) : (
                        <div className="d-flex flex-column gap-4">
                            {testResults.map((tr: any, idx: number) => {
                                const isInProgress = tr.session_status === "INPROGRESS";
                                const isCompleted = tr.session_status === "COMPLETED";
                                const isFinalizing = finalizingId === tr.test_result_id;
                                const isExpanded = expandedId === tr.test_result_id;
                                const workRunSources: any[] = tr.work_run_sources ?? [];
                                const pickingItemSources: any[] = tr.picking_item_sources ?? [];

                                return (
                                    <div key={tr.test_result_id} className={`border rounded overflow-hidden ${isInProgress ? 'border-warning' : ''}`}>
                                        {/* Row header */}
                                        <div
                                            className={`d-flex align-items-center justify-content-between px-5 py-3 ${isInProgress ? 'bg-light-warning' : 'bg-light'}`}
                                            style={{ cursor: isCompleted ? "pointer" : "default" }}
                                            onClick={() => isCompleted && setExpandedId(isExpanded ? null : tr.test_result_id)}
                                        >
                                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                                <span className="fw-bold text-gray-700 fs-6">{tr.test_result_code || `ครั้งที่ ${idx + 1}`}</span>
                                                <SessionStatusBadge status={tr.session_status} />
                                                {isCompleted && <OverallStatusBadge status={tr.overall_status} />}
                                                <span className="text-muted fs-7">
                                                    <i className="bi bi-box-seam me-1"></i>{tr.claimed_qty ?? quantity} ชิ้น
                                                </span>
                                                {workRunSources.length > 0 && (
                                                    <span className="d-flex gap-1 flex-wrap">
                                                        {workRunSources.map((src: any) => {
                                                            const wrStatus = src.work_run?.status;
                                                            const badgeCls = wrStatus === "COMPLETED" ? "badge-light-success" : wrStatus === "INPROGRESS" ? "badge-light-warning" : "badge-light-secondary";
                                                            return (
                                                                <span key={src.work_run_id} className={`badge ${badgeCls} fs-8`}>
                                                                    {src.work_run?.lot_number || `WR#${src.work_run_id}`} · {src.qty_from_run} ชิ้น
                                                                </span>
                                                            );
                                                        })}
                                                    </span>
                                                )}
                                                {isCompleted && tr.test_date && (
                                                    <span className="text-muted fs-7">
                                                        <i className="bi bi-calendar3 me-1"></i>{tr.test_date.split("T")[0]}
                                                    </span>
                                                )}
                                                {isCompleted && tr.tested_by && (
                                                    <span className="text-muted fs-7">
                                                        <i className="bi bi-person me-1"></i>{tr.tested_by}
                                                    </span>
                                                )}
                                                {tr.remark && (
                                                    <span className="text-muted fs-7">{tr.remark}</span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                {isInProgress && !isFinalizing && (
                                                    <button
                                                        className="btn btn-sm btn-warning fw-bold"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenFinalize(tr); }}
                                                    >
                                                        <i className="bi bi-pencil-square me-1"></i>ป้อนผลทดสอบ
                                                    </button>
                                                )}
                                                {isInProgress && isFinalizing && (
                                                    <button
                                                        className="btn btn-sm btn-light"
                                                        onClick={(e) => { e.stopPropagation(); setFinalizingId(null); setFinalizeForm(null); }}
                                                    >
                                                        ยุบ
                                                    </button>
                                                )}
                                                {isInProgress && (
                                                    <button
                                                        className="btn btn-icon btn-sm btn-light-danger"
                                                        title="ยกเลิก Session"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(tr.test_result_id); }}
                                                    >
                                                        <i className="bi bi-trash fs-5"></i>
                                                    </button>
                                                )}
                                                {isCompleted && (
                                                    <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} text-gray-500`}></i>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── INPROGRESS body: Work Run Sources + Picking Items ── */}
                                        {isInProgress && (workRunSources.length > 0 || pickingItemSources.length > 0) && (
                                            <div className="px-6 py-4 border-top bg-white">
                                                <div className="row g-4">
                                                    {/* Work Run Sources */}
                                                    {workRunSources.length > 0 && (
                                                        <div className={pickingItemSources.length > 0 ? "col-md-6" : "col-12"}>
                                                            <div className="fs-8 fw-bold text-muted text-uppercase mb-2">
                                                                <i className="bi bi-diagram-3 me-1"></i>Work Run ที่นำมาทดสอบ
                                                            </div>
                                                            <div className="d-flex flex-column gap-2">
                                                                {workRunSources.map((src: any) => {
                                                                    const wr = src.work_run ?? {};
                                                                    const statusBadge = wr.status === "COMPLETED" ? "badge-light-success" : wr.status === "INPROGRESS" ? "badge-light-warning" : "badge-light-secondary";
                                                                    return (
                                                                        <div key={src.work_run_id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                                            <div className="d-flex align-items-center gap-3">
                                                                                <span className="fw-bold text-gray-800 fs-7">#{src.work_run.lot_number ?? src.work_run_id}</span>
                                                                                <span className={`badge ${statusBadge} fs-8`}>{wr.status ?? '-'}</span>
                                                                            </div>
                                                                            <div className="d-flex gap-4 text-muted fs-8">
                                                                                <span>นำมา <span className="fw-bold text-gray-700">{src.qty_from_run}</span></span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Picking Item Sources (auto-allocated) */}
                                                    {pickingItemSources.length > 0 && (
                                                        <div className={workRunSources.length > 0 ? "col-md-6" : "col-12"}>
                                                            <div className="fs-8 fw-bold text-muted text-uppercase mb-2">
                                                                <i className="bi bi-box-seam me-1"></i>สินค้าที่เบิกมา
                                                            </div>
                                                            <div className="d-flex flex-column gap-2">
                                                                {pickingItemSources.map((src: any) => {
                                                                    const pri = src.picking_request_item ?? {};
                                                                    return (
                                                                        <div key={src.id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                                            <div className="d-flex align-items-center gap-3">
                                                                                <span className="fw-bold text-gray-800 fs-7">{pri.item_code ?? '-'}</span>
                                                                                <span className="text-muted fs-8">{pri.item_name ?? '-'}</span>
                                                                            </div>
                                                                            <span className="text-muted fs-8">
                                                                                นำมา <span className="fw-bold text-gray-700">{src.qty_consumed}</span>
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Phase 2: Finalize Form (INPROGRESS only) ── */}
                                        {isInProgress && isFinalizing && finalizeForm && (
                                            <div className="px-6 py-5 border-top border-warning bg-white">
                                                <h6 className="fw-bold text-warning mb-5">
                                                    <i className="bi bi-clipboard2-data me-2"></i>
                                                    ป้อนผลการทดสอบ — {tr.claimed_qty ?? quantity} หน่วย
                                                </h6>

                                                {/* Metadata fields */}
                                                <div className="row g-4 mb-6">
                                                    <div className="col-md-3">
                                                        <label className="form-label fw-bold">วันที่ทดสอบ</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={finalizeForm.test_date}
                                                            onChange={(e) => handleFinalizeFormChange("test_date", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label fw-bold">ผู้ทดสอบ</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="ชื่อผู้ทดสอบ"
                                                            value={finalizeForm.tested_by}
                                                            onChange={(e) => handleFinalizeFormChange("tested_by", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label fw-bold">วิธีการทดสอบ</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="e.g. Proof Load Test"
                                                            value={finalizeForm.test_method}
                                                            onChange={(e) => handleFinalizeFormChange("test_method", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label fw-bold">มาตรฐานอ้างอิง</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="e.g. BS EN 13414"
                                                            value={finalizeForm.standard_reference}
                                                            onChange={(e) => handleFinalizeFormChange("standard_reference", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-bold">หมายเหตุ</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="หมายเหตุ (ถ้ามี)"
                                                            value={finalizeForm.remark}
                                                            onChange={(e) => handleFinalizeFormChange("remark", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label fw-bold">ผลการทดสอบโดยรวม</label>
                                                        <div className="d-flex gap-6 mt-2">
                                                            {(["PASSED", "FAILED"] as const).map((s) => (
                                                                <label key={s} className="d-flex align-items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        className="form-check-input"
                                                                        name={`overall_${tr.test_result_id}`}
                                                                        checked={finalizeForm.overall_status === s}
                                                                        onChange={() => handleFinalizeFormChange("overall_status", s)}
                                                                    />
                                                                    <span className={`fw-bold fs-6 ${s === "PASSED" ? "text-success" : "text-danger"}`}>{s}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Per-item table */}
                                                <h6 className="fw-bold text-gray-700 mb-3">
                                                    ผลรายหน่วย ({tr.claimed_qty ?? quantity} หน่วย)
                                                </h6>
                                                <div className="table-responsive mb-5">
                                                    <table className="table table-bordered align-middle fs-7 mb-0">
                                                        <thead className="table-light">
                                                            <tr className="text-center fw-bold text-gray-700">
                                                                <th className="w-60px">ลำดับ</th>
                                                                <th className="text-start">คำอธิบาย</th>
                                                                <th className="w-120px">Serial No.</th>
                                                                <th className="w-100px">WLL วัดได้</th>
                                                                <th className="w-100px">Load Test</th>
                                                                <th className="w-120px">ผล</th>
                                                                <th className="w-150px">หมายเหตุ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {finalizeForm.items.map((item, i) => (
                                                                <tr key={i}>
                                                                    <td className="text-center fw-bold text-gray-600">{item.unit_number}</td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            value={item.description}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "description", e.target.value)}
                                                                            placeholder="คำอธิบาย"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={item.serial_no}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "serial_no", e.target.value)}
                                                                            placeholder="-"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={item.wll_measured}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "wll_measured", toDecimalInput(e.target.value))}
                                                                            placeholder="0.00"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={item.load_test_value}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "load_test_value", toDecimalInput(e.target.value))}
                                                                            placeholder="0.00"
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <select
                                                                            className={`form-select form-select-sm fw-bold ${item.result === "PASSED" ? "text-success" : "text-danger"}`}
                                                                            value={item.result}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "result", e.target.value as "PASSED" | "FAILED")}
                                                                        >
                                                                            <option value="PASSED">PASSED</option>
                                                                            <option value="FAILED">FAILED</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            value={item.remark}
                                                                            onChange={(e) => handleFinalizeItemChange(i, "remark", e.target.value)}
                                                                            placeholder="-"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="d-flex justify-content-end gap-3">
                                                    <button
                                                        className="btn btn-light fw-bold"
                                                        onClick={() => { setFinalizingId(null); setFinalizeForm(null); }}
                                                        disabled={finalizeSaving}
                                                    >
                                                        ยกเลิก
                                                    </button>
                                                    <button
                                                        className="btn btn-success fw-bold"
                                                        onClick={handleFinalize}
                                                        disabled={finalizeSaving}
                                                    >
                                                        {finalizeSaving
                                                            ? <><span className="spinner-border spinner-border-sm me-2" />กำลังบันทึก...</>
                                                            : <><i className="bi bi-check-circle me-2"></i>ยืนยันผลการทดสอบ</>
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Completed: expanded detail ─────────────── */}
                                        {isCompleted && isExpanded && (
                                            <div className="px-5 py-4 border-top">
                                                <div className="d-flex gap-6 fs-7 text-gray-600 mb-4 flex-wrap">
                                                    {tr.test_method && <span><span className="fw-bold">วิธี: </span>{tr.test_method}</span>}
                                                    {tr.standard_reference && <span><span className="fw-bold">มาตรฐาน: </span>{tr.standard_reference}</span>}
                                                    {tr.remark && <span><span className="fw-bold">หมายเหตุ: </span>{tr.remark}</span>}
                                                </div>

                                                {/* Work Run Sources + Picking Item Sources (completed) */}
                                                {(workRunSources.length > 0 || pickingItemSources.length > 0) && (
                                                    <div className="row g-4 mb-5">
                                                        {workRunSources.length > 0 && (
                                                            <div className={pickingItemSources.length > 0 ? "col-md-6" : "col-12"}>
                                                                <div className="fs-8 fw-bold text-muted text-uppercase mb-2">
                                                                    <i className="bi bi-diagram-3 me-1"></i>Work Run ที่นำมาทดสอบ
                                                                </div>
                                                                <div className="d-flex flex-column gap-2">
                                                                    {workRunSources.map((src: any) => {
                                                                        const wr = src.work_run ?? {};
                                                                        const statusBadge = wr.status === "COMPLETED" ? "badge-light-success" : wr.status === "INPROGRESS" ? "badge-light-warning" : "badge-light-secondary";
                                                                        return (
                                                                            <div key={src.work_run_id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                                                <div className="d-flex align-items-center gap-3">
                                                                                    <span className="fw-bold text-gray-800 fs-7">#{src.work_run.lot_number ?? src.work_run_id}</span>
                                                                                    <span className={`badge ${statusBadge} fs-8`}>{wr.status ?? '-'}</span>
                                                                                </div>
                                                                                <div className="d-flex gap-4 text-muted fs-8">
                                                                                    <span>นำมา <span className="fw-bold text-gray-700">{src.qty_from_run}</span></span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {pickingItemSources.length > 0 && (
                                                            <div className={workRunSources.length > 0 ? "col-md-6" : "col-12"}>
                                                                <div className="fs-8 fw-bold text-muted text-uppercase mb-2">
                                                                    <i className="bi bi-box-seam me-1"></i>สินค้าที่เบิกมา
                                                                </div>
                                                                <div className="d-flex flex-column gap-2">
                                                                    {pickingItemSources.map((src: any) => {
                                                                        const pri = src.picking_request_item ?? {};
                                                                        return (
                                                                            <div key={src.id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                                                <div className="d-flex align-items-center gap-3">
                                                                                    <span className="fw-bold text-gray-800 fs-7">{pri.item_code ?? '-'}</span>
                                                                                    <span className="text-muted fs-8">{pri.item_name ?? '-'}</span>
                                                                                </div>
                                                                                <span className="text-muted fs-8">
                                                                                    นำมา <span className="fw-bold text-gray-700">{src.qty_consumed}</span>
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {tr.test_result_items && tr.test_result_items.length > 0 && (
                                                    <div className="table-responsive">
                                                        <table className="table table-bordered align-middle fs-7 mb-0">
                                                            <thead className="table-light">
                                                                <tr className="text-center fw-bold text-gray-700">
                                                                    <th className="w-60px">ลำดับ</th>
                                                                    <th className="text-start">คำอธิบาย</th>
                                                                    <th className="w-120px">Serial No.</th>
                                                                    <th className="w-100px">WLL วัดได้</th>
                                                                    <th className="w-100px">Load Test</th>
                                                                    <th className="w-100px">ผล</th>
                                                                    <th>หมายเหตุ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {tr.test_result_items.map((item: any) => (
                                                                    <tr key={item.test_result_item_id} className="text-center">
                                                                        <td className="fw-bold">{item.unit_number}</td>
                                                                        <td className="text-start">{item.description || "-"}</td>
                                                                        <td>{item.serial_no || "-"}</td>
                                                                        <td>{item.wll_measured ?? "-"}</td>
                                                                        <td>{item.load_test_value ?? "-"}</td>
                                                                        <td><OverallStatusBadge status={item.result} /></td>
                                                                        <td>{item.remark || "-"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestResultSection;
