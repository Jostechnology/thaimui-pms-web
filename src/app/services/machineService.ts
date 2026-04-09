import { front_api } from "./apiConfig";
import type {
    Machine,
    MachineListResponse
} from "../type_interface/MachineType";

export interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

const getHeaders = () => {
    const activeBranchId = localStorage.getItem('activeBranchId');
    return {
        "X-Branch-ID": activeBranchId || ''
    };
};

const handleResponse = async <T = any>(response: Response | false | undefined): Promise<APIResponse<T>> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};


export const getMachineList = async (
    page: number = 1,
    per_page: number = 10,
    search: string = "",
    status: string = ""
): Promise<APIResponse<MachineListResponse>> => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", per_page.toString());
        if (search) params.append("search", search);
        if (status) params.append("status", status);

        const queryString = params.toString();
        const path = queryString ? `/get_machine_list?${queryString}` : `/get_machine_list`;

        const response = await front_api(
            "GET",
            path,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<MachineListResponse>(response);
    } catch (error) {
        console.error("getMachineList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getMachineById = async (id: number | string): Promise<APIResponse<Machine>> => {
    try {
        const response = await front_api(
            "GET",
            `/get_machine_id/${id}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<Machine>(response);
    } catch (error) {
        console.error("getMachineById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createMachine = async (data: any): Promise<APIResponse<Machine>> => {
    try {
        const response = await front_api(
            "POST",
            "/create_machine",
            data,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<Machine>(response);
    } catch (error) {
        console.error("createMachine Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างข้อมูลเครื่องจักร" };
    }
};

export const updateMachine = async (id: number | string, data: any): Promise<APIResponse<Machine>> => {
    try {
        const response = await front_api(
            "PUT",
            `/update_machine/${id}`,
            data,
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse<Machine>(response);
    } catch (error) {
        console.error("updateMachine Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลเครื่องจักร" };
    }
};

export const deleteMachine = async (id: number | string): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/delete_machine/${id}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("deleteMachine Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูลเครื่องจักร" };
    }
};
