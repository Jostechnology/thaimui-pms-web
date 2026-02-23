
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

export enum WorkOrderStatusEnum {
    READY = 'READY',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED'
}

export interface EmployeeBreakdown {
    employee_id: number;
    employee_first_name: string;
    employee_last_name: string;
    status: string;
    salary_at_phase: number;
    hourly_rate: number;
    time_spent_seconds: number;
    net_cost: number;
}

export interface BreakData {
    break_id: number;
    work_phase_id: number;
    break_start: string;
    break_end: string | null;
    break_type: string;
}

export interface PhaseDetailData {
    work_phase_id: number;
    phase_name: string;
    phase_status: string;
    created_date: string;
    start_date: string | null;
    end_date: string | null;
    work_order_id: number;
    doc_num: string;
    total_time_spent_seconds: number;
    total_labor_cost: number;
    employee_breakdown: EmployeeBreakdown[];
    breaks: BreakData[];
}