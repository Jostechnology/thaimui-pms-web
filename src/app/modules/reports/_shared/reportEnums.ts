/** Shared enum option lists (value = BE enum name, label = Thai) for report filters. */

export const WORKRUN_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'รอดำเนินการ' },
    { value: 'INPROGRESS', label: 'กำลังทำ' },
    { value: 'PAUSED', label: 'หยุดชั่วคราว' },
    { value: 'COMPLETED', label: 'เสร็จสิ้น' },
];

export const TEST_RESULT_STATUS_OPTIONS = [
    { value: 'PASSED', label: 'ผ่าน' },
    { value: 'FAILED', label: 'ไม่ผ่าน' },
];

export const TEST_SESSION_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'รอดำเนินการ' },
    { value: 'INPROGRESS', label: 'กำลังทำ' },
    { value: 'PAUSED', label: 'หยุดชั่วคราว' },
    { value: 'COMPLETED', label: 'เสร็จสิ้น' },
];

export const TEST_TYPE_OPTIONS = [
    { value: 'PROOF_LOAD', label: 'Proof Load' },
    { value: 'BREAKING', label: 'Breaking' },
    { value: 'VISUAL', label: 'Visual' },
    { value: 'DIMENSIONAL', label: 'Dimensional' },
];

export const URGENCY_OPTIONS = [
    { value: 'LOW', label: 'ต่ำ' },
    { value: 'NORMAL', label: 'ปกติ' },
    { value: 'HIGH', label: 'สูง' },
    { value: 'URGENT', label: 'เร่งด่วน' },
];

export const MACHINE_STATUS_OPTIONS = [
    { value: 'RUNNING', label: 'กำลังทำงาน' },
    { value: 'DOWN', label: 'เสีย' },
    { value: 'IDLE', label: 'ว่าง' },
    { value: 'OFFLINE', label: 'ออฟไลน์' },
];

export const DIRECTION_OPTIONS = [
    { value: 'increase', label: 'เพิ่ม (+)' },
    { value: 'decrease', label: 'ลด (−)' },
];

export const MATERIAL_SOURCE_OPTIONS = [
    { value: 'WORKRUN', label: 'การผลิต (WorkRun)' },
    { value: 'TESTRESULT', label: 'การทดสอบ (Test)' },
];
