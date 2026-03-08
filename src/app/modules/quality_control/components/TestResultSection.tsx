import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    createTestResult,
    getTestResultsByQCWorkOrder,
    deleteTestResult,
} from "../../../services/testResultService";

interface Props {
    qcWorkOrderId: number;
    quantity: number;
    salesItemDescription?: string;
}

interface TestResultItemForm {
    unit_number: number;
    serial_no: string;
    wll_measured: string;
    load_test_value: string;
    description: string;
    result: "PASSED" | "FAILED";
    remark: string;
}

interface TestResultForm {
    test_date: string;
    tested_by: string;
    test_method: string;
    standard_reference: string;
    overall_status: "PASSED" | "FAILED";
    remark: string;
    items: TestResultItemForm[];
}

const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const buildDefaultItems = (qty: number, description: string): TestResultItemForm[] =>
    Array.from({ length: qty }, (_, i) => ({
        unit_number: i + 1,
        serial_no: "",
        wll_measured: "",
        load_test_value: "",
        description,
        result: "PASSED",
        remark: "",
    }));

const defaultForm = (qty: number, description: string): TestResultForm => ({
    test_date: getTodayLocal(),
    tested_by: "",
    test_method: "",
    standard_reference: "",
    overall_status: "PASSED",
    remark: "",
    items: buildDefaultItems(qty, description),
});

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={`badge fw-bold px-3 py-2 ${status === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
        {status === "PASSED" ? "PASSED" : "FAILED"}
    </span>
);

const TestResultSection: React.FC<Props> = ({ qcWorkOrderId, quantity, salesItemDescription = "" }) => {
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [form, setForm] = useState<TestResultForm>(() => defaultForm(quantity, salesItemDescription));

    const loadTestResults = async () => {
        setLoading(true);
        try {
            const res = await getTestResultsByQCWorkOrder(qcWorkOrderId);
            if (res.success) setTestResults(Array.isArray(res.data) ? res.data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (qcWorkOrderId) loadTestResults();
    }, [qcWorkOrderId]);

    const handleFormChange = (field: keyof Omit<TestResultForm, "items">, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index: number, field: keyof TestResultItemForm, value: string) => {
        setForm((prev) => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const handleOpenForm = () => {
        setForm(defaultForm(quantity, salesItemDescription));
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                items: form.items.map((it) => ({
                    ...it,
                    wll_measured: it.wll_measured === "" ? null : parseFloat(it.wll_measured),
                    load_test_value: it.load_test_value === "" ? null : parseFloat(it.load_test_value),
                })),
            };
            const res = await createTestResult(qcWorkOrderId, payload);
            if (res.success) {
                Swal.fire("สำเร็จ!", "บันทึกผลการทดสอบเรียบร้อยแล้ว", "success");
                setShowForm(false);
                loadTestResults();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถบันทึกได้", "error");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = await Swal.fire({
            title: "ยืนยันการลบ?",
            text: "ผลการทดสอบนี้จะถูกลบถาวร",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#d33",
        });
        if (!confirm.isConfirmed) return;
        const res = await deleteTestResult(id);
        if (res.success) {
            Swal.fire("ลบแล้ว!", "ลบผลการทดสอบเรียบร้อย", "success");
            loadTestResults();
        } else {
            Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถลบได้", "error");
        }
    };

    return (
        <div className="mt-8">
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom border-gray-200 d-flex justify-content-between align-items-center py-4 px-6">
                    <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-clipboard2-check fs-2 text-primary"></i>
                        <h5 className="mb-0 fw-bold text-gray-800">ผลการทดสอบ (Test Results)</h5>
                        {testResults.length > 0 && (
                            <span className="badge badge-light-primary fw-bold">{testResults.length}</span>
                        )}
                    </div>
                    {!showForm && (
                        <button className="btn btn-sm btn-primary fw-bold" onClick={handleOpenForm}>
                            <i className="bi bi-plus-lg me-1"></i>บันทึกผลการทดสอบ
                        </button>
                    )}
                </div>

                <div className="card-body p-6">

                    {/* ---- Create Form ---- */}
                    {showForm && (
                        <div className="border border-primary border-dashed rounded p-6 mb-6 bg-light-primary">
                            <h6 className="fw-bold text-primary mb-5">
                                <i className="bi bi-pencil-square me-2"></i>บันทึกผลการทดสอบใหม่
                            </h6>

                            {/* Header fields */}
                            <div className="row g-4 mb-6">
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">วันที่ทดสอบ</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={form.test_date}
                                        onChange={(e) => handleFormChange("test_date", e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">ผู้ทดสอบ</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="ชื่อผู้ทดสอบ"
                                        value={form.tested_by}
                                        onChange={(e) => handleFormChange("tested_by", e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">วิธีการทดสอบ</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Proof Load Test"
                                        value={form.test_method}
                                        onChange={(e) => handleFormChange("test_method", e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">มาตรฐานอ้างอิง</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. BS EN 13414"
                                        value={form.standard_reference}
                                        onChange={(e) => handleFormChange("standard_reference", e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-bold">หมายเหตุ</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="หมายเหตุ (ถ้ามี)"
                                        value={form.remark}
                                        onChange={(e) => handleFormChange("remark", e.target.value)}
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
                                                    name="overall_status"
                                                    checked={form.overall_status === s}
                                                    onChange={() => handleFormChange("overall_status", s)}
                                                />
                                                <span className={`fw-bold fs-6 ${s === "PASSED" ? "text-success" : "text-danger"}`}>{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Items table — 1 row per unit */}
                            <h6 className="fw-bold text-gray-700 mb-3">
                                ผลการทดสอบรายหน่วย ({quantity} หน่วย)
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
                                        {form.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="text-center fw-bold text-gray-600">{item.unit_number}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                                        placeholder="คำอธิบาย"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm text-center"
                                                        value={item.serial_no}
                                                        onChange={(e) => handleItemChange(idx, "serial_no", e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="form-control form-control-sm text-center"
                                                        value={item.wll_measured}
                                                        onChange={(e) => handleItemChange(idx, "wll_measured", e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="form-control form-control-sm text-center"
                                                        value={item.load_test_value}
                                                        onChange={(e) => handleItemChange(idx, "load_test_value", e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <select
                                                        className={`form-select form-select-sm fw-bold ${item.result === "PASSED" ? "text-success" : "text-danger"}`}
                                                        value={item.result}
                                                        onChange={(e) => handleItemChange(idx, "result", e.target.value as "PASSED" | "FAILED")}
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
                                                        onChange={(e) => handleItemChange(idx, "remark", e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex justify-content-end gap-3">
                                <button className="btn btn-light fw-bold" onClick={() => setShowForm(false)} disabled={saving}>
                                    ยกเลิก
                                </button>
                                <button className="btn btn-primary fw-bold" onClick={handleSave} disabled={saving}>
                                    {saving ? (
                                        <><span className="spinner-border spinner-border-sm me-2" />กำลังบันทึก...</>
                                    ) : (
                                        <><i className="bi bi-save me-2"></i>บันทึก</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ---- Existing Test Results ---- */}
                    {loading ? (
                        <div className="text-center py-6 text-muted">
                            <span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...
                        </div>
                    ) : testResults.length === 0 ? (
                        !showForm && (
                            <div className="text-center py-8 text-muted">
                                <i className="bi bi-clipboard2-x fs-2x d-block mb-3 text-gray-400"></i>
                                ยังไม่มีผลการทดสอบ
                            </div>
                        )
                    ) : (
                        <div className="d-flex flex-column gap-4">
                            {testResults.map((tr: any, idx: number) => {
                                const isExpanded = expandedId === tr.test_result_id;
                                return (
                                    <div key={tr.test_result_id} className="border rounded overflow-hidden">
                                        <div
                                            className="d-flex align-items-center justify-content-between px-5 py-3 bg-light"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => setExpandedId(isExpanded ? null : tr.test_result_id)}
                                        >
                                            <div className="d-flex align-items-center gap-4">
                                                <span className="fw-bold text-gray-700 fs-6">
                                                    ครั้งที่ {idx + 1} — {tr.test_date ? tr.test_date.split("T")[0] : "-"}
                                                </span>
                                                <StatusBadge status={tr.overall_status} />
                                                {tr.tested_by && (
                                                    <span className="text-muted fs-7">
                                                        <i className="bi bi-person me-1"></i>{tr.tested_by}
                                                    </span>
                                                )}
                                                {tr.test_method && (
                                                    <span className="text-muted fs-7">{tr.test_method}</span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <button
                                                    className="btn btn-icon btn-sm btn-light-danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(tr.test_result_id); }}
                                                    title="ลบผลการทดสอบ"
                                                >
                                                    <i className="bi bi-trash fs-5"></i>
                                                </button>
                                                <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} text-gray-500`}></i>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-5 py-4">
                                                <div className="d-flex gap-6 fs-7 text-gray-600 mb-4 flex-wrap">
                                                    {tr.standard_reference && (
                                                        <span><span className="fw-bold">มาตรฐาน: </span>{tr.standard_reference}</span>
                                                    )}
                                                    {tr.remark && (
                                                        <span><span className="fw-bold">หมายเหตุ: </span>{tr.remark}</span>
                                                    )}
                                                </div>

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
                                                                        <td><StatusBadge status={item.result} /></td>
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
