import { front_api } from "./apiConfig";
import { getIsAllBranch } from "../helpers/appHelpers";

export type UrgencyLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface SalesOrderSummary {
    test_total: number;
    test_has_qcworkorder: number;
    doc_entry: number;
    doc_num: number;
    card_code: string;
    card_name: string;
    slp_code: string;
    slp_name: string;
    bpl_code: string;
    bpl_name: string;
    branch_code: string | null;
    branch_name: string | null;
    group_code: string;
    group_name: string;
    created_date: string;
    items_total: number;
    quantity_to_produce: number;
    produced_qty: number;
    qc_count: number;
    qc_passed: number;
    qc_failed: number;
    produce_total: number;
    produce_has_workorder: number;
    item_group : string
    status: 'INPROGRESS' | 'COMPLETED';
    urgency_level: UrgencyLevel | null;
}

export const getSalesOrderList = async (
    page: number,
    per_page: number,
    search: string = "",
    start_date: string = "",
    end_date: string = "",
    urgency_level: UrgencyLevel | "" = "",
    sort_by: string = "",
    sort_order: "asc" | "desc" = "desc"
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
        });

        if (search) params.append("search", search);
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (urgency_level) params.append("urgency_level", urgency_level);
        if (sort_by) {
            params.append("sort_by", sort_by);
            params.append("sort_order", sort_order);
        }

        const endpoint = getIsAllBranch()
            ? `/all_branch/sales_order/get_all`
            : `/sales_order/get_all`;

        const response = await front_api(
            "GET",
            `${endpoint}?${params.toString()}`,
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

export const assignBranchToSalesOrder = async (doc_entry: number, branch_id: number) => {
    try {
        const response = await front_api(
            "POST",
            `/sales_order/${doc_entry}/pms_assign_branch`,
            { branch_id },
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("assignBranchToSalesOrder Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const deleteSalesOrderByDocNum = async (doc_num: number) => {
    try {
        const response = await front_api(
            "DELETE",
            `/sales_order/cascade/${doc_num}`,
            {},
            { wrapData: false }
        );

        if (!response) return false;

        const result = await response.json();
        return response.ok ? { ...result, success: true } : { ...result, success: false };
    } catch (error) {
        console.error("deleteSalesOrderByDocNum Error:", error);
        return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว" };
    }
}

export const getSalesOrderById = async (doc_entry: number) => {
    try {
        const endpoint = `/sales_order/get_by_doc_entry/${doc_entry}`;

        const response = await front_api(
            "GET",
            endpoint,
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
