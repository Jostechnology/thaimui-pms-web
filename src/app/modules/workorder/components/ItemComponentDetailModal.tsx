import React, { useState, useEffect, useCallback } from 'react';
import {
    getItemComponentDetail,
    getComponentSpecTypes,
    getComponentOptionTypes,
    updateItemComponentDetail,
} from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import type {
    ItemComponent,
    ComponentSpecType,
    ComponentOptionType,
    WorkOrder,
} from '../../../type_interface/WorkOrderType';

interface Props {
    show: boolean;
    onClose: () => void;
    itemComponentId: number | null;
    workOrder: WorkOrder;
    onSaved?: () => void;
}

// ---- Spec row local state ----
interface SpecRowState {
    component_spec_type_id: number;
    end_side: 'top' | 'bottom' | null;
    bool_value: boolean | null;
    decimal_value: number | null;
    text_value: string | null;
}

const ItemComponentDetailModal: React.FC<Props> = ({
    show,
    onClose,
    itemComponentId,
    workOrder,
    onSaved,
}) => {
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [component, setComponent] = useState<ItemComponent | null>(null);
    const [specTypes, setSpecTypes] = useState<ComponentSpecType[]>([]);
    const [optionTypes, setOptionTypes] = useState<ComponentOptionType[]>([]);
    const [remark, setRemark] = useState('');
    const [specRows, setSpecRows] = useState<SpecRowState[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
    const [saving, setSaving] = useState(false);

    // --- Fetch data ---
    const fetchData = useCallback(async () => {
        if (!itemComponentId) return;
        setLoading();
        try {
            const [detailRes, specTypesRes, optionTypesRes] = await Promise.all([
                getItemComponentDetail(itemComponentId),
                getComponentSpecTypes(),
                getComponentOptionTypes(),
            ]);

            if (detailRes?.success && detailRes.data) {
                const comp: ItemComponent = detailRes.data;
                setComponent(comp);
                setRemark(comp.remark || '');

                // Init selected options from existing data
                const opts = new Set<number>();
                comp.component_options?.forEach((o) => opts.add(o.component_option_type_id));
                setSelectedOptions(opts);
            }

            if (specTypesRes?.success && specTypesRes.data) {
                setSpecTypes(specTypesRes.data);
            }

            if (optionTypesRes?.success && optionTypesRes.data) {
                setOptionTypes(optionTypesRes.data);
            }
        } catch (e) {
            console.error(e);
            alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setUnLoading();
        }
    }, [itemComponentId]);

    // Init spec rows once we have both specTypes and component
    useEffect(() => {
        if (specTypes.length === 0 || !component) return;
        const rows: SpecRowState[] = [];
        for (const st of specTypes) {
            // Find existing spec for this type with top side
            const existingTop = component.component_specs?.find(
                (s) => s.component_spec_type_id === st.component_spec_type_id && s.end_side === 'top'
            );
            rows.push({
                component_spec_type_id: st.component_spec_type_id,
                end_side: 'top',
                bool_value: existingTop?.bool_value ?? null,
                decimal_value: existingTop?.decimal_value ?? null,
                text_value: existingTop?.text_value ?? null,
            });

            const existingBottom = component.component_specs?.find(
                (s) => s.component_spec_type_id === st.component_spec_type_id && s.end_side === 'bottom'
            );
            rows.push({
                component_spec_type_id: st.component_spec_type_id,
                end_side: 'bottom',
                bool_value: existingBottom?.bool_value ?? null,
                decimal_value: existingBottom?.decimal_value ?? null,
                text_value: existingBottom?.text_value ?? null,
            });
        }
        setSpecRows(rows);
    }, [specTypes, component]);

    useEffect(() => {
        if (show && itemComponentId) {
            fetchData();
        }
        // Lock background scroll
        if (show) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [show, itemComponentId]);

    // --- Handlers ---
    const updateSpecRow = (specTypeId: number, endSide: string | null, field: string, value: any) => {
        setSpecRows((prev) =>
            prev.map((r) => {
                if (r.component_spec_type_id === specTypeId && r.end_side === endSide) {
                    return { ...r, [field]: value };
                }
                return r;
            })
        );
    };

    const toggleOption = (optTypeId: number) => {
        setSelectedOptions((prev) => {
            const next = new Set(prev);
            if (next.has(optTypeId)) next.delete(optTypeId);
            else next.add(optTypeId);
            return next;
        });
    };

    const handleSave = async () => {
        if (!itemComponentId) return;
        setSaving(true);
        setLoading();
        try {
            // Build specs payload — only send rows that actually have data
            const specs = specRows
                .filter((r) => {
                    if (r.bool_value === true) return true;
                    if (r.decimal_value !== null && r.decimal_value !== undefined) return true;
                    if (r.text_value !== null && r.text_value !== undefined && r.text_value !== '') return true;
                    return false;
                })
                .map((r) => ({
                    component_spec_type_id: r.component_spec_type_id,
                    end_side: r.end_side,
                    bool_value: r.bool_value,
                    decimal_value: r.decimal_value,
                    text_value: r.text_value,
                }));

            const payload = {
                remark,
                specs,
                options: Array.from(selectedOptions),
            };

            const res = await updateItemComponentDetail(itemComponentId, payload);
            if (res?.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    text: 'อัปเดตรายละเอียด Component เรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false,
                });
                onSaved?.();
                onClose();
            } else {
                alertMessage(res?.message || 'เกิดข้อผิดพลาดในการบันทึก');
            }
        } catch (e) {
            console.error(e);
            alertMessage('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
            setUnLoading();
        }
    };

    if (!show) return null;

    const getSpecType = (specTypeId: number): ComponentSpecType | undefined =>
        specTypes.find((st) => st.component_spec_type_id === specTypeId);

    // --- Render ---
    return (
        <div
            className="modal d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="modal-dialog modal-fullscreen" style={{ margin: 0 }}>
                <div className="modal-content" style={{ borderRadius: 0 }}>
                    {/* Header */}
                    <div
                        className="modal-header py-3 px-5"
                        style={{
                            background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
                            color: '#fff',
                        }}
                    >
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className="d-flex align-items-center justify-content-center rounded"
                                style={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                }}
                            >
                                <i className="bi bi-file-earmark-text fs-3 text-white" />
                            </div>
                            <div>
                                <h5 className="modal-title fw-bolder mb-0 fs-4">
                                    ใบสั่งผลิต ชุดประกอบ (Z-BOM)
                                </h5>
                                <div className="fs-8 opacity-75">
                                    {component?.component_name || ''}
                                    {workOrder?.doc_num ? ` • ORDR-${workOrder.doc_num}` : ''}
                                </div>
                            </div>
                        </div>
                        <button
                            className="btn btn-sm btn-icon"
                            onClick={onClose}
                            style={{ color: '#fff', opacity: 0.8 }}
                        >
                            <i className="bi bi-x-lg fs-3" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-5" style={{ overflowY: 'auto', backgroundColor: '#f8f9fb' }}>
                        {/* Work Order Info Header */}
                        <div className="card border-0 shadow-sm mb-5">
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-3">
                                        <div className="fs-8 text-muted fw-semibold mb-1">เลขที่ใบสั่งผลิต</div>
                                        <div className="fw-bold text-dark">ORDR-{workOrder?.doc_num || '-'}</div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fs-8 text-muted fw-semibold mb-1">สินค้า</div>
                                        <div className="fw-bold text-dark">
                                            {workOrder?.sales_item?.item_name || '-'}
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fs-8 text-muted fw-semibold mb-1">รหัสสินค้า</div>
                                        <div className="fw-bold text-dark">
                                            {workOrder?.sales_item?.item_code || '-'}
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="fs-8 text-muted fw-semibold mb-1">ชื่อ Component</div>
                                        <div className="fw-bold text-primary">
                                            {component?.component_name || '-'}
                                        </div>
                                    </div>
                                </div>
                                {workOrder?.sales_item?.item_description && (
                                    <div className="mt-3 pt-3 border-top">
                                        <div className="fs-8 text-muted fw-semibold mb-1">รายละเอียดสินค้า</div>
                                        <div className="text-gray-700 fs-7">
                                            {workOrder.sales_item.item_description}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Material Table */}
                        <div className="card border-0 shadow-sm mb-5">
                            <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                                <i className="bi bi-box-seam text-primary fs-5" />
                                <span className="fw-bold text-dark fs-6">วัสดุที่ใช้ (Materials)</span>
                                <span className="badge bg-light-primary text-primary ms-auto">
                                    {component?.material_usages?.length || 0} รายการ
                                </span>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead>
                                            <tr className="bg-light text-muted fw-bold fs-8 text-uppercase">
                                                <th className="ps-4 py-3" style={{ width: 50 }}>
                                                    #
                                                </th>
                                                <th className="py-3">ชื่อวัสดุ</th>
                                                <th className="py-3">รหัสวัสดุ</th>
                                                <th className="py-3">รายละเอียด</th>
                                                <th className="py-3 text-center">จำนวน</th>
                                                <th className="py-3 text-end">หน่วย</th>
                                                <th className="py-3 text-end pe-4">ราคา/หน่วย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(component?.material_usages || []).map((usage, idx) => (
                                                <tr key={usage.usage_id}>
                                                    <td className="ps-4 fw-semibold text-gray-500">{idx + 1}</td>
                                                    <td className="fw-semibold text-dark">
                                                        {usage.material_list?.item_name || '-'}
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-light text-gray-700 fs-8">
                                                            {usage.material_list?.item_code || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted fs-8">
                                                        {usage.material_list?.item_description || '-'}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-primary fs-8 px-3">
                                                            x{usage.quantity_used}
                                                        </span>
                                                    </td>
                                                    <td className="text-end text-muted fs-8">ตัว/ชุด</td>
                                                    <td className="text-end pe-4 fw-semibold">
                                                        ฿{usage.material_list?.unit_price?.toLocaleString() || '0'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!component?.material_usages || component.material_usages.length === 0) && (
                                                <tr>
                                                    <td colSpan={7} className="text-center text-muted py-6">
                                                        <i className="bi bi-inbox fs-1 d-block mb-2 text-gray-300" />
                                                        ไม่มีข้อมูลวัสดุ
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Remark */}
                        <div className="card border-0 shadow-sm mb-5">
                            <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                                <i className="bi bi-chat-left-text text-warning fs-5" />
                                <span className="fw-bold text-dark fs-6">หมายเหตุ</span>
                            </div>
                            <div className="card-body p-4">
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="ใส่หมายเหตุ..."
                                    style={{
                                        resize: 'vertical',
                                        border: '1px solid #dee2e6',
                                        borderRadius: 8,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Bottom Section: Specs + Options + Image */}
                        <div className="row g-4">
                            {/* Spec Table (Left) */}
                            <div className="col-lg-5">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-list-check text-success fs-5" />
                                        <span className="fw-bold text-dark fs-6">สเปคของสินค้า</span>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle mb-0">
                                                <thead>
                                                    <tr className="bg-light text-muted fw-bold fs-9 text-uppercase">
                                                        <th className="ps-3 py-2">รายการ</th>
                                                        <th className="py-2 text-center">ปลายด้านบน</th>
                                                        <th className="py-2 text-center">ปลายด้านล่าง</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {specTypes.map((st) => {
                                                        const topRow = specRows.find(
                                                            (r) =>
                                                                r.component_spec_type_id ===
                                                                st.component_spec_type_id && r.end_side === 'top'
                                                        );
                                                        const bottomRow = specRows.find(
                                                            (r) =>
                                                                r.component_spec_type_id ===
                                                                st.component_spec_type_id &&
                                                                r.end_side === 'bottom'
                                                        );

                                                        const renderInput = (
                                                            row: SpecRowState | undefined,
                                                            endSide: 'top' | 'bottom'
                                                        ) => {
                                                            if (!row) return null;
                                                            if (st.spec_type === 'boolean') {
                                                                return (
                                                                    <div className="form-check d-flex justify-content-center">
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            checked={row.bool_value === true}
                                                                            onChange={(e) =>
                                                                                updateSpecRow(
                                                                                    st.component_spec_type_id,
                                                                                    endSide,
                                                                                    'bool_value',
                                                                                    e.target.checked
                                                                                )
                                                                            }
                                                                            style={{ width: 18, height: 18 }}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            if (st.spec_type === 'decimal') {
                                                                return (
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-center"
                                                                        style={{ maxWidth: 100, margin: '0 auto' }}
                                                                        value={
                                                                            row.decimal_value !== null &&
                                                                                row.decimal_value !== undefined
                                                                                ? row.decimal_value
                                                                                : ''
                                                                        }
                                                                        onChange={(e) =>
                                                                            updateSpecRow(
                                                                                st.component_spec_type_id,
                                                                                endSide,
                                                                                'decimal_value',
                                                                                e.target.value === ''
                                                                                    ? null
                                                                                    : parseFloat(e.target.value)
                                                                            )
                                                                        }
                                                                        placeholder="0"
                                                                    />
                                                                );
                                                            }
                                                            // text
                                                            return (
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm text-center"
                                                                    style={{ maxWidth: 120, margin: '0 auto' }}
                                                                    value={row.text_value || ''}
                                                                    onChange={(e) =>
                                                                        updateSpecRow(
                                                                            st.component_spec_type_id,
                                                                            endSide,
                                                                            'text_value',
                                                                            e.target.value || null
                                                                        )
                                                                    }
                                                                    placeholder="..."
                                                                />
                                                            );
                                                        };

                                                        return (
                                                            <tr key={st.component_spec_type_id}>
                                                                <td className="ps-3 fw-semibold text-gray-700 fs-8">
                                                                    {st.component_spec_type_id}. {st.component_spec_type_name}
                                                                </td>
                                                                <td className="text-center py-2">
                                                                    {renderInput(topRow, 'top')}
                                                                </td>
                                                                <td className="text-center py-2">
                                                                    {renderInput(bottomRow, 'bottom')}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Option Table (Middle) */}
                            <div className="col-lg-3">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-toggles text-info fs-5" />
                                        <span className="fw-bold text-dark fs-6">ตัวเลือก</span>
                                    </div>
                                    <div className="card-body p-3">
                                        <div className="d-flex flex-column gap-2">
                                            {optionTypes.map((ot) => (
                                                <label
                                                    key={ot.component_option_type_id}
                                                    className="d-flex align-items-center gap-2 px-3 py-2 rounded cursor-pointer"
                                                    style={{
                                                        backgroundColor: selectedOptions.has(
                                                            ot.component_option_type_id
                                                        )
                                                            ? '#e8f0fe'
                                                            : '#f8f9fa',
                                                        border: `1px solid ${selectedOptions.has(ot.component_option_type_id)
                                                            ? '#4285f4'
                                                            : '#e5e7eb'
                                                            }`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedOptions.has(ot.component_option_type_id)}
                                                        onChange={() => toggleOption(ot.component_option_type_id)}
                                                        style={{ width: 16, height: 16 }}
                                                    />
                                                    <span
                                                        className="fs-8 fw-semibold"
                                                        style={{
                                                            color: selectedOptions.has(
                                                                ot.component_option_type_id
                                                            )
                                                                ? '#1a73e8'
                                                                : '#374151',
                                                        }}
                                                    >
                                                        {ot.component_option_type_name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Image (Right) */}
                            <div className="col-lg-4">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                                        <i className="bi bi-image text-danger fs-5" />
                                        <span className="fw-bold text-dark fs-6">แบบแปลนชุดประกอบ</span>
                                    </div>
                                    <div className="card-body d-flex align-items-center justify-content-center p-4">
                                        {component?.img_url ? (
                                            <img
                                                src={component.img_url}
                                                alt={component.component_name}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: 400,
                                                    objectFit: 'contain',
                                                    borderRadius: 8,
                                                    border: '1px solid #e5e7eb',
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center text-muted py-10">
                                                <i className="bi bi-image fs-1 d-block mb-3 text-gray-300" />
                                                <span className="fs-7">ไม่มีรูปภาพ</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="modal-footer py-3 px-5"
                        style={{
                            borderTop: '1px solid #e5e7eb',
                            backgroundColor: '#fff',
                        }}
                    >
                        <button className="btn btn-light px-5" onClick={onClose} disabled={saving}>
                            <i className="bi bi-x-circle me-2" />
                            ยกเลิก
                        </button>
                        <button
                            className="btn btn-primary px-5 d-flex align-items-center gap-2"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2-circle" />
                                    บันทึก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemComponentDetailModal;
