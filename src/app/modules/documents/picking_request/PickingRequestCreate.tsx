import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import Swal from 'sweetalert2';
import { getSalesOrderList, getSalesOrderById } from '../../../services/salesOrder';
import { createSalesOrderPickingRequest } from '../../../services/pickingRequestService';
import type { PickingRequestItemPayload } from '../../../type_interface/PickingRequestType';

interface SOOption {
    doc_entry: number;
    doc_num: number;
    card_name: string;
}

interface PickableOption {
    value: string;          // unique key: "si:97" or "ml:104"
    item_code: string;
    item_name: string;
    unit: string;
    type: 'sales_item' | 'material';
    sales_item_id?: number;
    material_list_id?: number;
    order_line_num?: number;
}

interface ItemRow {
    key: number;
    selectedValue: string;  // matches PickableOption.value, or "" for blank
    quantity: string;
    remark: string;
}

let rowCounter = 1;
const emptyRow = (): ItemRow => ({ key: rowCounter++, selectedValue: '', quantity: '', remark: '' });

const PickingRequestCreate: React.FC = () => {
    const navigate = useNavigate();

    // SO search state
    const [soSearch, setSoSearch] = useState('');
    const [soOptions, setSoOptions] = useState<SOOption[]>([]);
    const [soLoading, setSoLoading] = useState(false);
    const [selectedSO, setSelectedSO] = useState<SOOption | null>(null);
    const [soDetailLoading, setSoDetailLoading] = useState(false);

    // Pickable options built from SO detail
    const [pickableOptions, setPickableOptions] = useState<PickableOption[]>([]);

    const [remark, setRemark] = useState('');
    const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
    const [saving, setSaving] = useState(false);

    // --- SO search ---
    const searchSO = useCallback(async (q: string) => {
        if (!q.trim()) { setSoOptions([]); return; }
        setSoLoading(true);
        try {
            const res = await getSalesOrderList(1, 20, q);
            if (res?.success && Array.isArray(res.data?.items)) {
                setSoOptions(res.data.items.map((s: any) => ({
                    doc_entry: s.doc_entry,
                    doc_num: s.doc_num,
                    card_name: s.card_name,
                })));
            } else {
                setSoOptions([]);
            }
        } finally {
            setSoLoading(false);
        }
    }, []);

    const handleSOSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setSoSearch(v);
        searchSO(v);
    };

    const handleSelectSO = async (opt: SOOption) => {
        setSelectedSO(opt);
        setSoSearch('');
        setSoOptions([]);
        setPickableOptions([]);
        setRows([emptyRow()]);

        setSoDetailLoading(true);
        try {
            const res = await getSalesOrderById(opt.doc_entry);
            if (res?.success && res.data) {
                const options: PickableOption[] = [];

                // Sales items — exclude produced items (they come from manufacturing, not warehouse)
                const salesItems: any[] = (res.data.items ?? []).filter((si: any) => !si.produce);
                for (const si of salesItems) {
                    options.push({
                        value: `si:${si.sales_item_id}`,
                        item_code: si.item_code,
                        item_name: si.item_name,
                        unit: si.unit_name ?? '',
                        type: 'sales_item',
                        sales_item_id: si.sales_item_id,
                        order_line_num: si.order_line_num,
                    });
                }

                // Materials (top-level, deduplicated by material_list_id)
                const seenMl = new Set<number>();
                const materials: any[] = res.data.material_list ?? [];
                for (const ml of materials) {
                    if (!seenMl.has(ml.material_list_id)) {
                        seenMl.add(ml.material_list_id);
                        options.push({
                            value: `ml:${ml.material_list_id}`,
                            item_code: ml.item_code,
                            item_name: ml.item_name,
                            unit: ml.unit_name ?? '',
                            type: 'material',
                            material_list_id: ml.material_list_id,
                        });
                    }
                }

                setPickableOptions(options);
            }
        } catch {
            // not critical
        } finally {
            setSoDetailLoading(false);
        }
    };

    const handleClearSO = () => {
        setSelectedSO(null);
        setPickableOptions([]);
        setRows([emptyRow()]);
    };

    // --- Row management ---
    const updateRow = (key: number, field: keyof ItemRow, value: string) => {
        setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
    };

    const handleRowSelect = (key: number, value: string) => {
        const opt = pickableOptions.find((o) => o.value === value);
        setRows((prev) => prev.map((r) => {
            if (r.key !== key) return r;
            // Auto-fill qty from option if currently empty
            const newQty = !r.quantity && opt ? '1' : r.quantity;
            return { ...r, selectedValue: value, quantity: newQty };
        }));
    };

    const addRow = () => setRows((prev) => [...prev, emptyRow()]);

    const removeRow = (key: number) => setRows((prev) => prev.filter((r) => r.key !== key));

    // Lookup helper
    const getOption = (value: string) => pickableOptions.find((o) => o.value === value);

    // --- Submit ---
    const handleSubmit = async () => {
        if (!selectedSO) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือก Sales Order', 'warning');
            return;
        }

        const validRows = rows.filter((r) => r.selectedValue);
        if (validRows.length === 0) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        for (let i = 0; i < validRows.length; i++) {
            const q = Number(validRows[i].quantity);
            if (!q || q <= 0) {
                const opt = getOption(validRows[i].selectedValue);
                Swal.fire('แจ้งเตือน', `${opt?.item_name ?? `รายการที่ ${i + 1}`}: กรุณาระบุจำนวนที่ถูกต้อง`, 'warning');
                return;
            }
        }

        const items: PickingRequestItemPayload[] = validRows.map((r) => {
            const opt = getOption(r.selectedValue)!;
            return {
                item_code: opt.item_code,
                item_name: opt.item_name,
                quantity: Number(r.quantity),
                unit: opt.unit,
                remark: r.remark.trim() || undefined,
                order_line_num: opt.order_line_num,
                sales_item_id: opt.sales_item_id,
                material_list_id: opt.material_list_id,
            };
        });

        setSaving(true);
        try {
            const res = await createSalesOrderPickingRequest(selectedSO.doc_entry, {
                remark: remark.trim() || undefined,
                items,
            });
            if (res.success) {
                await Swal.fire({ title: 'สร้างคำขอเบิกสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
                navigate('/documents/picking_request');
            } else {
                Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถสร้างคำขอเบิกได้', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    // Split options by type for optgroups
    const salesItemOptions = pickableOptions.filter((o) => o.type === 'sales_item');
    const materialOptions = pickableOptions.filter((o) => o.type === 'material');

    return (
        <Content>
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>สร้างคำขอเบิก</h1>
                        <span className='text-muted fw-semibold fs-6'>สร้างคำขอเบิกวัสดุสำหรับ Sales Order</span>
                    </div>
                </div>
            </div>

            {/* Sales Order selection */}
            <div className='card shadow-sm mb-6'>
                <div className='card-header border-0 pt-5'>
                    <h5 className='card-title fw-bold'>
                        <i className='bi bi-file-earmark-text me-2 text-primary'></i>Sales Order
                    </h5>
                </div>
                <div className='card-body pt-2'>
                    {selectedSO ? (
                        <div className='d-flex align-items-center justify-content-between border border-success rounded px-4 py-3 bg-light-success'>
                            <div className='d-flex align-items-center gap-3'>
                                <span className='fw-bold text-gray-900 fs-6'>SO-{selectedSO.doc_num}</span>
                                <span className='text-muted fs-7'>{selectedSO.card_name}</span>
                                <span className='badge badge-light-success fs-8'>#{selectedSO.doc_entry}</span>
                                {soDetailLoading && (
                                    <span className='spinner-border spinner-border-sm text-muted'></span>
                                )}
                                {!soDetailLoading && pickableOptions.length > 0 && (
                                    <span className='text-muted fs-8'>
                                        {salesItemOptions.length} สินค้า · {materialOptions.length} วัสดุ
                                    </span>
                                )}
                            </div>
                            <button className='btn btn-sm btn-icon btn-light-danger' onClick={handleClearSO} title='เปลี่ยน SO'>
                                <i className='bi bi-x fs-4'></i>
                            </button>
                        </div>
                    ) : (
                        <div className='position-relative'>
                            <div className='d-flex align-items-center position-relative'>
                                <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-4'>
                                    <span className='path1'></span><span className='path2'></span>
                                </i>
                                <input
                                    type='text'
                                    className='form-control form-control-solid ps-12'
                                    placeholder='ค้นหา Sales Order (เลขที่ SO หรือชื่อลูกค้า)'
                                    value={soSearch}
                                    onChange={handleSOSearchChange}
                                />
                                {soLoading && (
                                    <span className='spinner-border spinner-border-sm position-absolute end-0 me-4 text-muted'></span>
                                )}
                            </div>
                            {soOptions.length > 0 && (
                                <div className='position-absolute w-100 bg-white border rounded shadow-sm mt-1' style={{ zIndex: 10 }}>
                                    {soOptions.map((opt) => (
                                        <div
                                            key={opt.doc_entry}
                                            className='px-4 py-3 border-bottom'
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f8fa')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                                            onClick={() => handleSelectSO(opt)}
                                        >
                                            <span className='fw-bold text-gray-800'>SO-{opt.doc_num}</span>
                                            <span className='text-muted ms-3 fs-7'>{opt.card_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Items table */}
            <div className='card shadow-sm mb-6'>
                <div className='card-header border-0 pt-5 d-flex justify-content-between align-items-center'>
                    <h5 className='card-title fw-bold'>
                        <i className='bi bi-list-ul me-2 text-primary'></i>รายการที่ต้องการเบิก
                    </h5>
                    <button className='btn btn-sm btn-light-primary fw-bold' onClick={addRow} disabled={!selectedSO}>
                        <i className='bi bi-plus-lg me-1'></i>เพิ่มแถว
                    </button>
                </div>
                <div className='card-body pt-2'>
                    {!selectedSO ? (
                        <div className='text-center py-10 text-muted'>
                            <i className='bi bi-file-earmark-text fs-2x d-block mb-3 text-gray-300'></i>
                            เลือก Sales Order ก่อนเพิ่มรายการ
                        </div>
                    ) : soDetailLoading ? (
                        <div className='text-center py-10 text-muted'>
                            <span className='spinner-border spinner-border-sm me-2'></span>กำลังโหลดรายการ...
                        </div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table align-middle fs-7 mb-0'>
                                <thead>
                                    <tr className='fw-bold text-gray-600 text-uppercase fs-8 border-bottom'>
                                        <th className='min-w-280px'>สินค้า / วัสดุ</th>
                                        <th className='w-120px'>รหัส</th>
                                        <th className='w-70px text-center'>หน่วย</th>
                                        <th className='w-90px text-center'>จำนวน</th>
                                        <th className='min-w-160px'>หมายเหตุ</th>
                                        <th className='w-30px'></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const opt = getOption(row.selectedValue);
                                        return (
                                            <tr key={row.key}>
                                                <td>
                                                    <select
                                                        className={`form-select form-select-sm ${!row.selectedValue ? 'text-muted' : ''}`}
                                                        value={row.selectedValue}
                                                        onChange={(e) => handleRowSelect(row.key, e.target.value)}
                                                    >
                                                        <option value=''>— เลือกสินค้า / วัสดุ —</option>
                                                        {salesItemOptions.length > 0 && (
                                                            <optgroup label='สินค้า (Sales Items)'>
                                                                {salesItemOptions.map((o) => (
                                                                    <option key={o.value} value={o.value}>
                                                                        {o.item_name} ({o.item_code})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        {materialOptions.length > 0 && (
                                                            <optgroup label='วัสดุ (Materials)'>
                                                                {materialOptions.map((o) => (
                                                                    <option key={o.value} value={o.value}>
                                                                        {o.item_name} ({o.item_code})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className='text-muted fs-8 fw-semibold'>
                                                        {opt?.item_code ?? '—'}
                                                    </span>
                                                </td>
                                                <td className='text-center'>
                                                    <span className='badge badge-light-secondary fw-bold'>
                                                        {opt?.unit ?? '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <input
                                                        type='text'
                                                        className='form-control form-control-sm text-center'
                                                        placeholder='0'
                                                        value={row.quantity}
                                                        disabled={!row.selectedValue}
                                                        onChange={(e) => updateRow(row.key, 'quantity', e.target.value.replace(/[^0-9]/g, ''))}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type='text'
                                                        className='form-control form-control-sm'
                                                        placeholder='หมายเหตุ'
                                                        value={row.remark}
                                                        onChange={(e) => updateRow(row.key, 'remark', e.target.value)}
                                                    />
                                                </td>
                                                <td className='text-center'>
                                                    {rows.length > 1 && (
                                                        <button
                                                            className='btn btn-icon btn-sm btn-light-danger'
                                                            onClick={() => removeRow(row.key)}
                                                        >
                                                            <i className='bi bi-trash fs-6'></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Remark */}
            <div className='card shadow-sm mb-6'>
                <div className='card-body'>
                    <label className='form-label fw-bold'>หมายเหตุรวม (ไม่บังคับ)</label>
                    <textarea
                        className='form-control form-control-solid'
                        rows={2}
                        placeholder='หมายเหตุสำหรับคำขอเบิกนี้'
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className='d-flex justify-content-end gap-3'>
                <button className='btn btn-light fw-bold' onClick={() => navigate(-1)} disabled={saving}>
                    ยกเลิก
                </button>
                <button className='btn btn-primary fw-bold px-8' onClick={handleSubmit} disabled={saving || !selectedSO}>
                    {saving
                        ? <><span className='spinner-border spinner-border-sm me-2' />กำลังสร้าง...</>
                        : <><i className='bi bi-check-lg me-2'></i>สร้างคำขอเบิก</>
                    }
                </button>
            </div>
        </Content>
    );
};

export default PickingRequestCreate;
