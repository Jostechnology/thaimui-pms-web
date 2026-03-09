import { front_api } from "./apiConfig";
import type {
    MaterialStockSummary,
    MaterialValidationRequest,
    MaterialValidationResponse,
    MaterialTransaction,
    MaterialUsageDetail,
} from "../type_interface/MaterialStockType";

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

/**
 * ดึงสรุปยอดคงเหลือวัตถุดิบทั้งหมดของ Sales Item
 */
export const getMaterialStockSummary = async (
    salesItemId: number
): Promise<APIResponse & { data?: MaterialStockSummary[] }> => {
    try {
        const response = await front_api(
            "GET",
            `/material_stock/summary/${salesItemId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getMaterialStockSummary Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * ตรวจสอบจำนวนวัตถุดิบว่าเพียงพอหรือไม่ก่อนสร้าง/แก้ไข Work Order
 */
export const validateMaterialStock = async (
    payload: MaterialValidationRequest
): Promise<APIResponse & { data?: MaterialValidationResponse }> => {
    try {
        const response = await front_api(
            "POST",
            "/material_stock/validate",
            payload,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("validateMaterialStock Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * ดึงรายละเอียดการใช้วัตถุดิบทั้งหมด — ผลิตที่ไหน เทสอะไร เอกสารอะไรบ้าง
 */
export const getMaterialUsageDetail = async (
    materialListId: number
): Promise<APIResponse & { data?: MaterialUsageDetail }> => {
    try {
        const response = await front_api(
            "GET",
            `/material_stock/usage_detail/${materialListId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getMaterialUsageDetail Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * ดึงประวัติ transaction ของวัตถุดิบ (ตาราง t_material_transaction)
 * กรองตาม type ได้ เช่น 'REMOVE' สำหรับเทส
 */
export const getMaterialTransactions = async (
    salesItemId: number,
    type?: string
): Promise<APIResponse & { data?: MaterialTransaction[] }> => {
    try {
        const params = new URLSearchParams();
        if (type) params.append("type", type);

        const response = await front_api(
            "GET",
            `/material_stock/transactions/${salesItemId}?${params.toString()}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getMaterialTransactions Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

/**
 * ดึงรายการวัตถุดิบทั้งหมดพร้อมสรุปยอดคงเหลือ สำหรับหน้า Tracking
 * กรองตามประเภทได้ เช่น 'test' หรือ 'production'
 */
export const getAllMaterialTracking = async (
    params?: { search?: string; type?: string }
): Promise<APIResponse & { data?: MaterialStockSummary[] }> => {
    try {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append("search", params.search);
        if (params?.type) searchParams.append("type", params.type);

        const queryStr = searchParams.toString();
        const response = await front_api(
            "GET",
            `/material_stock/tracking${queryStr ? `?${queryStr}` : ''}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getAllMaterialTracking Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
