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
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createCertificate Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้าง Certificate" };
    }
};
