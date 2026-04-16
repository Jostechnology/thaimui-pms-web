import type { Employee } from './EmployeeType';
import type { Machine } from './MachineType';
import { SalesItem } from './SalesItemType';


// Lightweight WorkRun — returned inside get_work_order_by_id
export interface WorkRun {
    work_run_id: number;
    work_order_id: number;
    quantity: number;
    status: string;
    lot_number: string | null;
    completion_remark: string | null;
    created_date: string | null;
    defect_qty: number | null;
    usable_qty: number | null;
    wms_pick_reference: string | null;
    start_date: string | null;
    end_date: string | null;
}

export interface WorkRunAssignment {
    work_run_assignment_id: number;
    work_run_id: number;
    employee_id: number;
    from_time: string;
    to_time: string | null;
    employee: Employee;
}

export interface WorkRunMachineEntry {
    work_run_machine_id: number;
    work_run_id: number;
    machine_id: number;
    from_time: string;
    to_time: string | null;
    machine: Machine;
}

export interface WorkRunBreak {
    break_id: number;
    work_run_id: number;
    break_start: string;
    break_end: string | null;
    break_type: string;
    remark: string | null;
}

export interface ReworkSource {
    id: number;
    rework_work_run_id: number;
    source_work_run_id: number;
    qty: number;
    created_date: string;
}

export interface WorkRunRequiredItem {
    id: number;
    work_run_id: number;
    material_list_id: number;
    item_code: string;
    item_name: string;
    quantity: number;
    unit: string;
    qty_consumed_actual: number | null;
    created_by: string;
    created_date: string;
}

// Full WorkRun display — returned from GET /api/work_run/:id (WorkRunDisplaySchema)
export interface WorkRunDetail extends WorkRun {
    assignments: WorkRunAssignment[];
    machines: WorkRunMachineEntry[];
    breaks: WorkRunBreak[];
    required_items: WorkRunRequiredItem[];
}

export interface SalesItemTestResult {
    test_result_id: number;
    failed_item_qty: number;
    created_date: string | null;
    doc_num?: string | null;
    work_run_id?: number | null;
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
        item_group: string;
        quantity: number;
        remaining_num: number;
        cost_price: number;
        unit_price: number;
    };
}

export interface ComponentTemplateSectionData {
    section_data_id: number;
    section_type: string;
    data: any;
    section_key: string;
    item_component_id: number;
}

export interface ItemComponent {
    item_component_id: number;
    work_order_id: number;
    component_name: string;
    material_usages: ComponentMaterialUsage[];
    remark: string | null;
    img_url: string | null;
    component_template_id: number | null;
    component_template_sections: ComponentTemplateSectionData[];
}


export interface WorkOrder {
    work_order_id: number;
    work_order_code: string;
    doc_num: string;
    created_date: string;
    quantity: number;
    status: WorkOrderStatusEnum;
    sales_item: SalesItem | null;
    item_components: ItemComponent[];
    work_runs: WorkRun[];
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

export interface WorkRunEmployeeBreakdown {
    employee_id: number;
    employee_first_name: string;
    employee_last_name: string;
    status: string;
    salary_at_run: number;
    hourly_rate: number;
    from_time: string | null;
    to_time: string | null;
    time_spent_seconds: number;
    net_cost: number;
}

export interface WorkRunMachineBreakdown {
    machine_id: number;
    machine_name: string | null;
    from_time: string | null;
    to_time: string | null;
    time_spent_seconds: number;
}

export interface WorkRunCostDetailData {
    work_run_id: number;
    lot_number: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_work_seconds: number;
    total_labor_cost: number;
    employee_breakdown: WorkRunEmployeeBreakdown[];
    machine_breakdown: WorkRunMachineBreakdown[];
    breaks: BreakData[];
}
