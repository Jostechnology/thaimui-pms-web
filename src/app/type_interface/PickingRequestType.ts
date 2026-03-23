export interface PickingRequestListItem {
    picking_request_item_id: number;
    picking_request_id: number;
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark: string | null;
}

export interface PickingRequest {
    picking_request_id: number;
    request_type: "WORK_RUN" | "TEST_RESULT";
    work_run_id: number | null;
    test_result_id: number | null;
    status: "PENDING" | "SENT" | "SUCCESS" | "FAILED";
    wms_reference: string | null;
    remark: string | null;
    created_by: string | null;
    created_date: string | null;
    updated_by: string | null;
    updated_date: string | null;
    items: PickingRequestListItem[];
}

export interface PickingAvailableItem {
    item_code: string;
    item_name: string;
    unit?: string;
}

export interface PickingRequestItem {
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    remark?: string;
}

export interface PickingRequestPayload {
    remark?: string;
    items: PickingRequestItem[];
}

export interface PickingRequestStatusPayload {
    status: string;
    wms_reference?: string;
    remark?: string;
}
