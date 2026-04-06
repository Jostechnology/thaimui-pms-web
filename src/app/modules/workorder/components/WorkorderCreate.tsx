import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { searchSalesOrderService, getSalesOrderService } from '../../../services/salesOrderService';
import { createWorkOrder } from '../../../services/workorder';
import { getMaterialStockSummary, validateMaterialStock } from '../../../services/materialStockService';
import {
    getComponentTemplates,
    getComponentTemplateById,
    saveItemComponentSectionsBatch,
} from '../../../services/componentTemplateService';
import type { SalesOrderSearch, SalesOrderDetail } from '../../../type_interface/SalesOrderType';
import type { SalesItem } from '../../../type_interface/SalesItemType';
import type { Material } from '../../../type_interface/MaterialType';
import type { MaterialStockSummary as MaterialStockSummaryData } from '../../../type_interface/MaterialStockType';
import type { WorkOrder, ItemComponent, ComponentMaterialUsage } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { aggregateMaterialUsageFromComponents, validateMaterialQuantities, buildValidationSummaryMessage } from '../../../utils/materialValidation';
import MaterialStockSummary from '../../../custom_components/MaterialStockSummary';
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

    // Stock summary
    const [stockSummaries, setStockSummaries] = useState<MaterialStockSummaryData[]>([]);

    // Components - each component has multiple materials
    const [components, setComponents] = useState<ComponentItem[]>([
        { id: 1, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: '' }], nextMaterialId: 2 },
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

    // ─── When Sales Item changes, update material list & fetch stock ─
    useEffect(() => {
        if (selectedSalesItemId === '') {
            setMaterials([]);
            setStockSummaries([]);
            resetComponents();
            return;
        }
        const item = salesItems.find(i => i.sales_item_id === selectedSalesItemId);
        if (item) {
            setMaterials(item.material_list || []);
        }
        resetComponents();

        (async () => {
            try {
                const res = await getMaterialStockSummary(selectedSalesItemId as number);
                if (res && res.success && res.data) {
                    setStockSummaries(res.data);
                }
            } catch { }
        })();
    }, [selectedSalesItemId]);

    const resetComponents = () => {
        setComponents([
            { id: 1, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: '' }], nextMaterialId: 2 },
        ]);
        setNextComponentId(2);
    };

    // ─── Component helpers ─────────────────────────────────────
    const addComponent = () => {
        setComponents(prev => [
            ...prev,
            { id: nextComponentId, component_name: '', materials: [{ id: 1, material_list_id: '', quantity_used: '' }], nextMaterialId: 2 }
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
                        materials: [...comp.materials, { id: comp.nextMaterialId, material_list_id: '', quantity_used: '' }],
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

    const getSelectedMaterialIdsInComponent = (componentId: number): number[] => {
        const comp = components.find(c => c.id === componentId);
        if (!comp) return [];
        return comp.materials
            .map(m => m.material_list_id)
            .filter((id): id is number => id !== '');
    };

    const getAvailableQuantity = (materialListId: number): number => {
        const stock = stockSummaries.find(s => s.material_list_id === materialListId);
        if (stock) return stock.remaining_quantity;
        const mat = materials.find(m => m.material_list_id === materialListId);
        return mat ? mat.remaining_num : 0;
    };

    const getTotalUsedForMaterial = (materialListId: number, excludeComponentId?: number, excludeMaterialRowId?: number): number => {
        let total = 0;
        for (const comp of components) {
            for (const mat of comp.materials) {
                if (mat.material_list_id === materialListId) {
                    if (comp.id === excludeComponentId && mat.id === excludeMaterialRowId) {
                        continue;
                    }
                    total += Number(mat.quantity_used) || 0;
                }
            }
        }
        return total;
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
            const validMaterials = comp.materials.filter(m => m.material_list_id !== '');
            if (validMaterials.length === 0) {
                Swal.fire('ข้อมูลไม่ครบ', `กรุณาเพิ่มวัตถุดิบในส่วนประกอบที่ ${i + 1}`, 'warning');
                return;
            }
            if (validMaterials.some(m => m.quantity_used === '' || Number(m.quantity_used) <= 0)) {
                Swal.fire('ข้อมูลไม่ถูกต้อง', `จำนวนวัตถุดิบในส่วนประกอบที่ ${i + 1} ต้องมากกว่า 0`, 'warning');
                return;
            }
        }

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

        const usageMap = aggregateMaterialUsageFromComponents(components);
        const requests = Array.from(usageMap.entries()).map(([id, qty]) => ({
            material_list_id: id,
            quantity_needed: qty,
        }));
        const clientValidation = validateMaterialQuantities(requests, materials, stockSummaries);
        const invalidItems = clientValidation.filter(r => !r.is_valid);

        if (invalidItems.length > 0) {
            const msg = buildValidationSummaryMessage(clientValidation);
            Swal.fire('วัตถุดิบไม่เพียงพอ', msg, 'error');
            return;
        }

        try {
            throw new Error("")
        } catch { }

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
    const handleTemplateSelect = async (itemComponentId: number, templateId: number | null) => {
        setSelectedTemplateIds(prev => ({ ...prev, [itemComponentId]: templateId }));
        if (!templateId || loadedTemplates[templateId]) return;
        const res = await getComponentTemplateById(templateId);
        if (res?.success && res.data) {
            setLoadedTemplates(prev => ({ ...prev, [templateId]: res.data }));
        }
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

    // ─── Render one section form for a component (step 2) ─────
    const renderDetailSectionForm = (comp: ItemComponent, section: TemplateSection) => {
        const fd = detailFormData[comp.item_component_id] || {};
        const data = fd[section.key] || {};
        const update = (newData: any) => updateDetailSectionData(comp.item_component_id, section.key, newData);

        switch (section.type) {
            case 'header': {
                const woData: Record<string, string> = {};
                if (createdWorkOrder) {
                    woData['เลขที่ใบสั่งผลิต'] = String(createdWorkOrder.doc_num || '');
                    woData['สินค้า'] = createdWorkOrder.sales_item?.item_name || '';
                    woData['รหัสสินค้า'] = createdWorkOrder.sales_item?.item_code || '';
                    woData['ชื่อ Component'] = comp.component_name || '';
                }
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='row g-3'>
                            {section.fields.map(f => {
                                const val = data[f.key] ?? (woData[f.label] || '');
                                return (
                                    <div key={f.key} className={`col-md-${12 / (section.columns || 4)}`}>
                                        <label className='form-label fw-semibold fs-7'>{f.label}</label>
                                        <input className='form-control form-control-sm bg-light-primary' value={val} readOnly />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            case 'material_table': {
                const mat_usages = comp.material_usages || [];
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='table-responsive'>
                            <table className='table table-bordered table-sm'>
                                <thead>
                                    <tr className='bg-light'>
                                        {section.columns.map(col => (
                                            <th key={col.key} className='fw-bold fs-8'>{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {mat_usages.length > 0 ? mat_usages.map((usage: ComponentMaterialUsage, idx: number) => (
                                        <tr key={usage.usage_id}>
                                            {section.columns.map(col => {
                                                let cellVal = '';
                                                const label = col.label.toLowerCase();
                                                if (label.includes('ชื่อ') || label.includes('name')) cellVal = usage.material_list?.item_name || '';
                                                else if (label.includes('รหัส') || label.includes('code')) cellVal = usage.material_list?.item_code || '';
                                                else if (label.includes('จำนวน') || label.includes('qty')) cellVal = String(usage.quantity_used || '');
                                                else if (label.includes('ราคา') || label.includes('price') || label.includes('หน่วย')) cellVal = String(usage.material_list?.unit_price);
                                                else if (label.includes('รายละเอียด') || label.includes('desc')) cellVal = usage.material_list?.item_description || '';
                                                else if (label.includes('ลำดับ') || label.includes('#') || label.includes('no')) cellVal = String(idx + 1);
                                                return <td key={col.key} className='fs-8'>{cellVal}</td>;
                                            })}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={section.columns.length} className='text-center text-muted py-4'>ไม่มีข้อมูลวัสดุ</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            }

            case 'key_value':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='row g-3'>
                            {section.fields.map(f => (
                                <div key={f.key} className={`col-md-${12 / (section.columns || 2)}`}>
                                    <label className='form-label fw-semibold fs-7'>
                                        {f.label} {f.unit && <span className='text-muted'>({f.unit})</span>}
                                    </label>
                                    <input
                                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                        className='form-control form-control-sm'
                                        value={data[f.key] || f.defaultValue || ''}
                                        onChange={e => update({ ...data, [f.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'checkbox_group':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='row g-2'>
                            {section.items.map(item => (
                                <div key={item.key} className={`col-md-${12 / (section.columns || 2)}`}>
                                    <div className='d-flex align-items-center gap-2'>
                                        <div className='form-check'>
                                            <input
                                                className='form-check-input'
                                                type='checkbox'
                                                checked={data[item.key]?.checked || false}
                                                onChange={e => update({ ...data, [item.key]: { ...data[item.key], checked: e.target.checked } })}
                                            />
                                            <label className='form-check-label fs-7'>{item.label}</label>
                                        </div>
                                        {item.hasTextField && (
                                            <input
                                                className='form-control form-control-sm ms-2'
                                                style={{ maxWidth: 200 }}
                                                placeholder={item.textFieldLabel || ''}
                                                value={data[item.key]?.text || ''}
                                                onChange={e => update({ ...data, [item.key]: { ...data[item.key], text: e.target.value } })}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'image_select':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='d-flex flex-wrap gap-3'>
                            {section.options.map(opt => (
                                <div
                                    key={opt.key}
                                    className={`d-flex flex-column align-items-center gap-2 p-3 border rounded ${(data.selected || []).includes(opt.key) ? 'border-primary bg-light-primary' : ''}`}
                                    style={{ cursor: 'pointer', minWidth: 100 }}
                                    onClick={() => {
                                        if (section.multiple) {
                                            const selected = data.selected || [];
                                            const newSelected = selected.includes(opt.key)
                                                ? selected.filter((k: string) => k !== opt.key)
                                                : [...selected, opt.key];
                                            update({ ...data, selected: newSelected });
                                        } else {
                                            update({ ...data, selected: [opt.key] });
                                        }
                                    }}
                                >
                                    {opt.imageUrl ? (
                                        <img src={opt.imageUrl} alt={opt.label} style={{ width: 60, height: 60, objectFit: 'contain' }} />
                                    ) : (
                                        <div className='border rounded bg-white d-flex align-items-center justify-content-center' style={{ width: 60, height: 60 }}>
                                            <i className='bi bi-image text-muted fs-4'></i>
                                        </div>
                                    )}
                                    <span className='fs-8 text-center'>{opt.label}</span>
                                    <div
                                        className={`border rounded d-flex align-items-center justify-content-center ${(data.selected || []).includes(opt.key) ? 'bg-primary border-primary' : 'border-dark'}`}
                                        style={{ width: 18, height: 18, minWidth: 18 }}
                                    >
                                        {(data.selected || []).includes(opt.key) && (
                                            <i className='bi bi-check text-white' style={{ fontSize: '0.7rem' }}></i>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'fixed_row_table':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='table-responsive'>
                            <table className='table table-bordered table-sm mb-0'>
                                <thead>
                                    <tr className='bg-light'>
                                        <th className='fw-bold text-center' style={{ minWidth: 160 }}>รายการ</th>
                                        {section.columns.map(col => (
                                            <th key={col.key} className='fw-bold text-center' style={{ width: col.width || '120px' }}>{col.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.rows.map(row => (
                                        <tr key={row.key}>
                                            <td className='fw-semibold' style={{ whiteSpace: 'nowrap' }}>{row.label}</td>
                                            {section.columns.map(col => {
                                                const cell = row.cells.find(c => c.columnKey === col.key);
                                                const cellKey = `${row.key}_${col.key}`;
                                                return (
                                                    <td key={col.key} className='text-center align-middle'>
                                                        {cell?.cellType === 'text' ? (
                                                            <input
                                                                className='form-control form-control-sm text-center'
                                                                value={data[cellKey] || ''}
                                                                onChange={e => update({ ...data, [cellKey]: e.target.value })}
                                                            />
                                                        ) : (
                                                            <div className='form-check d-flex justify-content-center m-0'>
                                                                <input
                                                                    className='form-check-input'
                                                                    type='checkbox'
                                                                    checked={data[cellKey] || false}
                                                                    onChange={e => update({ ...data, [cellKey]: e.target.checked })}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'signature':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <div className='row g-3'>
                            {section.fields.map(f => (
                                <div key={f.key} className={`col-md-${Math.max(3, Math.floor(12 / section.fields.length))}`}>
                                    <div className='text-center'>
                                        <div className='border-bottom border-dark mb-2' style={{ height: 60 }}></div>
                                        <input
                                            className='form-control form-control-sm text-center'
                                            placeholder={f.label}
                                            value={data[f.key] || ''}
                                            onChange={e => update({ ...data, [f.key]: e.target.value })}
                                        />
                                        {f.role && <span className='fs-9 text-muted'>{f.role}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'note':
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        <textarea
                            className='form-control'
                            rows={3}
                            placeholder={section.placeholder || 'กรอกหมายเหตุ...'}
                            value={data.text || ''}
                            onChange={e => update({ text: e.target.value })}
                        />
                    </div>
                );

            case 'image_upload': {
                const images: string[] = data.images || [];
                const maxImages = section.maxImages || 5;
                const handleUpload = (file: File | null) => {
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        update({ ...data, images: [...images, ev.target?.result as string] });
                    };
                    reader.readAsDataURL(file);
                };
                return (
                    <div>
                        <div className='fw-bold fs-5 mb-3 text-primary border-bottom pb-2'>{section.title}</div>
                        {section.description && <div className='text-muted fs-8 mb-3'>{section.description}</div>}
                        <div className='d-flex flex-wrap gap-3 mb-3'>
                            {images.map((img, idx) => (
                                <div key={idx} className='position-relative'>
                                    <img src={img} alt={`upload-${idx}`} className='border rounded'
                                        style={{ width: 100, height: 100, objectFit: 'contain', background: '#f9f9f9' }} />
                                    <button
                                        className='btn btn-sm btn-icon btn-danger position-absolute'
                                        style={{ top: -6, right: -6, width: 20, height: 20, padding: 0 }}
                                        onClick={() => update({ ...data, images: images.filter((_, i) => i !== idx) })}
                                    >
                                        <i className='bi bi-x' style={{ fontSize: '0.7rem' }}></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        {images.length < maxImages && (
                            <label className='btn btn-sm btn-light-primary'>
                                <i className='bi bi-camera me-1'></i>เลือกรูปภาพ ({images.length}/{maxImages})
                                <input type='file' accept='image/*' className='d-none'
                                    onChange={e => handleUpload(e.target.files?.[0] || null)} />
                            </label>
                        )}
                    </div>
                );
            }

            case 'spacer':
                return <div style={{ height: section.height || 20 }}></div>;

            default:
                return <div className='text-muted'>ไม่รู้จัก section type</div>;
        }
    };

    const hasAnySelectedMaterial = components.some(comp =>
        comp.materials.some(m => m.material_list_id !== '')
    );

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
                                                {item.item_name}
                                                {item.work_order ? ' (มี ใบสั่งผลิต แล้ว)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedSalesItemId !== '' && stockSummaries.length > 0 && (
                        <MaterialStockSummary
                            salesItemId={selectedSalesItemId as number}
                            externalData={stockSummaries}
                        />
                    )}

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

                            {materials.length === 0 && (
                                <div className="alert alert-warning d-flex align-items-center py-3 mb-5">
                                    <i className="bi bi-exclamation-triangle text-warning me-3 fs-4"></i>
                                    <span>ไม่พบวัตถุดิบสำหรับรายการสินค้าที่เลือก</span>
                                </div>
                            )}

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

                                            {comp.materials.map((mat, matIdx) => {
                                                const selectedMaterial = materials.find(m => m.material_list_id === mat.material_list_id);
                                                const usedByOthers = selectedMaterial ? getTotalUsedForMaterial(selectedMaterial.material_list_id, comp.id, mat.id) : 0;
                                                const availableFromStock = selectedMaterial ? getAvailableQuantity(selectedMaterial.material_list_id) : 0;
                                                const maxQty = selectedMaterial ? availableFromStock - usedByOthers : 1;
                                                const remaining = selectedMaterial ? maxQty - (Number(mat.quantity_used) || 0) : 0;
                                                const availableForDropdown = materials.filter(m =>
                                                    !selectedInThisComponent.includes(m.material_list_id) ||
                                                    mat.material_list_id === m.material_list_id
                                                );

                                                return (
                                                    <div key={mat.id} className="row align-items-center mb-3">
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

                                                        <div className="col-md-3 d-flex align-items-center justify-content-between">
                                                            <span className="text-muted fs-7">
                                                                {selectedMaterial ? `(คงเหลือ: ${remaining})` : ''}
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
                                        <select
                                            className='form-select form-select-sm'
                                            value={templateId || ''}
                                            onChange={e => {
                                                const val = e.target.value ? Number(e.target.value) : null;
                                                handleTemplateSelect(comp.item_component_id, val);
                                            }}
                                        >
                                            <option value=''>-- ไม่เลือก Template --</option>
                                            {allTemplates.map(t => (
                                                <option key={t.component_template_id} value={t.component_template_id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Template sections */}
                                    {template && (
                                        <div className='d-flex flex-column gap-5'>
                                            {template.sections.map((sec: TemplateSection) => (
                                                <div key={sec.key} className='border rounded p-4'>
                                                    {renderDetailSectionForm(comp, sec)}
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
