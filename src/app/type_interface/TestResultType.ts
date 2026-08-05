import type { Employee } from './EmployeeType';
import type { Machine } from './MachineType';
import type { ItemComponentVersion } from './WorkOrderType';

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
    base_labor_cost: number | null;
    day_labor_cost: number | null;
    ot_labor_cost: number | null;
    total_cost: number | null;
}

export interface TestResultPhoto {
    photo_id: number;
    caption: string | null;
    sequence: number;
    url: string | null;
    created_date: string;
    created_by: string;
}

export interface TestResultSpec {
    spec_id?: number;
    construction: string | null;
    grade: string | null;
    coating: string | null;
    diameter: number | null;
    nominal_length: number | null;
    tensile_strength: number | null;
    manufacturer: string | null;
    batch_no: string | null;
    termination: string | null;
}

export interface TestResultDetail {
    test_result_id: number;
    test_result_code: string;
    qc_work_order_id: number | null;
    session_status: 'PENDING' | 'INPROGRESS' | 'PAUSED' | 'COMPLETED';
    claimed_qty: number;
    overall_status: 'PASSED' | 'FAILED' | null;
    test_method: string | null;
    test_type: 'PROOF_LOAD' | 'BREAKING' | 'VISUAL' | 'DIMENSIONAL' | null;
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
    photos: TestResultPhoto[];
    spec: TestResultSpec | null;
    cost: TestResultCost | null;
    /**
     * True when the WorkRuns feeding this session were pinned to more than one
     * version of the same component (TestSpec unification "mixed version"
     * decision — see project_testspec_unification memory). Render the session
     * as normal, just show a soft warning; never block on this.
     */
    mixed_version?: boolean;
    /**
     * The component version this session's tested pieces were actually built
     * against — resolved from the feeding WorkRuns' pins (or the TestSpec's
     * pinned version), NOT the live template. Present only on COMPONENT_SECTION
     * sessions. Used to show the pinned test-section spec read-only so the
     * tester references the as-built document (S5 — see
     * project_testspec_unification memory). When mixed_version is true this is
     * the highest-version pin among the sources.
     */
    resolved_component_version?: ItemComponentVersion | null;
}
