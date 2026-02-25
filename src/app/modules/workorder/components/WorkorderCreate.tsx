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

interface MaterialRow {
    id: number;
    material_list_id: number | '';
    quantity_used: number | '';
}

interface ComponentItem {
    id: number;
    component_name: string;
    materials: MaterialRow[];
    nextMaterialId: number;
}

const WorkorderCreate: React.FC = () => {
    const navigate = useNavigate();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    // Sales Order search & selection
    const [salesOrderOptions, setSalesOrderOptions] = useState<SalesOrderSearch[]>([]);
    const [selectedDocEntry, setSelectedDocEntry] = useState<number | ''>('');
    const [salesOrderDetail, setSalesOrderDetail] = useState<SalesOrderDetail | null>(null);

    // Sales Item selection
    const [selectedSalesItemId, setSelectedSalesItemId] = useState<number | ''>('');
    const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

    // Materials for chosen sales item
    const [materials, setMaterials] = useState<Material[]>([]);

    // Components - each component has multiple materials
    const [components, setComponents] = useState<ComponentItem[]>([
        { id: 1, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: 1 }], nextMaterialId: 2 },
    ]);
    const [nextComponentId, setNextComponentId] = useState(2);

    const [submitting, setSubmitting] = useState(false);

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
            resetComponents();
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
            resetComponents();
            return;
        }
        const item = salesItems.find(i => i.sales_item_id === selectedSalesItemId);
        if (item) {
            setMaterials(item.material_list || []);
        }
        resetComponents();
    }, [selectedSalesItemId]);

    const resetComponents = () => {
        setComponents([
            { id: 1, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: 1 }], nextMaterialId: 2 },
        ]);
        setNextComponentId(2);
    };

    // ─── Component helpers ─────────────────────────────────────
    const addComponent = () => {
        setComponents(prev => [
            ...prev,
            { id: nextComponentId, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: 1 }], nextMaterialId: 2 }
        ]);
        setNextComponentId(prev => prev + 1);
    };

    const updateComponentName = (componentId: number, name: string) => {
        setComponents(prev =>
            prev.map(comp => comp.id === componentId ? { ...comp, component_name: name } : comp)
        );
    };

    const removeComponent = (componentId: number) => {
        setComponents(prev => prev.filter(c => c.id !== componentId));
    };

    // ─── Material helpers ──────────────────────────────────────
    const addMaterial = (componentId: number) => {
        setComponents(prev =>
            prev.map(comp => {
                if (comp.id === componentId) {
                    return {
                        ...comp,
                        materials: [...comp.materials, { id: comp.nextMaterialId, material_list_id: '', quantity_used: 1 }],
                        nextMaterialId: comp.nextMaterialId + 1
                    };
                }
                return comp;
            })
        );
    };

    const removeMaterial = (componentId: number, materialRowId: number) => {
        setComponents(prev =>
            prev.map(comp => {
                if (comp.id === componentId) {
                    return {
                        ...comp,
                        materials: comp.materials.filter(m => m.id !== materialRowId)
                    };
                }
                return comp;
            })
        );
    };

    const updateMaterial = (componentId: number, materialRowId: number, field: keyof MaterialRow, value: any) => {
        setComponents(prev =>
            prev.map(comp => {
                if (comp.id === componentId) {
                    return {
                        ...comp,
                        materials: comp.materials.map(m =>
                            m.id === materialRowId ? { ...m, [field]: value } : m
                        )
                    };
                }
                return comp;
            })
        );
    };

    const handleQuantityChange = (componentId: number, materialRowId: number, value: string, maxAmount: number) => {
        if (value === '' || /^\d+$/.test(value)) {
            if (value === '') {
                updateMaterial(componentId, materialRowId, 'quantity_used', '');
                return;
            }
            const num = Number(value);
            if (num > maxAmount) {
                updateMaterial(componentId, materialRowId, 'quantity_used', maxAmount);
                return;
            }
            updateMaterial(componentId, materialRowId, 'quantity_used', num);
        }
    };

    // Get selected material IDs within a specific component
    const getSelectedMaterialIdsInComponent = (componentId: number): number[] => {
        const comp = components.find(c => c.id === componentId);
        if (!comp) return [];
        return comp.materials
            .map(m => m.material_list_id)
            .filter((id): id is number => id !== '');
    };

    // ─── Submit ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (selectedSalesItemId === '') {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกรายการสินค้า (Sales Item)', 'warning');
            return;
        }

        // Validate each component has name and at least one material
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            if (!comp.component_name.trim()) {
                Swal.fire('ข้อมูลไม่ครบ', `กรุณาระบุชื่อส่วนประกอบที่ ${i + 1}`, 'warning');
                return;
            }
            const validMaterials = comp.materials.filter(m => m.material_list_id !== '');
            if (validMaterials.length === 0) {
                Swal.fire('ข้อมูลไม่ครบ', `กรุณาเพิ่มวัตถุดิบในส่วนประกอบที่ ${i + 1}`, 'warning');
                return;
            }
            // Check quantity > 0
            if (validMaterials.some(m => m.quantity_used === '' || Number(m.quantity_used) <= 0)) {
                Swal.fire('ข้อมูลไม่ถูกต้อง', `จำนวนวัตถุดิบในส่วนประกอบที่ ${i + 1} ต้องมากกว่า 0`, 'warning');
                return;
            }
        }

        // Check for duplicate materials within each component
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            const matIds = comp.materials
                .map(m => m.material_list_id)
                .filter((id): id is number => id !== '');
            if (new Set(matIds).size !== matIds.length) {
                Swal.fire('ข้อมูลซ้ำ', `มีวัตถุดิบที่ซ้ำกันในส่วนประกอบที่ ${i + 1} กรุณาตรวจสอบอีกครั้ง`, 'warning');
                return;
            }
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
            // Build payload - each component has component_name and material_usage array
            const item_components = components.map(comp => {
                const validMaterials = comp.materials.filter(m => m.material_list_id !== '');
                return {
                    component_name: comp.component_name.trim(),
                    material_usage: validMaterials.map(m => ({
                        material_list_id: m.material_list_id as number,
                        quantity_used: Number(m.quantity_used),
                    })),
                };
            });

            const payload = {
                sales_item_id: selectedSalesItemId as number,
                item_components,
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

    // Check if any component has at least one selected material (for Create button)
    const hasAnySelectedMaterial = components.some(comp =>
        comp.materials.some(m => m.material_list_id !== '')
    );

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
                    ระบุรายละเอียดใบสั่งขายและโครงสร้างส่วนประกอบพร้อมวัตถุดิบ
                </span>
            </div>

            <div className="card card-flush shadow-sm border-0 mb-6">
                <div className="card-body py-6 px-8">
                    {/* ── Section: Sales Order Info ── */}
                    <div className="d-flex align-items-center mb-5">
                        <i className="bi bi-cart-check text-primary fs-3 me-2"></i>
                        <h4 className="fw-bold text-gray-800 mb-0">ข้อมูลใบสั่งขาย (Sales Order)</h4>
                    </div>

                    <div className="row">
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
                </div>
            </div>

            {/* ── Section: Components & Materials ── */}
            <div className="d-flex justify-content-between align-items-center mb-5">
                <div className="d-flex align-items-center">
                    <i className="bi bi-gear-wide-connected text-primary fs-3 me-2"></i>
                    <h4 className="fw-bold text-gray-800 mb-0">ส่วนประกอบและวัตถุดิบ (Components & Materials)</h4>
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-primary fw-bold"
                    onClick={addComponent}
                >
                    <i className="bi bi-plus-lg me-1"></i> เพิ่มส่วนประกอบ (Add Component)
                </button>
            </div>

            {materials.length === 0 && selectedSalesItemId !== '' && (
                <div className="alert alert-warning d-flex align-items-center py-3 mb-5">
                    <i className="bi bi-exclamation-triangle text-warning me-3 fs-4"></i>
                    <span>ไม่พบวัตถุดิบสำหรับรายการสินค้าที่เลือก</span>
                </div>
            )}

            {/* Component Cards */}
            {components.map((comp, compIdx) => {
                const selectedInThisComponent = getSelectedMaterialIdsInComponent(comp.id);
                const hasUnselectedInThisComp = comp.materials.some(m => m.material_list_id === '');
                const availableForThisComponent = materials.filter(m =>
                    !selectedInThisComponent.includes(m.material_list_id)
                ).length;

                return (
                    <div key={comp.id} className="card card-flush shadow-sm border-0 mb-5">
                        <div className="card-header py-4 px-6 bg-light-primary d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center flex-grow-1 me-3">
                                <span className="badge badge-primary me-3 fs-6">{compIdx + 1}</span>
                                <input
                                    type="text"
                                    className="form-control form-control-solid form-control-sm fw-bold"
                                    placeholder={`ชื่อส่วนประกอบ (Component ${compIdx + 1})`}
                                    value={comp.component_name}
                                    onChange={(e) => updateComponentName(comp.id, e.target.value)}
                                    style={{ maxWidth: 300 }}
                                />
                            </div>
                            {components.length > 1 && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-light-danger"
                                    title="ลบส่วนประกอบ"
                                    onClick={() => removeComponent(comp.id)}
                                >
                                    <i className="bi bi-trash fs-4"></i>
                                </button>
                            )}
                        </div>
                        <div className="card-body py-5 px-6">
                            {/* Materials Header */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <span className="fw-bold text-muted text-uppercase fs-7">
                                    รายการวัตถุดิบ (Materials)
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light-primary fw-bold"
                                    onClick={() => addMaterial(comp.id)}
                                    disabled={
                                        availableForThisComponent <= selectedInThisComponent.length ||
                                        hasUnselectedInThisComp
                                    }
                                >
                                    <i className="bi bi-plus me-1"></i> เพิ่มวัตถุดิบ
                                </button>
                            </div>

                            {/* Material Rows */}
                            {comp.materials.map((mat, matIdx) => {
                                const selectedMaterial = materials.find(m => m.material_list_id === mat.material_list_id);
                                const maxQty = selectedMaterial ? selectedMaterial.item_num : 1;

                                // Filter available materials for this dropdown
                                const availableForDropdown = materials.filter(m =>
                                    !selectedInThisComponent.includes(m.material_list_id) ||
                                    mat.material_list_id === m.material_list_id
                                );

                                return (
                                    <div key={mat.id} className="row align-items-center mb-3">
                                        {/* Material select */}
                                        <div className="col-md-6 mb-2 mb-md-0">
                                            <select
                                                className="form-select form-select-solid"
                                                value={mat.material_list_id}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateMaterial(comp.id, mat.id, 'material_list_id', val === '' ? '' : Number(val));
                                                }}
                                                disabled={materials.length === 0}
                                            >
                                                <option value="">เลือกวัตถุดิบ (Material)</option>
                                                {availableForDropdown.map((m) => (
                                                    <option key={m.material_list_id} value={m.material_list_id}>
                                                        {m.item_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-md-3 mb-2 mb-md-0">
                                            <input
                                                type="text"
                                                className="form-control form-control-solid"
                                                placeholder="จำนวน"
                                                value={mat.quantity_used}
                                                onChange={(e) =>
                                                    handleQuantityChange(comp.id, mat.id, e.target.value, maxQty)
                                                }
                                            />
                                        </div>

                                        {/* Unit & Remove */}
                                        <div className="col-md-3 d-flex align-items-center justify-content-between">
                                            <span className="text-muted fs-7">
                                                {selectedMaterial ? `(คงเหลือ: ${selectedMaterial.item_num})` : ''}
                                            </span>
                                            {comp.materials.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-icon btn-light-danger ms-2"
                                                    title="ลบวัตถุดิบ"
                                                    onClick={() => removeMaterial(comp.id, mat.id)}
                                                >
                                                    <i className="bi bi-x fs-3"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* ── Actions ── */}
            <div className="d-flex justify-content-end gap-4 mt-6">
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
                    disabled={submitting || selectedSalesItemId === '' || !hasAnySelectedMaterial}
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
        </Content>
    );
};

export default WorkorderCreate;
