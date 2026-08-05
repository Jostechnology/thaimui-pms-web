import type { ComponentEditRequest } from './ComponentEditRequestType';
import type { Employee } from './EmployeeType';
import type { Machine } from './MachineType';
import { Material } from './MaterialType';
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

export interface MachineCost {
    depreciation_per_second: number;
    depreciation_cost: number | null;
    maintenance_rate_per_second: number;
    maintenance_cost: number | null;
    total_cost: number | null;
}

export interface WorkRunMachineEntry {
    work_run_machine_id: number;
    work_run_id: number;
    machine_id: number;
    from_time: string;
    to_time: string | null;
    allocated_maintenance_cost: number | null;
    machine: Machine;
    cost: MachineCost | null;
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
    material_list : Material
}

export interface WorkRunCost {
    cost_id: number;
    work_run_id: number;
    material_cost: number | null;
    depreciation_cost: number | null;
    maintenance_cost: number | null;
    base_labor_cost: number | null;
    day_labor_cost: number | null;
    ot_labor_cost: number | null;
    total_cost: number | null;
}

// Full WorkRun display — returned from GET /api/work_run/:id (WorkRunDisplaySchema)
export interface WorkRunDetail extends WorkRun {
    assignments: WorkRunAssignment[];
    machines: WorkRunMachineEntry[];
    breaks: WorkRunBreak[];
    required_items: WorkRunRequiredItem[];
    work_order: WorkOrder | null;
    cost: WorkRunCost | null;
}

export interface SalesItemTestResult {
    test_result_id: number;
    failed_item_qty: number;
    created_date: string | null;
    doc_num?: string | null;
    work_run_id?: number | null;
}

// ─── Material-code autofill (POST /decode_item_codes) ────────
// Best-effort decode of a material's item_code into detail-cell fields.
// Every field is optional: SLING/CHAIN emit a subset of structured fields,
// non-decodable categories emit only `description`, and a miss emits none.
// Keys deliberately match the FE schema keys in TemplateSectionForm.tsx.
export interface DecodedFields {
    type?: string;
    brand?: string;
    manufacturer?: string;
    structure?: string;
    core?: string;
    spiral?: string;
    grade?: string;
    grade_unit?: string;
    size?: string;
    description?: string;
}

// 'decode' = positional code decode (SLING/CHAIN); 'reference' = description
// lookup; 'none' = neither matched (FE shows a non-blocking hint).
export type DecodeSource = 'decode' | 'reference' | 'none';

export interface DecodeResult {
    source: DecodeSource;
    fields: DecodedFields;
}

// Keyed by raw item_code, as returned by the decode endpoint.
export type DecodeMap = Record<string, DecodeResult>;

export interface DecodeItemCodesResponse {
    results: DecodeMap;
}

// ─── Item-description upload (POST /upload_item_decode) ───────
// Validation report returned after uploading the item-description xlsx.
// `blocked` non-empty => import REJECTED, nothing was written.
export interface ItemDecodeLoadedCounts {
    SLING: number;
    CHAIN: number;
    reference: number;
}

export interface ItemDecodeUploadReport {
    ok: boolean;
    blocked: string[];   // non-empty => import rejected, nothing written
    warnings: string[];  // import proceeded despite these
    reserved: string[];  // info: declared positions with no meaning yet
    loaded_counts: ItemDecodeLoadedCounts;
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
        cost_per_unit?: number;
    };
}

export interface ComponentTemplateSectionData {
    section_data_id: number;
    section_type: string;
    data: any;
    section_key: string;
    item_component_id: number;
    /**
     * Per-component override of the template section's is_test_section flag.
     * null = inherit the template's value. Resolution rule: override if not
     * null, else the template section's flag, else false.
     */
    is_test_section?: boolean | null;
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
    /** how many document versions this component has produced — 0 = never saved/generated */
    doc_version: number;
    /** true once a document version exists; editing then needs an approved edit request */
    is_locked?: boolean;
    lock_reason?: string | null;
    /** the PENDING/APPROVED request that currently governs editing, if any */
    active_edit_request?: ComponentEditRequest | null;
    /** resolved: true if ANY section (template or override) resolves to a test section */
    has_test_section?: boolean;
    /** resolved section keys that are tests */
    test_section_keys?: string[];
}

// ─── Component save — test-section-skipped notice ─────────────
// Present only on the item-component SAVE response (POST .../save), never on
// GET/detail payloads: the component declares a test section but the parent
// SalesItem isn't marked `test = true`, so the BE created NO TestSpec / QC
// document for it (BE1 gate — see project_testspec_unification memory). The
// FE surfaces this as an info toast instead of silently doing nothing.
export interface TestSectionNotice {
    skipped: true;
    component_names: string[];
}

// Same shape as ItemComponent everywhere else, plus the save-only notice above.
// The save envelope carries the saved ItemComponent in `data` and the BE1
// skip-notice as a SIBLING key (matches the batch endpoint's
// `test_section_notices` and the list-endpoint `total/page/pages` convention),
// NOT merged into the component. Consume it at `res.test_section_notice`.

// ─── Component document versioning ───────────────────────────
// Every save of a component's sections freezes a snapshot and generates its own
// document under work_orders/{wo_code}/components/{id}/v{n} (older, backfilled
// components keep their legacy path without the /v{n} suffix) — always download
// through `doc_path`, never by rebuilding the path.
export interface ItemComponentVersion {
    version_id: number;
    item_component_id: number;
    version_no: number;
    component_name: string;
    remark: string | null;
    img_url: string | null;
    component_template_id: number | null;
    template_name: string | null;
    // ── Frozen blobs — omitted by the version LIST endpoint, present on the detail one ──
    /** shaped like TemplateSection[] from ComponentTemplateType, frozen as raw JSON */
    sections_snapshot?: any[];
    section_data_snapshot?: { section_key: string; section_type: string; data: any; is_test_section?: boolean }[];
    material_usage_snapshot?: any[];
    doc_ref_no: string | null;
    /** storage path of this version's document — feed to downloadComponentDocumentByPath() */
    doc_path: string | null;
    change_reason: string | null;
    edit_request_id: number | null;
    created_by: string | null;
    created_date: string;
}

// Pins the exact component document version a work run was started against, so
// the shop floor keeps reading the paper it began with even after a re-approval.
// superseded_date is set when a newer version replaces the pin.
export interface WorkRunComponentPin {
    pin_id: number;
    work_run_id: number;
    item_component_id: number;
    version_id: number;
    version_no: number;
    superseded_date: string | null;
    reason: string | null;
    created_by: string | null;
    created_date: string;
    component_name: string | null;
    doc_ref_no: string | null;
    doc_path: string | null;
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
    base_salary_at_run: number;
    day_rate_at_run: number;
    ot_hourly_rate_at_run: number;
    from_time: string | null;
    to_time: string | null;
    time_spent_seconds: number;
    effective_seconds: number;
    base_cost: number;
    day_cost: number;
    ot_cost: number;
    net_cost: number;
}

export interface WorkRunMachineBreakdown {
    work_run_machine_id: number;
    machine_id: number;
    machine_name: string | null;
    machine_code: string | null;
    is_second_hand: boolean;
    from_time: string | null;
    to_time: string | null;
    cost: MachineCost;
}

export interface WorkRunCostDetailData {
    work_run_id: number;
    lot_number: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_work_seconds: number;
    total_base_labor_cost: number;
    total_day_labor_cost: number;
    total_ot_labor_cost: number;
    total_labor_cost: number;
    employee_breakdown: WorkRunEmployeeBreakdown[];
    machine_breakdown: WorkRunMachineBreakdown[];
    breaks: BreakData[];
}
