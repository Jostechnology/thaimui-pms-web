import type { SalesItem } from './SalesItemType';

export type SalesOrderSearch = {
    doc_entry: string
    doc_num: string
}

export type SalesOrderDetail = {
    sales_order_id: number;
    doc_entry: number;
    doc_num: number;
    card_code: string;
    card_name: string;
    slp_code: string;
    slp_name: string;
    bpl_code: string;
    bpl_name: string;
    branch_code: string;
    branch_name: string;
    group_code: string;
    group_name: string;
    status: 'INPROGRESS' | 'COMPLETED';
    // Center-driven cancel (cancel-pending drain). cancel_requested blocks new
    // forward work while in-flight runs/tests finish; cancel_completed_date is set
    // once the drain empties (terminal).
    cancel_requested: boolean;
    cancel_requested_date: string | null;
    cancel_completed_date: string | null;
    items: SalesItem[];
    material_list: any[];
    created_date: string;
}