import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { searchSalesOrderService, getSalesOrderService } from '../../../services/salesOrderService';
import { createWorkOrder } from '../../../services/workorder';
import {
    getComponentTemplates,
    getComponentTemplateById,
    saveItemComponentSectionsBatch,
} from '../../../services/componentTemplateService';
import type { SalesOrderSearch, SalesOrderDetail } from '../../../type_interface/SalesOrderType';
import type { SalesItem } from '../../../type_interface/SalesItemType';
import type { Material } from '../../../type_interface/MaterialType';
import type { WorkOrder } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';
import TemplateSectionForm from './TemplateSectionForm';
import MaterialPicklist, { getAvailableForMaterial, type MaterialSelection } from './MaterialPicklist';
import Swal from 'sweetalert2';

interface ComponentItem {
    id: number;
    component_name: string;
    materials: MaterialSelection[];
}

type SectionFormData = Record<string, any>;

const WorkorderCreate: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    // Pre-fill from URL params (when navigating from SalesOrderView)
    const pendingSalesItemId = useRef<number | null>(
        searchParams.get('sales_item_id') ? Number(searchParams.get('sales_item_id')) : null
    );

    // Sales Order search & selection
    const [salesOrderOptions, setSalesOrderOptions] = useState<SalesOrderSearch[]>([]);
    const [soSearchKeyword, setSoSearchKeyword] = useState<string>('');
    const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrderSearch | null>(null);
    const [selectedDocEntry, setSelectedDocEntry] = useState<number | ''>('');
    const [salesOrderDetail, setSalesOrderDetail] = useState<SalesOrderDetail | null>(null);

    // Sales Item selection
    const [selectedSalesItemId, setSelectedSalesItemId] = useState<number | ''>('');
    const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

    // Materials for chosen sales item
    const [materials, setMaterials] = useState<Material[]>([]);

    // Components - each component has multiple materials
    const [components, setComponents] = useState<ComponentItem[]>([
        { id: 1, component_name: '', materials: [] },
    ]);
    const [nextComponentId, setNextComponentId] = useState(2);

    const [submitting, setSubmitting] = useState(false);

    // ── Step 2: Component Detail ──
    const [step, setStep] = useState<'create' | 'fill_details'>('create');
    const [createdWorkOrder, setCreatedWorkOrder] = useState<WorkOrder | null>(null);
    const [allTemplates, setAllTemplates] = useState<ComponentTemplate[]>([]);
    // keyed by item_component_id
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<number, number | null>>({});
    const [loadedTemplates, setLoadedTemplates] = useState<Record<number, ComponentTemplate>>({});
    const [detailFormData, setDetailFormData] = useState<Record<number, SectionFormData>>({});
    const [savingDetails, setSavingDetails] = useState(false);
    const [applySameTemplateToAll, setApplySameTemplateToAll] = useState(false);

    // ── Load templates list once (needed for step 2) ──
    useEffect(() => {
        (async () => {
            const res = await getComponentTemplates(1, 100, '');
            if (res?.success && res.data?.items) {
                setAllTemplates(res.data.items);
            }
        })();
    }, []);

    // ── Pre-fill from URL params ──
    useEffect(() => {
        const docEntryParam = searchParams.get('doc_entry');
        if (!docEntryParam) return;
        const docEntry = Number(docEntryParam);
        (async () => {
            try {
                const res = await getSalesOrderService(docEntry);
                if (res && res.success && res.data) {
                    const detail = res.data as SalesOrderDetail;
                    const soOption: SalesOrderSearch = {
                        doc_entry: String(detail.doc_entry),
                        doc_num: String(detail.doc_num),
                    };
                    setSalesOrderOptions([soOption]);
                    setSelectedSalesOrder(soOption);
                    setSelectedDocEntry(docEntry);
                }
            } catch { /* ignore */ }
        })();
    }, []);

    // ── Apply pending sales_item_id once salesItems is populated ──
    useEffect(() => {
        if (pendingSalesItemId.current !== null && salesItems.length > 0) {
            setSelectedSalesItemId(pendingSalesItemId.current);
            pendingSalesItemId.current = null;
        }
    }, [salesItems]);

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

    useEffect(() => {
        const timeout = setTimeout(() => { handleSearchSalesOrder(soSearchKeyword); }, 750);
        return () => clearTimeout(timeout);
    }, [soSearchKeyword]);

    // ─── Fetch Sales Order Detail when selected ────────────────
    useEffect(() => {
        if (selectedDocEntry === '') {
            setSalesOrderDetail(null);
            setSalesItems([]);
            setMaterials([]);
            setSelectedSalesItemId('');
            resetComponents();
            setSalesOrderOptions([]);
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
            { id: 1, component_name: '', materials: [] },
        ]);
        setNextComponentId(2);
    };

    // ─── Component helpers ─────────────────────────────────────
    const addComponent = () => {
        setComponents(prev => [
            ...prev,
            { id: nextComponentId, component_name: '', materials: [] }
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
    const updateComponentMaterials = (componentId: number, next: MaterialSelection[]) => {
        setComponents(prev =>
            prev.map(comp => comp.id === componentId ? { ...comp, materials: next } : comp)
        );
    };

    // Single pass over every component's material rows, grouped by
    // material_list_id — feeds the per-component "allocatedElsewhere" slice
    // below so each component's picklist reflects what every OTHER
    // component is using, live, without hiding materials from dropdowns.
    const materialUsageByMaterial = useMemo(() => {
        const map: Record<number, { componentId: number; qty: number; label: string }[]> = {};
        components.forEach((comp, idx) => {
            comp.materials.forEach(m => {
                const qty = Number(m.quantity_used) || 0;
                if (qty <= 0) return;
                if (!map[m.material_list_id]) map[m.material_list_id] = [];
                map[m.material_list_id].push({
                    componentId: comp.id,
                    qty,
                    label: comp.component_name.trim() || `ส่วนประกอบที่ ${idx + 1}`,
                });
            });
        });
        return map;
    }, [components]);

    const getAllocatedElsewhere = (componentId: number): Record<number, { qty: number; label: string }[]> => {
        const result: Record<number, { qty: number; label: string }[]> = {};
        Object.entries(materialUsageByMaterial).forEach(([materialListIdStr, entries]) => {
            const others = entries
                .filter(e => e.componentId !== componentId)
                .map(e => ({ qty: e.qty, label: e.label }));
            if (others.length > 0) result[Number(materialListIdStr)] = others;
        });
        return result;
    };

    // ─── Submit (Step 1) ───────────────────────────────────────
    const handleSubmit = async () => {
        if (selectedSalesItemId === '') {
            Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกรายการสินค้า (Sales Item)', 'warning');
            return;
        }

        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            if (!comp.component_name.trim()) {
                Swal.fire('ข้อมูลไม่ครบ', `กรุณาระบุชื่อส่วนประกอบที่ ${i + 1}`, 'warning');
                return;
            }
            if (comp.materials.length === 0) {
                Swal.fire('ข้อมูลไม่ครบ', `กรุณาเพิ่มวัตถุดิบในส่วนประกอบที่ ${i + 1}`, 'warning');
                return;
            }
            if (comp.materials.some(m => !m.quantity_used || m.quantity_used <= 0)) {
                Swal.fire('ข้อมูลไม่ถูกต้อง', `จำนวนวัตถุดิบในส่วนประกอบที่ ${i + 1} ต้องมากกว่า 0`, 'warning');
                return;
            }
            // A material row's checkbox IS its identity within a component,
            // so a duplicate material_list_id in one component is now
            // structurally impossible — no dedupe check needed here anymore.
            const allocatedElsewhere = getAllocatedElsewhere(comp.id);
            for (const m of comp.materials) {
                const mat = materials.find(mm => mm.material_list_id === m.material_list_id);
                if (!mat) continue;
                const available = getAvailableForMaterial(mat, allocatedElsewhere[m.material_list_id]);
                if (Number.isFinite(available) && m.quantity_used > available) {
                    Swal.fire(
                        'จำนวนเกินคงเหลือ',
                        `วัตถุดิบ "${mat.item_name}" ในส่วนประกอบที่ ${i + 1} มีจำนวนเกินคงเหลือ (คงเหลือ ${available})`,
                        'warning'
                    );
                    return;
                }
            }
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันการสร้างใบสั่งผลิต?',
            text: 'ระบบจะสร้างใบสั่งผลิตตามข้อมูลที่กรอก',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'สร้างใบสั่งผลิต',
            cancelButtonText: 'ยกเลิก',
        });

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        setLoading();
        try {
            const item_components = components.map(comp => ({
                component_name: comp.component_name.trim(),
                material_usage: comp.materials.map(m => ({
                    material_list_id: m.material_list_id,
                    quantity_used: Number(m.quantity_used),
                })),
            }));

            const payload = {
                sales_item_id: selectedSalesItemId as number,
                item_components,
            };

            const result = await createWorkOrder(payload);

            if (result && result.success) {
                const newWO = result.data?.item as WorkOrder;
                setCreatedWorkOrder(newWO);
                setStep('fill_details');
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

    // ─── Step 2: Template selection per component ──────────────
    // Fetches + caches a template body by id. Both the single-component and
    // apply-to-all paths funnel through here so a template is only ever
    // fetched once, no matter how many components end up using it.
    const ensureTemplateLoaded = async (templateId: number) => {
        if (loadedTemplates[templateId]) return;
        const res = await getComponentTemplateById(templateId);
        if (res?.success && res.data) {
            setLoadedTemplates(prev => ({ ...prev, [templateId]: res.data }));
        }
    };

    const handleTemplateSelect = async (itemComponentId: number, templateId: number | null) => {
        setSelectedTemplateIds(prev => ({ ...prev, [itemComponentId]: templateId }));
        if (!templateId) return;
        await ensureTemplateLoaded(templateId);
    };

    // Wired to every component's template <select> onChange. When
    // "ใช้ template เดียวกันกับทุก Component" is ticked, one selection applies
    // the same component_template_id to every component in a single state
    // update instead of the user re-opening the dropdown per component.
    const handleTemplateSelectForComponent = async (itemComponentId: number, templateId: number | null) => {
        if (applySameTemplateToAll && createdWorkOrder) {
            setSelectedTemplateIds(prev => {
                const next = { ...prev };
                createdWorkOrder.item_components.forEach(comp => {
                    next[comp.item_component_id] = templateId;
                });
                return next;
            });
            if (templateId) await ensureTemplateLoaded(templateId);
            return;
        }
        await handleTemplateSelect(itemComponentId, templateId);
    };

    const updateDetailSectionData = (itemComponentId: number, sectionKey: string, data: any) => {
        setDetailFormData(prev => ({
            ...prev,
            [itemComponentId]: { ...(prev[itemComponentId] || {}), [sectionKey]: data },
        }));
    };

    const handleSaveDetails = async () => {
        if (!createdWorkOrder) return;
        setSavingDetails(true);
        try {
            const toSave = createdWorkOrder.item_components.filter(
                comp => selectedTemplateIds[comp.item_component_id]
            );

            const batch = toSave.flatMap(comp => {
                const templateId = selectedTemplateIds[comp.item_component_id]!;
                const template = loadedTemplates[templateId];
                if (!template) return [];
                const fd = detailFormData[comp.item_component_id] || {};
                return [{
                    item_component_id: comp.item_component_id,
                    component_template_id: templateId,
                    sections_data: template.sections.map((sec: TemplateSection) => ({
                        section_type: sec.type,
                        section_key: sec.key,
                        data: fd[sec.key] || {},
                    })),
                }];
            });

            if (batch.length > 0) {
                const res = await saveItemComponentSectionsBatch(batch);
                if (!res?.success) {
                    Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
                    return;
                }
            }

            await Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
            navigate('/workorder/workorders_list');
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setSavingDetails(false);
        }
    };


    const hasAnySelectedMaterial = components.some(comp => comp.materials.length > 0);

    return (
        <Content>
            {/* ══════════════════════════════════════════════════
                STEP 1: Create Work Order
            ══════════════════════════════════════════════════ */}
            {step === 'create' && (
                <>
                    <div className="mb-6">
                        <button
                            className="btn btn-sm btn-light-primary fw-bold mb-4"
                            onClick={() => navigate('/workorder/workorders_list')}
                        >
                            <i className="bi bi-arrow-left me-1"></i> ย้อนกลับ
                        </button>
                        <h1 className="text-gray-900 fw-bold fs-2qx mb-1">สร้างใบสั่งผลิต</h1>
                        <span className="text-muted fw-semibold fs-6">
                            ระบุรายละเอียดใบสั่งขายและโครงสร้างส่วนประกอบพร้อมวัตถุดิบ
                        </span>
                    </div>

                    <div className="card card-flush shadow-sm border-0 mb-6">
                        <div className="card-body py-6 px-8">
                            <div className="d-flex align-items-center mb-5">
                                <i className="bi bi-cart-check text-primary fs-3 me-2"></i>
                                <h4 className="fw-bold text-gray-800 mb-0">ข้อมูลใบสั่งขาย (Sales Order)</h4>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-4 mb-md-0">
                                    <label className="form-label fw-bold fs-6 text-gray-800 required">
                                        เลือกใบสั่งขาย (Sales Order)
                                    </label>
                                    <Select
                                        options={salesOrderOptions}
                                        getOptionLabel={(option: any) => `${option.doc_num}`}
                                        getOptionValue={(option: any) => String(option.doc_entry)}
                                        formatOptionLabel={(option: any) => (
                                            <span className="fw-bold">{option.doc_num}</span>
                                        )}
                                        value={selectedSalesOrder}
                                        onInputChange={(inputValue, actionMeta) => {
                                            if (actionMeta.action === 'input-change') setSoSearchKeyword(inputValue);
                                        }}
                                        onChange={(option) => {
                                            setSelectedSalesOrder(option);
                                            setSelectedDocEntry(option ? Number(option.doc_entry) : '');
                                            setSelectedSalesItemId('');
                                        }}
                                        placeholder="ค้นหาใบสั่งขาย..."
                                        isClearable
                                        filterOption={null}
                                    />
                                </div>

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
                                                {item.item_name}{item.item_group ? ` [${item.item_group}]` : ''}
                                                {item.work_order ? ' (มี ใบสั่งผลิต แล้ว)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedSalesItemId !== '' && (
                        <>
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

                            {components.map((comp, compIdx) => (
                                <div key={comp.id} className="card card-flush shadow-sm border-0 mb-5">
                                    <div className="card-header py-4 px-6 bg-light-primary d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center flex-grow-1 me-3">
                                            <span className="badge badge-primary me-3 fs-6">{compIdx + 1}</span>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg form-control-sm fw-bold"
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
                                        <div className="mb-4">
                                            <span className="fw-bold text-muted text-uppercase fs-7">
                                                รายการวัตถุดิบ (Materials)
                                            </span>
                                        </div>

                                        <MaterialPicklist
                                            materials={materials}
                                            value={comp.materials}
                                            onChange={(next) => updateComponentMaterials(comp.id, next)}
                                            allocatedElsewhere={getAllocatedElsewhere(comp.id)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

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
                                    สร้างใบสั่งผลิต (Create)
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════
                STEP 2: Fill Component Details
            ══════════════════════════════════════════════════ */}
            {step === 'fill_details' && createdWorkOrder && (
                <>
                    {/* Step indicator */}
                    <div className='alert alert-success d-flex align-items-center py-4 mb-6'>
                        <i className='bi bi-check-circle-fill text-success fs-3 me-3'></i>
                        <div>
                            <div className='fw-bold fs-6'>สร้างใบสั่งผลิตสำเร็จ — เลขที่ {createdWorkOrder.doc_num}</div>
                            <div className='text-muted fs-7'>ขั้นตอนที่ 2: กรอกรายละเอียด Component (ไม่บังคับ สามารถข้ามและกรอกภายหลังได้)</div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className='d-flex flex-stack mb-6'>
                        <div>
                            <h1 className='text-gray-900 fw-bold fs-2 mb-0'>กรอกรายละเอียด Component</h1>
                            <span className='text-muted fs-7'>
                                ใบสั่งผลิต: {createdWorkOrder.doc_num} &nbsp;|&nbsp; สินค้า: {createdWorkOrder.sales_item?.item_name || ''}
                            </span>
                        </div>
                        <div className='d-flex gap-3'>
                            <button
                                className='btn btn-light fw-bold px-6'
                                onClick={() => navigate('/workorder/workorders_list')}
                            >
                                ข้ามขั้นตอนนี้
                            </button>
                            <button
                                className='btn btn-primary fw-bold px-6'
                                onClick={handleSaveDetails}
                                disabled={savingDetails}
                            >
                                {savingDetails
                                    ? <><span className='spinner-border spinner-border-sm me-2'></span>กำลังบันทึก...</>
                                    : <><i className='bi bi-check-lg me-1'></i>บันทึกและเสร็จสิ้น</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* One card per component */}
                    {createdWorkOrder.item_components.map((comp, idx) => {
                        const templateId = selectedTemplateIds[comp.item_component_id] ?? null;
                        const template = templateId ? loadedTemplates[templateId] : null;
                        return (
                            <div key={comp.item_component_id} className='card shadow-sm mb-6'>
                                <div className='card-header border-0 pt-5 pb-3 d-flex align-items-center gap-3'>
                                    <span className='badge badge-primary fs-6'>{idx + 1}</span>
                                    <h3 className='fw-bold text-gray-900 fs-5 mb-0'>{comp.component_name}</h3>
                                </div>
                                <div className='card-body pt-0 pb-6'>
                                    {/* Template selector */}
                                    <div className='mb-5'>
                                        <label className='form-label fw-semibold fs-7 text-muted text-uppercase'>
                                            เลือก Template (ไม่บังคับ)
                                        </label>
                                        <div className='d-flex align-items-center flex-wrap gap-4'>
                                            <select
                                                className='form-select form-select-sm'
                                                style={{ maxWidth: 280 }}
                                                value={templateId || ''}
                                                onChange={e => {
                                                    const val = e.target.value ? Number(e.target.value) : null;
                                                    handleTemplateSelectForComponent(comp.item_component_id, val);
                                                }}
                                            >
                                                <option value=''>-- ไม่เลือก Template --</option>
                                                {allTemplates.map(t => (
                                                    <option key={t.component_template_id} value={t.component_template_id}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {idx === 0 && createdWorkOrder.item_components.length > 1 && (
                                                <div className='form-check form-switch form-check-sm mb-0'>
                                                    <input
                                                        className='form-check-input'
                                                        type='checkbox'
                                                        id='apply-template-to-all'
                                                        checked={applySameTemplateToAll}
                                                        onChange={e => setApplySameTemplateToAll(e.target.checked)}
                                                    />
                                                    <label className='form-check-label fs-7 fw-semibold text-gray-700' htmlFor='apply-template-to-all'>
                                                        ใช้ template เดียวกันกับทุก Component
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Template sections */}
                                    {template && (
                                        <div className='d-flex flex-column gap-5'>
                                            {template.sections.map((sec: TemplateSection) => (
                                                <div key={sec.key} className='border rounded p-4'>
                                                    <TemplateSectionForm
                                                        section={sec}
                                                        data={(detailFormData[comp.item_component_id] || {})[sec.key] || {}}
                                                        onUpdate={data => updateDetailSectionData(comp.item_component_id, sec.key, data)}
                                                        workOrderDocNum={createdWorkOrder?.doc_num}
                                                        salesItemName={createdWorkOrder?.sales_item?.item_name}
                                                        salesItemCode={createdWorkOrder?.sales_item?.item_code}
                                                        componentName={comp.component_name}
                                                        materialUsages={comp.material_usages}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!templateId && (
                                        <div className='text-muted fs-7 py-2'>
                                            <i className='bi bi-info-circle me-1'></i>
                                            เลือก Template เพื่อกรอกข้อมูลรายละเอียดของ Component นี้
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div className='d-flex justify-content-end gap-3 mt-2'>
                        <button
                            className='btn btn-light fw-bold px-6'
                            onClick={() => navigate('/workorder/workorders_list')}
                        >
                            ข้ามขั้นตอนนี้
                        </button>
                        <button
                            className='btn btn-primary fw-bold px-6'
                            onClick={handleSaveDetails}
                            disabled={savingDetails}
                        >
                            {savingDetails
                                ? <><span className='spinner-border spinner-border-sm me-2'></span>กำลังบันทึก...</>
                                : <><i className='bi bi-check-lg me-1'></i>บันทึกและเสร็จสิ้น</>
                            }
                        </button>
                    </div>
                </>
            )}
        </Content>
    );
};

export default WorkorderCreate;
