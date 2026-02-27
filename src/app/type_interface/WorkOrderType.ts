import type { Employee } from './EmployeeType';


export interface WorkPhaseBreak {
    break_id: number;
    work_phase_id: number;
    break_start: string;
    break_end: string | null;
    break_type: BreakTypeEnum;
}

export interface WorkPhase {
    work_phase_id: number;
    work_order_id: number;
    phase_name: string;
    phase_status: WorkPhaseStatusEnum;
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
    status: WorkOrderStatusEnum;
    current_phase: WorkPhase | null;
    work_phases: WorkPhase[];
    sales_item: SalesItem | null;
}


export interface StatusCount {
    status: WorkOrderStatusEnum;
    count: number;
    color: string;
}

export interface EmployeeWorkload {
    employee_id: number;
    employee_name: string;
    active_tasks: number;
    COMPLETED_tasks: number;
}

export interface DashboardKPI {
    total: number;
    active: number;
    COMPLETED: number;
    waiting: number;
    overdue: number;
}

export enum WorkOrderStatusEnum {
    READY = 'READY',
    INPROGRESS = 'INPROGRESS',
    WAIT_TEST = 'WAIT_TEST',
    TESTING = 'TESTING',
    COMPLETED = 'COMPLETED'
}

export const WORK_ORDER_STATUS_OPTIONS: { value: WorkOrderStatusEnum; label: string }[] = [
    { value: WorkOrderStatusEnum.READY, label: 'พร้อมดำเนินการ' },
    { value: WorkOrderStatusEnum.INPROGRESS, label: 'กำลังดำเนินการ' },
    { value: WorkOrderStatusEnum.WAIT_TEST, label: 'รอทดสอบ (Wait Test)' },
    { value: WorkOrderStatusEnum.TESTING, label: 'กำลังทดสอบ (Testing)' },
    { value: WorkOrderStatusEnum.COMPLETED, label: 'ดำเนินการเสร็จสิ้น' }
];

export enum WorkPhaseStatusEnum {
    PENDING = 'PENDING',
    INPROGRESS = 'INPROGRESS',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED'
}
export enum BreakTypeEnum {
    LUNCHBREAK = 'LUNCHBREAK',
    RESTBREAK = 'RESTBREAK',
    OTHER = 'OTHER'
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
