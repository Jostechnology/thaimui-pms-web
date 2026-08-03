import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import { generateQCWorkOrderPDF } from "../../../utils/generateQCWorkOrderPDF";
import { QCWorkOrderData, QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import { formatThaiDate } from "../../../helpers/dataHelpers";
import TestResultSection from "./TestResultSection";
import Swal from "sweetalert2";
import "../../workorder/components/WorkorderView.css";
import { type TestResultDetail } from '../../../type_interface/TestResultType';
import { getTestResultsCostByQCWorkOrder } from '../../../services/testResultService';
import {
    QC_WORK_ORDER_STATUS_LABEL,
    QC_WORK_ORDER_STATUS_BADGE,
    TEST_RESULT_SESSION_STATUS_LABEL,
    TEST_RESULT_SESSION_STATUS_BADGE,
    type QCWorkOrderStatus,
} from '../../../helpers/statusLabels';

// ─── helpers ────────────────────────────────────────────────────────────────

// icon/dot are specific to this page's pill treatment, so they stay local —
// only the label/badge-class text is sourced from the shared QC work order
// status lookup. FAILED previously had no explicit branch here (it fell
// through to the raw-status/secondary default); it now gets the same
// dedicated treatment PASSED/INPROGRESS/PENDING already had.
const STATUS_INFO_ICON: Record<QCWorkOrderStatus, string> = {
    PASSED: "bi-patch-check-fill",
    FAILED: "bi-x-circle-fill",
    INPROGRESS: "bi-hourglass-split",
    PENDING: "bi-clock-fill",
};
const STATUS_INFO_DOT: Record<QCWorkOrderStatus, string> = {
    PASSED: "#17c653",
    FAILED: "#f1416c",
    INPROGRESS: "#f6c000",
    PENDING: "#1b84ff",
};

const getStatusInfo = (status: string) => {
    const s = status?.toUpperCase() as QCWorkOrderStatus;
    if (s === "PASSED" || s === "FAILED" || s === "INPROGRESS" || s === "PENDING") {
        return {
            cls: QC_WORK_ORDER_STATUS_BADGE[s],
            label: QC_WORK_ORDER_STATUS_LABEL[s],
            icon: STATUS_INFO_ICON[s],
            dot: STATUS_INFO_DOT[s],
        };
    }
    return { cls: "badge-light-secondary", label: status || "-", icon: "bi-circle", dot: "#99a1b7" };
};

const CheckBadge: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) =>
    checked ? (
        <span className="badge badge-light-info fw-semibold me-2 mb-2 px-3 py-2">
            <i className="bi bi-check2-circle me-1"></i>{label}
        </span>
    ) : null;

const InfoField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="d-flex flex-column">
        <span className="text-muted fw-semibold fs-8 text-uppercase mb-1 ls-1">{label}</span>
        <span className="fw-semibold text-gray-800 fs-6">{value ?? <span className="text-muted">—</span>}</span>
    </div>
);

const CardSection: React.FC<{ icon: string; title: string; children: React.ReactNode; badge?: React.ReactNode }> = ({ icon, title, children, badge }) => (
    <div className="card card-flush border-0 shadow-sm mb-5">
        <div className="card-header min-h-50px border-bottom border-gray-100 py-0">
            <div className="card-title d-flex align-items-center gap-2">
                <i className={`bi ${icon} text-primary fs-5`}></i>
                <span className="fw-bold text-gray-800 fs-6">{title}</span>
                {badge}
            </div>
        </div>
        <div className="card-body py-5 px-6">{children}</div>
    </div>
);

const formatTimer = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getTestStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return TEST_RESULT_SESSION_STATUS_LABEL.INPROGRESS;
        case 'COMPLETED': return TEST_RESULT_SESSION_STATUS_LABEL.COMPLETED;
        case 'PAUSED': return TEST_RESULT_SESSION_STATUS_LABEL.PAUSED;
        case 'PENDING': return TEST_RESULT_SESSION_STATUS_LABEL.PENDING;
        default: return status;
    }
};

// Returns the bare Bootstrap variant name (used as `badge-light-${variant}`
// at the call site below), not a full class — kept as-is, only the mapping
// values are now sourced from the shared badge-class lookup.
const getTestStatusVariant = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return TEST_RESULT_SESSION_STATUS_BADGE.INPROGRESS.replace('badge-light-', '');
        case 'COMPLETED': return TEST_RESULT_SESSION_STATUS_BADGE.COMPLETED.replace('badge-light-', '');
        case 'PAUSED': return TEST_RESULT_SESSION_STATUS_BADGE.PAUSED.replace('badge-light-', '');
        case 'PENDING': return TEST_RESULT_SESSION_STATUS_BADGE.PENDING.replace('badge-light-', '');
        default: return 'secondary';
    }
};

// ─── component ──────────────────────────────────────────────────────────────

const ViewQCWorkOrder: React.FC = () => {
    const { qc_workorder_id } = useParams<{ qc_workorder_id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [rawData, setRawData] = useState<any>(null);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [testResultDetails, setTestResultDetails] = useState<TestResultDetail[]>([]);
    const [costLoading, setCostLoading] = useState(false);
    // transfer_date / delivery_date are dedicated BE columns now (split out of
    // customer_receipt_number, which QCWorkOrderData still carries but this
    // page no longer displays as a date) — kept as local state since
    // QCWorkOrderData (shared type) doesn't carry them yet.
    const [transferDate, setTransferDate] = useState<string>("");
    const [deliveryDate, setDeliveryDate] = useState<string>("");

    const [now, setNow] = useState(Date.now());
    const [activePage, setActivePage] = useState(0);

    const calcElapsedMs = (fromTime: string, toTime: string | null, breaks: { break_start: string; break_end: string | null }[]): number => {
        const s = new Date(fromTime).getTime();
        const e = toTime ? new Date(toTime).getTime() : now;
        const brkMs = breaks.reduce((sum, b) => {
            const bS = new Date(b.break_start).getTime();
            const bE = b.break_end ? new Date(b.break_end).getTime() : now;
            return sum + Math.max(0, Math.min(e, bE) - Math.max(s, bS));
        }, 0);
        return Math.max(0, e - s - brkMs);
    };

    useEffect(() => { if (qc_workorder_id) loadData(qc_workorder_id); }, [qc_workorder_id]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const result = await getQCWorkOrderById(Number(id));
            if (!result.success || !result.data) {
                Swal.fire("ผิดพลาด!", result.message || "ไม่พบข้อมูล", "error");
                return;
            }
            const raw = result.data;
            setRawData(raw);
            setTestResults(raw.test_results ?? []);
            setTransferDate(raw.qc_form?.transfer_date ?? "");
            setDeliveryDate(raw.qc_form?.delivery_date ?? "");

            setCostLoading(true);
            getTestResultsCostByQCWorkOrder(Number(id))
                .then(res => {
                    if (res?.success && Array.isArray(res.data)) {
                        setTestResultDetails(res.data as TestResultDetail[]);
                    }
                })
                .catch(() => { })
                .finally(() => setCostLoading(false));
            const form = raw.qc_form || {};
            const items: QCWorkOrderItem[] = (raw.qc_items || []).map((item: any) => {
                const ml = item.material_list ?? {};

                return {
                    id: String(item.qc_item_id),
                    code: ml.item_code ?? item.item_code ?? "",
                    description: ml.item_name ?? item.description ?? "",
                    wll: item.wll ?? "",
                    quantity: item.quantity ?? "",
                    serialNo: item.serial_no ?? "",
                    remark: item.item_remark ?? "",
                    unit_name: ml.unit_name ?? "",
                    material_list_id: item.material_list_id ?? undefined,
                    material_list: item.material_list
                };
            });

            const so = raw.sales_order ?? {};
            setFormData({
                ...qcWorkData,
                work_order_id: raw.work_order_id,
                ptt: form.std_ptt ?? false,
                chevron: form.std_chevron ?? false,
                valeur: form.std_valeur ?? false,
                ophir: form.std_ophir ?? false,
                threeSpec: form.std_three_spec ?? false,
                standardOthers: form.std_others ?? false,
                standardOthersText: form.std_others_text ?? "",
                inHouse: form.cert_inhouse ?? false,
                thirdParty: form.cert_third_party ?? false,
                ndt: form.cert_ndt ?? false,
                testingOthers: form.cert_others ?? false,
                testingOthersText: form.cert_others_text ?? "",
                serialTag: form.serial_tag ?? false,
                serialImprint: form.serial_imprint ?? false,
                continueSerial: form.serial_continue ?? false,
                serialOthers: form.serial_others ?? false,
                serialOthersText: form.serial_others_text ?? "",
                generalRemark: form.general_remark ?? "",
                details: form.details ?? "",
                customerReceiptNumber: form.customer_receipt_number ?? "",
                docEntry: raw.doc_entry ?? "",
                salesItemId: raw.sales_item_id ?? undefined,
                salesItemCode: raw.sales_item_code ?? "",
                quantity: raw.quantity ?? 1,
                items,
                customerCode: so.card_code ?? "",
                customerName: so.card_name ?? "",
                docNum: so.doc_num ?? "",
                salesCode: so.slp_code ?? "",
                salesName: so.slp_name ?? "",
                teamCode: so.group_code ?? "",
                teamName: so.group_name ?? "",
                // Component-declared QC work order passthrough fields (snake_case on purpose)
                source_work_order_id: raw.source_work_order_id ?? null,
                is_component_declared: raw.is_component_declared ?? false,
                source_work_order_code: raw.source_work_order_code ?? null,
            });
        } catch (err) {
            console.error(err);
            Swal.fire("ผิดพลาด!", "ไม่สามารถโหลดข้อมูลได้", "error");
        } finally {
            setLoading(false);
        }
    };

    const testResultCosts = useMemo(() => {
        const calcSec = (entry: { from_time: string; to_time: string | null }, breaks: { break_start: string; break_end: string | null }[]) => {
            const s = new Date(entry.from_time).getTime();
            const e = entry.to_time ? new Date(entry.to_time).getTime() : Date.now();
            const brkMs = breaks.reduce((sum, b) => {
                const bS = new Date(b.break_start).getTime();
                const bE = b.break_end ? new Date(b.break_end).getTime() : Date.now();
                return sum + Math.max(0, Math.min(e, bE) - Math.max(s, bS));
            }, 0);
            return Math.max(0, e - s - brkMs) / 1000;
        };

        return testResultDetails.map(tr => {
            const stored = tr.cost ?? null;
            if (tr.session_status === 'COMPLETED' && stored) {
                const baseLabor = (stored as any).base_labor_cost ?? 0;
                const dayLabor = (stored as any).day_labor_cost ?? 0;
                const otLabor = (stored as any).ot_labor_cost ?? 0;
                return {
                    test_result_id: tr.test_result_id,
                    test_result_code: tr.test_result_code,
                    status: tr.session_status,
                    material: stored.material_cost ?? 0,
                    depreciation: stored.depreciation_cost ?? 0,
                    maintenance: stored.maintenance_cost ?? 0,
                    base_labor: baseLabor,
                    day_labor: dayLabor,
                    ot_labor: otLabor,
                    labor: baseLabor + dayLabor + otLabor,
                    total: stored.total_cost ?? 0,
                };
            }

            const breaks = tr.breaks ?? [];

            const material = (tr.required_items ?? []).reduce((sum: number, item: any) => {
                const ml = item.material_list;
                const cpu = ml ? (ml.cost_per_unit ?? (ml.quantity > 0 ? ml.cost_price / ml.quantity : 0)) : 0;
                return sum + cpu * item.quantity;
            }, 0);

            let depreciation = 0, maintenance = 0;
            (tr.machines ?? []).forEach((m: any) => {
                const sec = calcSec(m, breaks);
                const running = m.to_time === null;
                depreciation += running ? (m.cost?.depreciation_per_second ?? 0) * sec : (m.cost?.depreciation_cost ?? 0);
                maintenance += running ? (m.cost?.maintenance_rate_per_second ?? 0) * sec : (m.cost?.maintenance_cost ?? 0);
            });

            let baseLabor = 0, dayLabor = 0;
            (tr.assignments ?? []).forEach((a: any) => {
                const sec = calcSec(a, breaks);
                const baseSalary = a.employee?.base_salary ?? 0;
                const dayRate = a.employee?.day_rate ?? 0;
                baseLabor += (baseSalary / 30 / 8 / 3600) * sec;
                dayLabor += (dayRate / 8 / 3600) * sec;
            });
            const labor = baseLabor + dayLabor;

            return {
                test_result_id: tr.test_result_id,
                test_result_code: tr.test_result_code,
                status: tr.session_status,
                material,
                depreciation,
                maintenance,
                base_labor: baseLabor,
                day_labor: dayLabor,
                ot_labor: 0,
                labor,
                total: material + depreciation + maintenance + labor,
            };
        });
    }, [testResultDetails]);

    const totalCosts = useMemo(() =>
        testResultCosts.reduce(
            (acc, r) => ({
                material: acc.material + r.material,
                depreciation: acc.depreciation + r.depreciation,
                maintenance: acc.maintenance + r.maintenance,
                base_labor: acc.base_labor + r.base_labor,
                day_labor: acc.day_labor + r.day_labor,
                ot_labor: acc.ot_labor + r.ot_labor,
                labor: acc.labor + r.labor,
                total: acc.total + r.total,
            }),
            { material: 0, depreciation: 0, maintenance: 0, base_labor: 0, day_labor: 0, ot_labor: 0, labor: 0, total: 0 }
        ), [testResultCosts]);

    const handleExportPDF = async () => {
        if (formData.is_component_declared) {
            Swal.fire(
                "ไม่มีแบบฟอร์ม QC แยก",
                "ใบสั่งเทสนี้สร้างจาก Test Section ในเอกสารใบสั่งผลิต กรุณาดาวน์โหลดเอกสารใบสั่งผลิตแทน",
                "info"
            );
            return;
        }
        setPdfLoading(true);
        try {
            await generateQCWorkOrderPDF(formData, qc_workorder_id);
        } catch (err: any) {
            Swal.fire("ผิดพลาด!", err?.message || "ไม่สามารถ export PDF ได้", "error");
        } finally {
            setPdfLoading(false);
        }
    };

    const statusInfo = getStatusInfo(rawData?.status ?? "");

    // At least one completed test result passed QC — a certificate can be
    // created from it. Mirrors the completed/passedCount logic used in the
    // "สรุปการทดสอบ" summary below.
    const hasPassedTest = testResults.some(
        (tr) => tr.session_status === "COMPLETED" && tr.overall_status === "PASSED"
    );

    const activeTestSessions = testResultDetails.filter(tr => tr.session_status === 'INPROGRESS');
    const ACTIVE_SESSIONS_PER_PAGE = 3;
    const totalActivePages = Math.ceil(activeTestSessions.length / ACTIVE_SESSIONS_PER_PAGE);
    const pagedActiveSessions = activeTestSessions.slice(
        activePage * ACTIVE_SESSIONS_PER_PAGE,
        (activePage + 1) * ACTIVE_SESSIONS_PER_PAGE,
    );

    // ── loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <Content>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
                    <span className="spinner-border text-primary me-3" />
                    <span className="text-muted fs-6">กำลังโหลดข้อมูล...</span>
                </div>
            </Content>
        );
    }

    return (
        <Content>

            {/* Header */}
            <div className="wo-page-header mb-6">
                <div className="wo-page-header-left">
                    <button className="wo-back-btn" onClick={() => navigate("/quality_control/qc_workorders_list")}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <div className="wo-header-vdivider" />
                    <span className="wo-header-title">QC <strong>{rawData?.qc_work_order_code || "ใบสั่งเทส"}</strong></span>
                    {formData.is_component_declared && (
                        <>
                            <div className="wo-header-vdivider" />
                            <span className="badge badge-light-info fw-semibold">
                                <i className="bi bi-diagram-3 me-1"></i>จากใบสั่งผลิต
                            </span>
                        </>
                    )}
                    {formData.customerName && (
                        <>
                            <div className="wo-header-vdivider" />
                            <span className="wo-header-info">
                                <i className="bi bi-person me-1" />ลูกค้า: {formData.customerName}
                            </span>
                        </>
                    )}
                    {formData.docNum && (
                        <>
                            <div className="wo-header-vdivider" />
                            <span className="wo-header-info">
                                <i className="bi bi-receipt me-1" />SO #{formData.docNum}
                            </span>
                        </>
                    )}
                    {formData.quantity > 0 && (
                        <>
                            <div className="wo-header-vdivider" />
                            <span className="wo-header-info">
                                <i className="bi bi-box-seam me-1" />{formData.quantity} ชิ้น
                            </span>
                        </>
                    )}
                </div>
                <div className="wo-page-header-right">
                    {rawData?.status && (
                        <div className={`wo-status-pill${rawData.status.toUpperCase() === "PASSED" ? " wo-status-pill-green" : rawData.status.toUpperCase() === "PENDING" ? " wo-status-pill-grey" : ""}`}>
                            <span className="wo-status-dot" style={rawData.status.toUpperCase() === "PASSED" ? { background: "#22c55e", animation: "none" } : rawData.status.toUpperCase() === "PENDING" ? { animation: "none" } : undefined} />
                            {statusInfo.label}
                        </div>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={handleExportPDF}
                        disabled={pdfLoading || formData.is_component_declared}
                        title={formData.is_component_declared ? "ใบสั่งเทสนี้ไม่มีแบบฟอร์ม QC แยก กรุณาดาวน์โหลดเอกสารใบสั่งผลิตแทน" : undefined}
                    >
                        {pdfLoading
                            ? <><span className="spinner-border spinner-border-sm me-1" />กำลัง Export...</>
                            : <><i className="bi bi-file-earmark-pdf me-1" />Export PDF</>
                        }
                    </button>
                    {hasPassedTest && formData.docEntry && (
                        <button
                            className="btn btn-success"
                            onClick={() => navigate(
                                `/quality_control/qc_test_cert_list/create?doc_entry=${formData.docEntry}&sales_item_id=${formData.salesItemId ?? ""}`
                            )}
                        >
                            <i className="bi bi-patch-check me-1" />สร้างใบรับรอง
                        </button>
                    )}
                    {formData.is_component_declared ? (
                        <button
                            className="btn btn-light-secondary"
                            disabled
                            title="แก้ไขได้ที่เอกสารใบสั่งผลิตเท่านั้น เนื่องจากใบสั่งเทสนี้ถูกสร้างจาก Test Section"
                        >
                            <i className="bi bi-pencil-square me-1" />แก้ไข
                        </button>
                    ) : (
                        <button className="btn bg-primary text-white" onClick={() => navigate(`/quality_control/qc_workorders_list/edit/${qc_workorder_id}`)}>
                            <i className="bi bi-pencil-square text-white me-1" />แก้ไข
                        </button>
                    )}
                </div>
            </div>

            {/* Active Test Sessions — Live Monitoring Cards */}
            {activeTestSessions.length > 0 && (
                <div className="mb-8">

                    {/* Section header */}
                    <div className="d-flex align-items-center gap-3 mb-5">
                        <div className="wo-pulse-blue" />
                        <span className="fw-bold text-gray-900 fs-5">กำลังดำเนินการอยู่</span>
                        <span className="badge badge-light-primary fw-bold">{activeTestSessions.length} Test Session</span>
                        {totalActivePages > 1 && (
                            <div className="ms-auto d-flex align-items-center gap-2">
                                <button
                                    className="wo-page-btn"
                                    disabled={activePage === 0}
                                    onClick={() => setActivePage(p => Math.max(0, p - 1))}
                                >
                                    <i className="bi bi-chevron-left" />
                                </button>
                                <span className="text-muted fs-8 fw-semibold" style={{ minWidth: 40, textAlign: 'center' }}>
                                    {activePage + 1} / {totalActivePages}
                                </span>
                                <button
                                    className="wo-page-btn"
                                    disabled={activePage >= totalActivePages - 1}
                                    onClick={() => setActivePage(p => Math.min(totalActivePages - 1, p + 1))}
                                >
                                    <i className="bi bi-chevron-right" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cards grid — paginated, 3 per page */}
                    <div className="row g-4 wo-lmc-fade" key={activePage}>
                        {pagedActiveSessions.map(tr => {
                            const activeAssignments = tr.assignments.filter(a => a.to_time === null);
                            const activeMachines = tr.machines.filter(m => m.to_time === null);
                            const sessionElapsed = tr.started_at ? calcElapsedMs(tr.started_at, null, tr.breaks) : 0;

                            return (
                                <div key={tr.test_result_id} className="col-12 col-lg-6 col-xl-4">
                                    <div
                                        className="wo-lmc-card"
                                        onClick={() => navigate(`/quality_control/test_result/${tr.test_result_id}`)}
                                    >
                                        <div className="p-5">

                                            {/* Top row: Session code (left) + RUNNING (right) */}
                                            <div className="d-flex align-items-start justify-content-between mb-3">
                                                <div>
                                                    <span className="wo-card-lot-label">Test Session</span>
                                                    <span className="wo-card-lot-number">{tr.test_result_code || `TS-${tr.test_result_id}`}</span>
                                                    <div className="mt-2">
                                                        <span className="badge badge-light-primary fw-bold fs-8">
                                                            <i className="bi bi-box-seam me-1" style={{ fontSize: 10 }} />
                                                            {tr.claimed_qty} ชิ้น
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                    <div className="wo-pulse-blue" />
                                                    <span className="text-primary fw-bold fs-8">RUNNING</span>
                                                </div>
                                            </div>

                                            <div className="separator separator-dashed mb-4" />

                                            {/* Bottom row: Staff + Machine (left) | Timer (right) */}
                                            <div className="d-flex align-items-end justify-content-between gap-4">
                                                <div style={{ minWidth: 0 }}>
                                                    {/* Staff */}
                                                    <div className="mb-3">
                                                        {activeAssignments.length === 0 ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-person text-muted fs-7" />
                                                                <span className="text-muted fs-8 fst-italic">ยังไม่มีพนักงาน</span>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="symbol symbol-30px flex-shrink-0">
                                                                    <span className="symbol-label bg-light-primary text-primary fw-bold fs-8">
                                                                        {activeAssignments[0].employee?.employee_first_name?.[0] ?? '?'}
                                                                    </span>
                                                                </div>
                                                                <span className="fw-semibold text-gray-800 fs-7 text-truncate">
                                                                    {activeAssignments[0].employee?.employee_first_name} {activeAssignments[0].employee?.employee_last_name}
                                                                    {activeAssignments.length > 1 && (
                                                                        <span className="text-muted ms-1 fs-8">+{activeAssignments.length - 1} คน</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Machine */}
                                                    <div>
                                                        {activeMachines.length === 0 ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-gear text-muted fs-7" />
                                                                <span className="text-muted fs-8 fst-italic">ยังไม่มีเครื่องจักร</span>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="symbol symbol-30px flex-shrink-0">
                                                                    <span className="symbol-label bg-light-info text-info fw-bold fs-8">
                                                                        <i className="bi bi-gear-fill" />
                                                                    </span>
                                                                </div>
                                                                <span className="fw-semibold text-gray-800 fs-7 text-truncate">
                                                                    {activeMachines[0].machine?.machine_name || activeMachines[0].machine?.machine_code || `#${activeMachines[0].machine_id}`}
                                                                    {activeMachines.length > 1 && (
                                                                        <span className="text-muted ms-1 fs-8">+{activeMachines.length - 1}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Timer — right side */}
                                                <div className="flex-shrink-0">
                                                    <div className="wo-lmc-timer-large">{formatTimer(sessionElapsed)}</div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                60 / 40 BODY
            ═══════════════════════════════════════════════════════════ */}
            <div className="row g-6" style={{ alignItems: 'stretch' }}>

                {/* ── LEFT 60% — work order details ─────────────────────── */}
                <div className="col-12 col-xl-7">

                    {/* Basic info */}
                    <CardSection icon="bi-info-circle-fill" title="ข้อมูลทั่วไป">
                        <div className="row g-6">
                            <div className="col-6 col-md-3">
                                <InfoField label="วันที่ QC" value={rawData?.qc_date ? formatThaiDate(rawData.qc_date) : undefined} />
                            </div>
                            <div className="col-6 col-md-3">
                                <InfoField label="ผู้ตรวจสอบ" value={rawData?.qc_by} />
                            </div>
                            <div className="col-6 col-md-3">
                                <InfoField label="พนักงานขาย" value={formData.salesName || undefined} />
                            </div>
                            <div className="col-6 col-md-3">
                                <InfoField label="ทีม" value={formData.teamName || undefined} />
                            </div>
                            {transferDate && (
                                <div className="col-6 col-md-3">
                                    <InfoField label="วันที่ย้าย" value={formatThaiDate(transferDate)} />
                                </div>
                            )}
                            {deliveryDate && (
                                <div className="col-6 col-md-3">
                                    <InfoField label="วันที่ส่ง" value={formatThaiDate(deliveryDate)} />
                                </div>
                            )}
                        </div>
                    </CardSection>

                    {/* Customer & SO */}
                    <CardSection icon="bi-person-lines-fill" title="ลูกค้า & ใบสั่งขาย">
                        <div className="row g-6">
                            <div className="col-md-6">
                                <InfoField
                                    label="ลูกค้า"
                                    value={formData.customerName
                                        ? <>{formData.customerName} <span className="text-muted fw-normal fs-7">({formData.customerCode})</span></>
                                        : undefined}
                                />
                            </div>
                            <div className="col-md-3">
                                <InfoField label="ใบสั่งขายเลขที่" value={formData.docNum || undefined} />
                            </div>
                            <div className="col-md-3">
                                <InfoField label="รหัสสินค้า" value={formData.salesItemCode || undefined} />
                            </div>
                        </div>
                    </CardSection>

                    {formData.is_component_declared ? (
                        /* Component-declared QC work order — no QCForm / QCItem rows.
                           The WorkOrder component document IS the test specification,
                           so link out to it instead of rendering empty standards/items blocks. */
                        <CardSection
                            icon="bi-diagram-3-fill"
                            title="ที่มาของใบสั่งเทส"
                            badge={<span className="badge badge-light-info ms-1">จากใบสั่งผลิต</span>}
                        >
                            <div className="d-flex flex-column align-items-center text-center py-6 px-4">
                                <i className="bi bi-file-earmark-text text-primary fs-3x mb-3"></i>
                                <p className="text-gray-700 fs-6 mb-1">
                                    ใบสั่งเทสนี้ถูกสร้างขึ้นอัตโนมัติจาก <strong>Test Section</strong> ในเอกสารใบสั่งผลิต
                                </p>
                                <p className="text-muted fs-7 mb-6">
                                    มาตรฐาน / ใบรับรอง / Serial Number และรายการสินค้า ถูกกำหนดไว้ในเอกสารใบสั่งผลิตแทนแบบฟอร์ม QC นี้
                                    {formData.source_work_order_code && (
                                        <> (เลขที่เอกสาร <strong>{formData.source_work_order_code}</strong>)</>
                                    )}
                                </p>
                                <button
                                    className="btn btn-primary"
                                    disabled={!formData.source_work_order_id}
                                    onClick={() => navigate(`/workorder/workorders_detail/${formData.source_work_order_id}`)}
                                >
                                    <i className="bi bi-box-arrow-up-right me-2"></i>
                                    ไปที่เอกสารใบสั่งผลิต
                                </button>
                            </div>
                        </CardSection>
                    ) : (
                        <>
                            <CardSection icon="bi-shield-fill-check" title="มาตรฐาน / ใบรับรอง / Serial">
                                {/* ปรับเป็น row และใช้ col-md เพื่อแบ่งฝั่ง */}
                                <div className="row g-4">
                                    {/* มาตรฐาน */}
                                    <div className="col-12 col-md-4 border-end-md">
                                        <span className="text-muted fs-9 fw-bolder text-uppercase d-block mb-1">มาตรฐาน</span>
                                        <div className="d-flex flex-wrap gap-1">
                                            <CheckBadge checked={formData.ptt} label="PTT" />
                                            <CheckBadge checked={formData.chevron} label="Chevron" />
                                            <CheckBadge checked={formData.valeur} label="Valeur" />
                                            <CheckBadge checked={formData.ophir} label="Ophir" />
                                            <CheckBadge checked={formData.threeSpec} label="3Spec" />
                                            <CheckBadge checked={formData.standardOthers} label={formData.standardOthersText || "Others"} />
                                            {!formData.ptt && !formData.chevron && !formData.valeur && !formData.ophir && !formData.threeSpec && !formData.standardOthers && (
                                                <span className="text-muted fs-7">---</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ใบรับรอง */}
                                    <div className="col-12 col-md-4 border-end-md">
                                        <span className="text-muted fs-9 fw-bolder text-uppercase d-block mb-1">ใบรับรอง</span>
                                        <div className="d-flex flex-wrap gap-1">
                                            <CheckBadge checked={formData.inHouse} label="In-house" />
                                            <CheckBadge checked={formData.thirdParty} label="Third Party" />
                                            <CheckBadge checked={formData.ndt} label="NDT" />
                                            <CheckBadge checked={formData.testingOthers} label={formData.testingOthersText || "Others"} />
                                            {!formData.inHouse && !formData.thirdParty && !formData.ndt && !formData.testingOthers && (
                                                <span className="text-muted fs-7">---</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Serial Number */}
                                    <div className="col-12 col-md-4">
                                        <span className="text-muted fs-9 fw-bolder text-uppercase d-block mb-1">Serial Number</span>
                                        <div className="d-flex flex-wrap gap-1">
                                            <CheckBadge checked={formData.continueSerial} label="คล้องวางแห" />
                                            <CheckBadge checked={formData.serialImprint} label="ตอกที่ตัวสินค้า" />
                                            <CheckBadge checked={formData.serialTag} label="คล้องแท็ก" />
                                            <CheckBadge checked={formData.serialOthers} label={formData.serialOthersText || "Others"} />
                                            {!formData.continueSerial && !formData.serialImprint && !formData.serialTag && !formData.serialOthers && (
                                                <span className="text-muted fs-7">---</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardSection>

                            {/* Items */}
                            <CardSection
                                icon="bi-table"
                                title="รายการสินค้า"
                                badge={<span className="badge badge-light-primary ms-1">{formData.items.length}</span>}
                            >
                                <div className="table-responsive">
                                    <table className="table align-middle fs-7 gy-3 mb-0">
                                        <thead>
                                            <tr className="text-muted fw-bold fs-8 text-uppercase border-bottom border-gray-100">
                                                <th className="min-w-100px">รหัสสินค้า</th>
                                                <th className="min-w-150px">รายละเอียด</th>
                                                <th className="text-center w-70px">WLL</th>
                                                <th className="text-center w-70px">จำนวน</th>
                                                <th className="w-110px">Serial No.</th>
                                                <th>หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-700 fw-semibold">
                                            {formData.items.length > 0 ? formData.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <span className="badge badge-light-secondary fw-bold">{item.code || "—"}</span>
                                                    </td>
                                                    <td>{item.description || "—"}</td>
                                                    <td className="text-center text-muted">{item.wll || "—"}</td>
                                                    <td className="text-center fw-bold text-gray-900">{item.quantity}</td>
                                                    <td className="text-muted fs-8">{item.serialNo || "—"}</td>
                                                    <td className="text-muted">{item.remark || "—"}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={6} className="text-center text-muted py-6">ไม่มีรายการสินค้า</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardSection>
                        </>
                    )}

                    {/* Remark / Details — only if content */}
                    {(formData.generalRemark || formData.details) && (
                        <CardSection icon="bi-chat-left-text-fill" title="หมายเหตุ / รายละเอียด">
                            <div className="d-flex flex-column gap-5">
                                {formData.generalRemark && (
                                    <div>
                                        <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-2">Remark</span>
                                        <p className="text-gray-700 mb-0" style={{ whiteSpace: "pre-wrap" }}>{formData.generalRemark}</p>
                                    </div>
                                )}
                                {formData.details && (
                                    <div>
                                        <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-2">รายละเอียดการเทส</span>
                                        <p className="text-gray-700 mb-0" style={{ whiteSpace: "pre-wrap" }}>{formData.details}</p>
                                    </div>
                                )}
                            </div>
                        </CardSection>
                    )}

                    <div
                        style={{
                            position: "sticky",
                            top: 24,
                            maxHeight: "calc(100vh - 100px)",
                            overflowY: "auto",
                            overflowX: "hidden",
                        }}
                    >
                        {/* Progress Overview */}
                        <div className="card card-flush border-0 shadow-sm mb-5">
                            <div className="card-header min-h-50px border-bottom border-gray-100 py-0">
                                <div className="card-title d-flex align-items-center gap-2">
                                    <i className="bi bi-speedometer2 text-primary fs-5"></i>
                                    <span className="fw-bold text-gray-800 fs-6">สรุปการทดสอบ</span>
                                </div>
                            </div>
                            <div className="card-body py-5 px-6">
                                {(() => {
                                    const total = formData.quantity ?? 0;
                                    const completed = testResults.filter(tr => tr.session_status === "COMPLETED");
                                    const inProgress = testResults.filter(tr => tr.session_status === "INPROGRESS");
                                    const pending = testResults.filter(tr => tr.session_status === "PENDING");
                                    const passedCount = completed.filter(tr => tr.overall_status === "PASSED").length;
                                    const failedCount = completed.filter(tr => tr.overall_status === "FAILED").length;
                                    const testedQty = completed.reduce((sum: number, tr: any) => sum + (tr.claimed_qty ?? 0), 0);
                                    const inProgressQty = inProgress.reduce((sum: number, tr: any) => sum + (tr.claimed_qty ?? 0), 0);
                                    const progressPct = total > 0 ? Math.min(100, Math.round((testedQty / total) * 100)) : 0;

                                    return (
                                        <>
                                            {/* Main progress */}
                                            <div className="mb-6">
                                                <div className="d-flex justify-content-between align-items-end mb-2">
                                                    <span className="text-muted fw-bold fs-7">ความคืบหน้าการทดสอบ</span>
                                                    <span className="fw-bold text-gray-800 fs-6">{progressPct}%</span>
                                                </div>
                                                <div className="progress h-10px">
                                                    <div
                                                        className={`progress-bar ${progressPct === 100 ? 'bg-success' : 'bg-primary'}`}
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                                <div className="d-flex justify-content-between mt-2">
                                                    <span className="text-muted fs-8">ทดสอบแล้ว {testedQty} / {total} ชิ้น</span>
                                                    {inProgressQty > 0 && (
                                                        <span className="text-warning fs-8 fw-bold">กำลังทดสอบ {inProgressQty} ชิ้น</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stat cards */}
                                            <div className="row g-4 mb-5">
                                                <div className="col-6">
                                                    <div className="border border-gray-200 rounded p-4 text-center">
                                                        <span className="text-muted fs-8 fw-bold d-block mb-1">Sessions ทั้งหมด</span>
                                                        <span className="fw-bold text-gray-800 fs-2x">{testResults.length}</span>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="border border-gray-200 rounded p-4 text-center">
                                                        <span className="text-muted fs-8 fw-bold d-block mb-1">เสร็จสิ้น</span>
                                                        <span className="fw-bold text-success fs-2x">{completed.length}</span>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="border border-gray-200 rounded p-4 text-center">
                                                        <span className="text-muted fs-8 fw-bold d-block mb-1">กำลังดำเนินการ</span>
                                                        <span className="fw-bold text-warning fs-2x">{inProgress.length}</span>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="border border-gray-200 rounded p-4 text-center">
                                                        <span className="text-muted fs-8 fw-bold d-block mb-1">รอเริ่ม</span>
                                                        <span className="fw-bold text-gray-500 fs-2x">{pending.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pass / Fail breakdown */}
                                            {completed.length > 0 && (
                                                <div>
                                                    <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-3">ผลการทดสอบ (Sessions ที่เสร็จ)</span>
                                                    <div className="d-flex gap-3">
                                                        <div className="flex-grow-1 border border-success border-dashed rounded p-4 text-center bg-light-success">
                                                            <i className="bi bi-check-circle-fill text-success fs-2 d-block mb-1"></i>
                                                            <span className="fw-bold text-success fs-3">{passedCount}</span>
                                                            <span className="text-muted fs-8 d-block">PASSED</span>
                                                        </div>
                                                        <div className="flex-grow-1 border border-danger border-dashed rounded p-4 text-center bg-light-danger">
                                                            <i className="bi bi-x-circle-fill text-danger fs-2 d-block mb-1"></i>
                                                            <span className="fw-bold text-danger fs-3">{failedCount}</span>
                                                            <span className="text-muted fs-8 d-block">FAILED</span>
                                                        </div>
                                                    </div>
                                                    {completed.length > 0 && (
                                                        <div className="mt-3">
                                                            <div className="progress h-8px">
                                                                <div
                                                                    className="progress-bar bg-success"
                                                                    style={{ width: `${(passedCount / completed.length) * 100}%` }}
                                                                />
                                                                <div
                                                                    className="progress-bar bg-danger"
                                                                    style={{ width: `${(failedCount / completed.length) * 100}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-center mt-1">
                                                                <span className="text-muted fs-8">
                                                                    อัตราผ่าน {completed.length > 0 ? Math.round((passedCount / completed.length) * 100) : 0}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {testResults.length === 0 && (
                                                <div className="text-center py-6 text-muted">
                                                    <i className="bi bi-clipboard2-x fs-2x d-block mb-3 text-gray-300"></i>
                                                    <span className="fs-7">ยังไม่มีการทดสอบ</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── RIGHT 40% — Testing Dashboard ───────────────────────── */}
                <div className="col-12 col-xl-5" style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Test Results — full width under details */}
                    {qc_workorder_id && (
                        <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <TestResultSection
                                qcWorkOrderId={Number(qc_workorder_id)}
                                quantity={formData.quantity ?? 1}
                                salesItemDescription={formData.salesItemCode}
                                salesItemId={formData.salesItemId}
                                testResultsPre={testResults}
                                qcItems={formData.items}
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Cost Summary from all Test Sessions */}
            <div className="card shadow-sm mb-8 mt-6">
                <div className="card-header border-0 pt-5 pb-0">
                    <div className="card-title">
                        <span className="card-label fw-bold text-gray-900 fs-5">
                            ต้นทุนรวมจากทุก Test Session
                        </span>
                    </div>
                    {costLoading && (
                        <div className="card-toolbar">
                            <span className="spinner-border spinner-border-sm text-primary me-2" />
                            <span className="text-muted fs-8">กำลังโหลดต้นทุน...</span>
                        </div>
                    )}
                </div>
                <div className="card-body pt-5 pb-6">
                    <div className="row g-3 mb-6">
                        {[
                            { label: 'ค่าวัตถุดิบรวม', value: totalCosts.material, icon: 'bi-box-seam-fill', iconColor: '#0dcaf0', bg: '#e8fafe' },
                            { label: 'ค่าเสื่อมราคารวม', value: totalCosts.depreciation, icon: 'bi-graph-down-arrow', iconColor: '#6610f2', bg: '#f3f0ff' },
                            { label: 'ค่าซ่อมบำรุงรวม', value: totalCosts.maintenance, icon: 'bi-wrench-adjustable', iconColor: '#fd7e14', bg: '#fff4e6' },
                            { label: 'ค่าแรงรวม', value: totalCosts.labor, icon: 'bi-people-fill', iconColor: '#198754', bg: '#e8f8f0' },
                            { label: 'รวมทั้งหมด', value: totalCosts.total, icon: 'bi-cash-stack', iconColor: '#dc3545', bg: '#fff0f0' },
                        ].map(item => (
                            <div key={item.label} className="col-6 col-md-4 col-lg">
                                <div className="rounded-3 p-4 h-100 d-flex align-items-center gap-3"
                                    style={{ backgroundColor: item.bg }}>
                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ width: 46, height: 46, backgroundColor: `${item.iconColor}20` }}>
                                        <i className={`bi ${item.icon} fs-4`} style={{ color: item.iconColor }} />
                                    </div>
                                    <div>
                                        <div className="text-gray-500 fs-8 fw-semibold mb-1">{item.label}</div>
                                        {costLoading ? (
                                            <div className="placeholder-wave"><span className="placeholder col-10 rounded" /></div>
                                        ) : (
                                            <div className="fw-bolder fs-5" style={{ color: item.iconColor }}>
                                                ฿{item.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!costLoading && testResultCosts.length > 0 && (
                        <div className="table-responsive">
                            <table className="table align-middle table-row-bordered fs-7 gy-3">
                                <thead>
                                    <tr className="text-muted fw-bold fs-8 text-uppercase border-bottom border-gray-200">
                                        <th>Test Session</th>
                                        <th>สถานะ</th>
                                        <th className="text-end">ค่าวัตถุดิบ</th>
                                        <th className="text-end">ค่าเสื่อมราคา</th>
                                        <th className="text-end">ค่าซ่อมบำรุง</th>
                                        <th className="text-end" title="เงินเดือนฐาน prorate">ฐาน</th>
                                        <th className="text-end" title="ค่าแรงรายวัน prorate">รายวัน</th>
                                        <th className="text-end" title="OT / วันหยุด (คำนวนตอน finalize)">OT</th>
                                        <th className="text-end">ค่าพนักงานรวม</th>
                                        <th className="text-end">รวม</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 fw-semibold">
                                    {testResultCosts.map(r => (
                                        <tr key={r.test_result_id}>
                                            <td>
                                                <span className="fw-bold text-gray-800">
                                                    {r.test_result_code || `#${r.test_result_id}`}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-light-${getTestStatusVariant(r.status)}`}>
                                                    {getTestStatusLabel(r.status)}
                                                </span>
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.material > 0 ? `฿${r.material.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.depreciation > 0 ? `฿${r.depreciation.toFixed(4)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.maintenance > 0 ? `฿${r.maintenance.toFixed(4)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700 fs-8">
                                                {r.base_labor > 0 ? `฿${r.base_labor.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700 fs-8">
                                                {r.day_labor > 0 ? `฿${r.day_labor.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700 fs-8">
                                                {r.ot_labor > 0 ? `฿${r.ot_labor.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700 fw-bold">
                                                {r.labor > 0 ? `฿${r.labor.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end fw-bold text-primary">
                                                ฿{r.total.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-light">
                                    <tr className="fw-bolder border-top border-3 border-gray-200">
                                        <td colSpan={2} className="text-end text-gray-600 fs-7 py-5">รวมทั้งหมด</td>
                                        <td className="text-end py-5" style={{ color: '#0dcaf0' }}>
                                            ฿{totalCosts.material.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end py-5" style={{ color: '#6610f2' }}>
                                            ฿{totalCosts.depreciation.toLocaleString('th-TH', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                        </td>
                                        <td className="text-end py-5" style={{ color: '#fd7e14' }}>
                                            ฿{totalCosts.maintenance.toLocaleString('th-TH', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                        </td>
                                        <td className="text-end py-5 fs-8" style={{ color: '#198754' }}>
                                            ฿{totalCosts.base_labor.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end py-5 fs-8" style={{ color: '#0d6efd' }}>
                                            ฿{totalCosts.day_labor.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end py-5 fs-8" style={{ color: '#ffc107' }}>
                                            ฿{totalCosts.ot_labor.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end py-5 fw-bold" style={{ color: '#198754' }}>
                                            ฿{totalCosts.labor.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-end fs-5 py-5" style={{ color: '#dc3545' }}>
                                            ฿{totalCosts.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {!costLoading && testResultCosts.length === 0 && testResults.length > 0 && (
                        <div className="text-center text-muted py-6 fs-7">
                            <i className="bi bi-hourglass-split fs-3x text-gray-300 d-block mb-3" />
                            Test Session ยังไม่ได้เริ่มดำเนินการ จึงยังไม่มีข้อมูลต้นทุน
                        </div>
                    )}

                    {!costLoading && testResults.length === 0 && (
                        <div className="text-center text-muted py-6 fs-7">
                            ยังไม่มี Test Session
                        </div>
                    )}
                </div>
            </div>

        </Content >
    );
};

export default ViewQCWorkOrder;
