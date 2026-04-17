import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import { generateQCWorkOrderPDF } from "../../../utils/generateQCWorkOrderPDF";
import { QCWorkOrderData, QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import { getSalesOrderService } from "../../../services/salesOrderService";
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
                };
            });

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
            });

            if (raw.doc_entry) {
                try {
                    const soRes = await getSalesOrderService(Number(raw.doc_entry));
                    if (soRes?.data) {
                        const d = soRes.data;
                        setFormData(prev => ({
                            ...prev,
                            customerCode: d.card_code,
                            customerName: d.card_name,
                            docNum:       d.doc_num,
                            salesCode:    d.slp_code,
                            salesName:    d.slp_name,
                            teamCode:     d.group_code,
                            teamName:     d.group_name,
                        }));
                    }
                } catch { /* ignore */ }
            }
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

                </div>

                {/* ── RIGHT 40% — test results ───────────────────────────── */}
                <div className="col-12 col-xl-5">
                    {/*
                        Sticky wrapper — scrolls independently.
                        max-height keeps it viewport-bound; overflow-y lets the
                        panel scroll when test sessions expand.
                        The inner content already has table-responsive on every
                        table, so wide tables get horizontal scroll instead of
                        breaking the layout.
                    */}
                    <div
                        style={{
                            position: "sticky",
                            top: 24,
                            maxHeight: "calc(100vh - 100px)",
                            overflowY: "auto",
                            overflowX: "hidden",
                        }}
                    >
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
                </div>

            </div>
        </Content>
    );
};

export default ViewQCWorkOrder;
