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

export const getWorkRunById = async (workRunId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/work_run/${workRunId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getWorkRunsByWorkOrder = async (workOrderId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/work_order/${workOrderId}/work_runs`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export interface WorkRunSourceAllocation {
    source_work_run_id: number;
    qty: number;
}

export interface TestResultSourceAllocation {
    test_result_id: number;
    qty: number;
}

export const getSalesItemTestResults = async (salesItemId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/sales_item/${salesItemId}/test_results`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createWorkRun = async (
    workOrderId: number,
    payload: { quantity: number; source_work_runs?: WorkRunSourceAllocation[]; test_result_sources?: TestResultSourceAllocation[] }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/work_order/${workOrderId}/work_run/create`,
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};

export const getWorkRunsBySalesItem = async (salesItemId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/sales_item/${salesItemId}/work_runs`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const completeWorkRun = async (
    workRunId: number,
    payload: { completion_remark?: string; defect_qty?: number; usable_qty?: number }
): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PUT",
            `/work_run/${workRunId}/complete`,
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (e) {
        return { success: false, message: "เกิดข้อผิดพลาดในการส่งข้อมูล" };
    }
};
