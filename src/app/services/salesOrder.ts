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
    items_total: number;
    quantity_to_produce: number;
    produced_qty: number;
    qc_count: number;
    qc_passed: number;
    qc_failed: number;
    status: 'INPROGRESS' | 'COMPLETED';
}

export const getSalesOrderList = async (
    page: number,
    per_page: number,
    search: string = ""
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/sales_order/get_all?${params.toString()}`,
            {},
            { wrapData: false }
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

export const completeSalesItem = async (sales_item_id: number) => {
    try {
        const response = await front_api(
            "POST",
            `/sales_item/${sales_item_id}/complete`,
            {},
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("completeSalesItem Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getSalesOrderById = async (doc_entry: number) => {
    try {
        const response = await front_api(
            "GET",
            `/sales_order/get_by_doc_entry/${doc_entry}`,
            {},
            { wrapData: false }
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
