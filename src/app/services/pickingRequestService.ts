import { front_api } from "./apiConfig";
import type { PickingRequestPayload, PickingRequestStatusPayload } from "../type_interface/PickingRequestType";

export const getPickingRequestList = async (
    page: number,
    per_page: number,
    search?: string,
    status?: string,
    request_type?: string
): Promise<any> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", per_page.toString());
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (request_type) params.append("request_type", request_type);
    try {
        const response = await front_api("GET", `/picking_request/list?${params.toString()}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

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

export const createWorkRunPickingRequest = async (
    workRunId: number,
    payload: PickingRequestPayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/work_run/${workRunId}/picking_request`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const createTestResultPickingRequest = async (
    testResultId: number,
    payload: PickingRequestPayload
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/test_result/${testResultId}/picking_request`,
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
