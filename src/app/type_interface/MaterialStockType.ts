/**
 * ตรงกับตาราง t_material_transaction ใน DB
 * ใช้ track การเคลื่อนไหวของวัตถุดิบ (เช่น REMOVE สำหรับ QC testing)
 */
export interface MaterialTransaction {
    transaction_id: number;
    material_list_id: number;
    amount: number;
    /** ประเภท transaction เช่น 'REMOVE', 'ADD', 'ADJUST' */
    type: string;
    /** เลขที่เอกสารอ้างอิง เช่น 'QC-2026-001' */
    related_document_code: string;
    created_by: string | null;
    updated_by: string | null;
    created_date: string;
    updated_date: string;
}

/**
 * ตรงกับตาราง t_component_material_usage ใน DB
 * track การใช้วัตถุดิบในการผลิต (Work Order → Item Component)
 */
export interface ComponentMaterialUsageRecord {
    usage_id: number;
    item_component_id: number;
    material_list_id: number;
    quantity_used: number;
    created_date: string;
}

/**
 * สรุปยอดคงเหลือของวัตถุดิบแต่ละรายการ
 * คำนวณจาก:
 *   remaining = item_num
 *     - SUM(t_component_material_usage.quantity_used)   -- ใช้ในผลิต
 *     - SUM(t_material_transaction.amount WHERE type='REMOVE') -- ใช้ในเทส/อื่นๆ
 */
export interface MaterialStockSummary {
    material_list_id: number;
    sales_item_id: number;
    item_code: string;
    item_name: string;
    item_description: string;
    /** จำนวนทั้งหมดที่มี (จาก t_material_list.item_num) */
    total_quantity: number;
    /** จำนวนที่ใช้ไปในการผลิต (SUM จาก t_component_material_usage) */
    used_in_production: number;
    /** จำนวนที่ใช้ไปในเทส/อื่นๆ (SUM จาก t_material_transaction WHERE type='REMOVE') */
    used_in_testing: number;
    /** จำนวนคงเหลือ = total - production - testing */
    remaining_quantity: number;
}

/**
 * รายละเอียดการใช้วัตถุดิบในการผลิต (join t_component_material_usage → t_item_component → t_work_order)
 */
export interface MaterialProductionUsage {
    usage_id: number;
    work_order_doc_num: string;
    work_order_status: string;
    component_name: string;
    quantity_used: number;
    created_date: string;
}

/**
 * รายละเอียดทั้งหมดของวัตถุดิบ — ใช้ที่ไหนบ้าง ใช้ไปเท่าไร
 */
export interface MaterialUsageDetail {
    material_list_id: number;
    item_code: string;
    item_name: string;
    item_description: string;
    total_quantity: number;
    used_in_production: number;
    used_in_testing: number;
    remaining_quantity: number;
    /** การใช้ในผลิต — แยกตาม Work Order / Component */
    production_usages: MaterialProductionUsage[];
    /** Transaction อื่นๆ เช่น REMOVE สำหรับเทส */
    transactions: MaterialTransaction[];
}

/**
 * ผลลัพธ์การ validate จำนวนวัตถุดิบ
 */
export interface MaterialValidationResult {
    is_valid: boolean;
    material_list_id: number;
    item_name: string;
    requested_quantity: number;
    available_quantity: number;
    shortage: number;
    message: string;
}

/**
 * Request สำหรับตรวจสอบจำนวนวัตถุดิบก่อนใช้งาน
 */
export interface MaterialValidationRequest {
    sales_item_id: number;
    materials: {
        material_list_id: number;
        quantity_needed: number;
    }[];
    /** ไม่รวม work_order_id นี้ในการคำนวณ (กรณีแก้ไข) */
    exclude_work_order_id?: number;
}

/**
 * Response จาก API ตรวจสอบจำนวนวัตถุดิบ
 */
export interface MaterialValidationResponse {
    is_valid: boolean;
    results: MaterialValidationResult[];
    summary: MaterialStockSummary[];
}
