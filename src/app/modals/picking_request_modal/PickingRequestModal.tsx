import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import type { PickingAvailableItem, PickingRequestPayload } from "../../type_interface/PickingRequestType";

interface PickingItemForm {
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark: string;
}

interface Props {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    availableItems: PickingAvailableItem[];
    onSubmit: (payload: PickingRequestPayload) => Promise<{ success: boolean; message?: string }>;
    title?: string;
}

const PickingRequestModal: React.FC<Props> = ({
    show,
    onHide,
    onSuccess,
    availableItems,
    onSubmit,
    title = "สร้าง Picking Request",
}) => {
    const [selectedItems, setSelectedItems] = useState<Record<string, PickingItemForm>>({});
    const [remark, setRemark] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setSelectedItems({});
            setRemark("");
        }
    }, [show]);

    const isChecked = (item_code: string) => !!selectedItems[item_code];

    const toggleItem = (item: PickingAvailableItem) => {
        setSelectedItems((prev) => {
            if (prev[item.item_code]) {
                const next = { ...prev };
                delete next[item.item_code];
                return next;
            }
            return {
                ...prev,
                [item.item_code]: {
                    item_code: item.item_code,
                    item_name: item.item_name,
                    quantity: 1,
                    unit: item.unit ?? "",
                    remark: "",
                },
            };
        });
    };

    const updateItemField = (item_code: string, field: keyof PickingItemForm, value: string | number) => {
        setSelectedItems((prev) => ({
            ...prev,
            [item_code]: { ...prev[item_code], [field]: value },
        }));
    };

    const handleSubmit = async () => {
        const items = Object.values(selectedItems);
        if (items.length === 0) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกรายการอย่างน้อย 1 รายการ", "warning");
            return;
        }
        const invalidQty = items.find((it) => !it.quantity || it.quantity <= 0);
        if (invalidQty) {
            Swal.fire("แจ้งเตือน", `กรุณาระบุจำนวนสำหรับ "${invalidQty.item_name}"`, "warning");
            return;
        }
        const missingUnit = items.find((it) => !it.unit.trim());
        if (missingUnit) {
            Swal.fire("แจ้งเตือน", `กรุณาระบุหน่วยสำหรับ "${missingUnit.item_name}"`, "warning");
            return;
        }

        const payload: PickingRequestPayload = {
            remark: remark.trim() || undefined,
            items: items.map((it) => ({
                item_code: it.item_code,
                item_name: it.item_name,
                quantity: it.quantity,
                unit: it.unit.trim(),
                remark: it.remark.trim() || undefined,
            })),
        };

        setSaving(true);
        try {
            const res = await onSubmit(payload);
            if (res.success) {
                Swal.fire({ title: "สร้าง Picking Request สำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
                onHide();
                onSuccess();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถสร้าง Picking Request ได้", "error");
            }
        } finally {
            setSaving(false);
        }
    };

    const checkedCount = Object.keys(selectedItems).length;

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">
                    <i className="bi bi-box-seam me-2 text-primary"></i>{title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {availableItems.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                        <i className="bi bi-inbox fs-2x d-block mb-3 text-gray-400"></i>
                        ไม่มีรายการวัสดุในใบสั่งผลิตนี้
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <label className="form-label fw-bold text-gray-700">เลือกรายการที่ต้องการขอเบิก</label>
                            <div className="table-responsive">
                                <table className="table table-bordered align-middle fs-7 mb-0">
                                    <thead className="table-light">
                                        <tr className="fw-bold text-gray-700">
                                            <th className="w-40px text-center">เลือก</th>
                                            <th className="w-120px">รหัส</th>
                                            <th>ชื่อรายการ</th>
                                            <th className="w-100px text-center">จำนวน</th>
                                            <th className="w-90px text-center">หน่วย</th>
                                            <th className="w-160px">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableItems.map((item) => {
                                            const checked = isChecked(item.item_code);
                                            const form = selectedItems[item.item_code];
                                            return (
                                                <tr key={item.item_code} className={checked ? "table-active" : ""}>
                                                    <td className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={checked}
                                                            onChange={() => toggleItem(item)}
                                                        />
                                                    </td>
                                                    <td className="fw-bold text-gray-700 fs-7">{item.item_code}</td>
                                                    <td className="text-gray-800">{item.item_name}</td>
                                                    <td className="text-center">
                                                        {checked ? (
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm text-center"
                                                                min={1}
                                                                value={form.quantity}
                                                                onChange={(e) => updateItemField(item.item_code, "quantity", Number(e.target.value))}
                                                            />
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {checked ? (
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm text-center"
                                                                placeholder="pcs"
                                                                value={form.unit}
                                                                onChange={(e) => updateItemField(item.item_code, "unit", e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {checked ? (
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="หมายเหตุ (ถ้ามี)"
                                                                value={form.remark}
                                                                onChange={(e) => updateItemField(item.item_code, "remark", e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mb-2">
                            <label className="form-label fw-bold text-gray-700">หมายเหตุรวม (ไม่บังคับ)</label>
                            <textarea
                                className="form-control form-control-solid"
                                rows={2}
                                placeholder="หมายเหตุสำหรับ Picking Request นี้"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                            />
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-light fw-bold" onClick={onHide} disabled={saving}>
                    ยกเลิก
                </button>
                {availableItems.length > 0 && (
                    <button className="btn btn-primary fw-bold" onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                            <><span className="spinner-border spinner-border-sm me-2" />กำลังส่ง...</>
                        ) : (
                            <><i className="bi bi-send me-2"></i>ส่ง Picking Request{checkedCount > 0 && ` (${checkedCount} รายการ)`}</>
                        )}
                    </button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default PickingRequestModal;
