import { front_api } from "./apiConfig";

export const searchSalesOrderService = async (search: string) => {
    try {
        const token = localStorage.getItem('tk-jos');

        const headers = {
            "Authorization": `Bearer ${token}`
        };
        const response = await front_api(
            "GET",
            `/search_sales_order?search=${search}`,
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
        console.error("getWorkOrderById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getSalesOrderService = async (doc_entry: number) => {
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
        console.error("getWorkOrderById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getSalesOrdersForQC = async (search: string = "") => {
    try {
        const token = localStorage.getItem('tk-jos');
        const headers = { "Authorization": `Bearer ${token}` };
        const params = new URLSearchParams();
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/get_sales_orders_for_qc?${params.toString()}`,
            {},
            { wrapData: false, headers }
        );

        if (!response) return false;
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getSalesOrdersForQC Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

// Mock po_reference until backend supports it
export const getSalesOrderForCertificate = async (doc_entry: number) => {
    const result = await getSalesOrderService(doc_entry);
    if (result && result.success && result.data) {
        const poRef = result.data.po_reference || result.data.num_at_card || `PO-${result.data.doc_num || doc_entry}`;
        return { ...result, data: { ...result.data, po_reference: poRef } };
    }
    return result;
};

export const getSalesItemsForQC = async (search: string = "") => {
    try {
        const token = localStorage.getItem('tk-jos');
        const headers = { "Authorization": `Bearer ${token}` };
        const params = new URLSearchParams();
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/get_sales_items_for_qc?${params.toString()}`,
            {},
            { wrapData: false, headers }
        );

        if (!response) return { success: false, data: [] };
        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("getSalesItemsForQC Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}
