import React, { useState, useEffect } from "react";
import { SalesOrderSearch } from "../../../type_interface/SalesOrderType";
import Select from "react-select";
import {
    QCWorkOrderData,
} from "../../../type_interface/QCWorkOrderType";
import { qcWorkData } from "../../../libs/defaultFormData";
import {
    getSalesOrderService,
    searchSalesOrderService,
} from "../../../services/salesOrderService";
import { Material } from "../../../type_interface/MaterialType";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import Swal from "sweetalert2";

type PageMode = "create" | "view" | "edit";

const CreateTestCertificate: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [overallStatus, setOverallStatus] = useState<'acceptable' | 'not_acceptable' | null>('acceptable');

    const [salesOrders, setSalesOrder] = useState<SalesOrderSearch[]>([]);
    const [searchSalesOrder, setSearchSalesOrder] = useState<string>("");
    const [formData, setFormData] = useState<QCWorkOrderData>(qcWorkData);
    const [materialList, setMaterialList] = useState<Material[]>([]);
    const [mode, setMode] = useState<PageMode>("create");
    const { qc_workorder_id } = useParams<{ qc_workorder_id: string }>();
    const isReadOnly = mode === "view";
    const [loading, setLoading] = useState(false);

    const [selectedSalesOrders, setSelectedSalesOrders] = useState<any[]>([]);

    useEffect(() => {
        if (location.pathname.includes("/create")) {
            setMode("create");
        } else if (location.pathname.includes("/view")) {
            setMode("view");
        } else if (location.pathname.includes("/edit")) {
            setMode("edit");
        }
    }, [location.pathname]);

    // Load data for view/edit modes
    useEffect(() => {
        if (qc_workorder_id && (mode === "view" || mode === "edit")) {
            loadQCWorkOrder(qc_workorder_id);
        }
    }, [qc_workorder_id, mode]);

    const handleChangedSalesOrders = async (selectedOptions: any) => {
        const options = selectedOptions || [];
        setSelectedSalesOrders(options);

        if (options.length > 0) {
            let combinedMaterials: any[] = [];
            let firstSOData: any = null;

            // วนลูปดึงข้อมูลของทุกๆ SO ที่เลือกมา
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
                    console.error(`Failed to fetch details for SO: ${doc_entry}`, error);
                }
            }

            // อัปเดตตาราง Material รวม
            setMaterialList(combinedMaterials);

            // อัปเดตข้อมูลลูกค้า (ใช้ข้อมูลจาก SO แรก)
            if (firstSOData) {
                setFormData((prev) => ({
                    ...prev,
                    customerCode: firstSOData.card_code,
                    customerName: firstSOData.card_name,
                    docNum: firstSOData.doc_num,
                    docEntry: firstSOData.doc_entry,
                }));
            }
        } else {
            setFormData(qcWorkData);
            setMaterialList([]);
        }
    };

    const loadQCWorkOrder = async (id: string) => {
        setLoading(true);
        try {
            const result = await getQCWorkOrderById(Number(id));
            if (result.success && result.data) {
                const formDataToSet = {
                    ...qcWorkData,
                    ...((result.data as any).form_data || {}),
                    ...result.data,
                };
                setFormData(formDataToSet);

                if (formDataToSet.donEntry) {
                    try {
                        const salesRes = await getSalesOrderService(Number(formDataToSet.donEntry));
                        if (salesRes && salesRes.data && salesRes.data.material_list) {
                            setMaterialList(salesRes.data.material_list);
                            setSalesOrder([{
                                doc_num: salesRes.data.doc_num,
                                doc_entry: salesRes.data.doc_entry
                            } as unknown as SalesOrderSearch]);
                        }
                    } catch (e) {
                        console.error("Failed to fetch materials for this QC Work Order", e);
                    }
                }
            } else {
                Swal.fire("ผิดพลาด!", result.message || "ไม่พบข้อมูล QC Work Order", "error");
            }
        } catch (error) {
            console.error("Error loading QC work order:", error);
            Swal.fire("ผิดพลาด!", "ไม่สามารถโหลดข้อมูลได้", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSalesOrder = async () => {
        const res = await searchSalesOrderService(searchSalesOrder);
        setSalesOrder(res.data);
    };

    const handleClickedSalesOrder = async (option: any) => {
        if (option) {
            const doc_entry: number = option.doc_entry;
            setFormData((prev: any) => ({
                ...prev,
                donEntry: doc_entry,
            }));

            const res = await getSalesOrderService(doc_entry);
            const data = res.data;

            setFormData((prev) => ({
                ...prev,
                customerCode: data.card_code,
                customerName: data.card_name,
                docNum: data.doc_num,
                docEntry: data.doc_entry,
                salesCode: data.slp_code,
                salesName: data.slp_name,
                teamCode: data.group_code,
                teamName: data.group_name,
            }));

            setMaterialList(data.material_list || []);
            setSearchSalesOrder(option.doc_entry);
        } else {
            setFormData(qcWorkData);
            setSearchSalesOrder("");
            setMaterialList([]);
        }
    };

    useEffect(() => {
        if (!searchSalesOrder) return;

        const timeout = setTimeout(() => {
            handleSearchSalesOrder();
        }, 750);

        return () => {
            clearTimeout(timeout);
        };
    }, [searchSalesOrder]);

    return (
        <div className="container-fluid px-10 py-8">
            <div className="d-flex flex-column gap-8">

                {/* --- Header & Breadcrumb --- */}
                <div className="d-flex flex-column py-2">
                    <h1 className="fw-bold text-gray-900 fs-2 mb-2">Create Test Certificate</h1>
                    <span className="text-gray-500 fs-6">Configure and generate a new material test certificate for compliance.</span>
                </div>

                {/* --- Section 1: Source Selection --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-10">
                        <div className="d-flex align-items-center mb-8">
                            <span className="badge badge-circle badge-light-primary text-primary fs-5 fw-bold me-3">1</span>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">Source Selection</h3>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">ใบสั่งขายเลขที่ (เลือกได้หลายรายการ)</label>
                            <Select
                                isMulti
                                options={salesOrders}
                                formatOptionLabel={(option: any) => (
                                    <div className="d-flex align-items-center gap-2">
                                        <span>{option.doc_entry}</span>
                                    </div>
                                )}
                                getOptionValue={(option) => option.doc_entry}
                                value={selectedSalesOrders}
                                onInputChange={(inputValue, actionMeta) => {
                                    if (actionMeta.action === "input-change") {
                                        setSearchSalesOrder(inputValue);
                                    }
                                }}
                                onChange={handleChangedSalesOrders}
                                placeholder="ค้นหาใบสั่งขาย..."
                                isClearable
                                isDisabled={isReadOnly}
                                components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                            />
                        </div>

                        <div className="table-responsive border rounded">
                            <table className="table align-middle table-row-dashed fs-6 gy-4 mb-0">
                                <thead className="bg-light">
                                    <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase border-bottom border-gray-200">
                                        <th className="w-50px ps-4">
                                            <div className="form-check form-check-sm form-check-custom form-check-solid">
                                                <input className="form-check-input" type="checkbox" />
                                            </div>
                                        </th>
                                        <th className="min-w-100px">ITEM ID</th>
                                        <th className="min-w-300px">DESCRIPTION</th>
                                        <th className="min-w-100px">QUANTITY</th>
                                        <th className="min-w-100px">BATCH NO.</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-700">
                                    {materialList.length > 0 ? (
                                        materialList.map((mat: any, index: number) => (
                                            <tr key={mat.material_list_id || index} className="hover:bg-light-primary transition-all">
                                                <td className="ps-4">
                                                    <div className="form-check form-check-sm form-check-custom form-check-solid">
                                                        {/* 🌟 ในอนาคตเราจะต้องผูก onChange ตรงนี้เพื่อให้ User เลือกว่าจะเอา Item ไหนไปออก Cert */}
                                                        <input className="form-check-input" type="checkbox" defaultChecked />
                                                    </div>
                                                </td>

                                                {/* 1. ITEM ID */}
                                                <td>
                                                    <span className="fw-bold text-gray-800">{mat.item_code || "-"}</span>
                                                </td>

                                                {/* 2. DESCRIPTION (เอาชื่อสินค้ามาทำตัวหนา แล้วเอาคำอธิบายไว้บรรทัดล่างตัวเล็กๆ) */}
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-gray-800 fw-bold">{mat.item_name || "-"}</span>
                                                        {mat.item_description && (
                                                            <span className="text-muted fs-8">{mat.item_description}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 3. QUANTITY (ชั่วคราวใช้ item_num ไปก่อน) */}
                                                <td>{mat.item_num || "-"}</td>

                                                {/* 4. BATCH NO. (ยังไม่มีใน JSON ปล่อยว่างไปก่อน) */}
                                                <td><span className="text-gray-400">-</span></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-10">
                                                <i className="bi bi-inbox fs-2x d-block mb-2 text-gray-400"></i>
                                                กรุณาเลือกใบสั่งขาย เพื่อแสดงรายการสินค้า
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- Section 2: Header Details --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-10">
                        <div className="d-flex align-items-center mb-8">
                            <span className="badge badge-circle badge-light-primary text-primary fs-5 fw-bold me-3">2</span>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">Header Details</h3>
                        </div>

                        <div className="row g-8">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-gray-700 fs-6">Customer</label>
                                {/* ดึงชื่อลูกค้าจาก formData มาแสดงเลย */}
                                <input type="text" className="form-control form-control-solid bg-light text-muted" value={formData.customerName || ""} readOnly placeholder="Auto-filled from Sales Order" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-gray-700 fs-6">Certificate No.</label>
                                <input type="text" className="form-control" placeholder="TC-XXXX-XXXX" />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-gray-700 fs-6">Date of Test</label>
                                <input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-gray-700 fs-6">Standard Ref.</label>
                                <input type="text" className="form-control" placeholder="e.g. BS EN 12385-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Section 3: Material Results (เก็บของเดิมไว้ก่อน) --- */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-8 p-lg-10">
                        <div className="d-flex align-items-center mb-8">
                            <span className="badge badge-circle badge-light-primary text-primary fs-5 fw-bold me-3">3</span>
                            <h3 className="m-0 fw-bold text-gray-800 fs-4">Material Results</h3>
                        </div>

                        <div className="table-responsive">
                            <table className="table align-middle table-row-dashed fs-6 gy-4 mb-0">
                                <thead>
                                    <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase border-bottom border-gray-200">
                                        <th className="w-50px">NO.</th>
                                        <th className="min-w-100px">REF. NO.</th>
                                        <th className="min-w-300px">DESCRIPTION</th>
                                        <th className="min-w-150px text-center">W.L.L. (MT.)</th>
                                        <th className="min-w-150px text-center">LOAD TEST (MT.)</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-700">
                                    <tr>
                                        <td>1</td>
                                        <td>SL-8842</td>
                                        <td>
                                            <textarea className="form-control form-control-sm bg-light" rows={2} defaultValue="Steel Wire Rope - 12mm Galvanized Core IWRC"></textarea>
                                        </td>
                                        <td><input type="number" className="form-control form-control-sm text-center bg-light" placeholder="0.00" /></td>
                                        <td><input type="number" className="form-control form-control-sm text-center bg-light" placeholder="0.00" /></td>
                                    </tr>
                                    <tr>
                                        <td>2</td>
                                        <td>SL-8843</td>
                                        <td>
                                            <textarea className="form-control form-control-sm bg-light" rows={2} defaultValue="Omega Shackle 4.75t G-2130 Crosby Style"></textarea>
                                        </td>
                                        <td><input type="number" className="form-control form-control-sm text-center bg-light" defaultValue="4.75" /></td>
                                        <td><input type="number" className="form-control form-control-sm text-center bg-light" defaultValue="9.50" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- Footer: Overall Result & Actions --- */}
                <div className="card shadow-sm border-0 bg-transparent mb-10">
                    <div className="card-body p-0 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between">
                        <div className="d-flex flex-column mb-6 mb-lg-0">
                            <h4 className="fw-bold text-gray-800 mb-4 fs-5">Overall Inspection Result</h4>
                            <div className="d-flex gap-4">
                                <label className={`btn btn-outline btn-active-light-success d-flex flex-column align-items-center justify-content-center p-4 w-150px rounded-3 ${overallStatus === 'acceptable' ? 'active border-success border-2 bg-light-success' : 'border-gray-300'}`}>
                                    <input type="radio" className="btn-check" name="status" value="acceptable" checked={overallStatus === 'acceptable'} onChange={() => setOverallStatus('acceptable')} />
                                    <i className={`bi bi-check-circle-fill fs-2x mb-2 ${overallStatus === 'acceptable' ? 'text-success' : 'text-gray-400'}`}></i>
                                    <span className={`fw-bold fs-6 ${overallStatus === 'acceptable' ? 'text-success' : 'text-gray-600'}`}>ACCEPTABLE</span>
                                </label>

                                <label className={`btn btn-outline btn-active-light-danger d-flex flex-column align-items-center justify-content-center p-4 w-150px rounded-3 ${overallStatus === 'not_acceptable' ? 'active border-danger border-2 bg-light-danger' : 'border-gray-300'}`}>
                                    <input type="radio" className="btn-check" name="status" value="not_acceptable" checked={overallStatus === 'not_acceptable'} onChange={() => setOverallStatus('not_acceptable')} />
                                    <i className={`bi bi-x-circle-fill fs-2x mb-2 ${overallStatus === 'not_acceptable' ? 'text-danger' : 'text-gray-400'}`}></i>
                                    <span className={`fw-bold fs-6 ${overallStatus === 'not_acceptable' ? 'text-danger' : 'text-gray-600'}`}>NOT ACCEPTABLE</span>
                                </label>
                            </div>
                        </div>

                        <div className="d-flex align-items-end gap-3">
                            <button className="btn btn-light fw-bold px-8" onClick={() => navigate(-1)}>Cancel</button>
                            <button className="btn btn-primary fw-bold px-8 shadow-sm">
                                <i className="bi bi-save me-2"></i> Save Certificate
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateTestCertificate;