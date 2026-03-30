import { front_api } from "./apiConfig";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
    pagination?: any;
}

const getHeaders = () => {
    const token = localStorage.getItem('tk-jos');
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

const handleResponse = async (response: Response | false | undefined): Promise<APIResponse> => {
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

export const getComponentTemplates = async (
    page: number = 1,
    per_page: number = 10,
    search: string = ""
): Promise<APIResponse> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/component_templates?${params.toString()}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getComponentTemplateById = async (templateId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/component_templates/${templateId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createComponentTemplate = async (payload: {
    name: string;
    sections: any[];
}): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            "/component_templates",
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const updateComponentTemplate = async (
    templateId: number,
    payload: { name?: string; sections?: any[] }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PUT",
            `/component_templates/${templateId}`,
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getItemComponentSections = async (itemComponentId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/item_component/${itemComponentId}/sections`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const saveItemComponentSections = async (
    itemComponentId: number,
    payload: { component_template_id: number; sections_data: any[] }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/${itemComponentId}/sections`,
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const saveItemComponentSectionsBatch = async (
    payload: { item_component_id: number; component_template_id: number; sections_data: any[] }[]
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/sections/batch`,
            payload,
            { wrapData: true, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const deleteComponentTemplate = async (templateId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/component_templates/${templateId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
