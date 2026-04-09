import { front_api } from "./apiConfig";
import type { MachineTypeItem, MachineTypeListResponse } from "../type_interface/MachineType";

export interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

export const handleResponse = async <T = any>(response: Response | false | undefined): Promise<APIResponse<T>> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const getMachineTypeList = async (
    page: number = 1,
    per_page: number = 10,
    search: string = ""
): Promise<APIResponse<MachineTypeListResponse>> => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", per_page.toString());
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/machine_type/list?${params.toString()}`,
            {},
            { wrapData: false }
        );
        return await handleResponse<MachineTypeListResponse>(response);
    } catch (error) {
        console.error("getMachineTypeList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getAllMachineTypes = async (): Promise<APIResponse<MachineTypeItem[]>> => {
    try {
        const response = await front_api(
            "GET",
            `/machine_type/all`,
            {},
            { wrapData: false }
        );
        return await handleResponse<MachineTypeItem[]>(response);
    } catch (error) {
        console.error("getAllMachineTypes Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getMachineTypeById = async (id: number): Promise<APIResponse<MachineTypeItem>> => {
    try {
        const response = await front_api(
            "GET",
            `/machine_type/${id}`,
            {},
            { wrapData: false }
        );
        return await handleResponse<MachineTypeItem>(response);
    } catch (error) {
        console.error("getMachineTypeById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createMachineType = async (data: any): Promise<APIResponse<MachineTypeItem>> => {
    try {
        const response = await front_api(
            "POST",
            "/machine_type/create",
            data,
            { wrapData: false }
        );
        return await handleResponse<MachineTypeItem>(response);
    } catch (error) {
        console.error("createMachineType Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างประเภทเครื่องจักร" };
    }
};

export const updateMachineType = async (id: number, data: any): Promise<APIResponse<MachineTypeItem>> => {
    try {
        const response = await front_api(
            "PUT",
            `/machine_type/${id}`,
            data,
            { wrapData: false }
        );
        return await handleResponse<MachineTypeItem>(response);
    } catch (error) {
        console.error("updateMachineType Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตประเภทเครื่องจักร" };
    }
};
