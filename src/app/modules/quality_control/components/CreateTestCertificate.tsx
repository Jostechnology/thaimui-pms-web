import React, { useState, useEffect } from "react";
import Select from "react-select";
import { SalesOrderSearch } from "../../../type_interface/SalesOrderType";
import { searchSalesOrderService, getSalesOrderForCertificate } from "../../../services/salesOrderService";
import { getTestResultsBySalesOrder } from "../../../services/testResultService";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { createCertificate } from "../../../services/certificateService";

interface CertFormState {
    testMethod: string;
    remark: string;
    standardRef: string;
    dateOfTest: string;
    certificateNo: string;
    customerName: string;
    poReference: string;
}

interface CertItemRow {
    id: string;
    salesItemId: number | null;
    testResultItemId: number | null;
    itemNo: string;
    testNumber: string;
    refNumber: string;
    description: string;
    wll: string;
    loadTest: string;
}

const getTodayLocalString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={`badge fw-bold px-3 py-1 ${status === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
        {status}
    </span>
);

const CreateTestCertificate: React.FC = () => {
    const navigate = useNavigate();

    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable'>('acceptable');
    const [salesOrderOptions, setSalesOrderOptions] = useState<SalesOrderSearch[]>([]);
    const [searchKeyword, setSearchKeyword] = useState<string>("");
    const [selectedSalesOrder, setSelectedSalesOrder] = useState<any | null>(null);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [testResultsLoading, setTestResultsLoading] = useState(false);
    const [selectedTestResult, setSelectedTestResult] = useState<any | null>(null);
    const [certForm, setCertForm] = useState<CertFormState>({
        testMethod: "Proof Load Test",
        certificateNo: "",
        remark: "",
        standardRef: "",
        dateOfTest: getTodayLocalString(),
        customerName: "",
        poReference: "",
    });
    const [certItemRows, setCertItemRows] = useState<CertItemRow[]>([]);

    // When a test result is selected, populate rows from its items
    const handleSelectTestResult = (tr: any) => {
        setSelectedTestResult(tr);
        const items: CertItemRow[] = (tr.test_result_items || []).map((item: any, idx: number) => ({
            id: `tr-item-${item.test_result_item_id}`,
            salesItemId: tr.sales_item_id ?? null,
            testResultItemId: item.test_result_item_id,
            itemNo: String(idx + 1).padStart(2, '0'),
            testNumber: String(item.unit_number ?? idx + 1),
            refNumber: item.serial_no || "",
            description: item.description || "",
            wll: item.wll_measured != null ? String(item.wll_measured) : "",
            loadTest: item.load_test_value != null ? String(item.load_test_value) : "",
        }));
        setCertItemRows(items);
        // Auto-fill test method and standard ref from test result if cert form is still default
        setCertForm(prev => ({
            ...prev,
            testMethod: tr.test_method || prev.testMethod,
            standardRef: tr.standard_reference || prev.standardRef,
        }));
    };

    const handleRemoveRow = (index: number) => {
        setCertItemRows(prev => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.map((row, i) => ({ ...row, itemNo: String(i + 1).padStart(2, '0') }));
        });
    };

    const handleRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        setCertItemRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const sanitizeNumericInput = (val: string) => {
        let s = val.replace(/[^0-9.]/g, "");
        const parts = s.split('.');
        if (parts.length > 2) s = parts.shift() + '.' + parts.join('');
        return s;
    };

    const handleNumericRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const clean = sanitizeNumericInput(value);
        const num = clean === '' ? NaN : parseFloat(clean);
        if (!isNaN(num) && num < 0) return;
        handleRowChange(index, field, clean);
    };

    const handleSave = async () => {
        if (!selectedSalesOrder) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือก Sales Order ก่อนทำการบันทึก", "warning");
            return;
        }
        if (!selectedTestResult) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกผลการทดสอบก่อนทำการบันทึก", "warning");
            return;
        }
        if (certItemRows.length === 0) {
            Swal.fire("แจ้งเตือน", "ไม่มีรายการสินค้าในใบ Cert", "warning");
            return;
        }

        const payload = {
            sales_order_doc_entry: selectedSalesOrder.doc_entry,
            certification_name: certForm.certificateNo.trim() !== "" ? certForm.certificateNo : "TC-AUTO-GEN",
            certification_date: certForm.dateOfTest,
            certification_status: overallStatus,
            remark: certForm.remark,
            standard_ref: certForm.standardRef,
            test_method: certForm.testMethod,
            customer_name: certForm.customerName,
            po_reference: certForm.poReference,
            items: certItemRows.map(row => ({
                sales_item_id: row.salesItemId,
                test_result_item_id: row.testResultItemId,
                item_no: row.itemNo,
                test_number: row.testNumber,
                ref_number: row.refNumber,
                description: row.description,
                wll: row.wll === "" ? null : parseFloat(row.wll),
                load_test: row.loadTest === "" ? null : parseFloat(row.loadTest),
            })),
        };

        try {
            Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const result = await createCertificate(payload);
            if (result && result.success) {
                Swal.fire("สำเร็จ!", "สร้าง Test Certificate เรียบร้อยแล้ว", "success").then(() => navigate(-1));
            } else {
                Swal.fire("ผิดพลาด!", result?.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
            }
        } catch (error: any) {
            Swal.fire("ผิดพลาด!", error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        }
    };

    const handleSearchSalesOrder = async (keyword: string) => {
        try {
            const res: any = await searchSalesOrderService(keyword);
            const list = res?.data
                ? (Array.isArray(res.data) ? res.data : (res.data.items || res.data.data || []))
                : [];
            setSalesOrderOptions(list);
        } catch {
            setSalesOrderOptions([]);
        }
    };

    const handleSelectSalesOrder = async (option: any) => {
        setSelectedSalesOrder(option || null);
        setTestResults([]);
        setSelectedTestResult(null);
        setCertItemRows([]);

        if (!option) {
            setCertForm(prev => ({ ...prev, customerName: "", poReference: "" }));
            return;
        }

        try {
            // Fetch SO detail for customer + PO ref
            const soRes = await getSalesOrderForCertificate(Number(option.doc_entry));
            if (soRes && soRes.success && soRes.data) {
                setCertForm(prev => ({
                    ...prev,
                    customerName: soRes.data.card_name || "",
                    poReference: soRes.data.po_reference || "",
                }));
            }

            // Fetch test results for this SO
            setTestResultsLoading(true);
            const trRes = await getTestResultsBySalesOrder(Number(option.doc_entry));
            if (trRes && trRes.success) {
                setTestResults(Array.isArray(trRes.data) ? trRes.data : []);
            }
        } catch {
            Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการดึงข้อมูล", "error");
            setSelectedSalesOrder(null);
        } finally {
            setTestResultsLoading(false);
        }
    };

    useEffect(() => {
        if (!searchKeyword) return;
        const timeout = setTimeout(() => { handleSearchSalesOrder(searchKeyword); }, 750);
        return () => clearTimeout(timeout);
    }, [searchKeyword]);

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-column gap-6">

                {/* --- เลือก Sales Order --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-6">
                        <div className="d-flex align-items-center mb-4">
                            <i className="bi bi-receipt fs-2 text-primary me-3"></i>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">เลือก Sales Order</h3>
                        </div>
                        <div className="w-md-500px">
                            <Select
                                options={salesOrderOptions}
                                getOptionLabel={(option: any) => `${option.doc_num}`}
                                getOptionValue={(option: any) => String(option.doc_entry)}
                                formatOptionLabel={(option: any) => (
                                    <span className="fw-bold">{option.doc_num}</span>
                                )}
                                value={selectedSalesOrder}
                                onInputChange={(inputValue, actionMeta) => {
                                    if (actionMeta.action === "input-change") setSearchKeyword(inputValue);
                                }}
                                onChange={handleSelectSalesOrder}
                                placeholder="ค้นหา Sales Order..."
                                isClearable
                                filterOption={null}
                            />
                        </div>
                    </div>
                </div>

                {/* --- เลือกผลการทดสอบ --- */}
                {selectedSalesOrder && (
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-6">
                            <div className="d-flex align-items-center mb-4">
                                <i className="bi bi-clipboard2-check fs-2 text-success me-3"></i>
                                <h3 className="m-0 fw-bold text-gray-800 fs-4">เลือกผลการทดสอบ (Test Result)</h3>
                            </div>

                            {testResultsLoading ? (
                                <div className="text-muted py-4">
                                    <span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...
                                </div>
                            ) : testResults.length === 0 ? (
                                <div className="text-center py-6 text-muted">
                                    <i className="bi bi-clipboard2-x fs-2x d-block mb-2 text-gray-400"></i>
                                    ไม่พบผลการทดสอบสำหรับ Sales Order นี้
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {testResults.map((tr: any) => {
                                        const isSelected = selectedTestResult?.test_result_id === tr.test_result_id;
                                        return (
                                            <div
                                                key={tr.test_result_id}
                                                className={`border rounded p-4 cursor-pointer transition-all ${isSelected ? "border-primary bg-light-primary" : "border-gray-300 hover-bg-light"}`}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => handleSelectTestResult(tr)}
                                            >
                                                <div className="d-flex align-items-center gap-4 flex-wrap">
                                                    <div className="form-check mb-0">
                                                        <input
                                                            type="radio"
                                                            className="form-check-input"
                                                            readOnly
                                                            checked={isSelected}
                                                        />
                                                    </div>
                                                    <span className="fw-bold text-gray-800">
                                                        {tr.test_date ? tr.test_date.split("T")[0] : "-"}
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
                                                    <span className="text-muted fs-7 ms-auto">
                                                        {tr.test_result_items?.length ?? 0} หน่วย
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- จำลองหน้ากระดาษ Test Certificate --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-12 bg-white rounded shadow-sm border border-gray-300">

                        <div className="text-center mb-10 pb-5 border-bottom border-2 border-gray-400">
                            <h1 className="fw-bolder text-gray-900 fs-2hx tracking-widest uppercase">TEST CERTIFICATE</h1>
                        </div>

                        <div className="row g-8 mb-10">
                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Customer :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={certForm.customerName} readOnly placeholder="[Auto from Sales Order]" />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">PO Ref. :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={certForm.poReference} readOnly placeholder="[Auto from Sales Order]" />
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
                                    <input disabled type="text" className="form-control" value={certForm.certificateNo} onChange={(e) => setCertForm({ ...certForm, certificateNo: e.target.value })} placeholder="เว้นว่างไว้เพื่อ Auto Gen" />
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
                                        <th className="w-100px border-end border-gray-400">Load Test<br />(MT.)</th>
                                        <th className="w-50px"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certItemRows.length > 0 ? (
                                        certItemRows.map((row, index) => (
                                            <tr key={row.id} className="text-center">
                                                <td className="fw-bold border-end border-gray-400">{row.itemNo}</td>
                                                <td className="border-end border-gray-400 p-1">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" value={row.testNumber} onChange={(e) => handleRowChange(index, 'testNumber', e.target.value)} />
                                                </td>
                                                <td className="border-end border-gray-400 p-1">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" placeholder="-" value={row.refNumber} onChange={(e) => handleRowChange(index, 'refNumber', e.target.value)} />
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
                                                            const n = parseFloat(e.target.value);
                                                            if (e.target.value !== '' && (isNaN(n) || n < 0)) handleNumericRowChange(index, 'wll', '');
                                                        }}
                                                    />
                                                </td>
                                                <td className="border-end border-gray-400 p-1">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        className="form-control form-control-sm text-center border-0 bg-transparent fw-bold"
                                                        placeholder="0.00"
                                                        value={row.loadTest}
                                                        onChange={(e) => handleNumericRowChange(index, 'loadTest', e.target.value)}
                                                        onBlur={(e) => {
                                                            const n = parseFloat(e.target.value);
                                                            if (e.target.value !== '' && (isNaN(n) || n < 0)) handleNumericRowChange(index, 'loadTest', '');
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-1">
                                                    <button
                                                        className="btn btn-icon btn-sm btn-light-danger"
                                                        onClick={() => handleRemoveRow(index)}
                                                        title="ลบแถวนี้"
                                                    >
                                                        <i className="bi bi-x fs-4"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-10">
                                                {selectedTestResult
                                                    ? "ไม่มีรายการในผลการทดสอบที่เลือก"
                                                    : "กรุณาเลือกผลการทดสอบจากด้านบน"}
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
                            <i className="bi bi-save me-2"></i> Save Certificate
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateTestCertificate;
