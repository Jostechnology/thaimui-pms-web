import { front_api } from "./apiConfig";
import type { PickingRequestPayload, PickingRequestStatusPayload, PickingItemAdjustmentPayload, ReallocatePayload } from "../type_interface/PickingRequestType";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
}

const handleResponse = async (response: Response | false | undefined): Promise<APIResponse> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const getPickingRequestList = async (
    page: number,
    per_page: number,
    search?: string,
    status?: string,
    doc_entry?: number
): Promise<any> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", per_page.toString());
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (doc_entry) params.append("doc_entry", doc_entry.toString());
    try {
        const response = await front_api("GET", `/picking_request/list?${params.toString()}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const createSalesOrderPickingRequest = async (
    docEntry: number,
    payload: PickingRequestPayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/sales_order/${docEntry}/picking_request`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getPickingRequestsByDocEntry = async (docEntry: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/sales_order/${docEntry}/picking_request`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" };
    }
};

export const getPickingRequestById = async (pickingRequestId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/picking_request/${pickingRequestId}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" };
    }
};

export const createPickingItemAdjustment = async (
    pickingRequestItemId: number,
    payload: PickingItemAdjustmentPayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/picking_request_item/${pickingRequestItemId}/adjustment`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getPickingRequestAdjustments = async (
    pickingRequestId: number,
    page: number,
    per_page: number
): Promise<APIResponse> => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", per_page.toString());
        const response = await front_api(
            "GET",
            `/picking_request/${pickingRequestId}/adjustment?${params.toString()}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" };
    }
};

export const getPickingItemReallocateOptions = async (
    pickingRequestItemId: number
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/picking_request_item/${pickingRequestItemId}/reallocate_options`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" };
    }
};

export const createPickingItemReallocate = async (
    pickingRequestItemId: number,
    payload: ReallocatePayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/picking_request_item/${pickingRequestItemId}/reallocate`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const updatePickingRequestStatus = async (
    pickingRequestId: number,
    payload: PickingRequestStatusPayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PATCH",
            `/picking_request/${pickingRequestId}/status`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
