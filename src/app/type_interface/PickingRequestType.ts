export interface PickingRequestListItem {
    picking_request_item_id: number;
    picking_request_id: number;
    sales_item_id: number | null;
    material_list_id: number | null;
    order_line_num: number | null;
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark: string | null;
    qty_available : number
    picking_request_code : string
}

export interface PickingRequest {
    picking_request_id: number;
    picking_request_code: string | null;
    doc_entry: number | null;
    status: "PENDING" | "SENT" | "SUCCESS" | "FAILED";
    wms_reference: string | null;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
    updated_by: string | null;
    updated_date: string | null;
    sales_order?: { doc_entry: number; doc_num: string } | null;
    items: PickingRequestListItem[];
}

// ── Detail view types ──────────────────────────────────────────────────────

export interface PickingRequestAdjustmentDetail {
    id: number;
    picking_request_item_id: number;
    delta_qty: number;
    reason: PickingItemAdjustmentReason;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
}

export interface TestResultConsumption {
    id: number;
    test_result_id: number;
    test_result_required_item_id: number | null;
    qty_allocated: number;
    qty_consumed: number | null;
    test_result: {
        test_result_id: number;
        test_result_code: string;
        session_status: string;
        overall_status: string | null;
    };
}

export interface WorkRunConsumption {
    id: number;
    work_run_id: number;
    work_run_required_item_id: number | null;
    qty_allocated: number;
    qty_consumed: number | null;
    work_run: {
        work_run_id: number;
        lot_number: string | null;
        work_order_id: number;
        status: string;
    };
}

export interface PickingRequestItemDetail {
    picking_request_item_id: number;
    picking_request_id: number;
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    sales_item_id: number | null;
    material_list_id: number | null;
    order_line_num: number | null;
    remark: string | null;
    qty_committed: number;
    adj_total: number;
    qty_available: number;
    adjustments: PickingRequestAdjustmentDetail[];
    test_result_consumptions: TestResultConsumption[];
    work_run_consumptions: WorkRunConsumption[];
}

export interface PickingRequestDetail {
    picking_request_id: number;
    picking_request_code: string | null;
    doc_entry: number | null;
    status: "PENDING" | "SENT" | "SUCCESS" | "FAILED";
    wms_reference: string | null;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
    updated_by: string | null;
    updated_date: string | null;
    sales_order: { doc_entry: number; doc_num: string } | null;
    items: PickingRequestItemDetail[];
}

export interface PickingRequestItemPayload {
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark?: string;
    order_line_num: number;
    sales_item_id: number;
    material_list_id: number;
}

export interface PickingRequestPayload {
    remark?: string;
    items: PickingRequestItemPayload[];
}

export interface PickingRequestStatusPayload {
    status: string;
    wms_reference?: string;
    remark?: string;
}

export type PickingItemAdjustmentReason = 'MISCOUNT' | 'SPILLAGE' | 'CORRECTION' | 'OTHER';

export interface PickingItemAdjustment {
    id: number;
    picking_request_item_id: number;
    delta_qty: number;
    reason: PickingItemAdjustmentReason;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
    picking_request_item?: {
        item_code: string;
        item_name: string;
        unit: string;
    };
}

export interface PickingItemAdjustmentPayload {
    delta_qty: number;
    reason: PickingItemAdjustmentReason;
    remark?: string;
}
