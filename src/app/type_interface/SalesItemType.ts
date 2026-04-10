import type { Material } from './MaterialType';

export type SalesItem = {
    sales_item_id: number;
    status: string;
    item_code: string;
    quantity: number;
    item_name: string;
    item_group: string;
    item_description: string;
    unit_name: string;
    unit_id: number;
    cost_price: number;
    unit_price: number;
    doc_num: number;
    doc_entry: number;
    material_list: Material[];
    work_order: any | null;
    producing_qty: number;
    produced_qty: number;
    queued_for_test_qty: number;
    tested_qty: number;
};
