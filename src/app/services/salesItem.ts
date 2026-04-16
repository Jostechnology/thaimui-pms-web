import { front_api } from "./apiConfig";

export const getSalesItem = async (doc_entry: number) => {
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