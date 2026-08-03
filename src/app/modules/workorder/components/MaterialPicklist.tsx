import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './MaterialPicklist.css';

// Field names mirror app/type_interface/MaterialType.ts (Material) — kept as
// their own type here (rather than importing Material directly) so this
// component only depends on the fields it actually renders.
export type MaterialOption = {
    material_list_id: number;
    item_code: string;
    item_name: string;
    item_group?: string;
    unit_name?: string;
    remaining_num?: number;
    quantity?: number;
};

export type MaterialSelection = {
    material_list_id: number;
    quantity_used: number;
};

export interface MaterialPicklistProps {
    materials: MaterialOption[];
    value: MaterialSelection[];
    onChange: (next: MaterialSelection[]) => void;
    /** qty this material already consumes in OTHER components, for the "ใช้แล้วที่อื่น" column */
    allocatedElsewhere?: Record<number, { qty: number; label: string }[]>;
    readOnly?: boolean;
}

/**
 * How much of a material a single row may still take: stock remaining minus
 * whatever other components already claimed. Exported so callers (e.g.
 * WorkorderCreate's submit guard) can run the exact same check without
 * re-deriving it.
 */
export const getAvailableForMaterial = (
    material: MaterialOption,
    allocatedElsewhereForMaterial?: { qty: number; label: string }[]
): number => {
    if (material.remaining_num === undefined) return Infinity;
    const usedElsewhere = (allocatedElsewhereForMaterial || []).reduce((sum, u) => sum + u.qty, 0);
    return material.remaining_num - usedElsewhere;
};

const MaterialPicklist: React.FC<MaterialPicklistProps> = ({
    materials,
    value,
    onChange,
    allocatedElsewhere = {},
    readOnly = false,
}) => {
    const selectedOnlyId = useId();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    // Raw text mirror of the qty inputs — kept separate from the numeric
    // `value` prop so the user can freely clear/retype without the box
    // fighting them (e.g. "" briefly rendering back as "0").
    const [qtyText, setQtyText] = useState<Record<number, string>>({});
    // Row that was just ticked — focus is moved into its qty input once the
    // (now-enabled) input exists in the DOM.
    const [justCheckedId, setJustCheckedId] = useState<number | null>(null);

    const checkboxRefs = useRef<Map<number, HTMLInputElement>>(new Map());
    const qtyRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    // Reset transient typing state whenever the candidate material list itself
    // changes (e.g. sales item switched) — old ids are meaningless here.
    useEffect(() => {
        setQtyText({});
    }, [materials]);

    useEffect(() => {
        if (justCheckedId === null) return;
        const el = qtyRefs.current.get(justCheckedId);
        if (el) {
            el.focus();
            el.select();
        }
        setJustCheckedId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const selectionMap = useMemo(() => {
        const map = new Map<number, number>();
        value.forEach(v => map.set(v.material_list_id, v.quantity_used));
        return map;
    }, [value]);

    const getOtherUsage = (materialListId: number) => allocatedElsewhere[materialListId] || [];

    const filteredMaterials = useMemo(() => {
        let list = materials;
        if (showSelectedOnly) {
            list = list.filter(m => selectionMap.has(m.material_list_id));
        }
        const kw = searchKeyword.trim().toLowerCase();
        if (kw) {
            list = list.filter(m =>
                m.item_code.toLowerCase().includes(kw) ||
                m.item_name.toLowerCase().includes(kw) ||
                (m.item_group || '').toLowerCase().includes(kw)
            );
        }
        return list;
    }, [materials, showSelectedOnly, searchKeyword, selectionMap]);

    const handleToggle = (mat: MaterialOption, checked: boolean) => {
        if (readOnly) return;
        if (checked) {
            const available = getAvailableForMaterial(mat, getOtherUsage(mat.material_list_id));
            const prefillQty = Number.isFinite(available) ? Math.max(available, 0) : (mat.quantity ?? 0);
            setQtyText(prev => ({ ...prev, [mat.material_list_id]: String(prefillQty) }));
            onChange([
                ...value.filter(v => v.material_list_id !== mat.material_list_id),
                { material_list_id: mat.material_list_id, quantity_used: prefillQty },
            ]);
            setJustCheckedId(mat.material_list_id);
        } else {
            setQtyText(prev => {
                const next = { ...prev };
                delete next[mat.material_list_id];
                return next;
            });
            onChange(value.filter(v => v.material_list_id !== mat.material_list_id));
        }
    };

    const handleQtyChange = (materialListId: number, raw: string) => {
        if (raw !== '' && !/^\d+$/.test(raw)) return;
        setQtyText(prev => ({ ...prev, [materialListId]: raw }));
        const num = raw === '' ? 0 : Number(raw);
        onChange(value.map(v => v.material_list_id === materialListId ? { ...v, quantity_used: num } : v));
    };

    const focusNextUnselectedCheckbox = (fromMaterialListId: number) => {
        const idx = filteredMaterials.findIndex(m => m.material_list_id === fromMaterialListId);
        for (let i = idx + 1; i < filteredMaterials.length; i++) {
            const candidate = filteredMaterials[i];
            if (!selectionMap.has(candidate.material_list_id)) {
                const el = checkboxRefs.current.get(candidate.material_list_id);
                if (el) {
                    el.focus();
                    return;
                }
            }
        }
    };

    const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, materialListId: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            focusNextUnselectedCheckbox(materialListId);
        }
    };

    const handleSelectAllRemaining = () => {
        if (readOnly) return;
        const additions: MaterialSelection[] = [];
        const textUpdates: Record<number, string> = {};
        filteredMaterials.forEach(mat => {
            if (selectionMap.has(mat.material_list_id)) return;
            const available = getAvailableForMaterial(mat, getOtherUsage(mat.material_list_id));
            const qty = Number.isFinite(available) ? (available as number) : (mat.quantity ?? 0);
            if (qty > 0) {
                additions.push({ material_list_id: mat.material_list_id, quantity_used: qty });
                textUpdates[mat.material_list_id] = String(qty);
            }
        });
        if (additions.length > 0) {
            setQtyText(prev => ({ ...prev, ...textUpdates }));
            onChange([...value, ...additions]);
        }
    };

    const selectedCount = value.length;
    const totalQty = value.reduce((sum, v) => sum + (Number(v.quantity_used) || 0), 0);
    const hasSelectableRemaining = filteredMaterials.some(m =>
        !selectionMap.has(m.material_list_id) &&
        getAvailableForMaterial(m, getOtherUsage(m.material_list_id)) > 0
    );

    if (materials.length === 0) {
        return (
            <div className="alert alert-warning d-flex align-items-center py-3 mb-0">
                <i className="bi bi-exclamation-triangle text-warning me-3 fs-4"></i>
                <span>ไม่พบวัตถุดิบสำหรับรายการสินค้าที่เลือก</span>
            </div>
        );
    }

    return (
        <div className="mp-picklist">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <div className="d-flex align-items-center position-relative" style={{ minWidth: 220, maxWidth: 320 }}>
                    <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4">
                        <span className="path1"></span><span className="path2"></span>
                    </i>
                    <input
                        type="text"
                        className="form-control form-control-sm ps-12"
                        placeholder="ค้นหาวัตถุดิบ (รหัส / ชื่อ / กลุ่ม)"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                </div>

                <div className="form-check form-switch form-check-sm mb-0">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id={selectedOnlyId}
                        checked={showSelectedOnly}
                        onChange={(e) => setShowSelectedOnly(e.target.checked)}
                    />
                    <label className="form-check-label fs-7 fw-semibold text-gray-700" htmlFor={selectedOnlyId}>
                        แสดงเฉพาะที่เลือก
                    </label>
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        className="btn btn-sm btn-light-primary fw-bold ms-auto"
                        onClick={handleSelectAllRemaining}
                        disabled={!hasSelectableRemaining}
                    >
                        <i className="bi bi-check2-all me-1"></i>เลือกทั้งหมดที่เหลือ
                    </button>
                )}
            </div>

            <div className="table-responsive mp-table-wrap border rounded">
                <table className="table align-middle table-row-dashed fs-7 gy-2 mb-0 mp-table">
                    <thead>
                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 bg-light border-bottom border-gray-200">
                            <th className="w-40px text-center">✓</th>
                            <th className="min-w-200px">วัตถุดิบ</th>
                            <th className="min-w-100px d-none d-md-table-cell">กลุ่ม</th>
                            <th className="min-w-80px text-end">คงเหลือ</th>
                            <th className="min-w-140px">จำนวนที่ใช้</th>
                            <th className="min-w-150px d-none d-md-table-cell">ใช้แล้วที่อื่น</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {filteredMaterials.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-muted">
                                    ไม่พบวัตถุดิบที่ตรงกับคำค้นหา
                                </td>
                            </tr>
                        ) : filteredMaterials.map((mat) => {
                            const isSelected = selectionMap.has(mat.material_list_id);
                            const qtyUsed = selectionMap.get(mat.material_list_id) ?? 0;
                            const others = getOtherUsage(mat.material_list_id);
                            const otherQty = others.reduce((sum, u) => sum + u.qty, 0);
                            const available = getAvailableForMaterial(mat, others);
                            const isOverAllocated = isSelected && Number.isFinite(available) && qtyUsed > (available as number);
                            const displayQty = isSelected ? (qtyText[mat.material_list_id] ?? String(qtyUsed)) : '';

                            return (
                                <tr key={mat.material_list_id} className={isSelected ? 'bg-light-primary' : undefined}>
                                    <td className="text-center">
                                        <div className="form-check form-check-sm justify-content-center d-flex">
                                            <input
                                                ref={(el) => {
                                                    if (el) checkboxRefs.current.set(mat.material_list_id, el);
                                                    else checkboxRefs.current.delete(mat.material_list_id);
                                                }}
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={readOnly}
                                                onChange={(e) => handleToggle(mat, e.target.checked)}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="fw-bold text-gray-800">{mat.item_name}</span>
                                            <span className="text-muted fs-8">{mat.item_code}</span>
                                            <div className="d-md-none mt-1 d-flex flex-column gap-1">
                                                {mat.item_group && (
                                                    <span className="badge badge-light-info fs-9 align-self-start">{mat.item_group}</span>
                                                )}
                                                {others.length > 0 && (
                                                    <span className="text-warning fs-9">
                                                        ใช้แล้วที่อื่น: {otherQty} ({others.map(o => o.label).join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="d-none d-md-table-cell">
                                        {mat.item_group ? <span className="badge badge-light-info">{mat.item_group}</span> : '-'}
                                    </td>
                                    <td className="text-end">
                                        <span className="fw-semibold">{mat.remaining_num ?? '-'}</span>
                                        {mat.unit_name && <span className="text-muted fs-8 ms-1">{mat.unit_name}</span>}
                                    </td>
                                    <td>
                                        <input
                                            ref={(el) => {
                                                if (el) qtyRefs.current.set(mat.material_list_id, el);
                                                else qtyRefs.current.delete(mat.material_list_id);
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            className={`form-control form-control-sm mp-qty-input ${isOverAllocated ? 'is-invalid border-danger' : ''}`}
                                            placeholder="จำนวน"
                                            value={displayQty}
                                            disabled={!isSelected || readOnly}
                                            onChange={(e) => handleQtyChange(mat.material_list_id, e.target.value)}
                                            onKeyDown={(e) => handleQtyKeyDown(e, mat.material_list_id)}
                                        />
                                        {isOverAllocated && (
                                            <div className="text-danger fs-9 mt-1">
                                                เกินจำนวนคงเหลือ (คงเหลือ {available})
                                            </div>
                                        )}
                                    </td>
                                    <td className="d-none d-md-table-cell">
                                        {others.length > 0 ? (
                                            <span className="text-muted fs-8">
                                                {otherQty} ({others.map(o => o.label).join(', ')})
                                            </span>
                                        ) : (
                                            <span className="text-muted fs-8">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="d-flex justify-content-end mt-3">
                <span className="text-muted fw-semibold fs-7">
                    เลือกแล้ว {selectedCount} รายการ · จำนวนรวม {totalQty}
                </span>
            </div>
        </div>
    );
};

export default MaterialPicklist;
