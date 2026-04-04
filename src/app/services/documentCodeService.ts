import { front_api } from "./apiConfig";

export const getDocumentCodes = async () => {
    try {
        const response = await front_api(
            "GET",
            "/document_code/get",
            {},
            { wrapData: false }
        );

        if (!response) return { success: false };

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getDocumentCodes Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createDocumentCodes = async (data: any) => {
    try {
        const response = await front_api(
            "POST",
            "/document_code/create",
            data,
            { wrapData: true }
        );

        if (!response) return { success: false };

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("createDocumentCodes Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const editDocumentCodes = async (data: any) => {
    try {
        const response = await front_api(
            "PUT",
            "/document_code/edit",
            data,
            { wrapData: true }
        );

        if (!response) return { success: false };

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("editDocumentCodes Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
