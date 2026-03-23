import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../../../../_metronic/layout/components/content";
import { KTIcon } from "../../../../_metronic/helpers";
import { useAlertModal } from "../../../context/ModalContext";
import { useAppLoading } from "../../../context/AppLoadingContext";
import { getDocumentCodes, createDocumentCodes, editDocumentCodes } from "../../../services/documentCodeService";
import DocumentCodeModal from "../../../modals/document_code/DocumentCodeModal";
import { DocumentCodeResponse, DocumentCodeWithConfig } from "../../../type_interface/document_code";

const DocumentCodeSetting = () => {
    const navigate = useNavigate();
    const { alertMessage } = useAlertModal();
    const { setLoading, setUnLoading } = useAppLoading();

    const [documentCodes, setDocumentCodes] = useState<DocumentCodeWithConfig[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DocumentCodeWithConfig | null>(null);

    const fetchDocumentCodes = async () => {
        setLoading();
        try {
            const response: DocumentCodeResponse = await getDocumentCodes();
            if (!response || !response.success) {
                alertMessage(response?.message ?? "ไม่สามารถดึงข้อมูลได้ กรุณาลองอีกครั้ง");
                return;
            }

            const mergedData: DocumentCodeWithConfig[] = response.all.map((doc) => {
                const config = response.own.find((own) => own.gen_number_type === doc.gen_number_type);
                return {
                    ...doc,
                    config,
                    isConfigured: !!config,
                };
            });

            setDocumentCodes(mergedData);
        } catch (error) {
            console.error("Error fetching document codes:", error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
        }
    };

    const handleCreate = useCallback((item: DocumentCodeWithConfig) => {
        setSelectedItem(item);
        setShowCreate(true);
    }, []);

    const handleEdit = useCallback((item: DocumentCodeWithConfig) => {
        setSelectedItem(item);
        setShowEdit(true);
    }, []);

    const handleCloseCreate = useCallback(() => {
        setShowCreate(false);
        setSelectedItem(null);
    }, []);

    const handleCloseEdit = useCallback(() => {
        setShowEdit(false);
        setSelectedItem(null);
    }, []);

    const handleSave = async (data: any): Promise<boolean> => {
        try {
            const res = await createDocumentCodes(data);
            await fetchDocumentCodes();
            return !!res?.success;
        } catch (error) {
            console.error("Error creating document code:", error);
            return false;
        }
    };

    const handleEditSave = async (data: any): Promise<boolean> => {
        try {
            const res = await editDocumentCodes(data);
            await fetchDocumentCodes();
            return !!res?.success;
        } catch (error) {
            console.error("Error editing document code:", error);
            return false;
        }
    };

    useEffect(() => {
        fetchDocumentCodes();
    }, []);

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
                                    ตั้งค่าการสร้างเลขที่เอกสาร
                                </span>
                            </h3>
                        </div>

                        <div className="card-body py-3">
                            <div className="table-responsive">
                                <table className="table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3">
                                    <thead>
                                        <tr className="fw-bold text-muted">
                                            <th className="w-25px">#</th>
                                            <th className="min-w-150px">ประเภท</th>
                                            <th className="min-w-200px">คำอธิบาย</th>
                                            <th className="min-w-120px">สถานะ</th>
                                            <th className="min-w-150px">Prefix</th>
                                            <th className="min-w-150px">Format</th>
                                            <th className="min-w-100px">เลขที่ปัจจุบัน</th>
                                            <th className="min-w-100px text-end">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documentCodes.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center text-gray-500 py-5">
                                                    ไม่พบข้อมูล
                                                </td>
                                            </tr>
                                        ) : (
                                            documentCodes.map((item, index) => (
                                                <tr key={item.document_code_id}>
                                                    <td>
                                                        <span className="text-dark fw-bold fs-6">{index + 1}</span>
                                                    </td>
                                                    <td>
                                                        <span className="text-dark fw-bold fs-6">
                                                            {item.gen_number_type}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted fw-semibold fs-7">
                                                            {item.description}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.isConfigured ? (
                                                            <span className="badge badge-light-success">ตั้งค่าแล้ว</span>
                                                        ) : (
                                                            <span className="badge badge-light-warning">ยังไม่ได้ตั้งค่า</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="text-dark fw-semibold fs-6">
                                                            {item.config?.gen_number_prefix ?? "-"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted fw-semibold fs-7">
                                                            {item.config?.gen_number_format ?? "-"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="text-dark fw-bold fs-6">
                                                            {item.config?.gen_number_current ?? "-"}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {item.isConfigured ? (
                                                            <button
                                                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                                                onClick={() => handleEdit(item)}
                                                                title="แก้ไข"
                                                            >
                                                                <KTIcon iconName="pencil" className="fs-3" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn btn-sm btn-light-primary"
                                                                onClick={() => handleCreate(item)}
                                                                title="ตั้งค่า"
                                                            >
                                                                <KTIcon iconName="plus" className="fs-3" />
                                                                ตั้งค่า
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DocumentCodeModal
                show={showCreate}
                handleClose={handleCloseCreate}
                onSave={handleSave}
                editData={selectedItem}
            />

            <DocumentCodeModal
                show={showEdit}
                handleClose={handleCloseEdit}
                onSave={handleEditSave}
                editData={selectedItem}
            />
        </Content>
    );
};

export default DocumentCodeSetting;
