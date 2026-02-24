import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { searchSalesOrderService, getSalesOrderService } from '../../../services/salesOrderService';
import { createWorkOrder } from '../../../services/workorder';
import type { SalesOrderSearch, SalesOrderDetail } from '../../../type_interface/SalesOrderType';
import type { SalesItem } from '../../../type_interface/SalesItemType';
import type { Material } from '../../../type_interface/MaterialType';
import Swal from 'sweetalert2';

interface ComponentRow {
    id: number;
    material_list_id: number | '';
    quantity_used: number;
}

const WorkorderCreate: React.FC = () => {
    const navigate = useNavigate();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    // Sales Order search & selection
    const [salesOrderSearch, setSalesOrderSearch] = useState('');
    const [salesOrderOptions, setSalesOrderOptions] = useState<SalesOrderSearch[]>([]);
    const [selectedDocEntry, setSelectedDocEntry] = useState<number | ''>('');
    const [salesOrderDetail, setSalesOrderDetail] = useState<SalesOrderDetail | null>(null);

    // Sales Item selection
    const [selectedSalesItemId, setSelectedSalesItemId] = useState<number | ''>('');
    const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

    // Materials for chosen sales item
    const [materials, setMaterials] = useState<Material[]>([]);

    // Component rows
    const [components, setComponents] = useState<ComponentRow[]>([
        { id: 1, material_list_id: '', quantity_used: 1 },
    ]);
    const [nextId, setNextId] = useState(2);

    const [submitting, setSubmitting] = useState(false);

    // ─── Search Sales Orders ───────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (salesOrderSearch.trim().length === 0) {
                // Load initial list
                try {
                    const res = await searchSalesOrderService('');
                    if (res && res.success) {
                        setSalesOrderOptions(res.data?.items || res.data || []);
                    }
                } catch { /* ignore */ }
                return;
            }
            try {
                const res = await searchSalesOrderService(salesOrderSearch);
                if (res && res.success) {
                    setSalesOrderOptions(res.data?.items || res.data || []);
                }
            } catch { /* ignore */ }
        }, 400);
        return () => clearTimeout(timer);
    }, [salesOrderSearch]);

    // Load initial sales order list on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await searchSalesOrderService('');
                if (res && res.success) {
                    setSalesOrderOptions(res.data?.items || res.data || []);
                }
            } catch { /* ignore */ }
        })();
    }, []);

    // ─── Fetch Sales Order Detail when selected ────────────────
    useEffect(() => {
        if (selectedDocEntry === '') {
            setSalesOrderDetail(null);
            setSalesItems([]);
            setMaterials([]);
            setSelectedSalesItemId('');
            setComponents([{ id: 1, material_list_id: '', quantity_used: 1 }]);
            setNextId(2);
            return;
        }
        (async () => {
            setLoading();
            try {
                const res = await getSalesOrderService(selectedDocEntry);
                if (res && res.success) {
                    const detail = res.data as SalesOrderDetail;
                    setSalesOrderDetail(detail);
                    setSalesItems(detail.items || []);
                } else {
                    alertMessage('ไม่สามารถดึงข้อมูลใบสั่งขายได้');
                }
            } catch {
                alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งขาย');
            } finally {
                setUnLoading();
            }
        })();
    }, [selectedDocEntry]);

    // ─── When Sales Item changes, update material list ─────────
    useEffect(() => {
        if (selectedSalesItemId === '') {
            setMaterials([]);
            setComponents([{ id: 1, material_list_id: '', quantity_used: 1 }]);
            setNextId(2);
            return;
        }
        const item = salesItems.find(i => i.sales_item_id === selectedSalesItemId);
        if (item) {
            setMaterials(item.material_list || []);
        }
        // Reset components
        setComponents([{ id: 1, material_list_id: '', quantity_used: 1 }]);
        setNextId(2);
    }, [selectedSalesItemId]);

    // ─── Component helpers ─────────────────────────────────────
    const addComponent = () => {
        setComponents(prev => [...prev, { id: nextId, material_list_id: '', quantity_used: 1 }]);
        setNextId(prev => prev + 1);
    };

    const removeComponent = (id: number) => {
        setComponents(prev => prev.filter(c => c.id !== id));
    };

    const updateComponent = (id: number, field: keyof ComponentRow, value: any) => {
        setComponents(prev =>
            prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
        );
    };

    const handleQuantityChange = (id: number, value: string, maxAmount: number) => {
        if (value === '' || /^\d+$/.test(value)) {
            if (value === '') {
                updateComponent(id, 'quantity_used', '');
                return;
            }
            const num = Number(value);
            if (num > maxAmount) {
                updateComponent(id, 'quantity_used', maxAmount);
                return;
            }
            updateComponent(id, 'quantity_used', num);
        }
    };

    // ─── Submit ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (selectedSalesItemId === '') {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกรายการสินค้า (Sales Item)', 'warning');
            return;
        }

        const validComponents = components.filter(c => c.material_list_id !== '');
        if (validComponents.length === 0) {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        // Check duplicates
        const materialIds = validComponents.map(c => c.material_list_id);
        if (new Set(materialIds).size !== materialIds.length) {
            Swal.fire('ข้อมูลซ้ำ', 'มีวัตถุดิบที่ซ้ำกัน กรุณาตรวจสอบอีกครั้ง', 'warning');
            return;
        }

        // Check quantity > 0
        if (validComponents.some(c => c.quantity_used <= 0)) {
            Swal.fire('ข้อมูลไม่ถูกต้อง', 'จำนวนวัตถุดิบต้องมากกว่า 0', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันการสร้างใบสั่งผลิต?',
            text: 'ระบบจะสร้างใบสั่งผลิตตามข้อมูลที่กรอก',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'สร้างใบสั่งงาน',
            cancelButtonText: 'ยกเลิก',
        });

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        setLoading();
        try {
            const payload = {
                sales_item_id: selectedSalesItemId as number,
                item_components: validComponents.map(c => ({
                    material_list_id: c.material_list_id as number,
                    quantity_used: c.quantity_used,
                })),
            };

            const result = await createWorkOrder(payload);

            if (result && result.success) {
                await Swal.fire('สำเร็จ', 'สร้างใบสั่งผลิตเรียบร้อยแล้ว', 'success');
                navigate('/workorder/workorders_list');
            } else {
                Swal.fire('ผิดพลาด', result?.message || 'ไม่สามารถสร้างใบสั่งผลิตได้', 'error');
            }
        } catch {
            Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างใบสั่งผลิต', 'error');
        } finally {
            setSubmitting(false);
            setUnLoading();
        }
    };

    // ─── Already selected material IDs for disabling duplicates ─
    const selectedMaterialIds = components
        .map(c => c.material_list_id)
        .filter((id): id is number => id !== '');

    return (
        <Content>
            {/* Back button & Title */}
            <div className="mb-6">
                <button
                    className="btn btn-sm btn-light-primary fw-bold mb-4"
                    onClick={() => navigate('/workorder/workorders_list')}
                >
                    <i className="bi bi-arrow-left me-1"></i> ย้อนกลับ
                </button>
                <h1 className="text-gray-900 fw-bold fs-2qx mb-1">สร้างใบสั่งผลิต (Create Work Order)</h1>
                <span className="text-muted fw-semibold fs-6">
                    ระบุรายละเอียดใบสั่งขายและรายการวัตถุดิบที่ต้องการใช้ในการผลิต
                </span>
            </div>

            <div className="card card-flush shadow-sm border-0">
                <div className="card-body py-8 px-10">
                    {/* ── Row 1: Sales Order & Sales Item ── */}
                    <div className="row mb-8">
                        {/* Sales Order */}
                        <div className="col-md-6 mb-4 mb-md-0">
                            <label className="form-label fw-bold fs-6 text-gray-800 required">
                                เลือกใบสั่งขาย (Sales Order)
                            </label>
                            <select
                                className="form-select form-select-solid"
                                value={selectedDocEntry}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedDocEntry(val === '' ? '' : Number(val));
                                    setSelectedSalesItemId('');
                                }}
                            >
                                <option value="">-- เลือกใบสั่งขาย --</option>
                                {salesOrderOptions.map((so) => (
                                    <option key={so.doc_entry} value={so.doc_entry}>
                                        {so.doc_num}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sales Item */}
                        <div className="col-md-6">
                            <label className="form-label fw-bold fs-6 text-gray-800 required">
                                เลือกรายการสินค้า (Sales Item)
                            </label>
                            <select
                                className="form-select form-select-solid"
                                value={selectedSalesItemId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedSalesItemId(val === '' ? '' : Number(val));
                                }}
                                disabled={salesItems.length === 0}
                            >
                                <option value="">-- เลือกรายการสินค้า --</option>
                                {salesItems.map((item) => (
                                    <option
                                        key={item.sales_item_id}
                                        value={item.sales_item_id}
                                        disabled={!!item.work_order}
                                    >
                                        {item.item_name}
                                        {item.work_order ? ' (มี Work Order แล้ว)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ── Section: Components (Material + Quantity) ── */}
                    <div className="separator separator-dashed my-6"></div>

                    <div className="d-flex justify-content-between align-items-center mb-5">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-box-seam text-primary fs-3 me-2"></i>
                            <h4 className="fw-bold text-gray-800 mb-0">
                                รายการวัตถุดิบ (Add Components)
                            </h4>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-light-primary fw-bold"
                            onClick={addComponent}
                            disabled={materials.length === 0}
                        >
                            <i className="bi bi-plus-lg me-1"></i> เพิ่มวัตถุดิบ
                        </button>
                    </div>

                    {materials.length === 0 && selectedSalesItemId !== '' && (
                        <div className="alert alert-warning d-flex align-items-center py-3 mb-5">
                            <i className="bi bi-exclamation-triangle text-warning me-3 fs-4"></i>
                            <span>ไม่พบวัตถุดิบสำหรับรายการสินค้าที่เลือก</span>
                        </div>
                    )}

                    {components.map((comp, idx) => (
                        <div key={comp.id} className="row align-items-end mb-4">
                            {/* Material select */}
                            <div className="col-md-6 mb-2 mb-md-0">
                                {idx === 0 && (
                                    <label className="form-label fw-bold fs-7 text-muted text-uppercase">
                                        วัตถุดิบ (Material)
                                    </label>
                                )}
                                <select
                                    className="form-select form-select-solid"
                                    value={comp.material_list_id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateComponent(comp.id, 'material_list_id', val === '' ? '' : Number(val));
                                    }}
                                    disabled={materials.length === 0}
                                >
                                    <option value="">เลือกวัตถุดิบ</option>
                                    {materials.map((mat) => (
                                        <option
                                            key={mat.material_list_id}
                                            value={mat.material_list_id}
                                            disabled={
                                                selectedMaterialIds.includes(mat.material_list_id) &&
                                                comp.material_list_id !== mat.material_list_id
                                            }
                                        >
                                            {mat.item_name} (คงเหลือ: {mat.item_num})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity */}
                            <div className="col-md-4 mb-2 mb-md-0">
                                {idx === 0 && (
                                    <label className="form-label fw-bold fs-7 text-muted text-uppercase">
                                        จำนวน (Quantity)
                                    </label>
                                )}
                                {(() => {
                                    const mat = materials.find(m => m.material_list_id === comp.material_list_id);
                                    const maxQty = mat ? mat.item_num : 1;
                                    return (
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            value={comp.quantity_used}
                                            onChange={(e) =>
                                                handleQuantityChange(comp.id, e.target.value, maxQty)
                                            }
                                        />
                                    );
                                })()}
                            </div>

                            {/* Remove button */}
                            <div className="col-md-2 text-end">
                                {components.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-icon btn-light-danger"
                                        title="ลบรายการ"
                                        onClick={() => removeComponent(comp.id)}
                                    >
                                        <i className="bi bi-trash fs-4"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* ── Actions ── */}
                    <div className="separator separator-dashed my-8"></div>

                    <div className="d-flex justify-content-center gap-4">
                        <button
                            type="button"
                            className="btn btn-light fw-bold px-6"
                            onClick={() => navigate('/workorder/workorders_list')}
                        >
                            ยกเลิก (Cancel)
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary fw-bold px-6"
                            onClick={handleSubmit}
                            disabled={submitting || selectedSalesItemId === '' || selectedMaterialIds.length === 0}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    กำลังสร้าง...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle me-2"></i>
                                    สร้างใบสั่งงาน (Create)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default WorkorderCreate;
