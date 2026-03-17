import { front_api } from "./apiConfig";

const getHeaders = () => {
    const token = localStorage.getItem('tk-jos');
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

export const getBranchList = async () => {
    try {
        const response = await front_api(
            "GET", 
            "/get_all_branchs",
            {},
            {
                wrapData: false,
                headers: {}
            }
        );
        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};

export const createBranch = async (data: { branch_code: string; branch_name: string }) => {
    try {
        const response = await front_api(
            "POST",
            "/create_branch",
            data,
            {
                wrapData: false,
                headers: {}
            }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        return await response.json();
    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
};

export const updateBranch = async (branchId: number, data: { branch_code: string; branch_name: string }) => {
    try {
        const response = await front_api(
            "PUT",
            `/update_branch/${branchId}`,
            data,
            { wrapData: false, headers: getHeaders() }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        return await response.json();
    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
};

export const deleteBranch = async (branchId: number) => {
    try {
        const response = await front_api(
            "DELETE",
            `/delete_branch/${branchId}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        return await response.json();
    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
};