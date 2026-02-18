// ==========================================
// WorkOrder Dashboard Types
// ==========================================

export interface WorkOrderSummary {
    work_order_id: number;
    doc_num: string;
    doc_entry: string;
    status: WorkOrderStatus;
    created_date: string;
    sales_item_id: number;
    current_phase: {
        work_phase_id: number;
        phase_name: string;
        phase_status: string;
        start_time: string;
        end_time: string | null;
        employee_list: WorkPhaseEmployee[];
    } | null;
}

export interface WorkPhaseEmployee {
    employee_id: number;
    employee_first_name: string;
    employee_last_name: string;
    status: string;
}

export type WorkOrderStatus =
    | 'รอกำหนดข้อมูล'
    | 'ดีไซน์'
    | 'รอเบิกของ'
    | 'รอเริ่มงาน'
    | 'กำลังทำงาน'
    | 'เสร็จ'
    | 'รอเทส'
    | 'กำลังเทส'
    | 'สำเร็จ';

export interface StatusCount {
    status: WorkOrderStatus;
    count: number;
    color: string;
}

export interface EmployeeWorkload {
    employee_id: number;
    employee_name: string;
    active_tasks: number;
    completed_tasks: number;
}

export interface DashboardKPI {
    total: number;
    active: number;
    completed: number;
    waiting: number;
    overdue: number;
}

export enum WorkOrderStatusEnum{
    พร้อม = 'พร้อม',
    กำลังดําเนินการ = 'กำลังดําเนินการ',
    เสร็จสิ้น = 'เสร็จสิ้น'
}