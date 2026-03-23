import { front_api } from "./apiConfig";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
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

export const getOperationCostMonthly = async (
    page: number,
    per_page: number = 10,
    search: string = "",
    month: string = ""
): Promise<APIResponse> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);
        if (month) params.append("month", month);

        const response = await front_api(
            "GET",
            `/get_operation_cost_monthly?${params.toString()}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getOperationCostMonthly Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getOperationCostMonthlyById = async (
    operationCostMonthlyId: number
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/get_operation_cost_monthly/${operationCostMonthlyId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getOperationCostMonthlyById Error:", error);
        return { success: false, message: "ไม่สามารถดึงข้อมูลได้" };
    }
};

export const createOperationCostMonthly = async (payload: {
    operation_cost_date: string;
    depreciation_building_cost?: number;
    depreciation_building_period?: number;
    depreciation_util_cost?: number;
    depreciation_util_period?: number;
    office_rent_cost?: number;
    office_supplies_cost?: number;
    water_cost?: number;
    electricity_cost?: number;
    utility_cost?: number;
}): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            "/create_operation_cost_monthly",
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createOperationCostMonthly Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const updateOperationCostMonthly = async (
    operationCostMonthlyId: number,
    payload: {
        operation_cost_date?: string;
        depreciation_building_cost?: number;
        depreciation_building_period?: number;
        depreciation_util_cost?: number;
        depreciation_util_period?: number;
        office_rent_cost?: number;
        office_supplies_cost?: number;
        water_cost?: number;
        electricity_cost?: number;
        utility_cost?: number;
    }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PUT",
            `/update_operation_cost_monthly/${operationCostMonthlyId}`,
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("updateOperationCostMonthly Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const deleteOperationCostMonthly = async (
    operationCostMonthlyId: number
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/delete_operation_cost_monthly/${operationCostMonthlyId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("deleteOperationCostMonthly Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
