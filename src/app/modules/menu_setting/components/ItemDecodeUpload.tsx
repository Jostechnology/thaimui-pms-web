import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { KTIcon } from "../../../../_metronic/helpers";
import { useAlertModal } from "../../../context/ModalContext";
import { uploadItemDecode } from "../../../services/workorder";
import { ItemDecodeUploadReport } from "../../../type_interface/WorkOrderType";

const ItemDecodeUpload = () => {
    const navigate = useNavigate();
    const { alertMessage, openTwoBtnAlertModal } = useAlertModal();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [report, setReport] = useState<ItemDecodeUploadReport | null>(null);
    const [errorText, setErrorText] = useState<string>("");

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
                </div>
            </div>
        </Content>
    );
};

export default ItemDecodeUpload;
