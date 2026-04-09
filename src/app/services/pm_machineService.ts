import { front_api } from "./apiConfig";

export const getpmMachineList = async (
    page: number,
    per_page: number,
    search: string = "",
    status: string = ""
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);
        if (status) params.append("status", status);

        const response = await front_api(
            "GET",
            `/get_pm_machine?${params.toString()}`,
            {},
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();

        if (response.ok) {
            return { ...result.data, success: true };
        } else {
            return { ...result, success: false };
        }
    } catch (error) {
        console.error("getSalesOrderList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const createpmMachine = async (data: any) => {
    try {
        const response = await front_api(
            "POST",
            "/create_pm_machine",
            data,
            { wrapData: false }
        );
        if (!response) return { success: false, message: "No response from server" };
        const result = await response.json();
        if (response.ok) {
            return { ...result, success: true };
        } else {
            return { ...result, success: false };
        }
    } catch (error) {
        console.error("createpmMachine Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const getMachineList = async (search: string = "") => {
    try {
        const params = new URLSearchParams({
            page: "1",
            per_page: "999",
            status: "DOWN",
        });
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/get_machine_list?${params.toString()}`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false, items: [] };
        const result = await response.json();
        if (response.ok) {
            return { items: result.data?.items || [], success: true };
        } else {
            return { items: [], success: false };
        }
    } catch (error) {
        console.error("getMachineList Error:", error);
        return { success: false, items: [], message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
