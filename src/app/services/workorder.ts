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

export const createWorkPhase = async (items: any[]): Promise<APIResponse> => {
    try {
        const token = localStorage.getItem('tk-jos');
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
        const body = { items: items };
        const response = await front_api(
            "POST", 
            "/create_work_phase", 
            body,
            { 
                wrapData: false,
                headers: headers
            }
        );
        if (response) {
            if (response.ok) {
                return await response.json();
            }
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                message: errorData.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" 
            };
        }
        
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };

    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
