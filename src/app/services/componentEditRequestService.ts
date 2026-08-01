import { front_api } from "./apiConfig";
import type {
    ComponentEditRequest,
    ComponentEditRequestStatus,
} from "../type_interface/ComponentEditRequestType";

interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    pagination?: PaginationMeta;
}

export interface PaginationMeta {
    total: number;
    page: number;
    pages: number;
}

const handleResponse = async <T = any>(response: Response | false | undefined): Promise<APIResponse<T>> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    if (response.ok) {
        return await response.json();
    }
    const errorData = await response.json().catch(() => ({}));
    return {
        success: false,
        message: errorData.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"
    };
};

/** Every edit request ever raised for one component, newest first. */
export const getItemComponentEditRequests = async (
    itemComponentId: number
): Promise<APIResponse<ComponentEditRequest[]>> => {
    try {
        const response = await front_api(
            "GET",
            `/item_component/${itemComponentId}/edit_request`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest[]>(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * Ask Sales/Production for permission to edit a locked component.
 * Returns the created PENDING request (HTTP 201).
 */
export const createItemComponentEditRequest = async (
    itemComponentId: number,
    reason: string
): Promise<APIResponse<ComponentEditRequest>> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/${itemComponentId}/edit_request`,
            { reason },
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest>(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getComponentEditRequests = async (
    page: number = 1,
    per_page: number = 10,
    search: string = "",
    status?: ComponentEditRequestStatus,
    work_order_id?: number
): Promise<APIResponse<{ items: ComponentEditRequest[] }>> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });
        if (search) params.append("search", search);
        if (status) params.append("status", status);
        if (work_order_id) params.append("work_order_id", work_order_id.toString());

        const response = await front_api(
            "GET",
            `/component_edit_request/list?${params.toString()}`,
            {},
            { wrapData: false }
        );
        return await handleResponse<{ items: ComponentEditRequest[] }>(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getComponentEditRequestById = async (
    editRequestId: number
): Promise<APIResponse<ComponentEditRequest>> => {
    try {
        const response = await front_api(
            "GET",
            `/component_edit_request/${editRequestId}`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest>(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/** Approve a PENDING request — unlocks the component for exactly one more save. */
export const approveComponentEditRequest = async (
    editRequestId: number,
    review_remark?: string
): Promise<APIResponse<ComponentEditRequest>> => {
    try {
        const response = await front_api(
            "POST",
            `/component_edit_request/${editRequestId}/approve`,
            review_remark ? { review_remark } : {},
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest>(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

/** Reject a PENDING request. `review_remark` is required by the backend. */
export const rejectComponentEditRequest = async (
    editRequestId: number,
    review_remark: string
): Promise<APIResponse<ComponentEditRequest>> => {
    try {
        const response = await front_api(
            "POST",
            `/component_edit_request/${editRequestId}/reject`,
            { review_remark },
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest>(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

/** Withdraw your own request before it has been reviewed. */
export const cancelComponentEditRequest = async (
    editRequestId: number
): Promise<APIResponse<ComponentEditRequest>> => {
    try {
        const response = await front_api(
            "POST",
            `/component_edit_request/${editRequestId}/cancel`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ComponentEditRequest>(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
