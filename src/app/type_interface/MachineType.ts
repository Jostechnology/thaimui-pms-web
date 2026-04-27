
export type MachineTypeItem = {
    machine_type_id: number;
    type_name: string;
    type_description: string | null;
    is_active: boolean;
    created_date: string;
    updated_date: string;
    created_by: string | null;
    updated_by: string | null;
};

export type MachineTypeListResponse = {
    items: MachineTypeItem[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
};

//ประกาศ Interface สำหรับก้อนข้อมูล Machine ตามที่ Backend ส่งมา
export type Machine = {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    machine_description: string | null;
    manufacturer: string | null;
    purchase_date: string | null;
    purchase_price: number | null;
    useful_life_years: number | null;
    working_hours_per_day: number | null;
    remaining_maintenance_cost: number | null;
    status: string; // เช่น 'IDLE', 'RUNNING', 'DOWN'
    is_active: boolean;
    is_second_hand: boolean;
    accumulated_hours: number | null;
    machine_type_id: number | null;
    machine_type: {
        machine_type_id: number;
        type_name: string;
        type_description: string | null;
    } | null;
    created_by: string;
    created_date: string;
    updated_by: string;
    updated_date: string;
}

// Interface สำหรับหน้า List ที่มีเรื่อง Pagination และ Filter
export type MachineListResponse = {
    filters: {
        is_active: boolean | null;
        search: string;
        status: string;
    };
    items: Machine[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    prev_page: number | null;
    next_page: number | null;
}