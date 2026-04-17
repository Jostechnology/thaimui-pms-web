import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    createTestResult,
    getTestResultsByQCWorkOrder,
    finalizeTestResult,
    deleteTestResult,
    createTestResultRequiredItems,
    startTestResult,
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

interface RequiredItemStagedRow {
    qc_item_id?: number;
    item_code: string;
    item_name: string;
    required_qty: string;
    unit: string;
    material_list_id?: number;
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
    if (status === "PENDING") return <span className="badge badge-light-secondary fw-bold px-3 py-2"><i className="bi bi-clock me-1"></i>รอเริ่ม</span>;
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
    qcItems = [],
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
    const [claimError, setClaimError] = useState<string | null>(null);

    // Finalize state — keyed by test_result_id
    const [finalizingId, setFinalizingId] = useState<number | null>(null);
    const [finalizeForm, setFinalizeForm] = useState<FinalizeForm | null>(null);
    const [finalizeSaving, setFinalizeSaving] = useState(false);
    const [finalizeActuals, setFinalizeActuals] = useState<Record<number, string>>({});

    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Required items (PENDING)
    const [reqItemsTargetId, setReqItemsTargetId] = useState<number | null>(null);
    const [reqItemsStaged, setReqItemsStaged] = useState<RequiredItemStagedRow[]>([]);
    const [reqItemsSaving, setReqItemsSaving] = useState(false);
    const [reqItemErrors, setReqItemErrors] = useState<Record<number, string>>({});

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
        setClaimError(null);
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

    // ─── Required Items (PENDING) ─────────────────────────────────
    const handleOpenRequiredItems = (tr: any) => {
        const existingItems: RequiredItemStagedRow[] = (tr.required_items ?? []).map((it: any) => ({
            qc_item_id: it.qc_item_id ?? undefined,
            item_code: it.item_code ?? "",
            item_name: it.item_name ?? "",
            required_qty: String(it.required_qty ?? it.quantity ?? ""),
            unit: it.unit ?? "",
            material_list_id: it.material_list_id ?? undefined,
        }));
        // Pre-populate from qcItems if no existing required_items
        const defaultRows: RequiredItemStagedRow[] = qcItems.length > 0
            ? qcItems.map(qi => ({
                qc_item_id: Number(qi.id),
                item_code: qi.code,
                item_name: qi.description,
                required_qty: qi.quantity ?? "",
                unit: qi.unit_name ?? "",
                material_list_id: qi.material_list_id,
            }))
            : [{ item_code: "", item_name: "", required_qty: "", unit: "" }];
        setReqItemsStaged(existingItems.length > 0 ? existingItems : defaultRows);
        setReqItemErrors({});
        setReqItemsTargetId(tr.test_result_id);
    };

    const updateReqItemField = (idx: number, field: keyof RequiredItemStagedRow, value: string) => {
        setReqItemsStaged(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
        if (reqItemErrors[idx]) setReqItemErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
    };

    const addReqItemRow = () => {
        setReqItemsStaged(prev => [...prev, { item_code: "", item_name: "", required_qty: "", unit: "" }]);
    };

    const removeReqItemRow = (idx: number) => {
        setReqItemsStaged(prev => prev.filter((_, i) => i !== idx));
        setReqItemErrors(prev => {
            const n: Record<number, string> = {};
            Object.entries(prev).forEach(([k, v]) => { const ki = Number(k); if (ki < idx) n[ki] = v; else if (ki > idx) n[ki - 1] = v; });
            return n;
        });
    };

    const handleSaveRequiredItems = async () => {
        const newErrors: Record<number, string> = {};
        reqItemsStaged.forEach((row, i) => {
            if (!row.qc_item_id) newErrors[i] = "กรุณาเลือกสินค้า";
            else if (!row.required_qty || Number(row.required_qty) <= 0) newErrors[i] = "จำนวนต้องมากกว่า 0";
        });
        if (Object.keys(newErrors).length > 0) { setReqItemErrors(newErrors); return; }
        if (reqItemsTargetId === null) return;

        setReqItemsSaving(true);
        try {
            const payload = reqItemsStaged.map(row => ({
                item_code: row.item_code.trim(),
                item_name: row.item_name.trim(),
                required_qty: Number(row.required_qty),
                unit: row.unit.trim(),
                ...(row.qc_item_id != null ? { qc_item_id: row.qc_item_id } : {}),
                ...(row.material_list_id != null ? { material_list_id: row.material_list_id } : {}),
            }));
            const res = await createTestResultRequiredItems(reqItemsTargetId, payload);
            if (res.success) {
                setReqItemsTargetId(null);
                reloadResults();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถบันทึกรายการได้", "error");
            }
        } finally {
            setReqItemsSaving(false);
        }
    };

    const handleStart = async (testResultId: number) => {
        const confirm = await Swal.fire({
            title: "เริ่มทดสอบ?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "เริ่มเลย",
            cancelButtonText: "ยกเลิก",
        });
        if (!confirm.isConfirmed) return;
        const res = await startTestResult(testResultId);
        if (res.success) {
            Swal.fire({ title: "เริ่มทดสอบแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
            reloadResults();
        } else {
            Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถเริ่มทดสอบได้", "error");
        }
    };

    const toggleWorkRunAllocation = (workRunId: number) => {
        setClaimError(null);
        setClaimForm((prev) => {
            const exists = prev.work_runs.find((a) => a.work_run_id === workRunId);
            if (exists) {
                return { ...prev, work_runs: prev.work_runs.filter((a) => a.work_run_id !== workRunId) };
            }
            return { ...prev, work_runs: [...prev.work_runs, { work_run_id: workRunId, qty_from_run: 1 }] };
        });
    };

    const setAllocationQty = (workRunId: number, qty: number) => {
        setClaimError(null);
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
        if (claimForm.work_runs.length > 0) {
            const totalAllocated = claimForm.work_runs.reduce((sum, a) => sum + a.qty_from_run, 0);
            if (totalAllocated !== claimForm.claimed_qty) {
                setClaimError(`จำนวนรวมจาก Work Run (${totalAllocated}) ต้องเท่ากับจำนวนที่ขอทดสอบ (${claimForm.claimed_qty})`);
                return;
            }
        }
        setClaimError(null);
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
        const actuals: Record<number, string> = {};
        (tr.required_items ?? []).forEach((it: any) => { if (it.id != null) actuals[it.id] = ''; });
        setFinalizeActuals(actuals);
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
            const material_actuals = Object.entries(finalizeActuals)
                .filter(([, v]) => v !== '')
                .map(([id, qty]) => ({ test_result_required_item_id: Number(id), qty_used: Number(qty) }));
            const payload = {
                ...finalizeForm,
                items: finalizeForm.items.map((it) => ({
                    ...it,
                    wll_measured: it.wll_measured === "" ? null : parseFloat(it.wll_measured),
                    load_test_value: it.load_test_value === "" ? null : parseFloat(it.load_test_value),
                })),
                ...(material_actuals.length > 0 ? { material_actuals } : {}),
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
                            <i className="bi bi-plus-lg me-1"></i>สร้างการทดสอบ
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

                            {claimForm.work_runs.length > 0 && (() => {
                                const totalAllocated = claimForm.work_runs.reduce((sum, a) => sum + a.qty_from_run, 0);
                                const diff = claimForm.claimed_qty - totalAllocated;
                                return (
                                    <div className={`mb-4 px-4 py-2 rounded d-flex align-items-center gap-2 ${diff !== 0 ? "bg-light-danger text-danger" : "bg-light-success text-success"}`}>
                                        <i className={`bi ${diff !== 0 ? "bi-exclamation-triangle" : "bi-check-circle"} fw-bold`}></i>
                                        <span className="fw-bold fs-7">
                                            รวมจาก Work Run: {totalAllocated} / {claimForm.claimed_qty}
                                            {diff > 0 && ` (ขาดอยู่ ${diff})`}
                                            {diff < 0 && ` (เกินมา ${Math.abs(diff)})`}
                                        </span>
                                    </div>
                                );
                            })()}
                            {claimError && (
                                <div className="alert alert-danger py-2 px-4 mb-4 fs-7">
                                    <i className="bi bi-exclamation-circle me-2"></i>{claimError}
                                </div>
                            )}
                            <div className="d-flex justify-content-end gap-3">
                                <button className="btn btn-light fw-bold" onClick={() => setShowClaimForm(false)} disabled={claimSaving}>
                                    ยกเลิก
                                </button>
                                <button className="btn btn-primary fw-bold" onClick={handleClaim} disabled={claimSaving}>
                                    {claimSaving
                                        ? <><span className="spinner-border spinner-border-sm me-2" />กำลังสร้าง...</>
                                        : <><i className="bi bi-play-fill me-2"></i>สร้างการทดสอบ</>
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
                                const isPending = tr.session_status === "PENDING";
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
                                            className={`d-flex align-items-center justify-content-between px-5 py-3 ${isInProgress ? 'bg-light-warning' : isPending ? 'bg-light-secondary' : 'bg-light'}`}
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
                                                {isPending && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-light-primary fw-bold"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenRequiredItems(tr); }}
                                                        >
                                                            <i className="bi bi-list-check me-1"></i>รายการวัตถุดิบ
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-primary fw-bold"
                                                            onClick={(e) => { e.stopPropagation(); handleStart(tr.test_result_id); }}
                                                        >
                                                            <i className="bi bi-play-fill me-1"></i>เริ่มทดสอบ
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-sm btn-light-danger"
                                                            title="ยกเลิก Session"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(tr.test_result_id); }}
                                                        >
                                                            <i className="bi bi-trash fs-5"></i>
                                                        </button>
                                                    </>
                                                )}
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

                                        {/* ── PENDING body: Required Items editor ── */}
                                        {isPending && reqItemsTargetId === tr.test_result_id && (
                                            <div className="px-6 py-5 border-top bg-white">
                                                <div className="d-flex justify-content-between align-items-center mb-4">
                                                    <h6 className="fw-bold text-gray-700 mb-0">
                                                        <i className="bi bi-list-check me-2 text-primary"></i>รายการวัตถุดิบที่ต้องใช้
                                                    </h6>
                                                    <button className="btn btn-sm btn-light-primary fw-bold" onClick={addReqItemRow}>
                                                        <i className="bi bi-plus-lg me-1"></i>เพิ่มแถว
                                                    </button>
                                                </div>
                                                <div className="table-responsive mb-4">
                                                    <table className="table table-bordered align-middle fs-7 mb-0">
                                                        <thead className="table-light">
                                                            <tr className="fw-bold text-gray-700">
                                                                <th>สินค้า</th>
                                                                <th className="w-80px">หน่วย</th>
                                                                <th className="w-110px">จำนวนที่ต้องการ</th>
                                                                <th className="w-50px"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reqItemsStaged.map((row, i) => {
                                                                const selectedQcItem = qcItems.find(qi => Number(qi.id) === row.qc_item_id);
                                                                return (
                                                                    <tr key={i} className={reqItemErrors[i] ? "table-danger" : ""}>
                                                                        <td>
                                                                            <select
                                                                                className={`form-select form-select-sm ${reqItemErrors[i] ? "is-invalid" : ""}`}
                                                                                value={row.qc_item_id ?? ""}
                                                                                onChange={e => {
                                                                                    const qi = qcItems.find(q => Number(q.id) === Number(e.target.value));
                                                                                    if (qi) {
                                                                                        setReqItemsStaged(prev => prev.map((r, idx) => idx === i ? {
                                                                                            ...r,
                                                                                            qc_item_id: Number(qi.id),
                                                                                            item_code: qi.code,
                                                                                            item_name: qi.description,
                                                                                            unit: qi.unit_name ?? "",
                                                                                            material_list_id: qi.material_list_id,
                                                                                        } : r));
                                                                                        if (reqItemErrors[i]) setReqItemErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                                                                                    } else {
                                                                                        setReqItemsStaged(prev => prev.map((r, idx) => idx === i ? { ...r, qc_item_id: undefined, item_code: "", item_name: "", unit: "", material_list_id: undefined } : r));
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <option value="">-- เลือกสินค้า --</option>
                                                                                {qcItems.map(qi => (
                                                                                    <option key={qi.id} value={Number(qi.id)}>
                                                                                        {qi.code} — {qi.description}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            {reqItemErrors[i] && <div className="invalid-feedback">{reqItemErrors[i]}</div>}
                                                                        </td>
                                                                        <td className="text-center text-muted fw-bold">
                                                                            {selectedQcItem?.unit_name ?? row.unit ?? "-"}
                                                                        </td>
                                                                        <td>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm text-center"
                                                                                value={row.required_qty}
                                                                                onChange={e => updateReqItemField(i, "required_qty", formatIntegerInput(e.target.value))}
                                                                                placeholder="0"
                                                                            />
                                                                        </td>
                                                                        <td className="text-center">
                                                                            <button
                                                                                className="btn btn-icon btn-sm btn-light-danger"
                                                                                onClick={() => removeReqItemRow(i)}
                                                                                disabled={reqItemsStaged.length === 1}
                                                                            >
                                                                                <i className="bi bi-trash fs-6"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="d-flex justify-content-end gap-3">
                                                    <button className="btn btn-light fw-bold" onClick={() => setReqItemsTargetId(null)} disabled={reqItemsSaving}>
                                                        ยกเลิก
                                                    </button>
                                                    <button className="btn btn-primary fw-bold" onClick={handleSaveRequiredItems} disabled={reqItemsSaving}>
                                                        {reqItemsSaving
                                                            ? <><span className="spinner-border spinner-border-sm me-2" />กำลังบันทึก...</>
                                                            : <><i className="bi bi-check2 me-2"></i>บันทึกรายการ ({reqItemsStaged.length})</>
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* show existing required items for PENDING when editor is closed */}
                                        {isPending && reqItemsTargetId !== tr.test_result_id && (tr.required_items ?? []).length > 0 && (
                                            <div className="px-6 py-4 border-top bg-white">
                                                <div className="fs-8 fw-bold text-muted text-uppercase mb-3">
                                                    <i className="bi bi-list-check me-1"></i>รายการวัตถุดิบที่ต้องใช้
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="table table-bordered align-middle fs-7 mb-0">
                                                        <thead className="table-light">
                                                            <tr className="fw-bold text-gray-700">
                                                                <th>รหัสสินค้า</th>
                                                                <th>ชื่อสินค้า</th>
                                                                <th className="w-80px text-center">หน่วย</th>
                                                                <th className="w-110px text-center">จำนวนที่ต้องการ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(tr.required_items as any[]).map((it: any, i: number) => (
                                                                <tr key={i}>
                                                                    <td className="fw-bold text-gray-800">{it.item_code || "-"}</td>
                                                                    <td>{it.item_name || "-"}</td>
                                                                    <td className="text-center text-muted">{it.unit || "-"}</td>
                                                                    <td className="text-center fw-bold text-primary">{it.required_qty ?? it.quantity ?? "-"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── INPROGRESS body: Work Run Sources + Picking Items ── */}
                                        {isInProgress && (workRunSources.length > 0 || pickingItemSources.length > 0) && (
                                            <div className="px-6 py-4 border-top bg-white">
                                                <div className="d-flex flex-column gap-4">
                                                    {/* Work Run Sources */}
                                                    {workRunSources.length > 0 && (
                                                        <div>
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
                                                        <div>
                                                            <div className="fs-8 fw-bold text-muted text-uppercase mb-2">
                                                                <i className="bi bi-box-seam me-1"></i>สินค้าที่เบิกมา
                                                            </div>
                                                            <div className="d-flex flex-column gap-2">
                                                                {pickingItemSources.map((src: any) => {
                                                                    const pri = src.picking_request_item ?? {};
                                                                    return (
                                                                        <div key={src.id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                                            <div className="d-flex align-items-center gap-3">
                                                                                <span className="fw-bold badge badge-info">{pri.picking_request.picking_request_code}</span>
                                                                                <span className="fw-bold text-gray-800 fs-7">{pri.item_code ?? '-'}</span>
                                                                                <span className="text-muted fs-8">{pri.item_name ?? '-'}</span>
                                                                            </div>
                                                                            <span className="text-muted fs-8">
                                                                                นำมา <span className="fw-bold text-gray-700">{src.qty_allocated} {src.picking_request_item.unit}</span>
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

                                                {(tr.required_items ?? []).length > 0 && (
                                                    <div className="mb-5">
                                                        <h6 className="fw-bold text-gray-700 mb-3">
                                                            <i className="bi bi-box-seam me-2 text-primary"></i>จำนวนวัตถุดิบที่ใช้จริง
                                                        </h6>
                                                        <div className="table-responsive">
                                                            <table className="table table-bordered align-middle fs-7 mb-0">
                                                                <thead className="table-light">
                                                                    <tr className="fw-bold text-gray-700">
                                                                        <th>รหัสสินค้า</th>
                                                                        <th>ชื่อสินค้า</th>
                                                                        <th className="w-80px text-center">หน่วย</th>
                                                                        <th className="w-110px text-center">ต้องใช้</th>
                                                                        <th className="w-130px">ใช้จริง</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(tr.required_items as any[]).map((it: any) => (
                                                                        <tr key={it.id ?? it.qc_item_id}>
                                                                            <td className="text-muted fw-semibold">{it.item_code || '-'}</td>
                                                                            <td className="fw-bold text-gray-800">{it.item_name || '-'}</td>
                                                                            <td className="text-center text-muted">{it.unit || '-'}</td>
                                                                            <td className="text-center fw-semibold text-gray-700">{it.required_qty ?? it.quantity ?? '-'}</td>
                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control form-control-sm text-center"
                                                                                    placeholder="0"
                                                                                    value={it.id != null ? (finalizeActuals[it.id] ?? '') : ''}
                                                                                    onChange={e => {
                                                                                        if (it.id == null) return;
                                                                                        const s = formatIntegerInput(e.target.value);
                                                                                        setFinalizeActuals(prev => ({ ...prev, [it.id]: s }));
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

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
                                                    <div className="d-flex flex-column gap-4 mb-5">
                                                        {workRunSources.length > 0 && (
                                                            <div>
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
                                                            <div>
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
