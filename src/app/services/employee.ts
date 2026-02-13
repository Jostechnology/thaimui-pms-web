import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { front_api } from "./apiConfig";

export const getEmployeeList = async (search: string = "") => {
    try {
        const token = localStorage.getItem('tk-jos');
        const params = new URLSearchParams();
        if (search) params.append("search", search);

        const response = await front_api(
            "GET", 
            `/get_employee_list${params.toString()}`, 
            {}, 
            { 
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` } 
            }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};