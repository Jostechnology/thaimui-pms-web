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

export interface ComponentMaterialUsage {
    usage_id: number;
    item_component_id: number;
    material_list_id: number;
    quantity_used: number;
    material_list: {
        material_list_id: number;
        sales_item_id: number;
        item_code: string;
        item_name: string;
        item_description: string;
        original_num: number;
        remaining_num: number;
        cost_price: number;
        unit_price: number;
    };
}

export interface ComponentSpecType {
    component_spec_type_id: number;
    component_spec_type_name: string;
    spec_type: 'boolean' | 'decimal' | 'text';
}

export interface ComponentSpec {
    component_spec_id: number;
    item_component_id: number;
    component_spec_type_id: number;
    end_side: 'top' | 'bottom' | null;
    bool_value: boolean | null;
    decimal_value: number | null;
    text_value: string | null;
    component_spec_type: ComponentSpecType;
}

export interface ComponentOptionType {
    component_option_type_id: number;
    component_option_type_name: string;
}

export interface ComponentOption {
    component_option_id: number;
    component_option_type_id: number;
    item_component_id: number;
    component_option_type: ComponentOptionType;
}

export interface ItemComponent {
    item_component_id: number;
    work_order_id: number;
    component_name: string;
    material_usages: ComponentMaterialUsage[];
    component_specs: ComponentSpec[];
    component_options: ComponentOption[];
    remark: string | null;
    img_url: string | null;
}


export interface WorkOrder {
    work_order_id: number;
    doc_num: string;
    created_date: string;
    status: WorkOrderStatusEnum;
    current_phase: WorkPhase | null;
    work_phases: WorkPhase[];
    sales_item: SalesItem | null;
    item_components: ItemComponent[];
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
