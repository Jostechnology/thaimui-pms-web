import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCertificateById } from '../../../services/certificateService';

const CertificateDetail: React.FC = () => {
    const { qc_certification_id } = useParams<{ qc_certification_id: string }>();
    const navigate = useNavigate();
    const [certificate, setCertificate] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!qc_certification_id) return;
            try {
                const res = await getCertificateById(qc_certification_id);
                if (res.success && res.data) {
                    setCertificate(res.data);
                } else {
                    setError(res.message || "ไม่พบข้อมูล Certificate นี้");
                }
            } catch (err) {
                setError("เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [qc_certification_id]);

    if (loading) {
        return (
            <div className="container-fluid px-10 py-8 text-center pt-10">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="container-fluid px-10 py-8 text-center pt-10">
                <div className="alert alert-danger">{error || "No data found."}</div>
                <button className="btn btn-primary mt-4" onClick={() => navigate(-1)}>ย้อนกลับ</button>
            </div>
        );
    }

    // Helper formatting
    const formatDate = (isoString: string) => {
        if (!isoString) return "-";
        return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isAcceptable = certificate.certification_status === 'CertificationStatus.PASSED';
    const isNotAcceptable = certificate.certification_status === 'CertificationStatus.FAILED';

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-stack flex-wrap mb-8">
                <div className="page-title d-flex flex-column py-1">
                    <h1 className="d-flex align-items-center my-1 fw-bold text-gray-900 fs-2">
                        รายละเอียดใบรับรองการทดสอบ (Test Certificate)
                    </h1>
                    <span className="text-gray-500 fs-6 mt-1">
                        View comprehensive details of the test certificate.
                    </span>
                </div>
                <div className="d-flex align-items-center py-1">
                    <button
                        className="btn btn-light me-3"
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left me-2"></i> ย้อนกลับ
                    </button>
                    <button className="btn btn-primary disabled" disabled>
                        <i className="bi bi-printer me-2"></i> พิมพ์ PDF (Coming Soon)
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-8 p-lg-12 bg-white rounded shadow-sm border border-gray-300">

                    <div className="text-center mb-10 pb-5 border-bottom border-2 border-gray-400">
                        <h1 className="fw-bolder text-gray-900 fs-2hx tracking-widest uppercase">TEST CERTIFICATE</h1>
                    </div>

                    <div className="row g-8 mb-10">
                        <div className="col-md-6 d-flex flex-column gap-4">
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-125px fs-5">Customer :</label>
                                <input type="text" className="form-control form-control-solid bg-light fw-bold" value={certificate.customer || certificate.customer_name || "-"} readOnly />
                            </div>
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-125px fs-5">Test Method :</label>
                                <input type="text" className="form-control form-control-solid bg-light" value={certificate.test_method || "-"} readOnly />
                            </div>
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-125px fs-5">Remark :</label>
                                <input type="text" className="form-control form-control-solid bg-light" value={certificate.remark || "-"} readOnly />
                            </div>
                        </div>

                        <div className="col-md-6 d-flex flex-column gap-4">
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-150px fs-5">Certificate No :</label>
                                <input type="text" className="form-control form-control-solid bg-light fw-bold" value={certificate.certification_number || "-"} readOnly />
                            </div>
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-150px fs-5">Date of Test :</label>
                                <input type="text" className="form-control form-control-solid bg-light" value={formatDate(certificate.certification_date)} readOnly />
                            </div>
                            <div className="d-flex align-items-center">
                                <label className="fw-bold text-gray-800 min-w-150px fs-5">Standard Ref. :</label>
                                <input type="text" className="form-control form-control-solid bg-light" value={certificate.standard_reference || certificate.standard_ref || "-"} readOnly />
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive border border-gray-400 mb-8">
                        <table className="table align-middle table-row-bordered border-gray-400 fs-6 gy-3 mb-0">
                            <thead>
                                <tr className="text-center text-gray-800 fw-bolder fs-6 bg-light border-bottom border-gray-400">
                                    <th className="w-60px border-end border-gray-400">Item<br />No.</th>
                                    <th className="min-w-100px border-end border-gray-400">Test No.</th>
                                    <th className="min-w-100px border-end border-gray-400">Ref.No.</th>
                                    <th className="min-w-300px border-end border-gray-400">Description</th>
                                    <th className="w-100px border-end border-gray-400">W.L.L.<br />(MT.)</th>
                                    <th className="w-100px">Load Test<br />(MT.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certificate.check_items && certificate.check_items.length > 0 ? (
                                    certificate.check_items.map((row: any, index: number) => (
                                        <tr key={index} className="text-center">
                                            <td className="fw-bold border-end border-gray-400 bg-light">{row.item_no || "-"}</td>
                                            <td className="text-gray-700 border-end border-gray-400 bg-light">{row.test_number || row.test_no || "-"}</td>
                                            <td className="border-end border-gray-400 p-1">
                                                <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" value={row.ref_number || row.ref_no || "-"} readOnly />
                                            </td>
                                            <td className="border-end border-gray-400 p-1 text-start">
                                                <textarea className="form-control form-control-sm border-0 bg-transparent resize-none" rows={2} value={row.description || "-"} readOnly></textarea>
                                            </td>
                                            <td className="border-end border-gray-400 p-1">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                                                    value={row.wll !== null && row.wll !== undefined ? row.wll : "-"}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                                                    value={row.load_test !== null && row.load_test !== undefined ? row.load_test : "-"}
                                                    readOnly
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted py-10 bg-light">
                                            ไม่มีรายการข้อมูลการทดสอบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-center gap-10 mt-10">
                        <label className="d-flex align-items-center">
                            <input type="radio" className="form-check-input h-30px w-30px me-3 border-gray-400" checked={isAcceptable} readOnly disabled />
                            <span className="fs-2 fw-bold text-gray-800">Acceptable</span>
                        </label>
                        <label className="d-flex align-items-center">
                            <input type="radio" className="form-check-input h-30px w-30px me-3 border-gray-400" checked={isNotAcceptable} readOnly disabled />
                            <span className="fs-2 fw-bold text-gray-800">Not Acceptable</span>
                        </label>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CertificateDetail;
