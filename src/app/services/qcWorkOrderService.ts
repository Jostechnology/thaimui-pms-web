import { front_api } from "./apiConfig";

interface APIResponse {
    success: boolean;
    message?: string;
    data?: any;
    pagination? : any
}

const handleResponse = async (response: Response | false | undefined): Promise<APIResponse> => {
    if (!response) {
        return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
        return { ...result, success: true };
    }
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

// List QC Work Orders (paginated + search)
export const getQCWorkOrderList = async (
    page: number,
    per_page: number,
    search: string = "",
    filter: string = "",
    start_date: string = "",
    end_date: string = ""
): Promise<APIResponse> => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });
        if (search) params.append("search", search);
        if (filter) params.append("filter", filter);
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);

        const response = await front_api(
            "GET",
            `/get_qc_work_order_list?${params.toString()}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getQCWorkOrderList Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

// Get QC Work Order by ID
export const getQCWorkOrderById = async (id: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "GET",
            `/qc_work_order/${id}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("getQCWorkOrderById Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
};

const buildQCItemsPayload = (items: any[]) =>
    items.map((item: any) => ({
        item_code: item.code ?? item.item_code ?? "",
        description: item.description ?? "",
        wll: item.wll ?? "",
        quantity: item.quantity ?? "",
        serial_no: item.serialNo ?? item.serial_no ?? "",
        item_remark: item.remark ?? item.item_remark ?? "",
        ...(item.material_list_id != null ? { material_list_id: item.material_list_id } : {}),
    }));

// Create QC Work Order
export const createQCWorkOrder = async (data: any): Promise<APIResponse> => {
    try {
        const payload = {
            ...data,
            items: buildQCItemsPayload(data.items ?? []),
        };
        const response = await front_api(
            "POST",
            "/qc_work_order/create",
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("createQCWorkOrder Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างใบสั่งเทส" };
    }
};

// Update QC Work Order
export const updateQCWorkOrder = async (id: number, data: any): Promise<APIResponse> => {
    try {
        const payload = {
            ...data,
            items: buildQCItemsPayload(data.items ?? []),
        };
        const response = await front_api(
            "PUT",
            `/qc_work_order/update/${id}`,
            payload,
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("updateQCWorkOrder Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขใบสั่งเทส" };
    }
};

// Delete QC Work Order
export const deleteQCWorkOrder = async (id: number): Promise<APIResponse> => {
    try {
        const response = await front_api(
            "DELETE",
            `/qc_work_order/delete/${id}`,
            {},
            { wrapData: false }
        );
        return await handleResponse(response);
    } catch (error) {
        console.error("deleteQCWorkOrder Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบใบสั่งเทส" };
    }
};
export const searchQcWorkOrder = async (search: string) => {
    const response = await front_api(
        "GET",
        `/search_qc_work_order?search=${search}`,
        {},
        { wrapData: false }
    );
    return response;
};
