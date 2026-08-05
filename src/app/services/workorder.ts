import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { download_api, front_api, upload_api } from "./apiConfig";
import type {
    DecodeMap,
    ItemDecodeOverview,
    ItemDecodeUploadReport,
    ItemReferenceListResponse,
} from "../type_interface/WorkOrderType";


interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
}
export const getWorkOrderList = async (
    page: number,
    per_page: number,
    search: string = "",
    statusFilter: string = "",
    start_date: string = "",
    end_date: string = ""
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);
        if (statusFilter) params.append("filter", statusFilter);
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);

        const response = await front_api(
            "GET",
            `/get_work_order_list?${params.toString()}`,
            {},
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();

        if (response.ok) {
            return { ...result, success: true };
        } else {
            return { ...result, success: false };
        }

    } catch (error) {
        console.error("getWorkOrderList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getWorkOrderById = async (id: Number) => {
    try {
        const response = await front_api(
            "GET",
            `/get_work_order_by_id/${id}`,
            {},
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();

        if (response.ok) {
            return { ...result, success: true };
        } else {
            return { ...result, success: false };
        }

    } catch (error) {
        console.error("getWorkOrderById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

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

export const createWorkPhase = async (items: any[]): Promise<APIResponse> => {
    try {
        const body = { items: items };
        const response = await front_api(
            "POST",
            "/create_work_phase",
            body,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const updateWorkPhase = async (items: any[]): Promise<APIResponse> => {
    try {
        const body = { items: items };
        const response = await front_api(
            "PUT",
            "/update_work_phase",
            body,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const deleteWorkPhase = async (payload: { work_phase_ids: number[] }): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            "/delete_work_phase",
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getWorkPhaseDetail = async (workPhaseId: number) => {
    try {
        const response = await front_api(
            "GET",
            `/get_work_phase_detail/${workPhaseId}`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false };

        const result = await response.json();

        if (response.ok) {
            return { ...result, success: true };
        } else {
            return { ...result, success: false };
        }
    } catch (error) {
        console.error("getWorkPhaseDetail Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
export const createWorkOrder = async (payload: {
    sales_item_id: number;
    item_components: {
        component_name: string;
        material_usage: { material_list_id: number; quantity_used: number }[];
    }[];
}): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            "/create_work_order",
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

// Best-effort autofill: decode a batch of material item codes into detail
// fields. Returns { success, results } where results is keyed by item_code.
// Never throws — a failed/unavailable endpoint degrades to success:false and
// callers simply skip autofill (all fields stay user-editable).
export const decodeItemCodes = async (
    items: { item_code: string; item_group: string }[]
): Promise<APIResponse & { results?: DecodeMap }> => {
    try {
        const response = await front_api(
            "POST",
            "/decode_item_codes",
            { items },
            { wrapData: false }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        const result = await response.json();
        return response.ok
            ? { ...result, success: true }
            : { ...result, success: false };
    } catch (error) {
        console.error("decodeItemCodes Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

// Upload the item-description xlsx to (re)build all material-code decode data.
// Multipart upload — this REPLACES all existing decode data on the backend.
// Returns { success, report? } where report is the validation report. Never
// throws; a failed/unavailable endpoint degrades to success:false.
export const uploadItemDecode = async (
    file: File
): Promise<{ success: boolean; message?: string; report?: ItemDecodeUploadReport }> => {
    try {
        const result = await upload_api("/upload_item_decode", file);
        if (!result) {
            return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        }
        return { success: true, report: result as ItemDecodeUploadReport };
    } catch (error) {
        console.error("uploadItemDecode Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

// Read-only view of the currently loaded decode data (categories + legends and
// the total reference count). Never throws; degrades to success:false.
export const getItemDecodeOverview = async (): Promise<
    { success: boolean; message?: string } & Partial<ItemDecodeOverview>
> => {
    try {
        const response = await front_api(
            "GET",
            "/get_item_decode_overview",
            {},
            { wrapData: false }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getItemDecodeOverview Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

// Paginated, searchable browser over the raw item_no → description references.
// Never throws; degrades to success:false.
export const getItemReferenceList = async (params: {
    page: number;
    per_page: number;
    search?: string;
}): Promise<{ success: boolean; message?: string } & Partial<ItemReferenceListResponse>> => {
    try {
        const qs = new URLSearchParams({
            page: params.page.toString(),
            per_page: params.per_page.toString(),
        });
        if (params.search) qs.append("search", params.search);

        const response = await front_api(
            "GET",
            `/get_item_reference_list?${qs.toString()}`,
            {},
            { wrapData: false }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getItemReferenceList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

// Trigger a browser download of the decode data as an .xlsx file. Returns
// true on success, false on failure (non-blocking — caller surfaces the error).
export const exportItemDecode = async (): Promise<boolean> => {
    return await download_api("/export_item_decode", "ThaiMui - Item Description.xlsx");
};

export const getItemComponentDetail = async (itemComponentId: number) => {
    try {
        const response = await front_api(
            "GET",
            `/get_item_component_detail/${itemComponentId}`,
            {},
            { wrapData: false }
        );
        if (!response) return { success: false };
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getItemComponentDetail Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
