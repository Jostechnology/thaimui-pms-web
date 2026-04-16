import { front_api } from "./apiConfig";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
}

const handleResponse = async (response: Response | false | undefined): Promise<APIResponse> => {
    if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    const result = await response.json().catch(() => ({}));
    return response.ok
        ? { ...result, success: true }
        : { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const createTestResult = async (qcWorkOrderId: number, data: any): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/qc_work_order/${qcWorkOrderId}/test_result/create`,
            data,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createTestResult Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างผลการทดสอบ" };
    }
};

export const getTestResultsByQCWorkOrder = async (qcWorkOrderId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/qc_work_order/${qcWorkOrderId}/test_result/list`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getTestResultsByQCWorkOrder Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลผลการทดสอบ" };
    }
};

export const getTestResultsBySalesOrder = async (docEntry: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/sales_order/${docEntry}/test_result/list`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getTestResultsBySalesOrder Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงผลการทดสอบ" };
    }
};

export const getTestResultById = async (testResultId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/test_result/${testResultId}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getTestResultById Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลผลการทดสอบ" };
    }
};

export const finalizeTestResult = async (testResultId: number, data: any): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PUT",
            `/test_result/${testResultId}/finalize`,
            data,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("finalizeTestResult Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการยืนยันผลการทดสอบ" };
    }
};

export const updateTestResult = async (testResultId: number, data: any): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "PUT",
            `/test_result/${testResultId}/update`,
            data,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("updateTestResult Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขผลการทดสอบ" };
    }
};

export const createTestResultRequiredItems = async (testResultId: number, items: any[]): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/test_result/${testResultId}/required_items`,
            items,
            { wrapData: true }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createTestResultRequiredItems Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกรายการวัตถุดิบ" };
    }
};

export const startTestResult = async (testResultId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "POST",
            `/test_result/${testResultId}/start`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("startTestResult Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเริ่มทดสอบ" };
    }
};

export const deleteTestResult = async (testResultId: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/test_result/${testResultId}/delete`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("deleteTestResult Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบผลการทดสอบ" };
    }
};
