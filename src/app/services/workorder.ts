import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { front_api } from "./apiConfig";


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