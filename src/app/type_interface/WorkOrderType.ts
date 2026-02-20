import type { Employee } from './EmployeeType';


export type WorkOrderStatus =
    | 'พร้อม'
    | 'กำลังดำเนินการ'
    | 'เสร็จสิ้น';


export type WorkPhaseStatus =
    | 'รอดําเนินการ'
    | 'กําลังดําเนินการ'
    | 'หยุดชั่วคราว'
    | 'เสร็จสิ้น';


export type BreakType = 'พักกลางวัน' | 'พักเบรค' | 'อื่นๆ';
export interface WorkPhaseBreak {
    break_id: number;
    work_phase_id: number;
    break_start: string;
    break_end: string | null;
    break_type: BreakType;
}

export interface WorkPhase {
    work_phase_id: number;
    work_order_id: number;
    phase_name: string;
    phase_status: WorkPhaseStatus;
    start_date: string | null;
    end_date: string | null;
    created_date: string;
    employee_list: Employee[];
    breaks: WorkPhaseBreak[];
}


export interface SalesItem {
    sales_item_id: number;
    item_code: string;
    item_num: number;
    item_name: string;
    item_description: string;
    cost_price: number;
    unit_price: number;
    doc_num: string;
}


export interface WorkOrder {
    work_order_id: number;
    doc_num: string;
    created_date: string;
    status: WorkOrderStatus;
    current_phase: WorkPhase | null;
    work_phases: WorkPhase[];
    sales_item: SalesItem | null;
}


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
    READY = 'READY',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED'
}