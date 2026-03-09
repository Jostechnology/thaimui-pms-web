import type { Material } from '../type_interface/MaterialType';
import type { MaterialStockSummary, MaterialValidationResult } from '../type_interface/MaterialStockType';

/**
 * คำนวณยอดคงเหลือของวัตถุดิบแบบ client-side
 * ใช้ข้อมูล material.item_num เป็นจำนวนทั้งหมด
 * ลบด้วยจำนวนที่ใช้ไปแล้วจาก stockSummary (ถ้ามี)
 */
export const calculateRemainingQuantity = (
    material: Material,
    stockSummary?: MaterialStockSummary
): number => {
    if (stockSummary) {
        return stockSummary.remaining_quantity;
    }
    return material.item_num;
};

/**
 * Validate รายการวัตถุดิบที่ต้องการใช้ทั้งหมดแบบ client-side
 * ตรวจสอบว่าจำนวนที่ขอใช้ไม่เกินจำนวนคงเหลือ
 */
export const validateMaterialQuantities = (
    requests: { material_list_id: number; quantity_needed: number }[],
    materials: Material[],
    stockSummaries?: MaterialStockSummary[]
): MaterialValidationResult[] => {
    const results: MaterialValidationResult[] = [];

    for (const req of requests) {
        const material = materials.find(m => m.material_list_id === req.material_list_id);
        if (!material) continue;

        const stockInfo = stockSummaries?.find(s => s.material_list_id === req.material_list_id);
        const available = calculateRemainingQuantity(material, stockInfo);
        const isValid = req.quantity_needed <= available;
        const shortage = isValid ? 0 : req.quantity_needed - available;

        results.push({
            is_valid: isValid,
            material_list_id: req.material_list_id,
            item_name: material.item_name,
            requested_quantity: req.quantity_needed,
            available_quantity: available,
            shortage,
            message: isValid
                ? `${material.item_name}: ใช้ได้ (ขอ ${req.quantity_needed} / คงเหลือ ${available})`
                : `${material.item_name}: จำนวนไม่เพียงพอ (ขอ ${req.quantity_needed} / คงเหลือ ${available} / ขาด ${shortage})`,
        });
    }

    return results;
};

/**
 * รวมจำนวนที่ต้องการใช้วัตถุดิบแต่ละชนิดจาก components ทั้งหมด
 * ป้องกันการนับซ้ำระหว่าง component
 */
export const aggregateMaterialUsageFromComponents = (
    components: {
        materials: { material_list_id: number | ''; quantity_used: number | '' }[];
    }[]
): Map<number, number> => {
    const usageMap = new Map<number, number>();

    for (const comp of components) {
        for (const mat of comp.materials) {
            if (mat.material_list_id === '' || mat.quantity_used === '') continue;
            const id = mat.material_list_id as number;
            const qty = Number(mat.quantity_used) || 0;
            usageMap.set(id, (usageMap.get(id) || 0) + qty);
        }
    }

    return usageMap;
};

/**
 * สร้าง validation message สรุปรวมทุกรายการที่มีปัญหา
 */
export const buildValidationSummaryMessage = (
    results: MaterialValidationResult[]
): string => {
    const issues = results.filter(r => !r.is_valid);
    if (issues.length === 0) return '';

    const lines = issues.map(
        i => `• ${i.item_name}: ขอใช้ ${i.requested_quantity} แต่คงเหลือ ${i.available_quantity} (ขาด ${i.shortage})`
    );

    return `วัตถุดิบไม่เพียงพอ ${issues.length} รายการ:\n${lines.join('\n')}`;
};
