import type { Employee } from './EmployeeType';
import type { Machine } from './MachineType';

export interface TestResultMachineCost {
    depreciation_per_second: number;
    depreciation_cost: number | null;
    maintenance_rate_per_second: number;
    maintenance_cost: number | null;
    total_cost: number | null;
}

export interface TestResultBreak {
    break_id: number;
    test_result_id: number;
    break_start: string;
    break_end: string | null;
    break_type: 'LUNCHBREAK' | 'RESTBREAK' | 'OTHER';
    remark: string | null;
}

export interface TestResultAssignment {
    test_result_assignment_id: number;
    test_result_id: number;
    employee_id: number;
    from_time: string;
    to_time: string | null;
    employee: Employee;
}

export interface TestResultMachineEntry {
    test_result_machine_id: number;
    test_result_id: number;
    machine_id: number;
    from_time: string;
    to_time: string | null;
    allocated_maintenance_cost: number | null;
    machine: Machine;
    cost: TestResultMachineCost | null;
}

export interface TestResultCost {
    cost_id: number;
    test_result_id: number;
    material_cost: number | null;
    depreciation_cost: number | null;
    maintenance_cost: number | null;
    labor_cost: number | null;
    total_cost: number | null;
}

export interface TestResultDetail {
    test_result_id: number;
    test_result_code: string;
    qc_work_order_id: number | null;
    session_status: 'PENDING' | 'INPROGRESS' | 'PAUSED' | 'COMPLETED';
    claimed_qty: number;
    overall_status: 'PASSED' | 'FAILED' | null;
    test_date: string | null;
    tested_by: string | null;
    test_method: string | null;
    standard_reference: string | null;
    remark: string | null;
    created_date: string;
    started_at: string | null;
    assignments: TestResultAssignment[];
    machines: TestResultMachineEntry[];
    breaks: TestResultBreak[];
    required_items: any[];
    work_run_sources: any[];
    picking_item_sources: any[];
    test_result_items: any[];
    cost: TestResultCost | null;
}
