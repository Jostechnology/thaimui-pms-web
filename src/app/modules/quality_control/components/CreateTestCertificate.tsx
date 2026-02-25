import React, { useState, useEffect } from "react";
import { SalesOrderSearch } from "../../../type_interface/SalesOrderType";
import Select from "react-select";
import { QCWorkOrderData } from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import {
    getSalesOrderService,
    searchSalesOrderService,
} from "../../../services/salesOrderService";
import { Material } from "../../../type_interface/MaterialType";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { createCertificate } from "../../../services/certificateService";

type PageMode = "create" | "view" | "edit";

// 1. Interface สำหรับ Header Form
interface CertFormState {
    testMethod: string;
    remark: string;
    standardRef: string;
    dateOfTest: string;
    certificateNo?: string;
}

// 2. Interface สำหรับข้อมูลตารางที่แยกชิ้นแล้ว
interface CertItemRow {
    id: string;
    itemNo: string;
    testNo: string;
    refNo: string;
    description: string;
    wll: string;
    loadTest: string;
}

// 3. ฟังก์ชันเล็กๆ ดึงวันที่ปัจจุบันแบบ Local Time (Timezone ไทย)
const getTodayLocalString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // จะได้ฟอร์แมต YYYY-MM-DD เสมอ
};

const CreateTestCertificate: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // States หลัก
    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable' | null>('acceptable');
    const [salesOrders, setSalesOrder] = useState<SalesOrderSearch[]>([]);
    const [searchSalesOrder, setSearchSalesOrder] = useState<string>("");
    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [materialList, setMaterialList] = useState<Material[]>([]);
    const [selectedSalesOrder, setSelectedSalesOrder] = useState<any | null>(null);

    // 🌟 4. State สำหรับฟอร์มใบ Cert (ย้ายเข้ามาไว้ใน Component อย่างถูกต้อง)
    const [certForm, setCertForm] = useState<CertFormState>({
        testMethod: "Proof Load Test", //ค่า Default
        certificateNo: "",
        remark: "",
        standardRef: "",
        dateOfTest: getTodayLocalString()
    });

    // State สำหรับเก็บข้อมูลตารางที่ "แตกแถว" แล้ว (1 ชิ้น = 1 แถว)
    const [certItemRows, setCertItemRows] = useState<CertItemRow[]>([]);

    const [mode, setMode] = useState<PageMode>("create");
    const isReadOnly = mode === "view";

    // Logic การ "แตกแถว" ตามจำนวน Quantity (item_num)
    useEffect(() => {
        let expandedRows: CertItemRow[] = [];
        let counter = 1;

        materialList.forEach((mat: any) => {
            const qty = Number(mat.item_num || mat.Qty || mat.Quantity || 1);

            for (let i = 0; i < qty; i++) {
                expandedRows.push({
                    id: `${mat.item_code}-${counter}`,
                    itemNo: String(counter).padStart(2, '0'), // รันเลข 01, 02, 03...
                    testNo: "[Auto Gen]",
                    refNo: "",
                    description: `${mat.item_name || ""} ${mat.item_description || ""}`.trim(),
                    wll: "",
                    loadTest: "",
                });
                counter++;
            }
        });

        setCertItemRows(expandedRows);
    }, [materialList]);

    // Handle การพิมพ์แก้ไขข้อมูลในแต่ละแถวของตาราง
    const handleRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const newRows = [...certItemRows];
        newRows[index][field] = value;
        setCertItemRows(newRows);
    };

    // Handle numeric-only inputs for WLL and Load Test (no negative values)
    const sanitizeNumericInput = (val: string) => {
        // remove any non-digit and non-dot characters
        let s = val.replace(/[^0-9.]/g, "");
        // collapse multiple dots to a single dot
        const parts = s.split('.');
        if (parts.length > 2) {
            s = parts.shift() + '.' + parts.join('');
        }
        // remove leading zeros unless followed by a dot (keep user-friendly)
        // allow empty string
        return s;
    };

    const handleNumericRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const clean = sanitizeNumericInput(value);
        // prevent leading '-' by design; parsed negative is also blocked
        const num = clean === '' ? NaN : parseFloat(clean);
        if (!isNaN(num) && num < 0) {
            // ignore negative input (do not update)
            return;
        }

        const newRows = [...certItemRows];
        newRows[index][field] = clean;
        setCertItemRows(newRows);
    };

    const handleSave = async () => {
        if (certItemRows.length === 0) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกใบสั่งขายและตรวจสอบรายการสินค้า", "warning");
            return;
        }

        const payload = {
            qc_work_order_id: 6,
            certification_name: "TC-AUTO-GEN",
            certification_date: certForm.dateOfTest,
            certification_status: overallStatus,
            remark: certForm.remark,
            standard_ref: certForm.standardRef,
            test_method: certForm.testMethod,
            customer_name: formData.customerName,

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

            const result = await createCertificate(payload);
            if (result.success) {
                Swal.fire("สำเร็จ!", "สร้าง Test Certificate เรียบร้อยแล้ว", "success").then(() => {
                    navigate(-1);
                });
            } else {
                Swal.fire("ผิดพลาด!", result.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
            }
        } catch (error: any) {
            Swal.fire("ผิดพลาด!", error.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
        }
    };

    const handleSearchSalesOrder = async () => {
        try {
            const res = await searchSalesOrderService(searchSalesOrder);
            setSalesOrder(res.data || []);
        } catch (error) {
            console.error('searchSalesOrderService error', error);
            setSalesOrder([]);
        }
    };

    const handleChangedSalesOrder = async (option: any) => {
        const selected = option || null;
        setSelectedSalesOrder(selected);

        if (selected) {
            try {
                const res = await getSalesOrderService(selected.doc_entry);
                if (res && res.data) {
                    const materials = res.data.items || res.data.material_list || [];
                    setMaterialList(materials);

                    setFormData((prev) => ({
                        ...prev,
                        customerCode: res.data.card_code || prev.customerCode,
                        customerName: res.data.card_name || prev.customerName,
                    }));
                } else {
                    Swal.fire("ไม่พบข้อมูล!", `ไม่พบใบสั่งขาย ${selected.doc_entry}`, "warning");
                    setFormData(qcWorkData);
                    setMaterialList([]);
                }
            } catch (error) {
                console.error(`Failed to fetch SO: ${selected.doc_entry}`, error);
                Swal.fire("ผิดพลาด!", `เกิดข้อผิดพลาดในการดึงข้อมูล ${selected.doc_entry}`, "error");
                setFormData(qcWorkData);
                setMaterialList([]);
                setSelectedSalesOrder(null);
            }
        } else {
            setFormData(qcWorkData);
            setMaterialList([]);
        }
    };

    useEffect(() => {
        if (!searchSalesOrder) return;
        const timeout = setTimeout(() => { handleSearchSalesOrder(); }, 750);
        return () => clearTimeout(timeout);
    }, [searchSalesOrder]);

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-column gap-6">

                {/* --- ส่วนบน: เลือก Sales Order --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-6">
                        <div className="d-flex align-items-center mb-4">
                            <i className="bi bi-cart fs-2 text-primary me-3"></i>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">เลือกใบ QC</h3>
                        </div>
                        <div className="w-md-500px">
                            <Select
                                options={salesOrders}
                                formatOptionLabel={(option: any) => (
                                    <div className="d-flex align-items-center gap-2"><span>{option.doc_entry}</span></div>
                                )}
                                getOptionValue={(option) => option.doc_entry}
                                value={selectedSalesOrder}
                                onInputChange={(inputValue, actionMeta) => {
                                    if (actionMeta.action === "input-change") setSearchSalesOrder(inputValue);
                                }}
                                onChange={handleChangedSalesOrder}
                                placeholder="ค้นหาใบสั่งขาย..."
                                isClearable
                            />
                        </div>
                    </div>
                </div>

                {/* --- ส่วนล่าง: จำลองหน้ากระดาษ Test Certificate --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-12 bg-white rounded shadow-sm border border-gray-300">

                        <div className="text-center mb-10 pb-5 border-bottom border-2 border-gray-400">
                            <h1 className="fw-bolder text-gray-900 fs-2hx tracking-widest uppercase">TEST CERTIFICATE</h1>
                        </div>

                        <div className="row g-8 mb-10">
                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Customer :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={formData.customerName || ""} readOnly placeholder="[Auto from SO]" />
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
                                    <input type="text" className="form-control form-control-solid bg-light" value={certForm.certificateNo} onChange={(e) => setCertForm({ ...certForm, certificateNo: e.target.value })} />
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
                                                <td className="fw-bold border-end border-gray-400">{row.itemNo}</td>
                                                <td className="text-gray-500 border-end border-gray-400">{row.testNo}</td>
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
                                                            // ensure empty or valid non-negative number; if empty keep empty
                                                            const v = e.target.value;
                                                            if (v === '') return;
                                                            const n = parseFloat(v);
                                                            if (isNaN(n) || n < 0) {
                                                                // reset to empty when invalid
                                                                handleNumericRowChange(index, 'wll', '');
                                                            }
                                                        }}
                                                        min="0"
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
                                                        min="0"
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-10">
                                                ไม่มีรายการสินค้า (กรุณาเลือกใบสั่งขาย)
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