import { front_api } from "./apiConfig";

export interface SalesOrderSummary {
    doc_entry: number;
    doc_num: number;
    card_code: string;
    card_name: string;
    slp_code: string;
    slp_name: string;
    bpl_code: string;
    bpl_name: string;
    group_code: string;
    group_name: string;
    created_date: string;
    sales_items_count: number;
    work_orders_count: number;
}

export const getSalesOrderList = async (
    page: number,
    per_page: number,
    search: string = ""
) => {
    try {
        const token = localStorage.getItem('tk-jos');

        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);

        const headers = {
            "Authorization": `Bearer ${token}`
        };

        const response = await front_api(
            "GET",
            `/sales_order/get_all?${params.toString()}`,
            {},
            {
                wrapData: false,
                headers: headers
            }
        );

        if (!response) return false;

        const result = await response.json();

        if (response.ok) {
            return { data: result.data, pagination: result.pagination, success: true };
        } else {
            return { ...result, success: false };
        }
    } catch (error) {
        console.error("getSalesOrderList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getSalesOrderById = async (doc_entry: number) => {
    try {
        const token = localStorage.getItem('tk-jos');

        const headers = {
            "Authorization": `Bearer ${token}`
        };

        const response = await front_api(
            "GET",
            `/sales_order/get_by_doc_entry/${doc_entry}`,
            {},
            {
                wrapData: false,
                headers: headers
            }
        );

        if (!response) return false;

        const result = await response.json();

        if (response.ok) {
            return { ...result, success: true };
        } else {
            return { ...result, success: false };
        }
    } catch (error) {
        console.error("getSalesOrderById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}
