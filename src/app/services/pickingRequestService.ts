import { front_api } from "./apiConfig";
import type { PickingRequestPayload, PickingRequestStatusPayload } from "../type_interface/PickingRequestType";

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
    doc_entry?: number,
    start_date?: string,
    end_date?: string
): Promise<any> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", per_page.toString());
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (doc_entry) params.append("doc_entry", doc_entry.toString());
    if (start_date) params.append("start_date", start_date);
    if (end_date) params.append("end_date", end_date);
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
