import { front_api } from "./apiConfig";
import type { ItemComponentVersion } from "../type_interface/WorkOrderType";

interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    pagination?: any;
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
            { wrapData: false }
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
            { wrapData: false }
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
            { wrapData: false }
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
            { wrapData: false }
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
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * Save a component's section data. Every successful save cuts a new document
 * version, so pass `change_reason` on re-saves (doc_version > 0) to explain
 * what changed — it is stored on the version row.
 */
export interface SectionDataPayloadEntry {
    section_key: string;
    section_type: string;
    data: any;
    /** override of the template section's is_test_section flag; null = inherit */
    is_test_section?: boolean | null;
    [key: string]: any;
}

export const saveItemComponentSections = async (
    itemComponentId: number,
    payload: { component_template_id: number; sections_data: SectionDataPayloadEntry[]; change_reason?: string }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/${itemComponentId}/sections`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

/**
 * Full-replace a component's material usage set (PATCH .../material_usage).
 * `material_usage: []` is valid — it means the component uses no materials,
 * not an error. Same lock/approval/versioning shape as
 * saveItemComponentSections: pass `change_reason` when the save is consuming
 * an approved edit request. The response is the updated ItemComponent dumped
 * with the same schema as getItemComponentSections/getItemComponentDetail —
 * drop it straight into state instead of refetching.
 */
export interface MaterialUsagePayloadEntry {
    material_list_id: number;
    quantity_used: number;
}

export const updateItemComponentMaterialUsage = async (
    itemComponentId: number,
    payload: { material_usage: MaterialUsagePayloadEntry[]; change_reason?: string }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PATCH",
            `/item_component/${itemComponentId}/material_usage`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const saveItemComponentSectionsBatch = async (
    payload: {
        item_component_id: number;
        component_template_id: number;
        sections_data: SectionDataPayloadEntry[];
        change_reason?: string;
    }[]
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/sections/batch`,
            payload,
            { wrapData: true }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

/**
 * Version history of a component's documents, newest first.
 * The snapshot blobs (sections/section data/material usage) are NOT included —
 * use getItemComponentVersion() when you need to render an old version.
 */
export const getItemComponentVersions = async (
    itemComponentId: number
): Promise<APIResponse<ItemComponentVersion[]>> => {
    try {
        const response = await front_api(
            "GET",
            `/item_component/${itemComponentId}/versions`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ItemComponentVersion[]>(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/** One version with its frozen snapshots, addressed by version_no (not version_id). */
export const getItemComponentVersion = async (
    itemComponentId: number,
    versionNo: number
): Promise<APIResponse<ItemComponentVersion>> => {
    try {
        const response = await front_api(
            "GET",
            `/item_component/${itemComponentId}/versions/${versionNo}`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ItemComponentVersion>(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * Re-run document generation for the component's latest version without cutting
 * a new one — for when the generator failed or the file went missing.
 */
export const resendItemComponentDocument = async (
    itemComponentId: number
): Promise<APIResponse<ItemComponentVersion>> => {
    try {
        const response = await front_api(
            "POST",
            `/item_component/${itemComponentId}/resend_document`,
            {},
            { wrapData: false }
        );
        return await handleResponse<ItemComponentVersion>(response);
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
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
