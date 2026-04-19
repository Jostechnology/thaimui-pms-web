import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import { generateQCWorkOrderPDF } from "../../../utils/generateQCWorkOrderPDF";
import { QCWorkOrderData, QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import { formatThaiDate } from "../../../helpers/dataHelpers";
import TestResultSection from "./TestResultSection";
import Swal from "sweetalert2";

// ─── helpers ────────────────────────────────────────────────────────────────

const getStatusInfo = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "PASSED")    return { cls: "badge-light-success", label: "ผ่าน QC",         icon: "bi-patch-check-fill",  dot: "#17c653" };
    if (s === "INPROGRESS") return { cls: "badge-light-warning", label: "กำลังดำเนินการ", icon: "bi-hourglass-split",   dot: "#f6c000" };
    if (s === "PENDING")   return { cls: "badge-light-primary",  label: "รอดำเนินการ",    icon: "bi-clock-fill",        dot: "#1b84ff" };
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

// ─── component ──────────────────────────────────────────────────────────────

const ViewQCWorkOrder: React.FC = () => {
    const { qc_workorder_id } = useParams<{ qc_workorder_id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [rawData,  setRawData]  = useState<any>(null);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [loading,    setLoading]    = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    useEffect(() => { if (qc_workorder_id) loadData(qc_workorder_id); }, [qc_workorder_id]);

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
            const form  = raw.qc_form || {};
            const items: QCWorkOrderItem[] = (raw.qc_items || []).map((item: any) => {
                const ml = item.material_list ?? {};
                
                return {
                    id:              String(item.qc_item_id),
                    code:            ml.item_code  ?? item.item_code  ?? "",
                    description:     ml.item_name  ?? item.description ?? "",
                    wll:             item.wll       ?? "",
                    quantity:        item.quantity  ?? "",
                    serialNo:        item.serial_no ?? "",
                    remark:          item.item_remark ?? "",
                    unit_name:       ml.unit_name   ?? "",
                    material_list_id: item.material_list_id ?? undefined,
                    material_list : item.material_list
                };
            });

            const so = raw.sales_order ?? {};
            setFormData({
                ...qcWorkData,
                work_order_id:       raw.work_order_id,
                ptt:                 form.std_ptt        ?? false,
                chevron:             form.std_chevron    ?? false,
                valeur:              form.std_valeur     ?? false,
                ophir:               form.std_ophir      ?? false,
                threeSpec:           form.std_three_spec ?? false,
                standardOthers:      form.std_others     ?? false,
                standardOthersText:  form.std_others_text ?? "",
                inHouse:             form.cert_inhouse    ?? false,
                thirdParty:          form.cert_third_party ?? false,
                ndt:                 form.cert_ndt        ?? false,
                testingOthers:       form.cert_others     ?? false,
                testingOthersText:   form.cert_others_text ?? "",
                serialTag:           form.serial_tag      ?? false,
                serialImprint:       form.serial_imprint  ?? false,
                continueSerial:      form.serial_continue ?? false,
                serialOthers:        form.serial_others   ?? false,
                serialOthersText:    form.serial_others_text ?? "",
                generalRemark:       form.general_remark  ?? "",
                details:             form.details         ?? "",
                customerReceiptNumber: form.customer_receipt_number ?? "",
                docEntry:            raw.doc_entry        ?? "",
                salesItemId:         raw.sales_item_id    ?? undefined,
                salesItemCode:       raw.sales_item_code  ?? "",
                quantity:            raw.quantity         ?? 1,
                items,
                customerCode:        so.card_code         ?? "",
                customerName:        so.card_name         ?? "",
                docNum:              so.doc_num           ?? "",
                salesCode:           so.slp_code          ?? "",
                salesName:           so.slp_name          ?? "",
                teamCode:            so.group_code        ?? "",
                teamName:            so.group_name        ?? "",
            });
        } catch (err) {
            console.error(err);
            Swal.fire("ผิดพลาด!", "ไม่สามารถโหลดข้อมูลได้", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        setPdfLoading(true);
        try {
            await generateQCWorkOrderPDF(formData, qc_workorder_id);
        } catch {
            Swal.fire("ผิดพลาด!", "ไม่สามารถ export PDF ได้", "error");
        } finally {
            setPdfLoading(false);
        }
    };

    const statusInfo = getStatusInfo(rawData?.status ?? "");

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

            {/* ═══════════════════════════════════════════════════════════
                HERO HEADER CARD
            ═══════════════════════════════════════════════════════════ */}
            <div className="card card-flush border-0 shadow-sm mb-7">
                <div className="card-body py-6 px-7">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">

                        {/* Left: back + title + status */}
                        <div className="d-flex align-items-center gap-4">
                            <button
                                className="btn btn-sm btn-icon btn-light rounded-circle flex-shrink-0"
                                onClick={() => navigate("/quality_control/qc_workorders_list")}
                                title="ย้อนกลับ"
                            >
                                <i className="bi bi-arrow-left fs-5"></i>
                            </button>

                            <div className="d-flex flex-column">
                                <div className="d-flex align-items-center gap-3 flex-wrap">
                                    <h2 className="fw-bold text-gray-900 mb-0 fs-2x">
                                        {rawData?.qc_work_order_code || "ใบสั่งเทส"}
                                    </h2>
                                    {rawData?.status && (
                                        <span className={`badge ${statusInfo.cls} fw-bold px-4 py-2 fs-7`}>
                                            <i className={`bi ${statusInfo.icon} me-2`}></i>{statusInfo.label}
                                        </span>
                                    )}
                                </div>
                                {/* meta row */}
                                <div className="d-flex align-items-center gap-4 mt-2 flex-wrap">
                                    {rawData?.created_date && (
                                        <span className="text-muted fs-7">
                                            <i className="bi bi-calendar3 me-1"></i>
                                            สร้างเมื่อ {formatThaiDate(rawData.created_date)}
                                        </span>
                                    )}
                                    {formData.docNum && (
                                        <span className="text-muted fs-7">
                                            <i className="bi bi-receipt me-1"></i>
                                            SO #{formData.docNum}
                                        </span>
                                    )}
                                    {formData.customerName && (
                                        <span className="text-muted fs-7">
                                            <i className="bi bi-person me-1"></i>
                                            {formData.customerName}
                                        </span>
                                    )}
                                    {formData.quantity > 0 && (
                                        <span className="text-muted fs-7">
                                            <i className="bi bi-box-seam me-1"></i>
                                            {formData.quantity} ชิ้น
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: actions */}
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <button
                                className="btn btn-light fw-semibold"
                                onClick={handleExportPDF}
                                disabled={pdfLoading}
                            >
                                {pdfLoading
                                    ? <><span className="spinner-border spinner-border-sm me-2" />กำลัง Export...</>
                                    : <><i className="bi bi-file-earmark-pdf me-2 text-danger"></i>Export PDF</>
                                }
                            </button>
                            <button
                                className="btn btn-primary fw-semibold"
                                onClick={() => navigate(`/quality_control/qc_workorders_list/edit/${qc_workorder_id}`)}
                            >
                                <i className="bi bi-pencil-square me-2"></i>แก้ไข
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                60 / 40 BODY
            ═══════════════════════════════════════════════════════════ */}
            <div className="row g-6 align-items-start">

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
                            {formData.customerReceiptNumber && (
                                <div className="col-12">
                                    <InfoField label="วันที่ย้าย / ส่ง" value={formData.customerReceiptNumber} />
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

                    {/* Standards / Cert / Serial */}
                    <CardSection icon="bi-shield-fill-check" title="มาตรฐาน / ใบรับรอง / Serial">
                        <div className="d-flex flex-column gap-5">
                            <div>
                                <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-2">มาตรฐาน</span>
                                <div className="d-flex flex-wrap gap-1">
                                    <CheckBadge checked={formData.ptt}           label="PTT" />
                                    <CheckBadge checked={formData.chevron}       label="Chevron" />
                                    <CheckBadge checked={formData.valeur}        label="Valeur" />
                                    <CheckBadge checked={formData.ophir}         label="Ophir" />
                                    <CheckBadge checked={formData.threeSpec}     label="3Spec" />
                                    <CheckBadge checked={formData.standardOthers} label={`Others${formData.standardOthersText ? `: ${formData.standardOthersText}` : ""}`} />
                                    {!formData.ptt && !formData.chevron && !formData.valeur && !formData.ophir && !formData.threeSpec && !formData.standardOthers && (
                                        <span className="text-muted fs-7">ไม่ระบุ</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-2">ใบรับรอง</span>
                                <div className="d-flex flex-wrap gap-1">
                                    <CheckBadge checked={formData.inHouse}       label="In-house" />
                                    <CheckBadge checked={formData.thirdParty}    label="Third Party" />
                                    <CheckBadge checked={formData.ndt}           label="NDT" />
                                    <CheckBadge checked={formData.testingOthers} label={`Others${formData.testingOthersText ? `: ${formData.testingOthersText}` : ""}`} />
                                    {!formData.inHouse && !formData.thirdParty && !formData.ndt && !formData.testingOthers && (
                                        <span className="text-muted fs-7">ไม่ระบุ</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted fs-8 fw-bold text-uppercase d-block mb-2">Serial Number</span>
                                <div className="d-flex flex-wrap gap-1">
                                    <CheckBadge checked={formData.continueSerial} label="คล้องวางแห" />
                                    <CheckBadge checked={formData.serialImprint}  label="ตอกที่ตัวสินค้า" />
                                    <CheckBadge checked={formData.serialTag}      label="คล้องแท็ก" />
                                    <CheckBadge checked={formData.serialOthers}   label={`Others${formData.serialOthersText ? `: ${formData.serialOthersText}` : ""}`} />
                                    {!formData.continueSerial && !formData.serialImprint && !formData.serialTag && !formData.serialOthers && (
                                        <span className="text-muted fs-7">ไม่ระบุ</span>
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

                    {/* Test Results — full width under details */}
                    {qc_workorder_id && (
                        <TestResultSection
                            qcWorkOrderId={Number(qc_workorder_id)}
                            quantity={formData.quantity ?? 1}
                            salesItemDescription={formData.salesItemCode}
                            salesItemId={formData.salesItemId}
                            testResultsPre={testResults}
                            qcItems={formData.items}
                        />
                    )}

                </div>

                {/* ── RIGHT 40% — Testing Dashboard ───────────────────────── */}
                <div className="col-12 col-xl-5">
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

                        {/* Recent Sessions Timeline */}
                        {testResults.length > 0 && (
                            <div className="card card-flush border-0 shadow-sm mb-5">
                                <div className="card-header min-h-50px border-bottom border-gray-100 py-0">
                                    <div className="card-title d-flex align-items-center gap-2">
                                        <i className="bi bi-clock-history text-primary fs-5"></i>
                                        <span className="fw-bold text-gray-800 fs-6">Sessions ล่าสุด</span>
                                    </div>
                                </div>
                                <div className="card-body py-5 px-6">
                                    <div className="timeline">
                                        {testResults.slice(0, 5).map((tr: any, idx: number) => {
                                            const isCompleted = tr.session_status === "COMPLETED";
                                            const isInProgress = tr.session_status === "INPROGRESS";
                                            const dotColor = isCompleted
                                                ? (tr.overall_status === "PASSED" ? "bg-success" : "bg-danger")
                                                : isInProgress ? "bg-warning" : "bg-secondary";

                                            return (
                                                <div key={tr.test_result_id} className={`d-flex align-items-start gap-3 ${idx < Math.min(testResults.length, 5) - 1 ? 'mb-5 pb-5 border-bottom border-gray-100' : ''}`}>
                                                    <div className={`rounded-circle ${dotColor} flex-shrink-0 mt-1`} style={{ width: 10, height: 10 }} />
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="fw-bold text-gray-800 fs-7">
                                                                {tr.test_result_code || `Session #${idx + 1}`}
                                                            </span>
                                                            <span className={`badge fw-bold fs-9 ${
                                                                isCompleted ? (tr.overall_status === "PASSED" ? "badge-light-success" : "badge-light-danger")
                                                                : isInProgress ? "badge-light-warning" : "badge-light-secondary"
                                                            }`}>
                                                                {isCompleted ? tr.overall_status : tr.session_status}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex gap-3 mt-1 text-muted fs-8">
                                                            <span><i className="bi bi-box-seam me-1"></i>{tr.claimed_qty ?? 0} ชิ้น</span>
                                                            {tr.test_date && <span><i className="bi bi-calendar3 me-1"></i>{tr.test_date.split("T")[0]}</span>}
                                                            {tr.tested_by && <span><i className="bi bi-person me-1"></i>{tr.tested_by}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </Content>
    );
};

export default ViewQCWorkOrder;
