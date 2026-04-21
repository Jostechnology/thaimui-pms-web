import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import {
    createPickingItemAdjustment,
    createPickingItemReallocate,
    getPickingItemReallocateOptions,
} from '../../services/pickingRequestService';
import type {
    AdjustmentActionType,
    PickingItemAdjustmentReason,
    PickingRequestItemDetail,
    ReallocateOptionsData,
    ReallocateTargetKind,
} from '../../type_interface/PickingRequestType';
import {
    validateRequired,
    validateIntegerNonZero,
    validatePositiveInteger,
    validateMaxValue,
} from '../../utils/validate_utils';

const REASON_LABEL: Record<AdjustmentActionType, string> = {
    MISCOUNT: 'นับผิด',
    SPILLAGE: 'สูญหาย/เสียหาย',
    CORRECTION: 'แก้ไขรายการ',
    OTHER: 'อื่นๆ',
    REALLOCATE: 'โอนไปรายการอื่น (Reallocate)',
};

interface Props {
    show: boolean;
    onHide: () => void;
    item: PickingRequestItemDetail | null;
    onSuccess: () => void;
}

const AdjustItemModal: React.FC<Props> = ({ show, onHide, item, onSuccess }) => {
    const [action, setAction] = useState<AdjustmentActionType | ''>('');
    const [deltaQty, setDeltaQty] = useState('');
    const [qty, setQty] = useState('');
    const [remark, setRemark] = useState('');
    const [targetKind, setTargetKind] = useState<ReallocateTargetKind>('picking_request_item');
    const [targetId, setTargetId] = useState<string>('');
    const [options, setOptions] = useState<ReallocateOptionsData | null>(null);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setAction('');
            setDeltaQty('');
            setQty('');
            setRemark('');
            setTargetKind('picking_request_item');
            setTargetId('');
            setOptions(null);
            setErrors({});
        }
    }, [show, item]);

    useEffect(() => {
        const load = async () => {
            if (!item || action !== 'REALLOCATE') return;
            if (options) return;
            setOptionsLoading(true);
            try {
                const res = await getPickingItemReallocateOptions(item.picking_request_item_id);
                if (res.success && res.data) {
                    setOptions(res.data);
                    const d = res.data as ReallocateOptionsData;
                    if (d.picking_request_items.length > 0) setTargetKind('picking_request_item');
                    else if (d.sales_items.length > 0) setTargetKind('sales_item');
                    else if (d.material_lists.length > 0) setTargetKind('material_list');
                } else {
                    Swal.fire('ผิดพลาด', res.message || 'โหลดตัวเลือกไม่สำเร็จ', 'error');
                }
            } finally {
                setOptionsLoading(false);
            }
        };
        load();
    }, [action, item]);

    const clearErr = (k: string) => setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });

    const validateAdjust = (): boolean => {
        const e: Record<string, string> = {};
        const actionErr = validateRequired(action, 'ประเภทการปรับปรุง');
        if (actionErr) e.action = actionErr;
        const deltaErr = validateIntegerNonZero(deltaQty, 'จำนวนที่ปรับ');
        if (deltaErr) e.delta_qty = deltaErr;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateReallocate = (): boolean => {
        const e: Record<string, string> = {};
        const qtyErr = validatePositiveInteger(qty, 'จำนวนที่โอน')
            ?? (item ? validateMaxValue(qty, item.qty_available, 'จำนวนที่โอน') : null);
        if (qtyErr) e.qty = qtyErr;
        const targetErr = validateRequired(targetId, 'ปลายทาง');
        if (targetErr) e.target = targetErr;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submitAdjust = async () => {
        if (!item || !action || action === 'REALLOCATE') return;
        if (!validateAdjust()) return;
        setSaving(true);
        try {
            const res = await createPickingItemAdjustment(item.picking_request_item_id, {
                delta_qty: Number(deltaQty),
                reason: action as PickingItemAdjustmentReason,
                remark: remark.trim() || undefined,
            });
            if (res.success) {
                Swal.fire({ title: 'บันทึกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
                onHide();
                onSuccess();
            } else {
                Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถบันทึกได้', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const submitReallocate = async () => {
        if (!item) return;
        if (!validateReallocate()) return;
        const id = Number(targetId);
        const payload: any = { qty: Number(qty), remark: remark.trim() || undefined };
        if (targetKind === 'picking_request_item') payload.to_picking_request_item_id = id;
        else if (targetKind === 'sales_item') payload.to_sales_item_id = id;
        else payload.to_material_list_id = id;

        setSaving(true);
        try {
            const res = await createPickingItemReallocate(item.picking_request_item_id, payload);
            if (res.success) {
                const created = res.data?.created_reallocation_pr;
                const msg = created
                    ? `สร้าง PR ใหม่: ${created.picking_request_code}`
                    : 'โอนรายการสำเร็จ';
                Swal.fire({ title: 'สำเร็จ', text: msg, icon: 'success', timer: 1800, showConfirmButton: false });
                onHide();
                onSuccess();
            } else {
                Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถโอนได้', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = () => {
        if (action === 'REALLOCATE') submitReallocate();
        else submitAdjust();
    };

    const renderTargetList = () => {
        if (!options) return null;
        const opts = targetKind === 'picking_request_item' ? options.picking_request_items
            : targetKind === 'sales_item' ? options.sales_items
            : options.material_lists;
        if (opts.length === 0) {
            return <div className='text-muted fs-7 p-3 bg-light rounded'>ไม่มีตัวเลือกสำหรับประเภทนี้</div>;
        }
        return (
            <div className='table-responsive border rounded' style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table className='table table-hover align-middle fs-7 mb-0'>
                    <thead className='table-light sticky-top'>
                        <tr className='fw-bold text-gray-700 fs-8'>
                            <th className='w-40px'></th>
                            {targetKind === 'picking_request_item' && <><th>PR Code</th><th>สินค้า</th><th className='text-center w-70px'>จำนวน</th></>}
                            {targetKind === 'sales_item' && <><th>SO Doc</th><th>สินค้า</th><th className='text-center w-70px'>จำนวน</th></>}
                            {targetKind === 'material_list' && <><th>Line</th><th>สินค้า</th><th className='text-center w-70px'>จำนวน</th></>}
                        </tr>
                    </thead>
                    <tbody>
                        {targetKind === 'picking_request_item' && options.picking_request_items.map(o => (
                            <tr key={o.picking_request_item_id}
                                className={targetId === String(o.picking_request_item_id) ? 'table-active' : ''}
                                onClick={() => { setTargetId(String(o.picking_request_item_id)); clearErr('target'); }}
                                style={{ cursor: 'pointer' }}>
                                <td className='text-center'>
                                    <input type='radio' className='form-check-input'
                                        checked={targetId === String(o.picking_request_item_id)}readOnly />
                                </td>
                                <td className='fw-bold text-gray-800'>{o.picking_request_code ?? `#${o.picking_request_id}`} (SO-Line : {o.order_line_num})</td>
                                <td>
                                    <div className='fw-semibold text-gray-800'>{o.item_name}</div>
                                    <div className='text-muted fs-8'>{o.item_code}</div>
                                </td>
                                <td className='text-center text-gray-700'>{o.quantity} {o.unit}</td>
                            </tr>
                        ))}
                        {targetKind === 'sales_item' && options.sales_items.map(o => (
                            <tr key={o.sales_item_id}
                                className={targetId === String(o.sales_item_id) ? 'table-active' : ''}
                                onClick={() => { setTargetId(String(o.sales_item_id)); clearErr('target'); }}
                                style={{ cursor: 'pointer' }}>
                                <td className='text-center'>
                                    <input type='radio' className='form-check-input'
                                        checked={targetId === String(o.sales_item_id)} readOnly />
                                </td>
                                <td className='fw-bold text-gray-800'>{o.doc_num}</td>
                                <td>
                                    <div className='fw-semibold text-gray-800'>{o.item_name}</div>
                                    <div className='text-muted fs-8'>{o.item_code}</div>
                                </td>
                                <td className='text-center text-gray-700'>{o.quantity} {o.unit_name}</td>
                            </tr>
                        ))}
                        {targetKind === 'material_list' && options.material_lists.map(o => (
                            <tr key={o.material_list_id}
                                className={targetId === String(o.material_list_id) ? 'table-active' : ''}
                                onClick={() => { setTargetId(String(o.material_list_id)); clearErr('target'); }}
                                style={{ cursor: 'pointer' }}>
                                <td className='text-center'>
                                    <input type='radio' className='form-check-input'
                                        checked={targetId === String(o.material_list_id)} readOnly />
                                </td>
                                <td className='text-gray-700'>#{o.order_line_num}</td>
                                <td>
                                    <div className='fw-semibold text-gray-800'>{o.item_name}</div>
                                    <div className='text-muted fs-8'>{o.item_code}</div>
                                </td>
                                <td className='text-center text-gray-700'>{o.quantity} {o.unit_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const isReallocate = action === 'REALLOCATE';

    return (
        <Modal show={show} onHide={onHide} centered size={isReallocate ? 'lg' : undefined}>
            <Modal.Header closeButton>
                <Modal.Title className='fw-bold'>
                    <i className='bi bi-pencil-square me-2 text-warning'></i>ปรับปรุงรายการ
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {item && (
                    <div className='p-3 bg-light rounded mb-5'>
                        <div className='fw-bold text-gray-800 fs-6'>{item.item_name}</div>
                        <div className='text-muted fs-7 mt-1'>
                            <span className='me-4'><i className='bi bi-tag me-1'></i>{item.item_code}</span>
                            <span><i className='bi bi-box-seam me-1'></i>จำนวนเดิม: <span className='fw-bold text-gray-700'>{item.quantity} {item.unit}</span></span>
                        </div>
                        <div className='mt-2 d-flex gap-4 fs-8 text-muted'>
                            <span>Committed: <span className='fw-bold text-gray-700'>{item.qty_committed}</span></span>
                            <span>Adj.รวม: <span className={`fw-bold ${item.adj_total < 0 ? 'text-danger' : item.adj_total > 0 ? 'text-success' : 'text-gray-700'}`}>{item.adj_total > 0 ? `+${item.adj_total}` : item.adj_total}</span></span>
                            <span>คงเหลือ: <span className={`fw-bold ${item.qty_available > 0 ? 'text-success' : item.qty_available < 0 ? 'text-danger' : 'text-gray-700'}`}>{item.qty_available}</span></span>
                        </div>
                    </div>
                )}

                <div className='mb-5'>
                    <label className='form-label fw-bold required'>ประเภทการปรับปรุง</label>
                    <select
                        className={`form-select form-select-solid ${errors.action ? 'is-invalid' : ''}`}
                        value={action}
                        onChange={e => {
                            setAction(e.target.value as AdjustmentActionType);
                            setErrors({});
                            setTargetId('');
                        }}
                    >
                        <option value=''>-- เลือก --</option>
                        {(Object.entries(REASON_LABEL) as [AdjustmentActionType, string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </select>
                    {errors.action && <div className='invalid-feedback'>{errors.action}</div>}
                </div>

                {!isReallocate && action !== '' && (
                    <div className='mb-5'>
                        <label className='form-label fw-bold required'>จำนวนที่ปรับ (+ เพิ่ม / − ลด)</label>
                        <input
                            type='text'
                            className={`form-control form-control-lg ${errors.delta_qty ? 'is-invalid' : ''}`}
                            placeholder='เช่น -2 หรือ 5'
                            value={deltaQty}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === '' || v === '-' || /^-?\d*$/.test(v)) {
                                    setDeltaQty(v);
                                    if (errors.delta_qty) clearErr('delta_qty');
                                }
                            }}
                        />
                        {errors.delta_qty && <div className='invalid-feedback'>{errors.delta_qty}</div>}
                        <div className='form-text text-muted'>ค่าลบ = ลดจำนวน, ค่าบวก = เพิ่มจำนวน</div>
                    </div>
                )}

                {isReallocate && (
                    <>
                        <div className='mb-5'>
                            <label className='form-label fw-bold required'>จำนวนที่โอน</label>
                            <input
                                type='text'
                                className={`form-control form-control-lg ${errors.qty ? 'is-invalid' : ''}`}
                                placeholder='เช่น 5'
                                value={qty}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (v === '' || /^\d+$/.test(v)) {
                                        setQty(v);
                                        if (errors.qty) clearErr('qty');
                                    }
                                }}
                            />
                            {errors.qty && <div className='invalid-feedback'>{errors.qty}</div>}
                            <div className='form-text text-muted'>ระบบจะสร้างรายการปรับลบฝั่งต้นทาง และเพิ่มฝั่งปลายทาง</div>
                            <div className='form-text text-muted'><span className='text-info fw-bold'>ใบเบิกอื่น</span> ระบบจะย้ายจำนวนไปยังรายการใบเบิกที่เลือก</div>
                            <div className='form-text text-muted'><span className='text-info fw-bold'>สินค้า / วัตถุดิบ</span> ระบบจะสร้างใบเบิกใหม่ขึ้นมา เพื่อให้สินค้ามีที่อยู่ โดยจะเป็นสินค้า item code เดียวกันภายใน SalesOrder เดียวกัน ใบเบิกนี้จะไม่ถูกส่งไป WMS</div>
                        </div>

                        <div className='mb-3'>
                            <label className='form-label fw-bold required'>ปลายทาง</label>
                            <div className='btn-group w-100 mb-3' role='group'>
                                <button type='button'
                                    className={`btn btn-sm ${targetKind === 'picking_request_item' ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => { setTargetKind('picking_request_item'); setTargetId(''); clearErr('target'); }}>
                                    ใบเบิกอื่น ({options?.picking_request_items.length ?? 0})
                                </button>
                                <button type='button'
                                    className={`btn btn-sm ${targetKind === 'sales_item' ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => { setTargetKind('sales_item'); setTargetId(''); clearErr('target'); }}>
                                    สินค้า ({options?.sales_items.length ?? 0})
                                </button>
                                <button type='button'
                                    className={`btn btn-sm ${targetKind === 'material_list' ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => { setTargetKind('material_list'); setTargetId(''); clearErr('target'); }}>
                                    วัตถุดิบ ({options?.material_lists.length ?? 0})
                                </button>
                            </div>
                            {optionsLoading ? (
                                <div className='text-center py-5 text-muted'>
                                    <span className='spinner-border spinner-border-sm me-2' />กำลังโหลดตัวเลือก...
                                </div>
                            ) : renderTargetList()}
                            {errors.target && <div className='text-danger fs-8 mt-1'>{errors.target}</div>}
                        </div>
                    </>
                )}

                {action !== '' && (
                    <div className='mb-2'>
                        <label className='form-label fw-bold'>หมายเหตุ {!isReallocate && '(ไม่บังคับ)'}</label>
                        <textarea
                            className='form-control form-control-lg'
                            rows={2}
                            placeholder='อธิบายสาเหตุหรือบริบทเพิ่มเติม'
                            value={remark}
                            onChange={e => setRemark(e.target.value)}
                        />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className='btn btn-light fw-bold' onClick={onHide} disabled={saving}>ยกเลิก</button>
                <button
                    className={`btn ${isReallocate ? 'btn-primary' : 'btn-warning'} fw-bold`}
                    onClick={handleSubmit}
                    disabled={saving || !action}
                >
                    {saving
                        ? <><span className='spinner-border spinner-border-sm me-2' />กำลังบันทึก...</>
                        : isReallocate
                            ? <><i className='bi bi-arrow-left-right me-2'></i>ยืนยันการโอน</>
                            : <><i className='bi bi-check-lg me-2'></i>บันทึกการปรับปรุง</>}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default AdjustItemModal;
