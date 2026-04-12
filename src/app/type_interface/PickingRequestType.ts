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
    items: PickingRequestListItem[];
}

export interface PickingRequestItemPayload {
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark?: string;
    order_line_num?: number;
    sales_item_id?: number;
    material_list_id?: number;
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
