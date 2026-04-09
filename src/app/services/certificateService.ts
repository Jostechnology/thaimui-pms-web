import { front_api } from "./apiConfig";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
}

const handleResponse = async (response: Response | false | undefined): Promise<APIResponse> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const createCertificate = async (data: any): Promise<APIResponse> => {
    console.log("Creating Certificate with data:", data);
    try {
        const response = await front_api(
            "POST",
            "/test_certificate/create",
            data,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createCertificate Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้าง Certificate" };
    }
};

export const getCertificateList = async (
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
            `/test_certificate/get_list?${params.toString()}`,
            undefined,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getCertificateList Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล Certificate" };
    }
};

export const getCertificateById = async (id: number | string): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/test_certificate/get/${id}`,
            undefined,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error(`getCertificateById Error (ID: ${id}):`, error);
        return { success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล Certificate Detail" };
    }
};

export const updateCertificate = async (id: number | string, data: any): Promise<APIResponse> => {
    console.log(`Updating Certificate (ID: ${id}) with data:`, data);
    try {
        const response = await front_api(
            "PUT",
            `/test_certificate/update/${id}`,
            data,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error(`updateCertificate Error (ID: ${id}):`, error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไข Certificate" };
    }
};
