import { front_api } from "./apiConfig";
import type { PhaseTemplate, PhaseTemplateListResponse } from "../type_interface/PhaseTemplateType";

export interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

const getHeaders = () => {
    const token = localStorage.getItem('tk-jos');
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

const handleResponse = async <T = any>(response: Response | false | undefined): Promise<APIResponse<T>> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const getPhaseTemplateList = async (
    page: number = 1,
    per_page: number = 10,
    search: string = ""
): Promise<APIResponse<PhaseTemplateListResponse>> => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", per_page.toString());
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/phase_template/list?${params.toString()}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<PhaseTemplateListResponse>(response);
    } catch (error) {
        console.error("getPhaseTemplateList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getAllPhaseTemplates = async (): Promise<APIResponse<PhaseTemplate[]>> => {
    try {
        const response = await front_api(
            "GET",
            `/phase_template/all`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<PhaseTemplate[]>(response);
    } catch (error) {
        console.error("getAllPhaseTemplates Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getPhaseTemplateById = async (id: number): Promise<APIResponse<PhaseTemplate>> => {
    try {
        const response = await front_api(
            "GET",
            `/phase_template/${id}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<PhaseTemplate>(response);
    } catch (error) {
        console.error("getPhaseTemplateById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createPhaseTemplate = async (data: any): Promise<APIResponse<PhaseTemplate>> => {
    try {
        const response = await front_api(
            "POST",
            "/phase_template/create",
            data,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<PhaseTemplate>(response);
    } catch (error) {
        console.error("createPhaseTemplate Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้าง Phase Template" };
    }
};

export const updatePhaseTemplate = async (id: number, data: any): Promise<APIResponse<PhaseTemplate>> => {
    try {
        const response = await front_api(
            "PUT",
            `/phase_template/${id}`,
            data,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<PhaseTemplate>(response);
    } catch (error) {
        console.error("updatePhaseTemplate Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดต Phase Template" };
    }
};

export const deletePhaseTemplate = async (id: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/phase_template/${id}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("deletePhaseTemplate Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบ Phase Template" };
    }
};
