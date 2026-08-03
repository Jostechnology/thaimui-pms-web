// Centralized status -> Thai label and status -> badge-class lookups.
//
// Before this file existed, every list/detail page declared its own copy of
// these maps, and the Thai wording (and sometimes the badge colour) drifted
// between copies. Each exported pair below is the single source of truth for
// one status domain — call sites should import from here instead of
// re-declaring their own Record<Status, string>.
//
// Types are reused from where the codebase already declares them
// (type_interface/WorkOrderType, type_interface/TestResultType,
// services/salesOrder) rather than re-invented here. Where no type existed
// yet (QC work order status), a minimal local union is declared.

import { WorkOrderStatusEnum, WorkPhaseStatusEnum } from '../type_interface/WorkOrderType';
import type { TestResultDetail } from '../type_interface/TestResultType';
import type { UrgencyLevel } from '../services/salesOrder';

// ─── Work order status (READY / INPROGRESS / WAIT_TEST / TESTING / COMPLETED) ───

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatusEnum, string> = {
    [WorkOrderStatusEnum.READY]: 'พร้อม',
    [WorkOrderStatusEnum.INPROGRESS]: 'กำลังดำเนินงาน',
    [WorkOrderStatusEnum.WAIT_TEST]: 'รอทดสอบ',
    [WorkOrderStatusEnum.TESTING]: 'กำลังทดสอบ',
    [WorkOrderStatusEnum.COMPLETED]: 'เสร็จสิ้น',
};

export const WORK_ORDER_STATUS_BADGE: Record<WorkOrderStatusEnum, string> = {
    [WorkOrderStatusEnum.READY]: 'badge-light-primary',
    [WorkOrderStatusEnum.INPROGRESS]: 'badge-light-warning',
    [WorkOrderStatusEnum.WAIT_TEST]: 'badge-light-info',
    [WorkOrderStatusEnum.TESTING]: 'badge-light-info',
    [WorkOrderStatusEnum.COMPLETED]: 'badge-light-success',
};

// Sales item status — SalesItem.status walks the exact same production
// journey as WorkOrder.status in this codebase (SalesItemTrackingModal.tsx
// used to keep a byte-identical second copy of the map above just for this).
// Kept as separate exports so call sites can express "this is a sales item
// status" in their imports, but the values are intentionally the same object.
export const SALES_ITEM_STATUS_LABEL: Record<WorkOrderStatusEnum, string> = WORK_ORDER_STATUS_LABEL;
export const SALES_ITEM_STATUS_BADGE: Record<WorkOrderStatusEnum, string> = WORK_ORDER_STATUS_BADGE;

// ─── Work phase status (PENDING / INPROGRESS / PAUSED / COMPLETED) ───

export const WORK_PHASE_STATUS_LABEL: Record<WorkPhaseStatusEnum, string> = {
    [WorkPhaseStatusEnum.PENDING]: 'รอดำเนินการ',
    [WorkPhaseStatusEnum.INPROGRESS]: 'กำลังดำเนินการ',
    [WorkPhaseStatusEnum.PAUSED]: 'ระงับ/หยุดชั่วคราว',
    [WorkPhaseStatusEnum.COMPLETED]: 'เสร็จสิ้น',
};

export const WORK_PHASE_STATUS_BADGE: Record<WorkPhaseStatusEnum, string> = {
    [WorkPhaseStatusEnum.PENDING]: 'badge-light-secondary',
    [WorkPhaseStatusEnum.INPROGRESS]: 'badge-light-warning',
    [WorkPhaseStatusEnum.PAUSED]: 'badge-light-dark',
    [WorkPhaseStatusEnum.COMPLETED]: 'badge-light-success',
};

// ─── QC work order status ───
// No enum exists for this yet (QCWorkOrderType.ts only carries `status:
// string`), so a minimal local union is declared here instead of inventing
// one further away from where it is used.
export type QCWorkOrderStatus = 'PENDING' | 'INPROGRESS' | 'PASSED' | 'FAILED';

export const QC_WORK_ORDER_STATUS_LABEL: Record<QCWorkOrderStatus, string> = {
    PENDING: 'รอดำเนินการ',
    INPROGRESS: 'กำลังดำเนินการ',
    PASSED: 'ผ่าน',
    FAILED: 'ไม่ผ่าน',
};

export const QC_WORK_ORDER_STATUS_BADGE: Record<QCWorkOrderStatus, string> = {
    PENDING: 'badge-light-primary',
    INPROGRESS: 'badge-light-warning',
    PASSED: 'badge-light-success',
    FAILED: 'badge-light-danger',
};

// ─── Test result session status (PENDING / INPROGRESS / PAUSED / COMPLETED) ───
// Reuses the literal union already declared on TestResultDetail.session_status.
export type TestResultSessionStatus = TestResultDetail['session_status'];

export const TEST_RESULT_SESSION_STATUS_LABEL: Record<TestResultSessionStatus, string> = {
    PENDING: 'รอดำเนินการ',
    INPROGRESS: 'กำลังทดสอบ',
    PAUSED: 'หยุดชั่วคราว',
    COMPLETED: 'เสร็จสิ้น',
};

export const TEST_RESULT_SESSION_STATUS_BADGE: Record<TestResultSessionStatus, string> = {
    PENDING: 'badge-light-secondary',
    INPROGRESS: 'badge-light-warning',
    PAUSED: 'badge-light-info',
    COMPLETED: 'badge-light-success',
};

// ─── Test result overall status (PASSED / FAILED) ───
// Reuses the literal union already declared on TestResultDetail.overall_status
// (minus null, which call sites branch on separately before rendering a badge).
export type TestResultOverallStatus = NonNullable<TestResultDetail['overall_status']>;

export const TEST_RESULT_OVERALL_STATUS_LABEL: Record<TestResultOverallStatus, string> = {
    PASSED: 'ผ่าน',
    FAILED: 'ไม่ผ่าน',
};

export const TEST_RESULT_OVERALL_STATUS_BADGE: Record<TestResultOverallStatus, string> = {
    PASSED: 'badge-light-success',
    FAILED: 'badge-light-danger',
};

// ─── Urgency ───

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
    LOW: 'ต่ำ',
    NORMAL: 'ปกติ',
    HIGH: 'สูง',
    URGENT: 'เร่งด่วน',
};

export const URGENCY_BADGE: Record<UrgencyLevel, string> = {
    LOW: 'badge-light-secondary',
    NORMAL: 'badge-light-primary',
    HIGH: 'badge-light-warning',
    URGENT: 'badge-light-danger',
};
