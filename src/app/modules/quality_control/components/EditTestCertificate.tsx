import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getCertificateById, updateCertificate } from "../../../services/certificateService";

interface CertFormState {
    testMethod: string;
    remark: string;
    standardRef: string;
    dateOfTest: string;
    certificateNo: string;
    customerName: string;
}

interface CertItemRow {
    id?: string;
    itemNo: string;
    testNo: string;
    refNo: string;
    description: string;
    wll: string;
    loadTest: string;
}

const EditTestCertificate: React.FC = () => {
    const navigate = useNavigate();
    const { qc_certification_id } = useParams<{ qc_certification_id: string }>();

    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable' | null>('acceptable');

    const [certForm, setCertForm] = useState<CertFormState>({
        testMethod: "",
        certificateNo: "",
        remark: "",
        standardRef: "",
        dateOfTest: "",
        customerName: ""
    });

    const [certItemRows, setCertItemRows] = useState<CertItemRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!qc_certification_id) return;
            try {
                const res = await getCertificateById(qc_certification_id);
                if (res.success && res.data) {
                    const cert = res.data;

                    // Format date to YYYY-MM-DD for input type="date"
                    let formattedDate = "";
                    if (cert.certification_date) {
                        try {
                            const d = new Date(cert.certification_date);
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            formattedDate = `${year}-${month}-${day}`;
                        } catch (e) {
                            formattedDate = cert.certification_date;
                        }
                    }

                    setCertForm({
                        testMethod: cert.test_method || "",
                        certificateNo: cert.certification_number || cert.certification_name || "",
                        remark: cert.remark || "",
                        standardRef: cert.standard_reference || cert.standard_ref || "",
                        dateOfTest: formattedDate,
                        customerName: cert.customer || cert.customer_name || ""
                    });

                    let status: 'acceptable' | 'not_acceptable' | null = null;
                    if (cert.certification_status === 'CertificationStatus.PASSED' || cert.certification_status === 'acceptable') {
                        status = 'acceptable';
                    } else if (cert.certification_status === 'CertificationStatus.FAILED' || cert.certification_status === 'not_acceptable') {
                        status = 'not_acceptable';
                    } else {
                        status = cert.certification_status;
                    }
                    setOverallStatus(status);

                    if (cert.check_items && Array.isArray(cert.check_items)) {
                        const items: CertItemRow[] = cert.check_items.map((item: any) => ({
                            itemNo: item.item_no || "",
                            testNo: item.test_number || item.test_no || "",
                            refNo: item.ref_number || item.ref_no || "",
                            description: item.description || "",
                            wll: item.wll !== null && item.wll !== undefined ? String(item.wll) : "",
                            loadTest: item.load_test !== null && item.load_test !== undefined ? String(item.load_test) : ""
                        }));
                        setCertItemRows(items);
                    }
                } else {
                    Swal.fire("ไม่พบข้อมูล!", res.message || "ไม่พบข้อมูล Certificate นี้", "error").then(() => {
                        navigate(-1);
                    });
                }
            } catch (error) {
                console.error("Fetch detail error:", error);
                Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์", "error").then(() => {
                    navigate(-1);
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [qc_certification_id, navigate]);

    const handleRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const newRows = [...certItemRows];
        newRows[index][field] = value;
        setCertItemRows(newRows);
    };

    const sanitizeNumericInput = (val: string) => {
        let s = val.replace(/[^0-9.]/g, "");
        const parts = s.split('.');
        if (parts.length > 2) {
            s = parts.shift() + '.' + parts.join('');
        }
        return s;
    };

    const handleNumericRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const clean = sanitizeNumericInput(value);
        const num = clean === '' ? NaN : parseFloat(clean);
        if (!isNaN(num) && num < 0) return;

        const newRows = [...certItemRows];
        newRows[index][field] = clean;
        setCertItemRows(newRows);
    };

    const handleSave = async () => {
        if (!qc_certification_id) return;

        if (certItemRows.length === 0) {
            Swal.fire("แจ้งเตือน", "ไม่มีรายการสินค้าให้แก้ไข", "warning");
            return;
        }

        const payload = {
            certification_name: certForm.certificateNo.trim() !== "" ? certForm.certificateNo : "TC-AUTO-GEN",
            certification_date: certForm.dateOfTest,
            certification_status: overallStatus,
            remark: certForm.remark,
            standard_ref: certForm.standardRef,
            test_method: certForm.testMethod,
            customer_name: certForm.customerName,
            items: certItemRows.map(row => ({
                item_no: row.itemNo,
                test_no: row.testNo,
                ref_no: row.refNo,
                description: row.description,
                wll: row.wll,
                load_test: row.loadTest
            }))
        };

        try {
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const result = await updateCertificate(qc_certification_id, payload);

            if (result && result.success) {
                Swal.fire("สำเร็จ!", "แก้ไข Test Certificate เรียบร้อยแล้ว", "success").then(() => {
                    navigate(-1);
                });
            } else {
                Swal.fire("ผิดพลาด!", result?.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
            }
        } catch (error: any) {
            Swal.fire("ผิดพลาด!", error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        }
    };

    if (loading) {
        return (
            <div className="container-fluid px-10 py-8 text-center pt-10">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-column gap-6">

                {/* --- ส่วนบน: Header --- */}
                <div className="d-flex flex-stack flex-wrap mb-2">
                    <div className="page-title d-flex flex-column py-1">
                        <h1 className="d-flex align-items-center my-1 fw-bold text-gray-900 fs-2">
                            แก้ไขใบรับรองการทดสอบ (Edit Test Certificate)
                        </h1>
                        <span className="text-gray-500 fs-6 mt-1">
                            Modify details of the test certificate.
                        </span>
                    </div>
                </div>

                {/* --- ส่วนล่าง: ฟอร์ม Test Certificate --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-12 bg-white rounded shadow-sm border border-gray-300">

                        <div className="text-center mb-10 pb-5 border-bottom border-2 border-gray-400">
                            <h1 className="fw-bolder text-gray-900 fs-2hx tracking-widest uppercase">TEST CERTIFICATE</h1>
                        </div>

                        <div className="row g-8 mb-10">
                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Customer :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={certForm.customerName || ""} readOnly placeholder="Customer Name" />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Test Method :</label>
                                    <input type="text" className="form-control" value={certForm.testMethod} onChange={(e) => setCertForm({ ...certForm, testMethod: e.target.value })} placeholder="e.g. Proof Load Test" />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Remark :</label>
                                    <input type="text" className="form-control" value={certForm.remark} onChange={(e) => setCertForm({ ...certForm, remark: e.target.value })} placeholder="e.g. PO.No. 10559024" />
                                </div>
                            </div>

                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Certificate No :</label>
                                    <input type="text" className="form-control" value={certForm.certificateNo} onChange={(e) => setCertForm({ ...certForm, certificateNo: e.target.value })} placeholder="Certificate No." />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Date of Test :</label>
                                    <input type="date" className="form-control form-control-solid bg-light fw-bold" value={certForm.dateOfTest} onChange={(e) => setCertForm({ ...certForm, dateOfTest: e.target.value })} />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Standard Ref. :</label>
                                    <input type="text" className="form-control" value={certForm.standardRef} onChange={(e) => setCertForm({ ...certForm, standardRef: e.target.value })} placeholder="e.g. BS EN 13414" />
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
                                    {certItemRows.length > 0 ? (
                                        certItemRows.map((row, index) => (
                                            <tr key={index} className="text-center">
                                                <td className="fw-bold border-end border-gray-400">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" value={row.itemNo} onChange={(e) => handleRowChange(index, 'itemNo', e.target.value)} />
                                                </td>
                                                <td className="text-gray-500 border-end border-gray-400">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent text-gray-500" value={row.testNo} onChange={(e) => handleRowChange(index, 'testNo', e.target.value)} />
                                                </td>
                                                <td className="border-end border-gray-400 p-1">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" placeholder="-" value={row.refNo} onChange={(e) => handleRowChange(index, 'refNo', e.target.value)} />
                                                </td>
                                                <td className="border-end border-gray-400 p-1 text-start">
                                                    <textarea className="form-control form-control-sm border-0 bg-transparent resize-none" rows={2} value={row.description} onChange={(e) => handleRowChange(index, 'description', e.target.value)}></textarea>
                                                </td>
                                                <td className="border-end border-gray-400 p-1">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                                                        placeholder="0.00"
                                                        value={row.wll}
                                                        onChange={(e) => handleNumericRowChange(index, 'wll', e.target.value)}
                                                        onBlur={(e) => {
                                                            const v = e.target.value;
                                                            if (v === '') return;
                                                            const n = parseFloat(v);
                                                            if (isNaN(n) || n < 0) {
                                                                handleNumericRowChange(index, 'wll', '');
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                                                        placeholder="0.00"
                                                        value={row.loadTest}
                                                        onChange={(e) => handleNumericRowChange(index, 'loadTest', e.target.value)}
                                                        onBlur={(e) => {
                                                            const v = e.target.value;
                                                            if (v === '') return;
                                                            const n = parseFloat(v);
                                                            if (isNaN(n) || n < 0) {
                                                                handleNumericRowChange(index, 'loadTest', '');
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-10">
                                                ไม่มีรายการสินค้า
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex justify-content-center gap-10 mt-10">
                            <label className="d-flex align-items-center cursor-pointer">
                                <input type="radio" name="certStatus" value="acceptable" className="form-check-input h-30px w-30px me-3 border-gray-400" checked={overallStatus === 'acceptable'} onChange={() => setOverallStatus('acceptable')} />
                                <span className="fs-2 fw-bold text-gray-800">Acceptable</span>
                            </label>
                            <label className="d-flex align-items-center cursor-pointer">
                                <input type="radio" name="certStatus" value="not_acceptable" className="form-check-input h-30px w-30px me-3 border-gray-400" checked={overallStatus === 'not_acceptable'} onChange={() => setOverallStatus('not_acceptable')} />
                                <span className="fs-2 fw-bold text-gray-800">Not Acceptable</span>
                            </label>
                        </div>

                    </div>

                    <div className="card-footer border-0 d-flex justify-content-end gap-3 mt-4">
                        <button className="btn btn-light fw-bold px-8" onClick={() => navigate(-1)}>Cancel</button>
                        <button className="btn btn-primary fw-bold px-8 shadow-sm" onClick={handleSave}>
                            <i className="bi bi-save me-2"></i> Save Changes
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EditTestCertificate;
