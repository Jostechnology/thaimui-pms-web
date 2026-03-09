
//ประกาศ Interface สำหรับก้อนข้อมูล Machine ตามที่ Backend ส่งมา
export type Machine = {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    machine_description: string | null;
    manufacturer: string | null;
    purchase_date: string | null;
    status: string; // เช่น 'IDLE', 'RUNNING', 'DOWN'
    is_active: boolean;
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
    total: number;
}