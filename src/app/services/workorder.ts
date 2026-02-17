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
    limit: number,
    search: string = "",
) => {
    try {
        const token = localStorage.getItem('tk-jos');

        const params = new URLSearchParams({
            page: page.toString(),
            pageConfig: limit.toString(),
        });
        
        if (search) params.append("search", search); 
        
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
        message: errorData.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" 
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