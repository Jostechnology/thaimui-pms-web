import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { getItemComponentVersions } from '../../../services/componentTemplateService';
import { downloadComponentDocumentByPath } from '../../../services/documentGeneratorService';
import type { ItemComponentVersion } from '../../../type_interface/WorkOrderType';

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface ComponentVersionHistoryModalProps {
    show: boolean;
    onHide: () => void;
    itemComponentId: number;
    /** doc_version currently live on the component — that row is marked "ปัจจุบัน" */
    currentVersionNo?: number | null;
    componentName?: string | null;
}

const ComponentVersionHistoryModal: React.FC<ComponentVersionHistoryModalProps> = ({
    show,
    onHide,
    itemComponentId,
    currentVersionNo,
    componentName,
}) => {
    const [versions, setVersions] = useState<ItemComponentVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [downloadingVersionId, setDownloadingVersionId] = useState<number | null>(null);

    const fetchVersions = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await getItemComponentVersions(itemComponentId);
            if (res?.success && Array.isArray(res.data)) {
                // newest first — do not trust the server ordering
                const sorted = [...res.data].sort((a, b) => b.version_no - a.version_no);
                setVersions(sorted);
            } else {
                setVersions([]);
                setErrorMessage(res?.message || 'ไม่สามารถดึงประวัติเวอร์ชันได้');
            }
        } catch {
            setVersions([]);
            setErrorMessage('ไม่สามารถดึงประวัติเวอร์ชันได้');
        } finally {
            setLoading(false);
        }
    }, [itemComponentId]);

    useEffect(() => {
        if (show) fetchVersions();
    }, [show, fetchVersions]);

    const handleDownload = async (version: ItemComponentVersion) => {
        if (!version.doc_path) return;
        setDownloadingVersionId(version.version_id);
        try {
            const baseName = (componentName || `component_${itemComponentId}`).replace(/[\\/:*?"<>|]/g, '_');
            const res = await downloadComponentDocumentByPath(
                version.doc_path,
                `${baseName}_v${version.version_no}.pdf`
            );
            if (!res.success && !res.silent) {
                Swal.fire(
                    res.title || 'ดาวน์โหลดเอกสารไม่สำเร็จ',
                    res.message || 'ไม่สามารถดาวน์โหลดเอกสารได้',
                    res.icon || 'error'
                );
            }
        } finally {
            setDownloadingVersionId(null);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size='lg'>
            <Modal.Header closeButton>
                <Modal.Title className='fw-bold fs-4'>
                    <i className='bi bi-clock-history me-2 text-primary'></i>
                    ประวัติเวอร์ชันเอกสาร
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {componentName && (
                    <div className='text-muted fs-7 mb-4'>ชิ้นส่วน: {componentName}</div>
                )}

                {loading ? (
                    <div className='text-center py-10'>
                        <span className='spinner-border text-primary'></span>
                        <div className='text-muted fs-7 mt-3'>กำลังโหลดประวัติเวอร์ชัน...</div>
                    </div>
                ) : errorMessage ? (
                    <div className='alert alert-danger mb-0'>{errorMessage}</div>
                ) : versions.length === 0 ? (
                    <div className='text-center py-10'>
                        <i className='bi bi-file-earmark-x fs-3x text-gray-300 d-block mb-3'></i>
                        <span className='text-gray-500 fw-semibold fs-6'>ยังไม่มีประวัติเวอร์ชันของเอกสารนี้</span>
                    </div>
                ) : (
                    <div className='table-responsive'>
                        <table className='table table-row-bordered align-middle mb-0'>
                            <thead>
                                <tr className='fw-bold text-gray-700 fs-7'>
                                    <th style={{ minWidth: 110 }}>เวอร์ชัน</th>
                                    <th style={{ minWidth: 140 }}>แก้ไขโดย</th>
                                    <th style={{ minWidth: 160 }}>วันที่</th>
                                    <th style={{ minWidth: 220 }}>เหตุผล</th>
                                    <th className='text-end' style={{ minWidth: 120 }}>เอกสาร</th>
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map(v => {
                                    const isCurrent = currentVersionNo != null && v.version_no === currentVersionNo;
                                    return (
                                        <tr key={v.version_id}>
                                            <td>
                                                <span className='fw-bold text-gray-900 fs-7 me-2'>v{v.version_no}</span>
                                                {isCurrent && (
                                                    <span className='badge badge-light-success fw-bold px-3 py-1 fs-9'>ปัจจุบัน</span>
                                                )}
                                            </td>
                                            <td className='text-gray-700 fs-7'>{v.created_by || '-'}</td>
                                            <td className='text-gray-700 fs-7'>{formatDateTime(v.created_date)}</td>
                                            <td className='text-gray-700 fs-7'>
                                                {v.change_reason
                                                    ? v.change_reason
                                                    : <span className='text-muted fst-italic'>-</span>}
                                            </td>
                                            <td className='text-end'>
                                                <button
                                                    type='button'
                                                    className='btn btn-sm btn-light-success'
                                                    onClick={() => handleDownload(v)}
                                                    disabled={!v.doc_path || downloadingVersionId === v.version_id}
                                                    title={v.doc_path ? 'ดาวน์โหลดเอกสารเวอร์ชันนี้' : 'เวอร์ชันนี้ยังไม่มีไฟล์เอกสาร'}
                                                >
                                                    {downloadingVersionId === v.version_id
                                                        ? <span className='spinner-border spinner-border-sm me-1'></span>
                                                        : <i className='bi bi-download me-1'></i>}
                                                    ดาวน์โหลด
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button type='button' className='btn btn-light fw-bold' onClick={onHide}>
                    ปิด
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default ComponentVersionHistoryModal;
