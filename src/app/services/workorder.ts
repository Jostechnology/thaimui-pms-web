import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { front_api } from "./apiConfig";


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
    month: string = ""
) => {
    try {
        const token = localStorage.getItem('tk-jos');

        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);
        if (statusFilter) params.append("filter", statusFilter);
        if (month) params.append("month", month);

        const headers = {
            "Authorization": `Bearer ${token}`
        };
        const response = await front_api(
            "GET",
            `/get_work_order_list?${params.toString()}`,
            {},
            {
                wrapData: false,
                headers: headers
            }
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
        const token = localStorage.getItem('tk-jos');

        const headers = {
            "Authorization": `Bearer ${token}`
        };
        const response = await front_api(
            "GET",
            `/get_work_order_by_id/${id}`,
            {},
            {
                wrapData: false,
                headers: headers
            }
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

export const createWorkPhase = async (items: any[]): Promise<APIResponse> => {
    try {
        const body = { items: items };
        const response = await front_api(
            "POST",
            "/create_work_phase",
            body,
            { wrapData: false, headers: getHeaders() }
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
            { wrapData: false, headers: getHeaders() }
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
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getWorkPhaseDetail = async (workPhaseId: number) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const headers = {
            "Authorization": `Bearer ${token}`
        };
        const response = await front_api(
            "GET",
            `/get_work_phase_detail/${workPhaseId}`,
            {},
            {
                wrapData: false,
                headers: headers
            }
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
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getItemComponentDetail = async (itemComponentId: number) => {
    try {
        const response = await front_api(
            "GET",
            `/get_item_component_detail/${itemComponentId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        if (!response) return { success: false };
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getItemComponentDetail Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};


