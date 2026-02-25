import { front_api } from "./apiConfig";

export const searchSalesOrderService = async (search : string) => {
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

export const getSalesOrderService = async (doc_entry : number) => {
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

