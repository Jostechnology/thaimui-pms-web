import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { KTIcon } from "../../../../_metronic/helpers";
import { useAlertModal } from "../../../context/ModalContext";
import {
    exportItemDecode,
    getItemDecodeOverview,
    getItemReferenceList,
    uploadItemDecode,
} from "../../../services/workorder";
import type {
    ItemDecodeOverview,
    ItemReferenceRow,
    ItemDecodeUploadReport,
} from "../../../type_interface/WorkOrderType";
import TablePaginator from "../../../custom_components/TablePaginator";

// Categories with more values than this default to collapsed (e.g. ~1000 size rows).
const LARGE_CATEGORY_THRESHOLD = 30;
const REFERENCE_PER_PAGE = 10;

const ItemDecodeUpload = () => {
    const navigate = useNavigate();
    const { alertMessage, openTwoBtnAlertModal } = useAlertModal();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [report, setReport] = useState<ItemDecodeUploadReport | null>(null);
    const [errorText, setErrorText] = useState<string>("");

    // ── Current-data view ──
    const [overview, setOverview] = useState<ItemDecodeOverview | null>(null);
    const [overviewLoading, setOverviewLoading] = useState<boolean>(false);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // ── Reference browser ──
    const [refRows, setRefRows] = useState<ItemReferenceRow[]>([]);
    const [refLoading, setRefLoading] = useState<boolean>(false);
    const [refPage, setRefPage] = useState<number>(1);
    const [refPages, setRefPages] = useState<number>(0);
    const [refTotal, setRefTotal] = useState<number>(0);
    const [refSearchInput, setRefSearchInput] = useState<string>("");
    const [refSearch, setRefSearch] = useState<string>("");

    const fetchOverview = async () => {
        setOverviewLoading(true);
        try {
            const res = await getItemDecodeOverview();
            if (res.success && res.categories) {
                const data: ItemDecodeOverview = {
                    categories: res.categories,
                    reference_count: res.reference_count ?? 0,
                };
                setOverview(data);
                // Default-collapse large categories so ~1000-row legends don't flood the page.
                setCollapsed((prev) => {
                    const next: Record<string, boolean> = { ...prev };
                    data.categories.forEach((cat) => {
                        if (next[cat.category] === undefined) {
                            next[cat.category] = cat.value_count > LARGE_CATEGORY_THRESHOLD;
                        }
                    });
                    return next;
                });
            } else {
                setOverview(null);
            }
        } catch (error) {
            console.error("fetchOverview error:", error);
            setOverview(null);
        } finally {
            setOverviewLoading(false);
        }
    };

    const fetchReferences = async () => {
        setRefLoading(true);
        try {
            const res = await getItemReferenceList({
                page: refPage,
                per_page: REFERENCE_PER_PAGE,
                search: refSearch,
            });
            if (res.success && res.data) {
                setRefRows(res.data);
                setRefPages(res.pages ?? 0);
                setRefTotal(res.total ?? 0);
            } else {
                setRefRows([]);
                setRefPages(0);
                setRefTotal(0);
            }
        } catch (error) {
            console.error("fetchReferences error:", error);
            setRefRows([]);
            setRefPages(0);
            setRefTotal(0);
        } finally {
            setRefLoading(false);
        }
    };

    // Fetch overview on mount.
    useEffect(() => {
        fetchOverview();
    }, []);

    // Fetch reference page whenever page/search changes.
    useEffect(() => {
        fetchReferences();
    }, [refPage, refSearch]);

    // Debounce the search box (500ms) into the committed search term.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (refSearchInput !== refSearch) {
                setRefSearch(refSearchInput);
                setRefPage(1);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [refSearchInput, refSearch]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
        setReport(null);
        setErrorText("");
    };

    const doUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setReport(null);
        setErrorText("");
        try {
            const res = await uploadItemDecode(selectedFile);
            if (!res.success || !res.report) {
                setErrorText(res.message ?? "อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
                return;
            }
            setReport(res.report);
            // Refresh the current-data view so the user sees new data without a page reload.
            if (res.report.ok) {
                setRefPage(1);
                await Promise.all([fetchOverview(), fetchReferences()]);
            }
        } catch (error) {
            console.error("ItemDecodeUpload error:", error);
            setErrorText("เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadClick = () => {
        if (!selectedFile) {
            alertMessage("กรุณาเลือกไฟล์ .xlsx ก่อน");
            return;
        }
        openTwoBtnAlertModal(
            "การอัปโหลดจะแทนที่ข้อมูลถอดรหัสทั้งหมด (replaces all decode data) คุณต้องการดำเนินการต่อหรือไม่?",
            doUpload,
            () => {}
        );
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const ok = await exportItemDecode();
            if (!ok) {
                alertMessage("ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองอีกครั้ง");
            }
        } catch (error) {
            console.error("handleExport error:", error);
            alertMessage("เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const toggleCategory = (category: string) => {
        setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
    };

    return (
        <Content>
            <div className="row g-5 g-xxl-8">
                <div className="col-xl-12">
                    <div className="card mb-5 mb-xl-8">
                        <div className="card-header border-0 pt-5 d-flex justify-content-between align-items-center">
                            <h3 className="card-title align-items-start flex-row">
                                <button
                                    onClick={() => navigate("/setting")}
                                    className="d-flex align-items-center text-gray-800 text-hover-primary fs-2 fw-bolder me-1"
                                    style={{ border: "none", background: "none" }}
                                >
                                    <KTIcon iconName="arrow-left" className="fs-4 me-2" />
                                </button>
                                <span className="card-label fw-bold fs-3 mb-1">
                                    นำเข้าข้อมูลถอดรหัสรายการวัสดุ
                                </span>
                            </h3>
                        </div>

                        <div className="card-body py-3">
                            <div className="alert alert-light-warning d-flex align-items-center p-5 mb-6">
                                <KTIcon iconName="information-5" className="fs-2hx text-warning me-4" />
                                <div className="d-flex flex-column">
                                    <span className="fw-semibold">
                                        การอัปโหลดไฟล์จะแทนที่ข้อมูลถอดรหัสทั้งหมดที่มีอยู่ (replaces all
                                        decode data) กรุณาตรวจสอบไฟล์ก่อนนำเข้า
                                    </span>
                                </div>
                            </div>

                            <div className="row align-items-end g-4 mb-4">
                                <div className="col-md-8">
                                    <label className="form-label fw-semibold">ไฟล์รายการวัสดุ (.xlsx)</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx"
                                        className="form-control"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                    {selectedFile && (
                                        <span className="text-muted fw-semibold fs-7 d-block mt-2">
                                            ไฟล์ที่เลือก: {selectedFile.name}
                                        </span>
                                    )}
                                </div>
                                <div className="col-md-4">
                                    <button
                                        className="btn btn-primary w-100"
                                        onClick={handleUploadClick}
                                        disabled={isUploading || !selectedFile}
                                    >
                                        {isUploading ? (
                                            <span className="d-flex align-items-center justify-content-center">
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                    aria-hidden="true"
                                                ></span>
                                                กำลังอัปโหลด...
                                            </span>
                                        ) : (
                                            <span className="d-flex align-items-center justify-content-center">
                                                <KTIcon iconName="cloud-add" className="fs-3 me-2" />
                                                อัปโหลดและนำเข้า
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {errorText && (
                                <div className="alert alert-danger d-flex align-items-center p-5 mt-4">
                                    <KTIcon iconName="cross-circle" className="fs-2hx text-danger me-4" />
                                    <span className="fw-semibold">{errorText}</span>
                                </div>
                            )}

                            {report && (
                                <div className="mt-6">
                                    {/* Blocked — import rejected */}
                                    {report.blocked.length > 0 && (
                                        <div className="alert alert-danger p-5 mb-6">
                                            <div className="d-flex align-items-center mb-3">
                                                <KTIcon
                                                    iconName="cross-circle"
                                                    className="fs-2hx text-danger me-4"
                                                />
                                                <h4 className="mb-0 text-danger fw-bold">
                                                    นำเข้าไม่สำเร็จ — ไม่มีการบันทึกข้อมูล
                                                </h4>
                                            </div>
                                            <ul className="mb-0 ps-5">
                                                {report.blocked.map((msg, idx) => (
                                                    <li key={idx} className="fw-semibold">
                                                        {msg}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Success counts — meaningful only when ok */}
                                    {report.ok && (
                                        <div className="card bg-light-success mb-6">
                                            <div className="card-body p-5">
                                                <div className="d-flex align-items-center mb-4">
                                                    <KTIcon
                                                        iconName="check-circle"
                                                        className="fs-2hx text-success me-4"
                                                    />
                                                    <h4 className="mb-0 text-success fw-bold">
                                                        นำเข้าสำเร็จ
                                                    </h4>
                                                </div>
                                                <div className="row g-4">
                                                    <div className="col-md-4">
                                                        <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                                                            <div className="fs-2 fw-bold text-gray-800">
                                                                {report.loaded_counts.SLING}
                                                            </div>
                                                            <div className="text-muted fw-semibold fs-7">
                                                                SLING
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                                                            <div className="fs-2 fw-bold text-gray-800">
                                                                {report.loaded_counts.CHAIN}
                                                            </div>
                                                            <div className="text-muted fw-semibold fs-7">
                                                                CHAIN
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                                                            <div className="fs-2 fw-bold text-gray-800">
                                                                {report.loaded_counts.reference}
                                                            </div>
                                                            <div className="text-muted fw-semibold fs-7">
                                                                Reference
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {report.warnings.length > 0 && (
                                        <div className="alert alert-warning p-5 mb-6">
                                            <div className="d-flex align-items-center mb-3">
                                                <KTIcon
                                                    iconName="information-5"
                                                    className="fs-2hx text-warning me-4"
                                                />
                                                <h5 className="mb-0 fw-bold">คำเตือน</h5>
                                            </div>
                                            <ul className="mb-0 ps-5">
                                                {report.warnings.map((msg, idx) => (
                                                    <li key={idx} className="fw-semibold">
                                                        {msg}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Reserved — informational */}
                                    {report.reserved.length > 0 && (
                                        <div className="alert alert-secondary p-5 mb-0">
                                            <div className="d-flex align-items-center mb-3">
                                                <KTIcon
                                                    iconName="information"
                                                    className="fs-2hx text-muted me-4"
                                                />
                                                <h6 className="mb-0 fw-bold text-muted">
                                                    ตำแหน่งที่ยังไม่กำหนดความหมาย
                                                </h6>
                                            </div>
                                            <ul className="mb-0 ps-5 text-muted">
                                                {report.reserved.map((msg, idx) => (
                                                    <li key={idx} className="fw-semibold fs-7">
                                                        {msg}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Current data ── */}
                    <div className="card mb-5 mb-xl-8">
                        <div className="card-header border-0 pt-5 d-flex justify-content-between align-items-center">
                            <h3 className="card-title align-items-start flex-column">
                                <span className="card-label fw-bold fs-3 mb-1">ข้อมูลปัจจุบัน</span>
                                <span className="text-muted fw-semibold fs-7">
                                    ข้อมูลถอดรหัสและรายการอ้างอิงที่ใช้งานอยู่ในระบบ
                                </span>
                            </h3>
                            <div className="card-toolbar">
                                <button
                                    className="btn btn-light-success"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <span className="d-flex align-items-center">
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            ></span>
                                            กำลังส่งออก...
                                        </span>
                                    ) : (
                                        <span className="d-flex align-items-center">
                                            <KTIcon iconName="file-down" className="fs-3 me-2" />
                                            ส่งออก Excel
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="card-body py-3">
                            {overviewLoading ? (
                                <div className="text-center p-10">
                                    <span className="spinner-border spinner-border-sm align-middle me-2"></span>
                                    <span className="text-gray-500">กำลังดึงข้อมูล...</span>
                                </div>
                            ) : !overview || overview.categories.length === 0 ? (
                                <div className="d-flex flex-column flex-center p-10">
                                    <KTIcon iconName="information-5" className="fs-3x text-gray-300 mb-4" />
                                    <span className="text-gray-500">ยังไม่มีข้อมูลถอดรหัสในระบบ</span>
                                </div>
                            ) : (
                                <>
                                    {/* Summary counts */}
                                    <div className="row g-4 mb-6">
                                        {overview.categories.map((cat) => (
                                            <div className="col-md-3 col-sm-6" key={`sum-${cat.category}`}>
                                                <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                                                    <div className="fs-2 fw-bold text-gray-800">
                                                        {cat.value_count}
                                                    </div>
                                                    <div className="text-muted fw-semibold fs-7">
                                                        {cat.category}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="col-md-3 col-sm-6">
                                            <div className="border border-dashed border-primary rounded p-4 text-center">
                                                <div className="fs-2 fw-bold text-primary">
                                                    {overview.reference_count}
                                                </div>
                                                <div className="text-muted fw-semibold fs-7">
                                                    รายการอ้างอิงทั้งหมด
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decode legends per category */}
                                    {overview.categories.map((cat) => {
                                        const isCollapsed = !!collapsed[cat.category];
                                        return (
                                            <div
                                                className="border border-gray-300 rounded mb-5"
                                                key={`cat-${cat.category}`}
                                            >
                                                <div
                                                    className="d-flex justify-content-between align-items-center p-4 cursor-pointer bg-light"
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => toggleCategory(cat.category)}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <KTIcon
                                                            iconName={
                                                                isCollapsed ? "plus-square" : "minus-square"
                                                            }
                                                            className="fs-2 text-primary me-3"
                                                        />
                                                        <span className="fw-bold fs-5 text-gray-800">
                                                            {cat.category}
                                                        </span>
                                                        <span className="badge badge-light-primary ms-3">
                                                            {cat.value_count} ค่า
                                                        </span>
                                                    </div>
                                                    <span className="text-muted fw-semibold fs-7">
                                                        {isCollapsed ? "แสดง" : "ซ่อน"}
                                                    </span>
                                                </div>

                                                {!isCollapsed && (
                                                    <div className="p-4 pt-0">
                                                        {cat.fields.length === 0 ? (
                                                            <div className="text-muted fs-7 py-3">
                                                                ไม่มีข้อมูลถอดรหัสสำหรับหมวดนี้
                                                            </div>
                                                        ) : (
                                                            <div className="row g-4">
                                                                {cat.fields.map((field) => (
                                                                    <div
                                                                        className="col-md-6"
                                                                        key={`field-${cat.category}-${field.field}`}
                                                                    >
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <span className="fw-bold text-gray-800">
                                                                                {field.field}
                                                                            </span>
                                                                            {field.segment && (
                                                                                <span className="badge badge-light-info ms-2 fs-8">
                                                                                    ตำแหน่ง {field.segment}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-muted fs-8 ms-2">
                                                                                ({field.values.length})
                                                                            </span>
                                                                        </div>
                                                                        <div
                                                                            className="table-responsive"
                                                                            style={{
                                                                                maxHeight: "260px",
                                                                                overflowY: "auto",
                                                                            }}
                                                                        >
                                                                            <table className="table table-row-bordered table-row-gray-200 align-middle gs-0 gy-2 mb-0">
                                                                                <thead>
                                                                                    <tr className="text-muted fw-bold fs-8 text-uppercase">
                                                                                        <th className="min-w-60px">
                                                                                            รหัส
                                                                                        </th>
                                                                                        <th>ความหมาย</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="fs-7 fw-semibold text-gray-700">
                                                                                    {field.values.map((v, idx) => (
                                                                                        <tr
                                                                                            key={`v-${cat.category}-${field.field}-${idx}`}
                                                                                        >
                                                                                            <td className="fw-bold text-gray-800">
                                                                                                {v.code}
                                                                                            </td>
                                                                                            <td>{v.value}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* ── Reference browser ── */}
                            <div className="separator separator-dashed my-6"></div>

                            <div className="d-flex flex-stack flex-wrap mb-4 gap-3">
                                <div className="d-flex flex-column">
                                    <span className="fw-bold fs-5 text-gray-800">รายการอ้างอิง</span>
                                    <span className="text-muted fw-semibold fs-7">
                                        ทั้งหมด {refTotal} รายการ
                                    </span>
                                </div>
                                <div className="d-flex align-items-center position-relative">
                                    <KTIcon
                                        iconName="magnifier"
                                        className="fs-3 position-absolute ms-4"
                                    />
                                    <input
                                        type="text"
                                        className="form-control form-control-solid w-250px ps-12"
                                        placeholder="ค้นหารหัส / รายละเอียดสินค้า"
                                        value={refSearchInput}
                                        onChange={(e) => setRefSearchInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-4 mb-0">
                                    <thead>
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200">
                                            <th className="min-w-150px">รหัสสินค้า (Item No.)</th>
                                            <th className="min-w-250px">รายละเอียดสินค้า</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 fw-semibold">
                                        {refLoading ? (
                                            <tr>
                                                <td colSpan={2} className="text-center p-10">
                                                    <span className="spinner-border spinner-border-sm align-middle me-2"></span>
                                                    <span className="text-gray-500">กำลังดึงข้อมูล...</span>
                                                </td>
                                            </tr>
                                        ) : refRows.length > 0 ? (
                                            refRows.map((row, idx) => (
                                                <tr key={`ref-${row.item_no}-${idx}`}>
                                                    <td className="text-gray-800 fw-bold">
                                                        {row.item_no}
                                                    </td>
                                                    <td className="text-gray-700">
                                                        {row.item_description}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="text-center p-10">
                                                    <div className="d-flex flex-column flex-center">
                                                        <KTIcon
                                                            iconName="magnifier"
                                                            className="fs-3x text-gray-300 mb-4"
                                                        />
                                                        <span className="text-gray-500">
                                                            ไม่พบรายการอ้างอิง
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-flex justify-content-center pt-8">
                                <TablePaginator
                                    currentPage={refPage}
                                    setCurrentPage={setRefPage}
                                    totalPages={refPages}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default ItemDecodeUpload;
