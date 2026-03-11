import { front_api } from "./apiConfig";

export const getPmRepairList = async (
    page: number,
    limit: number,
    search: string = ""
) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const params = new URLSearchParams({
            page: page.toString(),
            pageConfig: limit.toString(),
        });
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/get_pm_repair_list?${params.toString()}`,
            {},
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return false;
        const result = await response.json();
        return response.ok
            ? { ...result, success: true }
            : { ...result, success: false };
    } catch (error) {
        console.error("getPmRepairList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

export const createPmRepair = async (data: {
    machine_name: string;
    repair_date: string;
    repair_cost: number;
    note?: string;
}) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const response = await front_api(
            "POST",
            "/create_pm_repair",
            data,
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return false;
        const result = await response.json();
        return response.ok
            ? { ...result, success: true }
            : { ...result, success: false };
    } catch (error) {
        console.error("createPmRepair Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};
