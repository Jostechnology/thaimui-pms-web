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
    const token = localStorage.getItem('tk-jos');
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

// อัปเกรด handleResponse ให้รองรับ Generics เช่นกัน
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


// เส้น List บังคับเลยว่า data ที่ได้ต้องเป็นโครงสร้างของ MachineListResponse
export const getMachineList = async (
    page: number = 1,
    limit: number = 10,
    search: string = "",
    status: string = ""
): Promise<APIResponse<MachineListResponse>> => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
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

// เส้น By ID บังคับเลยว่า data ที่ได้ต้องเป็นโครงสร้างของ Machine ชิ้นเดียว
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