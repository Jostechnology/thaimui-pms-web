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

type PageMode = "create" | "view" | "edit";

// Interface สำหรับเก็บข้อมูลแต่ละบรรทัดในใบ Cert (หลังจากแยกร่างตามจำนวนชิ้นแล้ว)
interface CertItemRow {
    id: string;
    itemNo: string;
    testNo: string;
    refNo: string;
    description: string;
    wll: string;
    loadTest: string;
}

const CreateTestCertificate: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // States หลัก
    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable' | null>('acceptable');
    const [salesOrders, setSalesOrder] = useState<SalesOrderSearch[]>([]);
    const [searchSalesOrder, setSearchSalesOrder] = useState<string>("");
    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [materialList, setMaterialList] = useState<Material[]>([]);
    const [selectedSalesOrders, setSelectedSalesOrders] = useState<any[]>([]);

    // States สำหรับใบ Cert (อิงตามฟิลด์ที่คุณต้องการ)
    const [certForm, setCertForm] = useState({
        testMethod: "Proof Load Test", // ค่า Default คร่าวๆ
        remark: "",
        standardRef: "",
        dateOfTest: new Date().toISOString().split('T')[0] // ดึงวันที่ปัจจุบัน
    });

    // State สำหรับเก็บข้อมูลตารางที่ "แตกแถว" แล้ว (1 ชิ้น = 1 แถว)
    const [certItemRows, setCertItemRows] = useState<CertItemRow[]>([]);

    const [mode, setMode] = useState<PageMode>("create");
    const isReadOnly = mode === "view";

    // 🌟 1. Logic การ "แตกแถว" ตามจำนวน Quantity (item_num)
    useEffect(() => {
        let expandedRows: CertItemRow[] = [];
        let counter = 1;

        materialList.forEach((mat: any) => {
            // ดึงจำนวนออกมา (ถ้าไม่มีให้ถือเป็น 1)
            const qty = Number(mat.item_num || mat.Qty || mat.Quantity || 1);
            
            // วนลูปสร้างแถวตามจำนวนชิ้น
            for (let i = 0; i < qty; i++) {
                expandedRows.push({
                    id: `${mat.item_code}-${counter}`,
                    itemNo: String(counter).padStart(2, '0'), // รันเลข 01, 02, 03...
                    testNo: "[Auto Gen]", // ระบบหลังบ้านรันให้ตอนบันทึก
                    refNo: "", // รอ User กรอก
                    description: `${mat.item_name || ""} ${mat.item_description || ""}`.trim(), // ข้อความตั้งต้น
                    wll: "", // รอ User กรอก
                    loadTest: "", // รอ User กรอก
                });
                counter++;
            }
        });

        setCertItemRows(expandedRows);
    }, [materialList]);

    // 🌟 2. Handle การพิมพ์แก้ไขข้อมูลในแต่ละแถวของตาราง
    const handleRowChange = (index: number, field: keyof CertItemRow, value: string) => {
        const newRows = [...certItemRows];
        newRows[index][field] = value;
        setCertItemRows(newRows);
    };

    const handleSearchSalesOrder = async () => {
        const res = await searchSalesOrderService(searchSalesOrder);
        setSalesOrder(res.data);
    };

    const handleChangedSalesOrders = async (selectedOptions: any) => {
        const options = selectedOptions || [];
        setSelectedSalesOrders(options);

        if (options.length > 0) {
            let combinedMaterials: any[] = [];
            let firstSOData: any = null;

            for (let i = 0; i < options.length; i++) {
                const doc_entry = options[i].doc_entry;
                try {
                    const res = await getSalesOrderService(doc_entry);
                    if (res && res.data) {
                        if (i === 0) firstSOData = res.data;
                        const materials = res.data.material_list || [];
                        combinedMaterials = [...combinedMaterials, ...materials];
                    }
                } catch (error) {
                    console.error(`Failed to fetch SO: ${doc_entry}`, error);
                }
            }

            setMaterialList(combinedMaterials);

            if (firstSOData) {
                setFormData((prev) => ({
                    ...prev,
                    customerCode: firstSOData.card_code,
                    customerName: firstSOData.card_name,
                }));
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
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">เลือกใบสั่งขาย (Sales Order)</h3>
                        </div>
                        <div className="w-md-500px">
                            <Select
                                isMulti
                                options={salesOrders}
                                formatOptionLabel={(option: any) => (
                                    <div className="d-flex align-items-center gap-2"><span>{option.doc_entry}</span></div>
                                )}
                                getOptionValue={(option) => option.doc_entry}
                                value={selectedSalesOrders}
                                onInputChange={(inputValue, actionMeta) => {
                                    if (actionMeta.action === "input-change") setSearchSalesOrder(inputValue);
                                }}
                                onChange={handleChangedSalesOrders}
                                placeholder="ค้นหาใบสั่งขาย... (เลือกได้มากกว่า 1 ใบ)"
                                isClearable
                            />
                        </div>
                    </div>
                </div>

                {/* --- ส่วนล่าง: จำลองหน้ากระดาษ Test Certificate --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-12 bg-white rounded shadow-sm border border-gray-300">
                        
                        {/* หัวเอกสาร (Title) */}
                        <div className="text-center mb-10 pb-5 border-bottom border-2 border-gray-400">
                            <h1 className="fw-bolder text-gray-900 fs-2hx tracking-widest uppercase">TEST CERTIFICATE</h1>
                        </div>

                        {/* ข้อมูล Header แบบ 2 คอลัมน์ (ซ้าย-ขวา) เหมือนในกระดาษจริง */}
                        <div className="row g-8 mb-10">
                            {/* คอลัมน์ซ้าย */}
                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Customer :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold" value={formData.customerName || ""} readOnly placeholder="[Auto from SO]" />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Test Method :</label>
                                    <input type="text" className="form-control" value={certForm.testMethod} onChange={(e) => setCertForm({...certForm, testMethod: e.target.value})} placeholder="e.g. Proof Load Test" />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-125px fs-5">Remark :</label>
                                    <input type="text" className="form-control" value={certForm.remark} onChange={(e) => setCertForm({...certForm, remark: e.target.value})} placeholder="e.g. PO.No. 10559024" />
                                </div>
                            </div>

                            {/* คอลัมน์ขวา */}
                            <div className="col-md-6 d-flex flex-column gap-4">
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Certificate No :</label>
                                    <input type="text" className="form-control form-control-solid bg-light fw-bold text-gray-600" value="[Auto Gen by System]" readOnly />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Date of Test :</label>
                                    <input type="date" className="form-control form-control-solid bg-light fw-bold" value={certForm.dateOfTest} readOnly />
                                </div>
                                <div className="d-flex align-items-center">
                                    <label className="fw-bold text-gray-800 min-w-150px fs-5">Standard Ref. :</label>
                                    <input type="text" className="form-control" value={certForm.standardRef} onChange={(e) => setCertForm({...certForm, standardRef: e.target.value})} placeholder="e.g. BS EN 13414" />
                                </div>
                            </div>
                        </div>

                        {/* ตารางรายการ (Items Table) */}
                        <div className="table-responsive border border-gray-400 mb-8">
                            <table className="table align-middle table-row-bordered border-gray-400 fs-6 gy-3 mb-0">
                                <thead>
                                    <tr className="text-center text-gray-800 fw-bolder fs-6 bg-light border-bottom border-gray-400">
                                        <th className="w-60px border-end border-gray-400">Item<br/>No.</th>
                                        <th className="min-w-100px border-end border-gray-400">Test No.</th>
                                        <th className="min-w-100px border-end border-gray-400">Ref.No.</th>
                                        <th className="min-w-300px border-end border-gray-400">Description</th>
                                        <th className="w-100px border-end border-gray-400">W.L.L.<br/>(MT.)</th>
                                        <th className="w-100px">Load Test<br/>(MT.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certItemRows.length > 0 ? (
                                        certItemRows.map((row, index) => (
                                            <tr key={index} className="text-center">
                                                {/* 1. Item No. (Frontend ไล่ให้เอง เช่น 01, 02) */}
                                                <td className="fw-bold border-end border-gray-400">{row.itemNo}</td>
                                                
                                                {/* 2. Test No. (Auto Gen) */}
                                                <td className="text-gray-500 border-end border-gray-400">{row.testNo}</td>
                                                
                                                {/* 3. Ref.No. (กรอกเอง) */}
                                                <td className="border-end border-gray-400 p-1">
                                                    <input type="text" className="form-control form-control-sm text-center border-0 bg-transparent" placeholder="-" value={row.refNo} onChange={(e) => handleRowChange(index, 'refNo', e.target.value)} />
                                                </td>
                                                
                                                {/* 4. Description (มีมาให้ แต่แก้ได้) */}
                                                <td className="border-end border-gray-400 p-1 text-start">
                                                    <textarea className="form-control form-control-sm border-0 bg-transparent resize-none" rows={2} value={row.description} onChange={(e) => handleRowChange(index, 'description', e.target.value)}></textarea>
                                                </td>
                                                
                                                {/* 5. W.L.L. (กรอกเอง) */}
                                                <td className="border-end border-gray-400 p-1">
                                                    <input type="number" step="0.01" className="form-control form-control-sm text-center border-0 bg-transparent fw-bold" placeholder="0.00" value={row.wll} onChange={(e) => handleRowChange(index, 'wll', e.target.value)} />
                                                </td>
                                                
                                                {/* 6. Load Test (กรอกเอง) */}
                                                <td className="p-1">
                                                    <input type="number" step="0.01" className="form-control form-control-sm text-center border-0 bg-transparent fw-bold" placeholder="0.00" value={row.loadTest} onChange={(e) => handleRowChange(index, 'loadTest', e.target.value)} />
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

                        {/* สรุปผลการทดสอบ (Overall Inspection Result) */}
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
                    
                    {/* Action Buttons (Save/Cancel) อยู่นอกกระดาษนิดนึง */}
                    <div className="card-footer border-0 d-flex justify-content-end gap-3 mt-4">
                        <button className="btn btn-light fw-bold px-8" onClick={() => navigate(-1)}>Cancel</button>
                        <button className="btn btn-primary fw-bold px-8 shadow-sm">
                            <i className="bi bi-save me-2"></i> Save Certificate
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateTestCertificate;