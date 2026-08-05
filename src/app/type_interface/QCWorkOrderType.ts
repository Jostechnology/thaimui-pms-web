import { Material } from "./MaterialType";

// ─── TestSpec unification ──────────────────────────────────────
// A SalesItem can carry multiple TestSpecs: DIRECT (manual QC, created via
// the "สร้างใบสั่งเทส" flow) or COMPONENT_SECTION (auto, one per ItemComponent
// that declares a test section — see project_testspec_unification memory).
// This replaces the old nullable source_work_order_id fork: COMPONENT_SECTION
// specs now carry the specific item_component_id + the version the spec was
// pinned to, so two test-section components on the same sales item no longer
// collapse into one indistinguishable QC row.
export interface TestSpec {
  test_spec_id: number;
  source_type: "DIRECT" | "COMPONENT_SECTION";
  item_component_id: number | null;
  component_name: string | null;
  version_no: number | null;
  section_keys: string[] | null;
}

export interface QCWorkOrderItem {
  id: string;
  code: string;
  description: string;
  wll: string;
  quantity: string;
  required_qty?: number;
  serialNo: string;
  remark: string;
  unit_name?: string;
  material_list_id?: number;
  material_list : Material
}

export interface QCWorkOrderData {
  id?: string;
  work_order_id: number | null;
  date: string;
  documentNumber: string;
  customerCode: string;
  customerName: string;
  docNum: string;
  customerReceiptNumber: string;
  docEntry: string
  salesName: string
  salesCode: string
  teamCode: string
  teamName: string
  inspectionDate: string
  salesItemId?: number
  salesItemCode?: string
  quantity: number

  // Component-declared QC work order (auto-created from a component's test
  // section). is_component_declared is true iff test_spec?.source_type ===
  // "COMPONENT_SECTION" — kept as its own field because it's cheap to check
  // without null-guarding test_spec everywhere. NOTE: kept snake_case on
  // purpose — these are passthrough fields from the BE, not part of the
  // hand-mapped camelCase form payload (see ViewQCWorkOrder.tsx).
  // source_work_order_id / source_work_order_code are REMOVED (TestSpec
  // unification) — use test_spec.item_component_id / component_name instead.
  test_spec?: TestSpec | null
  is_component_declared?: boolean

  // Testing standards
  ptt: boolean;
  chevron: boolean;
  valeur: boolean;
  ophir: boolean;
  threeSpec: boolean;
  standardOthers: boolean;
  standardOthersText: string;

  // Testing types
  inHouse: boolean;
  thirdParty: boolean;
  ndt: boolean;
  testingOthers: boolean;
  testingOthersText: string;

  // Serial number options
  continueSerial: boolean;
  serialImprint: boolean;
  serialTag: boolean;
  serialOthers: boolean;
  serialOthersText: string;

  // Remark
  generalRemark: string;
  details: string

  // Items
  items: QCWorkOrderItem[];
}

export type SearchQcWorkOrders = {
  qc_work_order_id?: number;
  qc_by : string;
}