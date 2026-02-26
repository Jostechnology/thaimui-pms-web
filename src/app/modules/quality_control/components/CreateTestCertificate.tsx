import React, { useState, useEffect } from "react";
import Select from "react-select";
import { QCWorkOrderData, SearchQcWorkOrders } from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import { getQCWorkOrderById, searchQcWorkOrder as searchQcWorkOrderService } from "../../../services/qcWorkOrderService";
import { Material } from "../../../type_interface/MaterialType";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { createCertificate } from "../../../services/certificateService";

type PageMode = "create" | "view" | "edit";

// 1. Interface สำหรับ Header Form
interface CertFormState {
    testMethod: string;
    remark: string;
    standardRef: string;
    dateOfTest: string;
    certificateNo: string;
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

// 3. ฟังก์ชันดึงวันที่ปัจจุบัน
const getTodayLocalString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const CreateTestCertificate: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // States หลัก
    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable' | null>('acceptable');
    const [qcOrders, setQcOrders] = useState<SearchQcWorkOrders[]>([]);
    const [searchQcWorkOrder, setSearchQcWorkOrder] = useState<string>("");
    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [materialList, setMaterialList] = useState<Material[]>([]);

    // State สำหรับเก็บใบ QC ที่ถูกเลือก
    const [selectedQcOrder, setSelectedQcOrder] = useState<any | null>(null);

    // State สำหรับฟอร์มใบ Cert
    const [certForm, setCertForm] = useState<CertFormState>({
        testMethod: "Proof Load Test",
        certificateNo: "",
        remark: "",
        standardRef: "",
        dateOfTest: getTodayLocalString()
    });

    const [certItemRows, setCertItemRows] = useState<CertItemRow[]>([]);
    const [mode, setMode] = useState<PageMode>("create");

    // Logic การ "แตกแถว"
    useEffect(() => {
        let expandedRows: CertItemRow[] = [];
        let counter = 1;

        materialList.forEach((mat: any) => {
            //2. ดักจับ quantity ค่าว่าง ("") ให้ถือว่าเป็น 1 ชิ้นเสมอ
            const rawQty = mat.quantity || mat.item_num || mat.Qty || mat.Quantity;
            const qty = (rawQty === "" || rawQty == null) ? 1 : Number(rawQty);

            for (let i = 0; i < qty; i++) {
                expandedRows.push({
                    id: `${mat.item_code || 'ITEM'}-${counter}`,
                    itemNo: String(counter).padStart(2, '0'),
                    testNo: "[Auto Gen]",
                    refNo: mat.serial_no || "", // 🌟 ถ้ามี serial_no ก็เอามาเป็น Ref ซะเลย
                    description: mat.description || `${mat.item_name || ""} ${mat.item_description || ""}`.trim(), // 🌟 ดึง description ตรงๆ
                    wll: mat.wll || "", // 🌟 ดึง WLL ที่ผูกมาด้วย
                    loadTest: "",
                });
                counter++;
            }
        });

        setCertItemRows(expandedRows);
    }, [materialList]);

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

    //ฟังก์ชัน Save ที่ปรับปรุงแล้ว
    const handleSave = async () => {
        // ดักจับว่าเลือกใบ QC หรือยัง
        if (!selectedQcOrder) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกใบ QC ก่อนทำการบันทึก", "warning");
            return;
        }

        if (certItemRows.length === 0) {
            Swal.fire("แจ้งเตือน", "ไม่มีรายการสินค้าให้สร้างใบ Cert", "warning");
            return;
        }

        const payload = {
            //ดึง ID มาจากใบ QC ที่เลือก (รองรับทั้งฟิลด์ qc_work_order_id หรือ id)
            qc_work_order_id: selectedQcOrder.qc_work_order_id || selectedQcOrder.id,

            //ถ้าไม่ได้กรอก Certificate No. ให้ส่ง TC-AUTO-GEN ไปให้ Backend จัดการ
            certification_name: certForm.certificateNo.trim() !== "" ? certForm.certificateNo : "TC-AUTO-GEN",

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

            if (result && result.success) {
                Swal.fire("สำเร็จ!", "สร้าง Test Certificate เรียบร้อยแล้ว", "success").then(() => {
                    navigate(-1);
                });
            } else {
                Swal.fire("ผิดพลาด!", result?.message || "ไม่สามารถบันทึกข้อมูลได้", "error");
            }
        } catch (error: any) {
            Swal.fire("ผิดพลาด!", error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        }
    };

    const handleSearchQcWorkOrder = async () => {
        try {
            const res: any = await searchQcWorkOrderService(searchQcWorkOrder);

            const jsonData = (res && typeof res.json === 'function') ? await res.json() : res;

            const list = (jsonData && jsonData.data)
                ? (Array.isArray(jsonData.data) ? jsonData.data : (jsonData.data.items || jsonData.data.data || []))
                : [];

            setQcOrders(list);
        } catch (error) {
            console.error('searchQcWorkOrder error', error);
            setQcOrders([]);
        }
    };
    const handleChangedQcOrder = async (option: any) => {
        const selected = option || null;
        setSelectedQcOrder(selected);

        if (selected) {
            try {
                const targetId = selected.qc_work_order_id || selected.id || selected.doc_entry;
                const res = await getQCWorkOrderById(targetId);

                if (res && res.data) {
                    // 🌟 1. ชี้เป้าไปที่ res.data.qc_items ตาม JSON ใหม่เป๊ะๆ
                    const materials = res.data.qc_items || res.data.items || res.data.material_list || [];
                    setMaterialList(materials);

                    setFormData((prev) => ({
                        ...prev,
                        customerCode: res.data.card_code || prev.customerCode,
                        customerName: res.data.card_name || prev.customerName,
                    }));
                } else {
                    Swal.fire("ไม่พบข้อมูล!", `ไม่พบรายละเอียดใบ QC`, "warning");
                    setFormData(qcWorkData);
                    setMaterialList([]);
                }
            } catch (error) {
                console.error(`Failed to fetch QC Order details`, error);
                Swal.fire("ผิดพลาด!", `เกิดข้อผิดพลาดในการดึงข้อมูลใบ QC`, "error");
                setFormData(qcWorkData);
                setMaterialList([]);
                setSelectedQcOrder(null);
            }
        } else {
            setFormData(qcWorkData);
            setMaterialList([]);
        }
    };

    useEffect(() => {
        if (!searchQcWorkOrder) return;
        const timeout = setTimeout(() => { handleSearchQcWorkOrder(); }, 750);
        return () => clearTimeout(timeout);
    }, [searchQcWorkOrder]);

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-column gap-6">

                {/* --- ส่วนบน: เลือก QC Work Order --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-6">
                        <div className="d-flex align-items-center mb-4">
                            <i className="bi bi-cart fs-2 text-primary me-3"></i>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">เลือกใบ QC (QC Work Order)</h3>
                        </div>
                        <div className="w-md-500px">
                            <Select
                                options={qcOrders}

                                getOptionLabel={(option: any) => String(option.doc_entry || option.qc_work_order_id || "QC-Order")}

                                getOptionValue={(option: any) => String(option.qc_work_order_id || option.doc_entry)}

                                formatOptionLabel={(option: any) => (
                                    <div className="d-flex align-items-center gap-2">
                                        <span>{option.doc_entry || option.qc_work_order_id || "QC-Order"}</span>
                                    </div>
                                )}
                                value={selectedQcOrder}
                                onInputChange={(inputValue, actionMeta) => {
                                    if (actionMeta.action === "input-change") setSearchQcWorkOrder(inputValue);
                                }}
                                onChange={handleChangedQcOrder}
                                placeholder="ค้นหาใบ QC..."
                                isClearable

                                filterOption={null}
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
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={formData.customerName || ""} readOnly placeholder="[Auto from QC]" />
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
                                    <input type="text" className="form-control" value={certForm.certificateNo} onChange={(e) => setCertForm({ ...certForm, certificateNo: e.target.value })} placeholder="เว้นว่างไว้เพื่อ Auto Gen" />
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
                                                ไม่มีรายการสินค้า (กรุณาเลือกใบ QC)
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