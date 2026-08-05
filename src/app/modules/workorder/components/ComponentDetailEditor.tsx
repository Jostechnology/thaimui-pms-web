import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import {
    getComponentTemplates,
    getComponentTemplateById,
    getItemComponentSections,
    saveItemComponent,
} from '../../../services/componentTemplateService';
import type { SaveItemComponentPayload } from '../../../services/componentTemplateService';
import {
    createItemComponentEditRequest,
    cancelComponentEditRequest,
} from '../../../services/componentEditRequestService';
import { getWorkOrderById, decodeItemCodes } from '../../../services/workorder';
import type { WorkOrder, ItemComponent, ComponentMaterialUsage, DecodeMap } from '../../../type_interface/WorkOrderType';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';
import { packIntoRows } from '../../../type_interface/ComponentTemplateType';
import { downloadComponentDocument } from '../../../services/documentGeneratorService';
import TemplateSectionForm from './TemplateSectionForm';
import ComponentVersionHistoryModal from './ComponentVersionHistoryModal';
import MaterialPicklist, { getAvailableForMaterial } from './MaterialPicklist';
import type { MaterialOption, MaterialSelection } from './MaterialPicklist';

// ─── Form data state: keyed by section_key ──────────────────
type SectionFormData = Record<string, any>;

const EDIT_REQUEST_STATUS_LABEL: Record<string, string> = {
    PENDING: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    CONSUMED: 'ใช้สิทธิ์แล้ว',
    CANCELLED: 'ยกเลิกแล้ว',
};

const EDIT_REQUEST_STATUS_BADGE: Record<string, string> = {
    PENDING: 'badge-light-info',
    APPROVED: 'badge-light-success',
    REJECTED: 'badge-light-danger',
    CONSUMED: 'badge-light-secondary',
    CANCELLED: 'badge-light-secondary',
};

const formatDateTime = (value?: string | null): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const ComponentDetailEditor: React.FC = () => {
    const navigate = useNavigate();
    const { workOrderId, componentId } = useParams<{ workOrderId: string; componentId: string }>();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [component, setComponent] = useState<ItemComponent | null>(null);

    // Template selection
    const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);

    // Form data
    const [formData, setFormData] = useState<SectionFormData>({});
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Materials — the component's own ComponentMaterialUsage rows, edited as a
    // full-replacement set (mirrors WorkorderCreate's per-component materials
    // state). Kept independent of `component` so a partial save (see
    // handleSave) can update `component` without discarding in-flight edits
    // here.
    const [materialSelections, setMaterialSelections] = useState<MaterialSelection[]>([]);

    // Best-effort material-code decode map (keyed by item_code), batched once
    // per component load and fed to every TemplateSectionForm for autofill.
    const [decodeMap, setDecodeMap] = useState<DecodeMap>({});

    // ── Test-section overrides ──
    // Per-component override of each section's is_test_section flag, keyed by
    // section_key. null = inherit the template's flag for that section.
    // Only entries the user has actually touched (or that were already saved
    // as an explicit override) live here — everything else falls back to the
    // template's own flag via resolveTestSection().
    const [testSectionOverrides, setTestSectionOverrides] = useState<Record<string, boolean | null>>({});

    // Lock / edit-request workflow
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestError, setRequestError] = useState<string | null>(null);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [cancellingRequest, setCancellingRequest] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);

    // ── Lock state ──
    // The component locks as soon as production starts; Production must approve an
    // edit request to unlock it, and that approval is burnt by the next save.
    const locked = component?.is_locked === true;
    const approval = component?.active_edit_request ?? null;
    const hasApproval = approval?.status === 'APPROVED';
    const hasPendingRequest = approval?.status === 'PENDING';
    const canEdit = !locked || hasApproval;

    // ── Materials: candidate list ──
    // GET /get_work_order_by_id now nests sales_item via SalesItemSchemaDetail
    // (backend commit 9030a91), which carries the FULL SalesItem.material_list —
    // every material on the sales item, not just ones some component already
    // used. This is the real candidate pool for the picklist.
    //
    // Runtime-guarded rather than trusted blindly: WorkOrderType's SalesItem
    // still types material_list as a required field, but that was also true
    // before the backend fix (it just lied). So check for an actual array at
    // runtime and fall back to the old "union of every component's
    // material_usages" derivation if it's ever missing — a regression here
    // should degrade to the previous (narrower) behavior, not render an
    // empty, unusable picker.
    const materialOptionsFromUsages = useMemo<MaterialOption[]>(() => {
        const map = new Map<number, MaterialOption>();
        const consider = (usages?: ComponentMaterialUsage[]) => {
            (usages || []).forEach(u => {
                if (map.has(u.material_list_id) || !u.material_list) return;
                // Backend's MaterialListSchema also dumps unit_name; the FE
                // ComponentMaterialUsage.material_list type just doesn't
                // declare it. Read it defensively rather than editing a type
                // file this component doesn't own.
                const ml = u.material_list as ComponentMaterialUsage['material_list'] & { unit_name?: string };
                map.set(u.material_list_id, {
                    material_list_id: ml.material_list_id,
                    item_code: ml.item_code,
                    item_name: ml.item_name,
                    item_group: ml.item_group,
                    unit_name: ml.unit_name,
                    remaining_num: ml.remaining_num,
                    quantity: ml.quantity,
                });
            });
        };
        (workOrder?.item_components || []).forEach(c => consider(c.material_usages));
        consider(component?.material_usages);
        return Array.from(map.values());
    }, [workOrder, component]);

    const materialOptions = useMemo<MaterialOption[]>(() => {
        const list = workOrder?.sales_item?.material_list;
        if (!Array.isArray(list)) {
            if (workOrder) {
                // Only warn once we actually have a work order to inspect —
                // avoids a false alarm during the initial loading render.
                // eslint-disable-next-line no-console
                console.warn(
                    'ComponentDetailEditor: work_order.sales_item.material_list is missing from the payload; ' +
                    'falling back to the material_usages-derived candidate list.'
                );
            }
            return materialOptionsFromUsages;
        }
        return list.map(ml => ({
            material_list_id: ml.material_list_id,
            item_code: ml.item_code,
            item_name: ml.item_name,
            item_group: ml.item_group,
            unit_name: ml.unit_name,
            remaining_num: ml.remaining_num,
            quantity: ml.quantity,
        }));
    }, [workOrder, materialOptionsFromUsages]);

    // ── Materials: cross-component allocation ──
    // Same shape as WorkorderCreate's materialUsageByMaterial/getAllocatedElsewhere,
    // but sourced from each sibling component's already-saved material_usages
    // (this page only edits ONE component, so siblings are read-only here).
    const materialUsageByMaterial = useMemo(() => {
        const map: Record<number, { componentId: number; qty: number; label: string }[]> = {};
        (workOrder?.item_components || []).forEach((comp, idx) => {
            (comp.material_usages || []).forEach(u => {
                const qty = Number(u.quantity_used) || 0;
                if (qty <= 0) return;
                if (!map[u.material_list_id]) map[u.material_list_id] = [];
                map[u.material_list_id].push({
                    componentId: comp.item_component_id,
                    qty,
                    label: comp.component_name?.trim() || `ส่วนประกอบที่ ${idx + 1}`,
                });
            });
        });
        return map;
    }, [workOrder]);

    const allocatedElsewhere = useMemo(() => {
        const currentId = Number(componentId);
        const result: Record<number, { qty: number; label: string }[]> = {};
        Object.entries(materialUsageByMaterial).forEach(([materialListIdStr, entries]) => {
            const others = entries
                .filter(e => e.componentId !== currentId)
                .map(e => ({ qty: e.qty, label: e.label }));
            if (others.length > 0) result[Number(materialListIdStr)] = others;
        });
        return result;
    }, [materialUsageByMaterial, componentId]);

    // ── Materials: change detection ──
    // Drives whether handleSave calls the material_usage PATCH at all — an
    // unchanged materials section should never burn the single-use approval.
    const originalMaterialSelections = useMemo<MaterialSelection[]>(() => (
        (component?.material_usages || []).map(u => ({
            material_list_id: u.material_list_id,
            quantity_used: u.quantity_used,
        }))
    ), [component]);

    const materialsChanged = useMemo(() => {
        const normalize = (list: MaterialSelection[]) =>
            [...list]
                .map(m => `${m.material_list_id}:${Number(m.quantity_used)}`)
                .sort()
                .join('|');
        return normalize(originalMaterialSelections) !== normalize(materialSelections);
    }, [originalMaterialSelections, materialSelections]);

    // ── Apply a fresh ItemComponent to state ──
    // Split in two on purpose. Both halves come from the SAME response now
    // (handleSave makes exactly one request to the combined save endpoint),
    // but sections are sent — and therefore refreshed — on every save,
    // while materials are only sent, and only refreshed, when
    // materialsChanged. Keeping the split means an unrelated sections-only
    // save can never stomp the materials half of state with anything other
    // than an idempotent echo of what was already there.
    const applyComponentSectionState = (comp: ItemComponent) => {
        setComponent(comp);
        if (comp.component_template_id) {
            setSelectedTemplateId(comp.component_template_id);
        }
        // Rebuild formData + test-section overrides from saved section data
        if (comp.component_template_sections?.length) {
            const fd: SectionFormData = {};
            const overrides: Record<string, boolean | null> = {};
            for (const sd of comp.component_template_sections) {
                fd[sd.section_key] = sd.data;
                overrides[sd.section_key] = sd.is_test_section ?? null;
            }
            setFormData(fd);
            setTestSectionOverrides(overrides);
        } else {
            setTestSectionOverrides({});
        }
    };

    const applyMaterialUsageState = (comp: ItemComponent) => {
        setMaterialSelections(
            (comp.material_usages || []).map(u => ({
                material_list_id: u.material_list_id,
                quantity_used: u.quantity_used,
            }))
        );
    };

    // ── Fetch work order + component ──
    const fetchData = useCallback(async () => {
        setLoading();
        try {
            const [woRes, compRes, tplRes] = await Promise.all([
                getWorkOrderById(Number(workOrderId)),
                getItemComponentSections(Number(componentId)),
                getComponentTemplates(1, 100, ''),
            ]);

            if (woRes?.success && woRes.data) {
                setWorkOrder(woRes.data);
            }

            if (compRes?.success && compRes.data) {
                applyComponentSectionState(compRes.data);
                applyMaterialUsageState(compRes.data);
            }

            if (tplRes?.success && tplRes.data?.items) {
                setTemplates(tplRes.data.items);
            }
        } catch {
            alertMessage('ไม่สามารถดึงข้อมูลได้');
        } finally {
            setUnLoading();
        }
    }, [workOrderId, componentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Batch-decode this component's material item_codes once it loads ──
    // De-dupes {item_code,item_group} across the component's material_usages,
    // hits /decode_item_codes ONCE, and stores the map for every
    // TemplateSectionForm. Best-effort: a miss/failure leaves decodeMap empty
    // and every detail field stays user-editable.
    useEffect(() => {
        const usages = component?.material_usages || [];
        const seen = new Set<string>();
        const items: { item_code: string; item_group: string }[] = [];
        usages.forEach(u => {
            const code = u.material_list?.item_code;
            const group = u.material_list?.item_group;
            if (!code || seen.has(code)) return;
            seen.add(code);
            items.push({ item_code: code, item_group: group || '' });
        });
        if (items.length === 0) {
            setDecodeMap({});
            return;
        }
        (async () => {
            const res = await decodeItemCodes(items);
            if (res?.success && res.results) setDecodeMap(res.results);
        })();
    }, [component]);

    // ── Load template when selected ──
    useEffect(() => {
        if (!selectedTemplateId) {
            setSelectedTemplate(null);
            return;
        }
        (async () => {
            const res = await getComponentTemplateById(selectedTemplateId);
            if (res?.success && res.data) {
                setSelectedTemplate(res.data);
            }
        })();
    }, [selectedTemplateId]);

    // ── Download component document ──
    const handleDownloadDocument = async () => {
        if (!workOrder?.doc_num || !componentId) return;
        setDownloading(true);
        try {
            const res = await downloadComponentDocument(workOrder.work_order_code, Number(componentId));
            if (!res.success && !res.silent) {
                Swal.fire(
                    res.title || 'ดาวน์โหลดเอกสารไม่สำเร็จ',
                    res.message || 'ไม่สามารถดาวน์โหลดเอกสารได้',
                    res.icon || 'error'
                );
            }
        } finally {
            setDownloading(false);
        }
    };

    // ── Update a section's form data ──
    const updateSectionData = (sectionKey: string, data: any) => {
        setFormData(prev => ({ ...prev, [sectionKey]: data }));
    };

    // ── Resolve a section's effective test-section flag ──
    // Rule: override if not null, else the template section's own flag, else false.
    const resolveTestSection = useCallback((sectionKey: string, templateFlag?: boolean | null): boolean => {
        const override = testSectionOverrides[sectionKey];
        if (override !== null && override !== undefined) return override;
        return !!templateFlag;
    }, [testSectionOverrides]);

    const handleToggleTestSection = (sectionKey: string, checked: boolean) => {
        setTestSectionOverrides(prev => ({ ...prev, [sectionKey]: checked }));
    };

    // ── Save ──
    const handleSave = async () => {
        if (!selectedTemplateId || !selectedTemplate) {
            Swal.fire('กรุณาเลือก Template', '', 'warning');
            return;
        }
        if (!canEdit) {
            Swal.fire(
                'ไม่สามารถแก้ไขได้',
                component?.lock_reason || 'เอกสารชิ้นส่วนนี้ถูกล็อกแล้ว กรุณาขออนุมัติแก้ไขจากฝ่ายผลิตก่อน',
                'warning'
            );
            return;
        }

        // Client-side pre-check for material over-allocation, so the user sees
        // it inline instead of only as a server 400. The server remains the
        // real authority (it sums usage across the whole WorkOrder against
        // MaterialList.quantity, not remaining_num — see
        // _write_material_usage's docstring on the API side, shared by both
        // the combined save endpoint and the standalone material_usage PATCH);
        // this is best-effort UX sugar on top of that.
        if (materialsChanged) {
            for (const m of materialSelections) {
                if (!m.quantity_used || m.quantity_used <= 0) {
                    Swal.fire('ข้อมูลไม่ถูกต้อง', 'จำนวนวัตถุดิบที่ใช้ต้องมากกว่า 0', 'warning');
                    return;
                }
                const mat = materialOptions.find(mm => mm.material_list_id === m.material_list_id);
                if (!mat) continue;
                const available = getAvailableForMaterial(mat, allocatedElsewhere[m.material_list_id]);
                if (Number.isFinite(available) && m.quantity_used > (available as number)) {
                    Swal.fire(
                        'จำนวนเกินคงเหลือ',
                        `วัตถุดิบ "${mat.item_name}" มีจำนวนเกินคงเหลือ (คงเหลือ ${available})`,
                        'warning'
                    );
                    return;
                }
            }
        }

        // Warn before removing the last remaining test section — this deletes the
        // auto-created QC work order, and the backend rejects the save outright if
        // testing has already started against it.
        const hadTestSection = component?.has_test_section === true;
        const willHaveTestSection = selectedTemplate.sections.some((sec: TemplateSection) =>
            resolveTestSection(sec.key, (sec as any).is_test_section)
        );
        if (hadTestSection && !willHaveTestSection) {
            const removalConfirm = await Swal.fire({
                title: 'ยืนยันการลบส่วนของการทดสอบ',
                html:
                    'การบันทึกนี้จะทำให้เอกสารไม่มีส่วนของการทดสอบเหลืออยู่เลย ' +
                    'ซึ่งจะ<b>ลบใบสั่งงาน QC</b> ที่สร้างจากเอกสารนี้โดยอัตโนมัติ<br/><br/>' +
                    'หากมีการเริ่มทดสอบไปแล้ว ระบบจะ<b>ปฏิเสธการบันทึก</b>นี้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันบันทึก',
                cancelButtonText: 'ยกเลิก',
            });
            if (!removalConfirm.isConfirmed) return;
        }

        // Saving against an approved request cuts a new version — the reason is
        // stored on that version row, so make the user spell out what changed.
        // Prefilled with the requester's own words from the original edit
        // request (component.active_edit_request.reason) so the user isn't
        // asked to write the same justification twice — once to ask
        // Production for the unlock (handleSubmitRequest), again here to
        // consume it. Still editable, still mandatory; only the blank-page
        // problem goes away. review_remark is the APPROVER's note, not the
        // requester's reason, so it is deliberately not used as the prefill.
        let changeReason: string | undefined;
        if (hasApproval) {
            const result = await Swal.fire({
                title: 'ยืนยันการบันทึก',
                input: 'textarea',
                inputLabel: 'เหตุผลในการแก้ไข',
                inputPlaceholder: 'ระบุสิ่งที่แก้ไขในเวอร์ชันนี้...',
                inputValue: approval?.reason || '',
                inputAttributes: { rows: '4' },
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                cancelButtonText: 'ยกเลิก',
                inputValidator: (value: string) =>
                    value && value.trim() ? null : 'กรุณาระบุเหตุผลในการแก้ไข',
            });
            if (!result.isConfirmed) return;
            changeReason = String(result.value || '').trim();
        }

        setSaving(true);
        try {
            const sectionsData = selectedTemplate.sections.map((sec: TemplateSection) => {
                const override = testSectionOverrides[sec.key];
                return {
                    section_type: sec.type,
                    section_key: sec.key,
                    data: formData[sec.key] || {},
                    // send the override when the user has set one, otherwise null (inherit)
                    is_test_section: override === true || override === false ? override : null,
                };
            });

            // ── One request, one transaction ──
            // POST .../save takes sections_data and/or material_usage and
            // runs ONE _assert_editable/approval-consumption/version/document
            // cycle for both, so a locked-with-approval save that touches
            // both parts no longer needs (and can no longer survive) two
            // separate calls — the old sections-then-materials sequence used
            // to 403 on the second call because the single-use approval was
            // already consumed by the first.
            //
            // sections_data is sent on every save, unconditionally — this
            // page has always rebuilt and resent the full section set on
            // every Save click (even when the user only touched materials),
            // and that pre-existing behavior is preserved as-is here. It's
            // now harmless: both parts land in the same transaction instead
            // of burning a second approval, so re-sending unchanged sections
            // costs nothing it didn't already cost before this endpoint
            // existed. material_usage is included ONLY when materialsChanged
            // — by key presence, not truthiness — because omitting the key
            // entirely is how this endpoint means "leave materials alone";
            // sending it (even as []) is a real, explicit "replace/clear
            // materials" instruction, and an unchanged materials section must
            // never trigger that.
            const payload: SaveItemComponentPayload = {
                component_template_id: selectedTemplateId,
                sections_data: sectionsData,
                ...(changeReason ? { change_reason: changeReason } : {}),
            };
            if (materialsChanged) {
                payload.material_usage = materialSelections.map(m => ({
                    material_list_id: m.material_list_id,
                    quantity_used: m.quantity_used,
                }));
            }

            const res = await saveItemComponent(Number(componentId), payload);

            if (!res?.success) {
                // A locked save (or an over-allocation, etc.) answers with a
                // Thai explanation — show it verbatim, and leave both
                // formData/testSectionOverrides and materialSelections
                // exactly as the user left them: nothing was written, so
                // nothing here should be discarded.
                Swal.fire('บันทึกไม่สำเร็จ', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
                return;
            }

            // Drop the response straight into state (doc_version bumped, any
            // approval now reflected as consumed) instead of a full refetch.
            applyComponentSectionState(res.data);
            if (materialsChanged) {
                applyMaterialUsageState(res.data);
            }
            await Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Ask production for permission to edit ──
    const openRequestModal = () => {
        setRequestReason('');
        setRequestError(null);
        setShowRequestModal(true);
    };

    const handleSubmitRequest = async () => {
        const reason = requestReason.trim();
        if (!reason) {
            setRequestError('กรุณาระบุเหตุผลในการขอแก้ไข');
            return;
        }
        setSubmittingRequest(true);
        try {
            const res = await createItemComponentEditRequest(Number(componentId), reason);
            if (res?.success) {
                setShowRequestModal(false);
                setRequestReason('');
                setRequestError(null);
                await Swal.fire({
                    title: 'ส่งคำขอแล้ว',
                    text: 'รอฝ่ายผลิตพิจารณาอนุมัติคำขอแก้ไข',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false,
                });
                await fetchData();
            } else {
                Swal.fire('ส่งคำขอไม่สำเร็จ', res?.message || 'ไม่สามารถส่งคำขอแก้ไขได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งคำขอแก้ไขได้', 'error');
        } finally {
            setSubmittingRequest(false);
        }
    };

    // ── Withdraw a pending request ──
    const handleCancelRequest = async () => {
        if (!approval) return;
        const confirm = await Swal.fire({
            title: 'ยกเลิกคำขอแก้ไข?',
            text: 'คำขอนี้จะถูกยกเลิก หากยังต้องการแก้ไขจะต้องยื่นคำขอใหม่',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยกเลิกคำขอ',
            cancelButtonText: 'ปิด',
        });
        if (!confirm.isConfirmed) return;

        setCancellingRequest(true);
        try {
            const res = await cancelComponentEditRequest(approval.edit_request_id);
            if (res?.success) {
                await Swal.fire({ title: 'ยกเลิกคำขอแล้ว', icon: 'success', timer: 1500, showConfirmButton: false });
                await fetchData();
            } else {
                Swal.fire('ยกเลิกคำขอไม่สำเร็จ', res?.message || 'ไม่สามารถยกเลิกคำขอได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกคำขอได้', 'error');
        } finally {
            setCancellingRequest(false);
        }
    };


    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0 d-flex align-items-center gap-3'>
                            <span>แก้ไขรายละเอียด: {component?.component_name || '...'}</span>
                            {component && (
                                <span className='badge badge-light-primary fw-bold px-4 py-2 fs-7'>
                                    เวอร์ชัน {component.doc_version ?? 0}
                                </span>
                            )}
                            {locked && (
                                <span className='badge badge-light-warning fw-bold px-4 py-2 fs-7'>
                                    <i className='bi bi-lock-fill me-1'></i>ล็อก
                                </span>
                            )}
                        </h1>
                        <span className='text-muted fs-7'>ใบสั่งผลิต: {workOrder?.doc_num || '...'}</span>
                    </div>
                </div>
                <div className='d-flex gap-2'>
                    <button
                        className='btn btn-light-primary fw-bold px-5'
                        onClick={() => setShowVersionModal(true)}
                        disabled={!componentId}
                    >
                        <i className='bi bi-clock-history me-1'></i>
                        ประวัติเวอร์ชัน
                    </button>
                    <button className='btn btn-light-success fw-bold px-5' onClick={handleDownloadDocument} disabled={downloading || !workOrder?.doc_num}>
                        {downloading ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-download me-1'></i>}
                        ดาวน์โหลดเอกสาร
                    </button>
                    <button className='btn btn-primary fw-bold px-6' onClick={handleSave} disabled={saving || !selectedTemplateId || !canEdit}>
                        {saving ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-check-lg me-1'></i>}
                        บันทึก
                    </button>
                </div>
            </div>

            {/* Lock / edit-request banner */}
            {locked && !hasPendingRequest && !hasApproval && (
                <div className='alert alert-warning d-flex align-items-start mb-8'>
                    <i className='bi bi-lock-fill fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1'>เอกสารชิ้นส่วนนี้ถูกล็อก</div>
                        <div className='fs-7'>
                            {component?.lock_reason || 'เริ่มการผลิตแล้ว จึงแก้ไขเอกสารไม่ได้จนกว่าฝ่ายผลิตจะอนุมัติคำขอแก้ไข'}
                        </div>
                        {approval?.status === 'REJECTED' && (
                            <div className='fs-7 mt-2'>
                                <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2 me-2`}>
                                    {EDIT_REQUEST_STATUS_LABEL[approval.status]}
                                </span>
                                คำขอล่าสุดไม่ได้รับอนุมัติ
                                {approval.review_remark ? ` — ${approval.review_remark}` : ''}
                            </div>
                        )}
                    </div>
                    <button className='btn btn-sm btn-warning fw-bold ms-3 text-nowrap' onClick={openRequestModal}>
                        <i className='bi bi-pencil-square me-1'></i>
                        ขออนุมัติแก้ไข
                    </button>
                </div>
            )}

            {locked && hasPendingRequest && approval && (
                <div className='alert alert-info d-flex align-items-start mb-8'>
                    <i className='bi bi-hourglass-split fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1 d-flex align-items-center gap-2'>
                            <span>รออนุมัติจากฝ่ายผลิต</span>
                            <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2`}>
                                {EDIT_REQUEST_STATUS_LABEL[approval.status] || approval.status}
                            </span>
                        </div>
                        <div className='fs-7'>เหตุผลที่ขอแก้ไข: {approval.reason}</div>
                        <div className='fs-8 text-muted mt-1'>
                            ยื่นคำขอโดย {approval.created_by || '-'} เมื่อ {formatDateTime(approval.created_date)}
                        </div>
                    </div>
                    <button
                        className='btn btn-sm btn-light-danger fw-bold ms-3 text-nowrap'
                        onClick={handleCancelRequest}
                        disabled={cancellingRequest}
                    >
                        {cancellingRequest
                            ? <span className='spinner-border spinner-border-sm me-1'></span>
                            : <i className='bi bi-x-circle me-1'></i>}
                        ยกเลิกคำขอ
                    </button>
                </div>
            )}

            {locked && hasApproval && approval && (
                <div className='alert alert-success d-flex align-items-start mb-8'>
                    <i className='bi bi-unlock-fill fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1 d-flex align-items-center gap-2'>
                            <span>ฝ่ายผลิตอนุมัติให้แก้ไขแล้ว</span>
                            <span className={`badge ${EDIT_REQUEST_STATUS_BADGE[approval.status]} fw-bold px-4 py-2`}>
                                {EDIT_REQUEST_STATUS_LABEL[approval.status] || approval.status}
                            </span>
                        </div>
                        <div className='fs-7'>
                            อนุมัติโดย {approval.reviewed_by || '-'}
                            {approval.reviewed_date ? ` เมื่อ ${formatDateTime(approval.reviewed_date)}` : ''}
                        </div>
                        {approval.review_remark && (
                            <div className='fs-7 mt-1'>หมายเหตุผู้อนุมัติ: {approval.review_remark}</div>
                        )}
                        <div className='fs-7 fw-bold text-danger mt-2'>
                            <i className='bi bi-exclamation-triangle-fill me-1'></i>
                            สิทธิ์นี้ใช้ได้ครั้งเดียว — <span className='text-decoration-underline'>บันทึกได้ 1 ครั้ง</span> เท่านั้น หลังจากบันทึกเอกสารจะถูกล็อกอีกครั้ง
                        </div>
                    </div>
                </div>
            )}

            {/* Test-section summary */}
            {component?.has_test_section && (
                <div className='alert alert-info d-flex align-items-start mb-8'>
                    <i className='bi bi-clipboard2-check fs-3 me-3 mt-1'></i>
                    <div className='flex-grow-1'>
                        <div className='fw-bold fs-6 mb-1'>เอกสารนี้มีส่วนของการทดสอบ</div>
                        <div className='fs-7'>
                            เอกสารชิ้นส่วนนี้ถือเป็นใบสั่งเทสของสินค้า (ใบสั่งเทส)
                            ระบบจะสร้างใบสั่งงาน QC (QC Work Order) จากเอกสารนี้โดยอัตโนมัติ
                        </div>
                    </div>
                </div>
            )}

            {/* Template Selection */}
            <div className='card shadow-sm mb-6'>
                <div className='card-header border-0 pt-5 pb-3'>
                    <h3 className='fw-bold text-gray-900 fs-5 mb-0'>
                        <i className='bi bi-file-earmark-text me-2 text-primary'></i>
                        เลือก Template
                    </h3>
                </div>
                <div className='card-body pt-0 pb-5'>
                    <select
                        className='form-select form-select-sm'
                        value={selectedTemplateId || ''}
                        disabled={!canEdit}
                        onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setSelectedTemplateId(val);
                            if (!val) setFormData({});
                        }}
                    >
                        <option value=''>-- กรุณาเลือก Template --</option>
                        {templates.map(t => (
                            <option key={t.component_template_id} value={t.component_template_id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Materials */}
            <div className='card shadow-sm mb-8'>
                <div className='card-header border-0 pt-5 pb-3'>
                    <h3 className='fw-bold text-gray-900 fs-5 mb-0'>
                        <i className='bi bi-box-seam me-2 text-primary'></i>
                        วัตถุดิบที่ใช้
                    </h3>
                </div>
                <div className='card-body pt-0 pb-6'>
                    <MaterialPicklist
                        materials={materialOptions}
                        value={materialSelections}
                        onChange={setMaterialSelections}
                        allocatedElsewhere={allocatedElsewhere}
                        readOnly={!canEdit}
                    />
                </div>
            </div>

            {/* Template Form */}
            {selectedTemplate && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-header border-0 pt-5 pb-3'>
                        <h3 className='fw-bold text-gray-900 fs-5 mb-0'>
                            <i className='bi bi-pencil-square me-2 text-primary'></i>
                            {selectedTemplate.name}
                        </h3>
                    </div>
                    <div className='card-body pt-0 pb-6'>
                        <div className='d-flex flex-column gap-6'>
                            {packIntoRows(selectedTemplate.sections).map((row, ri) => (
                                <div key={ri} className='row g-4'>
                                    {row.map((sec: TemplateSection) => {
                                        const w = (sec as any).width ?? 12;
                                        const isTestSection = resolveTestSection(sec.key, (sec as any).is_test_section);
                                        return (
                                            <div key={sec.key} className={`col-md-${w}`}>
                                                <div className='border rounded p-4 h-100'>
                                                    <div className='d-flex align-items-center justify-content-end gap-3 mb-3'>
                                                        {isTestSection && (
                                                            <span className='badge badge-light-info'>ส่วนของการทดสอบ</span>
                                                        )}
                                                        <div className='form-check form-check-custom form-check-solid form-switch'
                                                            title='ส่วนของการทดสอบ'>
                                                            <input
                                                                className='form-check-input'
                                                                type='checkbox'
                                                                id={`test-section-override-${sec.key}`}
                                                                checked={isTestSection}
                                                                disabled={!canEdit}
                                                                onChange={e => handleToggleTestSection(sec.key, e.target.checked)} />
                                                            <label className='form-check-label fs-8 text-nowrap'
                                                                htmlFor={`test-section-override-${sec.key}`}>
                                                                ส่วนของการทดสอบ
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <TemplateSectionForm
                                                        section={sec}
                                                        data={formData[sec.key] || {}}
                                                        onUpdate={data => updateSectionData(sec.key, data)}
                                                        workOrderDocNum={workOrder?.doc_num}
                                                        salesItemName={workOrder?.sales_item?.item_name}
                                                        salesItemCode={workOrder?.sales_item?.item_code}
                                                        salesItemNum={workOrder?.sales_item?.quantity}
                                                        componentName={component?.component_name}
                                                        materialUsages={component?.material_usages}
                                                        decodeMap={decodeMap}
                                                        readOnly={!canEdit}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* No template selected */}
            {!selectedTemplateId && (
                <div className='card shadow-sm'>
                    <div className='card-body py-12 text-center'>
                        <i className='bi bi-file-earmark-text fs-3x text-gray-300 d-block mb-4'></i>
                        <span className='text-gray-500 fw-semibold fs-5'>กรุณาเลือก Template เพื่อเริ่มกรอกข้อมูล</span>
                    </div>
                </div>
            )}

            {/* Ask production to unlock this component */}
            <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold fs-4'>
                        <i className='bi bi-pencil-square me-2 text-primary'></i>
                        ขออนุมัติแก้ไขเอกสาร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='text-muted fs-7 mb-4'>
                        ชิ้นส่วน: {component?.component_name || '-'} (เวอร์ชัน {component?.doc_version ?? 0})
                    </div>
                    <label className='form-label fw-semibold required'>เหตุผลในการขอแก้ไข</label>
                    <textarea
                        className={`form-control ${requestError ? 'is-invalid' : ''}`}
                        rows={4}
                        placeholder='ระบุเหตุผลที่ต้องแก้ไขเอกสารชิ้นส่วนนี้...'
                        value={requestReason}
                        onChange={e => {
                            setRequestReason(e.target.value);
                            if (requestError) setRequestError(null);
                        }}
                    />
                    {requestError && <div className='invalid-feedback d-block'>{requestError}</div>}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type='button'
                        className='btn btn-light fw-bold'
                        onClick={() => setShowRequestModal(false)}
                        disabled={submittingRequest}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type='button'
                        className='btn btn-primary fw-bold'
                        onClick={handleSubmitRequest}
                        disabled={submittingRequest || !requestReason.trim()}
                    >
                        {submittingRequest
                            ? <span className='spinner-border spinner-border-sm me-2'></span>
                            : <i className='bi bi-send me-1'></i>}
                        ส่งคำขอ
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Version history */}
            <ComponentVersionHistoryModal
                show={showVersionModal}
                onHide={() => setShowVersionModal(false)}
                itemComponentId={Number(componentId)}
                currentVersionNo={component?.doc_version}
                componentName={component?.component_name}
            />
        </Content>
    );
};

export default ComponentDetailEditor;
