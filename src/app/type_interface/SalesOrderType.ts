import type { SalesItem } from './SalesItemType';

export type SalesOrderSearch = {
    doc_entry: string
    doc_num: string
}

export type SalesOrderDetail = {
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
    items: SalesItem[];
    material_list: any[];
}