import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { Content } from "../../../../_metronic/layout/components/content";
import "../../workorder/components/WorkorderView.css";
import { getEmployeeTotalCount } from '../../../services/employee';
import { getMachineTotalCount } from '../../../services/machineService';
import {
    getTestResultById,
    startTestResult,
    pauseTestResult,
    resumeTestResult,
    finalizeTestResult,
    getInspectionChecklist,
    addTestResultPhotos,
    deleteTestResultPhoto,
    deleteTestResult,
    createTestResultRequiredItems,
    assignEmployeeToTestResult,
    unassignEmployeeFromTestResult,
    assignMachineToTestResult,
    unassignMachineFromTestResult,
} from "../../../services/testResultService";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import { getLaborSplit, estimateLiveLaborSplit } from "../../../utils/labor_cost_utils";
import { getEmployeeList } from "../../../services/employee";
import { getMachineList } from "../../../services/machineService";
import { formatThaiDate } from "../../../helpers/dataHelpers";
import { formatIntegerInput, toDecimalInput } from "../../../utils/input_format_utils";
import type { Employee } from "../../../type_interface/EmployeeType";
import type { Machine } from "../../../type_interface/MachineType";
import type { TestResultDetail, TestResultBreak, TestResultAssignment, TestResultMachineEntry } from "../../../type_interface/TestResultType";
import type { QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";

// --- Timeline & status helpers (shared with WorkorderView) ---
const getRunStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return '#0d6efd'; case 'COMPLETED': return '#198754';
        case 'PAUSED': return '#fd7e14'; case 'PENDING': return '#6c757d';
        default: return '#adb5bd';
    }
};

const getRunStatusBg = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return '#e7f1ff'; case 'COMPLETED': return '#d1e7dd';
        case 'PAUSED': return '#fff3e0'; case 'PENDING': return '#f8f9fa';
        default: return '#f8f9fa';
    }
};

const getRunStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return 'กำลังดำเนินการ'; case 'COMPLETED': return 'เสร็จสิ้น';
        case 'PAUSED': return 'หยุดชั่วคราว'; case 'PENDING': return 'รอดำเนินการ';
        default: return status;
    }
};

const calcTotalBreakMs = (breaks?: TestResultBreak[]): number => {
    if (!breaks?.length) return 0;
    return breaks.reduce((t, b) => {
        const s = new Date(b.break_start).getTime();
        const e = b.break_end ? new Date(b.break_end).getTime() : Date.now();
        return t + Math.max(0, e - s);
    }, 0);
};

const formatDurationMs = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const formatDateTimeTL = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const formatTimeTL = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const getFullDayBounds = (date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(24, 0, 0, 0);
    return { dayStart, dayEnd };
};

const timeToPercent = (time: Date, s: Date, e: Date): number => {
    const total = e.getTime() - s.getTime();
    if (total === 0) return 0;
    return Math.max(0, Math.min(100, ((time.getTime() - s.getTime()) / total) * 100));
};

const pickIntervalMin = (rangeMs: number): number => {
    const h = rangeMs / 3600000;
    if (h <= 0.5) return 5; if (h <= 1) return 10; if (h <= 2) return 15;
    if (h <= 4) return 30; if (h <= 8) return 60; if (h <= 16) return 120;
    return 180;
};

const buildTimelineLabels = (boundsStart: Date, boundsEnd: Date) => {
    const rangeMs = boundsEnd.getTime() - boundsStart.getTime();
    const intervalMs = pickIntervalMin(rangeMs) * 60000;
    const labels: { label: string; percent: number }[] = [];
    const firstTick = new Date(Math.ceil(boundsStart.getTime() / intervalMs) * intervalMs);
    for (let t = firstTick; t <= boundsEnd; t = new Date(t.getTime() + intervalMs)) {
        const pct = ((t.getTime() - boundsStart.getTime()) / rangeMs) * 100;
        if (pct < 0 || pct > 100) continue;
        labels.push({ label: t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), percent: pct });
    }
    return labels;
};

const fmtSeconds = (sec: number): string => {
    if (sec < 60) return `${Math.floor(sec)}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
};

const fmtCurrency = (val: number | null | undefined): string => {
    if (val == null) return "—";
    return val.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const elapsedSeconds = (fromTime: string, toTime: string | null): number => {
    const start = new Date(fromTime).getTime();
    const end = toTime ? new Date(toTime).getTime() : Date.now();
    return Math.max(0, (end - start) / 1000);
};

const getTodayLocal = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── sub-components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === "COMPLETED") return (
        <span className="wo-status-pill wo-status-pill-green">
            <span className="wo-status-dot" style={{ background: "#22c55e", animation: "none" }} />เสร็จสิ้น
        </span>
    );
    if (status === "INPROGRESS") return (
        <span className="wo-status-pill">
            <span className="wo-status-dot" />กำลังทดสอบ
        </span>
    );
    if (status === "PAUSED") return (
        <span className="wo-status-pill" style={{ background: "#fff3e0", color: "#fd7e14" }}>
            <span className="wo-status-dot" style={{ background: "#fd7e14", animation: "none" }} />พักทดสอบ
        </span>
    );
    if (status === "PENDING") return (
        <span className="wo-status-pill wo-status-pill-grey">
            <span className="wo-status-dot" style={{ animation: "none" }} />รอเริ่ม
        </span>
    );
    return <span className="wo-status-pill wo-status-pill-grey">{status}</span>;
};

const OverallBadge: React.FC<{ status: string | null }> = ({ status }) => {
    if (!status) return null;
    return (
        <span className={`badge fw-bold px-3 py-2 ${status === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
            {status}
        </span>
    );
};

const TestResultLiveTimer = ({ testResult }: { testResult: TestResultDetail }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    useEffect(() => {
        const status = testResult.session_status?.toUpperCase();
        if (status === 'PENDING') { setElapsed('00:00:00'); return; }

        // นับจาก started_at เป็น start time หลัก
        const startStr = testResult.started_at ?? (() => {
            const times = [
                ...(testResult.assignments ?? []).map(a => a.from_time),
                ...(testResult.machines ?? []).map(m => m.from_time),
            ].filter(Boolean) as string[];
            return times.length ? times.reduce((e, t) => new Date(t) < new Date(e) ? t : e) : null;
        })();
        if (!startStr) { setElapsed('00:00:00'); return; }

        const startMs = new Date(startStr).getTime();
        const calc = () => {
            const workMs = Math.max(0, Date.now() - startMs - calcTotalBreakMs(testResult.breaks));
            const s = Math.floor(workMs / 1000);
            setElapsed(`${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`);
        };
        calc();
        if (status === 'INPROGRESS') { const iv = setInterval(calc, 1000); return () => clearInterval(iv); }
    }, [testResult]);
    return <span className="wo-timer-value">{elapsed}</span>;
};

// ─── interfaces ──────────────────────────────────────────────────────────────

type TestTypeValue = "" | "PROOF_LOAD" | "BREAKING" | "VISUAL" | "DIMENSIONAL";

interface CheckRow {
    check_name: string;
    status: "PASS" | "FAIL" | "NA";
    note: string;
}

interface FinalizeItemForm {
    unit_number: number;
    serial_no: string;
    wll_measured: string;
    load_test_value: string;
    description: string;
    result: "PASSED" | "FAILED";
    remark: string;
    // Proof load params/measurements
    required_load: string;
    hold_time_sec: string;
    length_before: string;
    length_after: string;
    // Breaking test
    breaking_force: string;
    min_breaking_load: string;
    // Verdict + checklist
    fail_reason: string;
    checks: CheckRow[];
    // Breaking-test load curve (sampled points)
    load_curve: { t: number; load: number }[];
}

interface SpecForm {
    construction: string;
    grade: string;
    coating: string;
    diameter: string;
    nominal_length: string;
    tensile_strength: string;
    manufacturer: string;
    batch_no: string;
    termination: string;
}

interface FinalizeForm {
    test_method: string;
    test_type: TestTypeValue;
    standard_reference: string;
    overall_status: "PASSED" | "FAILED";
    remark: string;
    spec: SpecForm;
    items: FinalizeItemForm[];
}

const emptySpec = (): SpecForm => ({
    construction: "", grade: "", coating: "", diameter: "", nominal_length: "",
    tensile_strength: "", manufacturer: "", batch_no: "", termination: "",
});

const SPEC_FIELDS: { field: keyof SpecForm; label: string; numeric?: boolean }[] = [
    { field: "construction", label: "Construction (e.g. 6x36 IWRC)" },
    { field: "grade", label: "Grade (e.g. 1960 N/mm²)" },
    { field: "coating", label: "Coating (e.g. GAL)" },
    { field: "diameter", label: "Diameter (mm)", numeric: true },
    { field: "nominal_length", label: "Nominal Length (m)", numeric: true },
    { field: "tensile_strength", label: "Tensile Strength (N/mm²)", numeric: true },
    { field: "manufacturer", label: "Manufacturer" },
    { field: "batch_no", label: "Batch No." },
    { field: "termination", label: "Termination / Fitting" },
];

const TEST_TYPE_OPTIONS: { value: TestTypeValue; label: string }[] = [
    { value: "", label: "— เลือกประเภท —" },
    { value: "PROOF_LOAD", label: "Proof Load Test" },
    { value: "BREAKING", label: "Breaking Test" },
    { value: "VISUAL", label: "Visual Inspection" },
    { value: "DIMENSIONAL", label: "Dimensional" },
];

const emptyFinalizeItem = (unit_number: number, description: string): FinalizeItemForm => ({
    unit_number,
    serial_no: "",
    wll_measured: "",
    load_test_value: "",
    description,
    result: "PASSED",
    remark: "",
    required_load: "",
    hold_time_sec: "",
    length_before: "",
    length_after: "",
    breaking_force: "",
    min_breaking_load: "",
    fail_reason: "",
    checks: [],
    load_curve: [],
});

interface RequiredItemRow {
    qc_item_id?: number;
    item_code: string;
    item_name: string;
    required_qty: string;
    unit: string;
    material_list_id?: number;
}

// ─── main component ──────────────────────────────────────────────────────────

const ViewTestResultSession: React.FC = () => {
    const { test_result_id } = useParams<{ test_result_id: string }>();
    const navigate = useNavigate();

    const [testResult, setTestResult] = useState<TestResultDetail | null>(null);
    const [qcWorkOrder, setQcWorkOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [costTick, setCostTick] = useState(0);

    // Employee management
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [empSearch, setEmpSearch] = useState("");
    const [empLoading, setEmpLoading] = useState(false);
    const [assigningEmpId, setAssigningEmpId] = useState<number | null>(null);
    const [unassigningEmpId, setUnassigningEmpId] = useState<number | null>(null);

    // Machine management
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [machineSearch, setMachineSearch] = useState("");
    const [machineLoading, setMachineLoading] = useState(false);
    const [assigningMachineId, setAssigningMachineId] = useState<number | null>(null);
    const [unassigningMachineId, setUnassigningMachineId] = useState<number | null>(null);

    // Required items editor
    const [showReqEditor, setShowReqEditor] = useState(false);
    const [reqRows, setReqRows] = useState<RequiredItemRow[]>([]);
    const [reqErrors, setReqErrors] = useState<Record<number, string>>({});
    const [reqSaving, setReqSaving] = useState(false);

    // Start modal
    const [showStartModal, setShowStartModal] = useState(false);
    const [startSaving, setStartSaving] = useState(false);

    // Employee / Machine management modals
    const [showAssignEmpModal, setShowAssignEmpModal] = useState(false);
    const [showEmpHistoryModal, setShowEmpHistoryModal] = useState(false);
    const [showAssignMachineModal, setShowAssignMachineModal] = useState(false);
    const [showMachineHistoryModal, setShowMachineHistoryModal] = useState(false);

    // Finalize form
    const [showFinalizeForm, setShowFinalizeForm] = useState(false);
    const [finalizeForm, setFinalizeForm] = useState<FinalizeForm | null>(null);
    const [finalizeActuals, setFinalizeActuals] = useState<Record<number, string>>({});
    const [finalizeSaving, setFinalizeSaving] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [sessionPhotos, setSessionPhotos] = useState<any[]>([]);
    const [photoUploading, setPhotoUploading] = useState(false);

    // for timeline
    const [autoZoom, setAutoZoom] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [now, setNow] = useState(new Date());
    type ActivePopover =
        | { type: 'run'; centerPct: number }
        | { type: 'machine'; machineId: number; barId: string; centerPct: number }
        | { type: 'employee'; assignmentId: string; centerPct: number }
        | null;
    const [activePopover, setActivePopover] = useState<ActivePopover>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // to count
    const [totalCounts, setTotalCounts] = useState({ emp: 0, mach: 0 });

    // ─── data fetching ────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        if (!test_result_id) return;
        setLoading(true);
        try {
            const res = await getTestResultById(Number(test_result_id));
            if (!res.success || !res.data) {
                Swal.fire("ผิดพลาด!", res.message || "ไม่พบข้อมูล", "error");
                return;
            }
            const tr = res.data as TestResultDetail;
            setTestResult(tr);
            if (tr.qc_work_order_id) {
                const qcRes = await getQCWorkOrderById(tr.qc_work_order_id);
                if (qcRes.success) setQcWorkOrder(qcRes.data);
            }
        } catch {
            Swal.fire("ผิดพลาด!", "ไม่สามารถโหลดข้อมูลได้", "error");
        } finally {
            setLoading(false);
        }
    }, [test_result_id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Live cost timer
    useEffect(() => {
        if (testResult?.session_status !== "INPROGRESS") return;
        const interval = setInterval(() => setCostTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [testResult?.session_status]);

    // Load employees when search changes
    useEffect(() => {
        if (testResult?.session_status !== "INPROGRESS") return;
        setEmpLoading(true);
        getEmployeeList(1, 20, empSearch, "Active")
            .then(res => setAllEmployees(Array.isArray(res?.data?.items) ? res.data.items : []))
            .catch(() => setAllEmployees([]))
            .finally(() => setEmpLoading(false));
    }, [empSearch, testResult?.session_status]);

    // Load machines when search changes
    useEffect(() => {
        if (testResult?.session_status !== "INPROGRESS") return;
        setMachineLoading(true);
        getMachineList(1, 20, machineSearch, "")
            .then(res => setAllMachines(Array.isArray(res?.data?.items) ? res.data.items : []))
            .catch(() => setAllMachines([]))
            .finally(() => setMachineLoading(false));
    }, [machineSearch, testResult?.session_status]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ปิด popover เมื่อ click outside
    useEffect(() => {
        if (!activePopover) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
                setActivePopover(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover]);

    // เลื่อนวันที่ไปหาวันที่เริ่มงาน (เฉพาะกรณีงานเก่า)
    useEffect(() => {
        if (testResult?.started_at) {
            const startDate = new Date(testResult.started_at);
            const today = new Date();
            if (startDate.toDateString() !== today.toDateString() && startDate < today) {
                setSelectedDate(startDate);
            }
        }
    }, [testResult]);

    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    const handleToday = useCallback(() => setSelectedDate(new Date()), []);

    // for item table
    useEffect(() => {
        if (testResult && testResult.required_items) {
            // แปลงข้อมูลจาก API (required_items) ให้เข้ากับรูปแบบของตาราง (RequiredItemRow)
            const itemsFromApi = testResult.required_items.map((it: any) => ({
                qc_item_id: it.qc_item_id ?? undefined,
                item_code: it.item_code ?? "",
                item_name: it.item_name ?? "",
                required_qty: String(it.required_qty ?? ""),
                unit: it.unit ?? "",
                material_list_id: it.material_list_id ?? undefined,
            }));
            setReqRows(itemsFromApi);
        }
    }, [testResult]); // ทำงานทุกครั้งที่ testResult ได้รับข้อมูลใหม่จาก fetchData

    useEffect(() => {
        loadCounts();
    }, [test_result_id]);

    // ─── derived data ─────────────────────────────────────────────────────

    const qcItems: QCWorkOrderItem[] = useMemo(() => {
        if (!qcWorkOrder) return [];
        return (qcWorkOrder.qc_items ?? []).map((item: any) => {
            const ml = item.material_list ?? {};
            return {
                id: String(item.qc_item_id),
                code: ml.item_code ?? item.item_code ?? "",
                description: ml.item_name ?? item.description ?? "",
                wll: item.wll ?? "",
                quantity: item.quantity ?? "",
                required_qty: item.required_qty ?? undefined,
                serialNo: item.serial_no ?? "",
                unit_name: ml.unit_name ?? "",
                material_list_id: item.material_list_id ?? undefined,
                material_list: item.material_list,
            };
        });
    }, [qcWorkOrder]);

    const activeAssignments = useMemo(() =>
        (testResult?.assignments ?? []).filter(a => !a.to_time), [testResult]);
    const pastAssignments = useMemo(() =>
        (testResult?.assignments ?? []).filter(a => a.to_time), [testResult]);

    const activeMachines = useMemo(() =>
        (testResult?.machines ?? []).filter(m => !m.to_time), [testResult]);
    const pastMachines = useMemo(() =>
        (testResult?.machines ?? []).filter(m => m.to_time), [testResult]);

    // Live cost calculation
    const liveCosts = useMemo(() => {
        if (!testResult) return null;
        if (testResult.session_status === "COMPLETED" && testResult.cost) return testResult.cost;

        const breaks: TestResultBreak[] = testResult.breaks ?? [];
        const calcEffectiveSec = (fromStr: string, toStr: string | null): number => {
            const start = new Date(fromStr).getTime();
            const end = toStr ? new Date(toStr).getTime() : Date.now();
            const totalMs = Math.max(0, end - start);
            const breakMs = breaks.reduce((acc, b) => {
                if (!b.break_start) return acc;
                const bS = new Date(b.break_start).getTime();
                const bE = b.break_end ? new Date(b.break_end).getTime() : Date.now();
                const overlap = Math.max(0, Math.min(bE, end) - Math.max(bS, start));
                return acc + overlap;
            }, 0);
            return Math.max(0, totalMs - breakMs) / 1000;
        };

        let laborCost = 0;
        for (const a of (testResult?.assignments ?? [])) {
            const effSec = calcEffectiveSec(a.from_time, a.to_time);
            const baseSalary = (a.employee as any)?.base_salary ?? 0;
            const dayRate = (a.employee as any)?.day_rate ?? 0;
            laborCost += ((baseSalary / 30 / 8 / 3600) + (dayRate / 8 / 3600)) * effSec;
        }

        let depCost = 0;
        let maintCost = 0;
        for (const m of (testResult?.machines ?? [])) {
            const cost = m.cost;
            if (!cost) continue;
            if (m.to_time) {
                depCost += cost.depreciation_cost ?? 0;
                maintCost += cost.maintenance_cost ?? 0;
            } else {
                const effSec = calcEffectiveSec(m.from_time, null);
                depCost += cost.depreciation_per_second * effSec;
                maintCost += cost.maintenance_rate_per_second * effSec;
            }
        }

        let materialCost = 0;
        for (const ri of (testResult?.required_items ?? [])) {
            const ml = ri.material_list;
            if (!ml) continue;
            const costPerUnit = ml.cost_per_unit ?? (ml.cost_price && ml.quantity > 0 ? ml.cost_price / ml.quantity : 0);
            materialCost += costPerUnit * (ri.qty_consumed_actual ?? ri.required_qty ?? 0);
        }

        return {
            labor_cost: laborCost,
            depreciation_cost: depCost,
            maintenance_cost: maintCost,
            material_cost: materialCost,
            total_cost: laborCost + depCost + maintCost + materialCost,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testResult, costTick]);

    const calcElapsedSeconds = useCallback((entry: { from_time: string; to_time: string | null }, breaks: TestResultBreak[]): number => {
        const start = new Date(entry.from_time).getTime();
        const end = entry.to_time ? new Date(entry.to_time).getTime() : Date.now();
        const breakOverlapMs = (breaks ?? []).reduce((sum, b) => {
            const bStart = new Date(b.break_start).getTime();
            const bEnd = b.break_end ? new Date(b.break_end).getTime() : Date.now();
            return sum + Math.max(0, Math.min(end, bEnd) - Math.max(start, bStart));
        }, 0);
        return Math.max(0, end - start - breakOverlapMs) / 1000;
    }, []);

    const laborBreakdown = useMemo(() => {
        if (!testResult?.assignments) return [];
        const breaks = testResult.breaks ?? [];
        type LaborEntry = { employee_id: number; employee: TestResultAssignment['employee']; seconds: number; hourlyRate: number; cost: number; isWorking: boolean };
        const map = new Map<number, LaborEntry>();
        for (const a of testResult.assignments) {
            const seconds = calcElapsedSeconds(a, breaks);
            const isWorking = a.to_time === null;
            const baseSalary = (a.employee as any)?.base_salary ?? 0;
            const dayRate = (a.employee as any)?.day_rate ?? 0;
            const hourlyRate = (baseSalary / 30 / 8) + (dayRate / 8);
            const cost = hourlyRate * seconds / 3600;
            if (map.has(a.employee_id)) {
                const existing = map.get(a.employee_id)!;
                map.set(a.employee_id, {
                    ...existing,
                    seconds: existing.seconds + seconds,
                    cost: existing.cost + cost,
                    isWorking: existing.isWorking || isWorking,
                });
            } else {
                map.set(a.employee_id, { employee_id: a.employee_id, employee: a.employee, seconds, hourlyRate, cost, isWorking });
            }
        }
        return Array.from(map.values());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testResult, costTick, calcElapsedSeconds]);

    const totalLaborCost = useMemo(
        () => laborBreakdown.reduce((s, a) => s + a.cost, 0),
        [laborBreakdown]
    );

    /** Labor split (base/day/ot). Use stored values once finalized, otherwise live estimate. */
    const laborSplit = useMemo(() => {
        const isCompleted = (testResult?.session_status || '').toUpperCase() === 'COMPLETED';
        if (isCompleted && testResult?.cost) {
            return getLaborSplit(testResult.cost as any);
        }
        return estimateLiveLaborSplit(
            (testResult?.assignments ?? []) as any,
            (testResult?.breaks ?? []) as any,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testResult, costTick]);

    const isLaborEstimate = (testResult?.session_status || '').toUpperCase() !== 'COMPLETED';

    const totalMaterialCost = useMemo(() => {
        if (!testResult?.required_items?.length) return 0;
        return testResult.required_items.reduce((sum: number, item: any) => {
            const ml = item.material_list;
            if (!ml) return sum;
            const costPerUnit = ml.cost_per_unit ?? (ml.cost_price && ml.quantity > 0 ? ml.cost_price / ml.quantity : 0);
            return sum + costPerUnit * (item.qty_consumed_actual ?? item.required_qty ?? item.quantity ?? 0);
        }, 0);
    }, [testResult]);

    const machineCostActual = useMemo(() => {
        if (!testResult?.machines) return [];
        const breaks = testResult.breaks ?? [];
        type MachineEntry = {
            machine_id: number; machine: TestResultMachineEntry['machine'];
            depreciationCost: number; maintenanceCost: number; totalCost: number;
            seconds: number; isRunning: boolean; noRate: boolean;
        };
        const map = new Map<number, MachineEntry>();
        for (const m of testResult.machines) {
            const isRunning = m.to_time === null;
            const elapsed = calcElapsedSeconds(m, breaks);
            const cost = m.cost;
            const depreciationCost = isRunning
                ? (cost?.depreciation_per_second ?? 0) * elapsed
                : (cost?.depreciation_cost ?? 0);
            const maintenanceCost = isRunning
                ? (cost?.maintenance_rate_per_second ?? 0) * elapsed
                : (cost?.maintenance_cost ?? 0);
            if (map.has(m.machine_id)) {
                const ex = map.get(m.machine_id)!;
                map.set(m.machine_id, {
                    ...ex,
                    seconds: ex.seconds + elapsed,
                    depreciationCost: ex.depreciationCost + depreciationCost,
                    maintenanceCost: ex.maintenanceCost + maintenanceCost,
                    totalCost: ex.totalCost + depreciationCost + maintenanceCost,
                    isRunning: ex.isRunning || isRunning,
                    noRate: ex.noRate && !cost,
                });
            } else {
                map.set(m.machine_id, {
                    machine_id: m.machine_id,
                    machine: m.machine,
                    depreciationCost,
                    maintenanceCost,
                    totalCost: depreciationCost + maintenanceCost,
                    seconds: elapsed,
                    isRunning,
                    noRate: !cost,
                });
            }
        }
        return Array.from(map.values());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testResult, costTick, calcElapsedSeconds]);

    // Employees already assigned (to disable in picker)
    const assignedEmpIds = useMemo(() =>
        new Set(activeAssignments.map(a => a.employee_id)), [activeAssignments]);
    const assignedMachineIds = useMemo(() =>
        new Set(activeMachines.map(m => m.machine_id)), [activeMachines]);

    // fallback: ถ้า started_at เป็น null ใช้ from_time ของ assignment/machine แรกสุดแทน
    const effectiveStartedAt = useMemo(() => {
        if (testResult?.started_at) return testResult.started_at;
        const times = [
            ...(testResult?.assignments ?? []).map(a => a.from_time),
            ...(testResult?.machines ?? []).map(m => m.from_time),
        ].filter(Boolean) as string[];
        if (times.length === 0) return null;
        return times.reduce((earliest, t) =>
            new Date(t).getTime() < new Date(earliest).getTime() ? t : earliest
        );
    }, [testResult]);

    const costChartData = useMemo(() => {
        if (!effectiveStartedAt) return [];
        const startMs = new Date(effectiveStartedAt).getTime();
        const endMs = testResult?.session_status === 'COMPLETED'
            ? (testResult.assignments ?? []).reduce(
                (max, a) => a.to_time ? Math.max(max, new Date(a.to_time).getTime()) : max,
                startMs
            ) || Date.now()
            : Date.now();
        const totalMs = endMs - startMs;
        if (totalMs <= 0) return [];

        const POINTS = 60;
        const step = totalMs / POINTS;
        const breaks = testResult?.breaks ?? [];

        const effectiveSec = (entry: { from_time: string; to_time: string | null }, atMs: number) => {
            const eStart = new Date(entry.from_time).getTime();
            const eEnd = entry.to_time ? new Date(entry.to_time).getTime() : atMs;
            const activeEnd = Math.min(eEnd, atMs);
            if (eStart >= activeEnd) return 0;
            const overlapBreak = breaks.reduce((sum, b) => {
                const bS = new Date(b.break_start).getTime();
                const bE = b.break_end ? new Date(b.break_end).getTime() : atMs;
                return sum + Math.max(0, Math.min(activeEnd, bE) - Math.max(eStart, bS));
            }, 0);
            return Math.max(0, activeEnd - eStart - overlapBreak) / 1000;
        };

        const data = [];
        for (let i = 0; i <= POINTS; i++) {
            const t = startMs + i * step;
            let depreciation = 0;
            let maintenance = 0;
            (testResult?.machines ?? []).forEach(m => {
                const sec = effectiveSec(m, t);
                depreciation += (m.cost?.depreciation_per_second ?? 0) * sec;
                maintenance += (m.cost?.maintenance_rate_per_second ?? 0) * sec;
            });
            let labor = 0;
            (testResult?.assignments ?? []).forEach(a => {
                const sec = effectiveSec(a, t);
                const baseSalary = (a.employee as any)?.base_salary ?? 0;
                const dayRate = (a.employee as any)?.day_rate ?? 0;
                labor += ((baseSalary / 30 / 8 / 3600) + (dayRate / 8 / 3600)) * sec;
            });
            const elapsedMin = Math.round((t - startMs) / 60000);
            const hh = Math.floor(elapsedMin / 60).toString().padStart(2, '0');
            const mm = (elapsedMin % 60).toString().padStart(2, '0');
            data.push({
                elapsedMin,
                label: `${hh}:${mm}`,
                ค่าเสื่อมราคา: parseFloat(depreciation.toFixed(4)),
                ค่าซ่อมบำรุง: parseFloat(maintenance.toFixed(4)),
                ค่าพนักงาน: parseFloat(labor.toFixed(4)),
                รวม: parseFloat((depreciation + maintenance + labor).toFixed(4)),
            });
        }
        return data;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveStartedAt, testResult, costTick]);

    const timelineBounds = useMemo(() => {
        const { dayStart, dayEnd } = getFullDayBounds(selectedDate);
        if (!autoZoom || !effectiveStartedAt) return { start: dayStart, end: dayEnd };
        const times: number[] = [];
        const runStart = new Date(effectiveStartedAt).getTime();
        const runEnd = Date.now();
        times.push(runStart, runEnd);
        testResult?.machines?.forEach(m => {
            times.push(new Date(m.from_time).getTime());
            times.push(m.to_time ? new Date(m.to_time).getTime() : Date.now());
        });
        const dayTimes = times.filter(t => t >= dayStart.getTime() && t <= dayEnd.getTime());
        if (dayTimes.length === 0) return { start: dayStart, end: dayEnd };
        const PAD = 20 * 60 * 1000;
        return {
            start: new Date(Math.max(dayStart.getTime(), Math.min(...dayTimes) - PAD)),
            end: new Date(Math.min(dayEnd.getTime(), Math.max(...dayTimes) + PAD)),
        };
    }, [autoZoom, effectiveStartedAt, testResult, selectedDate]);

    const timelineLabels = useMemo(() => buildTimelineLabels(timelineBounds.start, timelineBounds.end), [timelineBounds]);

    const runBars = useMemo(() => {
        if (!effectiveStartedAt) return [];
        const { start, end } = timelineBounds;
        const breaks = testResult?.breaks ?? [];

        const rS = new Date(effectiveStartedAt).getTime();
        const rE = testResult?.session_status === 'COMPLETED'
            ? ((testResult.assignments ?? []).reduce((m, a) => a.to_time ? Math.max(m, new Date(a.to_time).getTime()) : m, rS) || now.getTime())
            : now.getTime();

        // เริ่มด้วย interval เดียว start→end แล้วเจาะรูช่วง break ออก
        let intervals: { s: number; e: number }[] = [{ s: rS, e: rE }];
        breaks.forEach(brk => {
            const bS = new Date(brk.break_start).getTime();
            const bE = brk.break_end ? new Date(brk.break_end).getTime() : now.getTime();
            const next: { s: number; e: number }[] = [];
            intervals.forEach(iv => {
                if (bS < iv.e && bE > iv.s) {
                    if (bS > iv.s) next.push({ s: iv.s, e: bS });
                    if (bE < iv.e) next.push({ s: bE, e: iv.e });
                } else {
                    next.push(iv);
                }
            });
            intervals = next;
        });

        return intervals
            .map((iv, idx) => {
                if (iv.e <= start.getTime() || iv.s >= end.getTime()) return null;
                const cs = new Date(Math.max(iv.s, start.getTime()));
                const ce = new Date(Math.min(iv.e, end.getTime()));
                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);
                if (r <= l) return null;
                return {
                    id: `run-bar-${idx}`,
                    leftPercent: l,
                    widthPercent: r - l,
                    isCurrent: testResult?.session_status !== 'COMPLETED' && iv.e >= now.getTime() - 2000,
                };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null && b.widthPercent > 0);
    }, [effectiveStartedAt, testResult, timelineBounds, now]);

    const breakBars = useMemo(() => {
        if (!testResult?.breaks?.length) return [];
        const { start, end } = timelineBounds;
        return testResult.breaks.map((b, i) => {
            const bS = new Date(b.break_start).getTime();
            const bE = b.break_end ? new Date(b.break_end).getTime() : now.getTime();
            if (bE < start.getTime() || bS > end.getTime()) return null;
            const cs = new Date(Math.max(bS, start.getTime()));
            const ce = new Date(Math.min(bE, end.getTime()));
            const l = timeToPercent(cs, start, end);
            const r = timeToPercent(ce, start, end);
            if (r <= l) return null;
            return { id: `break-${i}`, leftPercent: l, widthPercent: Math.max(0.5, r - l), isOpen: !b.break_end, break_type: b.break_type, from_time: b.break_start, to_time: b.break_end };
        }).filter(Boolean) as { id: string; leftPercent: number; widthPercent: number; isOpen: boolean; break_type: string; from_time: string; to_time: string | null }[];
    }, [testResult, timelineBounds, now]);

    type EmpBar = { bar_key: string; assignment_id: string; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string | null };
    type EmpRow = { employee_id: number; name: string; bars: EmpBar[] };

    const employeeRows = useMemo(() => {
        if (!testResult?.assignments) return [];
        const { start, end } = timelineBounds;
        const breaks = testResult.breaks ?? [];
        const grouped = new Map<number, EmpRow>();

        testResult.assignments.forEach(a => {
            const aS = new Date(a.from_time).getTime();
            const aE = a.to_time ? new Date(a.to_time).getTime() : now.getTime();

            if (!grouped.has(a.employee_id)) {
                const fn = a.employee?.employee_first_name ?? '';
                const ln = a.employee?.employee_last_name ?? '';
                grouped.set(a.employee_id, {
                    employee_id: a.employee_id,
                    name: `${fn} ${ln}`.trim() || `Emp #${a.employee_id}`,
                    bars: []
                });
            }

            if (aE < start.getTime() || aS > end.getTime()) return;

            let intervals: { s: number; e: number }[] = [{ s: aS, e: aE }];
            breaks.forEach(brk => {
                const bS = new Date(brk.break_start).getTime();
                const bE = brk.break_end ? new Date(brk.break_end).getTime() : now.getTime();
                const next: { s: number; e: number }[] = [];
                intervals.forEach(iv => {
                    if (bS < iv.e && bE > iv.s) {
                        if (bS > iv.s) next.push({ s: iv.s, e: bS });
                        if (bE < iv.e) next.push({ s: bE, e: iv.e });
                    } else { next.push(iv); }
                });
                intervals = next;
            });

            intervals.forEach((iv, segIdx) => {
                if (iv.e <= start.getTime() || iv.s >= end.getTime()) return;
                const cs = new Date(Math.max(iv.s, start.getTime()));
                const ce = new Date(Math.min(iv.e, end.getTime()));
                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);
                if (r <= l) return;
                grouped.get(a.employee_id)!.bars.push({
                    bar_key: `${a.test_result_assignment_id}-${segIdx}`,
                    assignment_id: `${a.test_result_assignment_id}`,
                    leftPercent: l,
                    widthPercent: Math.max(0.5, r - l),
                    isActive: a.to_time === null && iv.e >= now.getTime() - 1000,
                    from_time: a.from_time,
                    to_time: a.to_time
                });
            });
        });

        return Array.from(grouped.values());
    }, [testResult, timelineBounds, now]);

    type MachBar = { bar_key: string; test_result_machine_id: string; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string | null };
    type MachRow = { machine_id: number; name: string; machine_code?: string; bars: MachBar[] };

    const machineRows = useMemo(() => {
        if (!testResult?.machines) return [];
        const { start, end } = timelineBounds;
        const breaks = testResult.breaks ?? [];
        const grouped = new Map<number, MachRow>();

        testResult.machines.forEach(m => {
            const mS = new Date(m.from_time).getTime();
            const mE = m.to_time ? new Date(m.to_time).getTime() : now.getTime();

            if (!grouped.has(m.machine_id)) {
                grouped.set(m.machine_id, {
                    machine_id: m.machine_id,
                    name: m.machine?.machine_name || `Machine #${m.machine_id}`,
                    machine_code: m.machine?.machine_code,
                    bars: []
                });
            }

            if (mE < start.getTime() || mS > end.getTime()) return;

            let intervals: { s: number; e: number }[] = [{ s: mS, e: mE }];
            breaks.forEach(brk => {
                const bS = new Date(brk.break_start).getTime();
                const bE = brk.break_end ? new Date(brk.break_end).getTime() : now.getTime();
                const next: { s: number; e: number }[] = [];
                intervals.forEach(iv => {
                    if (bS < iv.e && bE > iv.s) {
                        if (bS > iv.s) next.push({ s: iv.s, e: bS });
                        if (bE < iv.e) next.push({ s: bE, e: iv.e });
                    } else { next.push(iv); }
                });
                intervals = next;
            });

            intervals.forEach((iv, segIdx) => {
                if (iv.e <= start.getTime() || iv.s >= end.getTime()) return;
                const cs = new Date(Math.max(iv.s, start.getTime()));
                const ce = new Date(Math.min(iv.e, end.getTime()));
                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);
                if (r <= l) return;
                grouped.get(m.machine_id)!.bars.push({
                    bar_key: `${m.test_result_machine_id}-${segIdx}`,
                    test_result_machine_id: `${m.test_result_machine_id}`,
                    leftPercent: l,
                    widthPercent: Math.max(0.5, r - l),
                    isActive: m.to_time === null && iv.e >= now.getTime() - 2000,
                    from_time: m.from_time,
                    to_time: m.to_time
                });
            });
        });

        return Array.from(grouped.values());
    }, [testResult, timelineBounds, now]);


    // Active machine
    const machineUsageRatio = totalCounts.mach > 0
        ? (activeMachines.length / totalCounts.mach) * 100
        : 0;

    // ─── employee actions ─────────────────────────────────────────────────

    const handleAssignEmployee = async (employeeId: number) => {
        if (!testResult) return;
        setAssigningEmpId(employeeId);
        try {
            const res = await assignEmployeeToTestResult(testResult.test_result_id, employeeId);
            if (res.success) {
                setTestResult(res.data as TestResultDetail);
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถเพิ่มพนักงานได้", "error");
            }
        } finally {
            setAssigningEmpId(null);
        }
    };

    const handleUnassignEmployee = async (employeeId: number) => {
        if (!testResult) return;
        setUnassigningEmpId(employeeId);
        try {
            const res = await unassignEmployeeFromTestResult(testResult.test_result_id, employeeId);
            if (res.success) {
                setTestResult(res.data as TestResultDetail);
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถนำพนักงานออกได้", "error");
            }
        } finally {
            setUnassigningEmpId(null);
        }
    };

    // ─── machine actions ──────────────────────────────────────────────────

    const handleAssignMachine = async (machineId: number) => {
        if (!testResult) return;
        setAssigningMachineId(machineId);
        try {
            const res = await assignMachineToTestResult(testResult.test_result_id, machineId);
            if (res.success) {
                setTestResult(res.data as TestResultDetail);
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถเพิ่มเครื่องจักรได้", "error");
            }
        } finally {
            setAssigningMachineId(null);
        }
    };

    const handleUnassignMachine = async (machineId: number) => {
        if (!testResult) return;
        setUnassigningMachineId(machineId);
        try {
            const res = await unassignMachineFromTestResult(testResult.test_result_id, machineId);
            if (res.success) {
                setTestResult(res.data as TestResultDetail);
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถนำเครื่องจักรออกได้", "error");
            }
        } finally {
            setUnassigningMachineId(null);
        }
    };

    // ─── required items ───────────────────────────────────────────────────

    const openReqEditor = () => {
        const existing: RequiredItemRow[] = (testResult?.required_items ?? []).map((it: any) => ({
            qc_item_id: it.qc_item_id ?? undefined,
            item_code: it.item_code ?? "",
            item_name: it.item_name ?? "",
            required_qty: String(it.required_qty ?? ""),
            unit: it.unit ?? "",
            material_list_id: it.material_list_id ?? undefined,
        }));
        const defaults: RequiredItemRow[] = qcItems.map(qi => ({
            qc_item_id: Number(qi.id),
            item_code: qi.code,
            item_name: qi.description,
            required_qty: qi.quantity ?? "",
            unit: qi.unit_name ?? "",
            material_list_id: qi.material_list_id,
        }));
        setReqRows(existing.length > 0 ? existing : (defaults.length > 0 ? defaults : [{ item_code: "", item_name: "", required_qty: "", unit: "" }]));
        setReqErrors({});
        setShowReqEditor(true);
    };

    const handleSaveReqItems = async () => {
        const errors: Record<number, string> = {};
        reqRows.forEach((row, i) => {
            if (!row.qc_item_id) errors[i] = "กรุณาเลือกสินค้า";
            else if (!row.required_qty || Number(row.required_qty) <= 0) errors[i] = "จำนวนต้องมากกว่า 0";
        });
        if (Object.keys(errors).length > 0) { setReqErrors(errors); return; }
        if (!testResult) return;
        setReqSaving(true);
        try {
            const payload = reqRows.map(row => ({
                item_code: row.item_code.trim(),
                item_name: row.item_name.trim(),
                required_qty: Number(row.required_qty),
                unit: row.unit.trim(),
                ...(row.qc_item_id != null ? { qc_item_id: row.qc_item_id } : {}),
                ...(row.material_list_id != null ? { material_list_id: row.material_list_id } : {}),
            }));
            const res = await createTestResultRequiredItems(testResult.test_result_id, payload);
            if (res.success) {
                setShowReqEditor(false);
                fetchData();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถบันทึกรายการได้", "error");
            }
        } finally {
            setReqSaving(false);
        }
    };

    // ─── pause / resume ───────────────────────────────────────────────────

    const handlePause = async () => {
        if (!testResult) return;
        const result = await Swal.fire({
            title: 'พักทดสอบ',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { LUNCHBREAK: 'พักเที่ยง', RESTBREAK: 'พักเบรค', OTHER: 'อื่นๆ' },
            inputValue: 'LUNCHBREAK',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักทดสอบ',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;
        const res = await pauseTestResult(testResult.test_result_id, { break_type: result.value });
        if (res.success) {
            Swal.fire({ title: 'พักทดสอบสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
            fetchData();
        } else {
            Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถพักทดสอบได้', 'error');
        }
    };

    const handleResume = async () => {
        if (!testResult) return;
        const res = await resumeTestResult(testResult.test_result_id);
        if (res.success) {
            Swal.fire({ title: 'ทดสอบต่อสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
            fetchData();
        } else {
            Swal.fire('ผิดพลาด!', res.message || 'ไม่สามารถทดสอบต่อได้', 'error');
        }
    };

    // ─── start modal ─────────────────────────────────────────────────────

    const openStartModal = () => {
        if (!testResult) return;
        setShowStartModal(true);
    };

    const handleStart = async () => {
        if (!testResult) return;
        setStartSaving(true);
        try {
            const res = await startTestResult(testResult.test_result_id);
            if (res.success) {
                setShowStartModal(false);
                Swal.fire({ title: "เริ่มทดสอบแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
                fetchData();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถเริ่มทดสอบได้", "error");
            }
        } finally {
            setStartSaving(false);
        }
    };

    // ─── finalize form ────────────────────────────────────────────────────

    const openFinalizeForm = () => {
        if (!testResult) return;
        const qty = testResult.claimed_qty;
        const desc = qcWorkOrder?.sales_item_code ?? "";
        const actuals: Record<number, string> = {};
        (testResult.required_items ?? []).forEach((it: any) => {
            const key = it.test_result_required_item_id ?? it.id;
            if (key != null) actuals[key] = "";
        });
        setFinalizeActuals(actuals);
        setExpandedItems({});
        setSessionPhotos(testResult.photos ?? []);
        setFinalizeForm({
            test_method: "",
            test_type: "",
            standard_reference: "",
            overall_status: "PASSED",
            remark: "",
            spec: emptySpec(),
            items: Array.from({ length: qty }, (_, i) => emptyFinalizeItem(i + 1, desc)),
        });
        setShowFinalizeForm(true);
    };

    // When test_type changes, fetch the default checklist and seed every unit's checks.
    const handleTestTypeChange = async (test_type: TestTypeValue) => {
        setFinalizeForm(prev => prev ? { ...prev, test_type } : prev);
        if (!test_type) {
            setFinalizeForm(prev => prev ? { ...prev, items: prev.items.map(it => ({ ...it, checks: [] })) } : prev);
            return;
        }
        const itemGroup = qcWorkOrder?.sales_item?.item_group ?? null;
        setChecklistLoading(true);
        try {
            const res = await getInspectionChecklist(itemGroup, test_type);
            const names: string[] = res.success && Array.isArray(res.data) ? res.data : [];
            const checks: CheckRow[] = names.map(check_name => ({ check_name, status: "NA", note: "" }));
            // Replace checks on every unit (fresh copy per item so edits don't alias)
            setFinalizeForm(prev => prev ? {
                ...prev,
                items: prev.items.map(it => ({ ...it, checks: checks.map(c => ({ ...c })) })),
            } : prev);
        } finally {
            setChecklistLoading(false);
        }
    };

    const fileToDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!testResult) return;
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // allow re-selecting the same file
        if (files.length === 0) return;
        setPhotoUploading(true);
        try {
            const photos = await Promise.all(files.map(async f => ({ image_base64: await fileToDataUrl(f) })));
            const res = await addTestResultPhotos(testResult.test_result_id, photos);
            if (res.success) {
                setSessionPhotos(res.data?.photos ?? []);
            } else {
                Swal.fire("ผิดพลาด!", res.message || "อัปโหลดรูปไม่สำเร็จ", "error");
            }
        } finally {
            setPhotoUploading(false);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        const res = await deleteTestResultPhoto(photoId);
        if (res.success) {
            setSessionPhotos(res.data?.photos ?? []);
        } else {
            Swal.fire("ผิดพลาด!", res.message || "ลบรูปไม่สำเร็จ", "error");
        }
    };

    const updateItem = (i: number, patch: Partial<FinalizeItemForm>) =>
        setFinalizeForm(prev => {
            if (!prev) return prev;
            const items = [...prev.items];
            items[i] = { ...items[i], ...patch };
            return { ...prev, items };
        });

    // Parse a CSV/XLSX file (first two columns = time, load) into curve points.
    const handleLoadCurveImport = async (i: number, file: File | undefined) => {
        if (!file) return;
        try {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
            const points = rows
                .map(r => ({ t: Number(r?.[0]), load: Number(r?.[1]) }))
                .filter(p => Number.isFinite(p.t) && Number.isFinite(p.load));
            if (points.length === 0) {
                Swal.fire("ผิดพลาด!", "ไม่พบข้อมูล (คอลัมน์ 1 = เวลา, คอลัมน์ 2 = โหลด)", "warning");
                return;
            }
            updateItem(i, { load_curve: points });
        } catch {
            Swal.fire("ผิดพลาด!", "อ่านไฟล์ไม่สำเร็จ", "error");
        }
    };

    const addCurvePoint = (i: number) =>
        setFinalizeForm(prev => {
            if (!prev) return prev;
            const items = [...prev.items];
            items[i] = { ...items[i], load_curve: [...items[i].load_curve, { t: 0, load: 0 }] };
            return { ...prev, items };
        });

    const updateCurvePoint = (i: number, pi: number, key: "t" | "load", value: number) =>
        setFinalizeForm(prev => {
            if (!prev) return prev;
            const items = [...prev.items];
            const load_curve = [...items[i].load_curve];
            load_curve[pi] = { ...load_curve[pi], [key]: value };
            items[i] = { ...items[i], load_curve };
            return { ...prev, items };
        });

    const removeCurvePoint = (i: number, pi: number) =>
        setFinalizeForm(prev => {
            if (!prev) return prev;
            const items = [...prev.items];
            items[i] = { ...items[i], load_curve: items[i].load_curve.filter((_, x) => x !== pi) };
            return { ...prev, items };
        });

    const updateItemCheck = (i: number, ci: number, patch: Partial<CheckRow>) =>
        setFinalizeForm(prev => {
            if (!prev) return prev;
            const items = [...prev.items];
            const checks = [...items[i].checks];
            checks[ci] = { ...checks[ci], ...patch };
            items[i] = { ...items[i], checks };
            return { ...prev, items };
        });

    const handleFinalize = async () => {
        if (!finalizeForm || !testResult) return;
        setFinalizeSaving(true);
        try {
            const material_actuals = Object.entries(finalizeActuals)
                .filter(([, v]) => v !== "")
                .map(([id, qty]) => ({ test_result_required_item_id: Number(id), qty_used: Number(qty) }));
            const numOrNull = (v: string) => v === "" ? null : parseFloat(v);
            const intOrNull = (v: string) => v === "" ? null : parseInt(v, 10);
            const spec = {
                ...finalizeForm.spec,
                diameter: numOrNull(finalizeForm.spec.diameter),
                nominal_length: numOrNull(finalizeForm.spec.nominal_length),
                tensile_strength: numOrNull(finalizeForm.spec.tensile_strength),
            };
            const payload = {
                ...finalizeForm,
                test_type: finalizeForm.test_type || null,
                spec,
                items: finalizeForm.items.map(it => ({
                    ...it,
                    wll_measured: numOrNull(it.wll_measured),
                    load_test_value: numOrNull(it.load_test_value),
                    required_load: numOrNull(it.required_load),
                    hold_time_sec: intOrNull(it.hold_time_sec),
                    length_before: numOrNull(it.length_before),
                    length_after: numOrNull(it.length_after),
                    breaking_force: numOrNull(it.breaking_force),
                    min_breaking_load: numOrNull(it.min_breaking_load),
                    checks: it.checks
                        .filter(c => c.check_name)
                        .map((c, idx) => ({ check_name: c.check_name, status: c.status, note: c.note || null, sequence: idx })),
                    load_curve: it.load_curve.length ? it.load_curve : null,
                })),
                ...(material_actuals.length > 0 ? { material_actuals } : {}),
            };
            const res = await finalizeTestResult(testResult.test_result_id, payload);
            if (res.success) {
                setShowFinalizeForm(false);
                setFinalizeForm(null);
                Swal.fire({ title: "บันทึกผลสำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
                fetchData();
            } else {
                Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถบันทึกผลได้", "error");
            }
        } finally {
            setFinalizeSaving(false);
        }
    };

    // ─── for count ────────────────────────────────────────────────────

    const loadCounts = async () => {
        const [empCount, machCount] = await Promise.all([
            getEmployeeTotalCount(),
            getMachineTotalCount()
        ]);
        setTotalCounts({ emp: empCount, mach: machCount });
    };

    // ─── delete ───────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!testResult) return;
        const confirm = await Swal.fire({
            title: "ยืนยันการลบ?",
            text: "Session นี้จะถูกยกเลิก",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#d33",
        });
        if (!confirm.isConfirmed) return;
        const res = await deleteTestResult(testResult.test_result_id);
        if (res.success) {
            const qcId = testResult.qc_work_order_id;
            Swal.fire({ title: "ยกเลิกแล้ว", icon: "success", timer: 1200, showConfirmButton: false });
            if (qcId) navigate(`/quality_control/qc_workorders_list/view/${qcId}`);
            else navigate(-1);
        } else {
            Swal.fire("ผิดพลาด!", res.message || "ไม่สามารถลบได้", "error");
        }
    };

    // ─── render ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Content>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
                    <span className="spinner-border text-primary me-3" />
                    <span className="text-muted">กำลังโหลดข้อมูล...</span>
                </div>
            </Content>
        );
    }

    if (!testResult) return <Content><div className="text-center py-10 text-muted">ไม่พบข้อมูล</div></Content>;

    const isPending = testResult.session_status === "PENDING";
    const isInProgress = testResult.session_status === "INPROGRESS";
    const isPaused = testResult.session_status === "PAUSED";
    const isActive = isInProgress || isPaused;
    const isCompleted = testResult.session_status === "COMPLETED";
    const qcId = testResult.qc_work_order_id;
    const qcCode = qcWorkOrder?.qc_work_order_code ?? `QC #${qcId}`;
    const salesItemDesc = qcWorkOrder?.sales_item_code ?? "";

    return (
        <Content>
            {/* ── HEADER ── */}
            <div className="card-header border-0 pt-5 pb-5 mb-8 bg-white p-5 rounded shadow-sm">
                <div className="container-fluid p-0">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-5">
                        <div className="d-flex align-items-center flex-wrap gap-5">
                            <button
                                className="btn btn-clean btn-sm text-gray-500 hover-primary p-0 me-2"
                                onClick={() => qcId ? navigate(`/quality_control/qc_workorders_list/view/${qcId}`) : navigate(-1)}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>

                            <h1 className="text-dark fw-bolder fs-2 mb-0">
                                {testResult.test_result_code || `Session #${testResult.test_result_id}`}
                            </h1>

                            {/* ข้อมูล Metadata (Customer, SO, Qty) */}
                            <div className="d-flex align-items-center gap-6 ms-2">
                                <span className="text-muted fw-bold fs-6 d-flex align-items-center">
                                    <i className="bi bi-person fs-5 me-2" />
                                    {qcCode}
                                </span>

                                <span className="text-muted fw-bold fs-6 d-flex align-items-center">
                                    <i className="bi bi-box-seam fs-5 me-2" />
                                    {testResult.claimed_qty || 1} ชิ้น
                                </span>
                            </div>
                        </div>

                        {/* --- ฝั่งขวา: สถานะ + ปุ่ม Action --- */}
                        <div className="d-flex align-items-center gap-3">
                            {isPending && (
                                <button className="btn btn-sm btn-primary fw-bold px-6" onClick={openStartModal}>
                                    <i className="bi bi-play-fill me-1" />เริ่มทดสอบ
                                </button>
                            )}
                            {isInProgress && (
                                <button className="btn btn-sm btn-warning fw-bold px-6" onClick={handlePause}>
                                    <i className="bi bi-pause-fill me-1" />พักทดสอบ
                                </button>
                            )}
                            {isPaused && (
                                <button className="btn btn-sm btn-primary fw-bold px-6" onClick={handleResume}>
                                    <i className="bi bi-play-fill me-1" />ทดสอบต่อ
                                </button>
                            )}
                            {isActive && !showFinalizeForm && (
                                <button className="btn btn-sm btn-success fw-bold px-6" onClick={openFinalizeForm}>
                                    <i className="bi bi-check-circle me-1" />ปิดการทดสอบ
                                </button>
                            )}

                        </div>

                    </div>
                </div>
            </div>

            {/* ── Mixed-version soft warning ──
                TestSpec unification: runs feeding this session were pinned to more
                than one version of the same component. Soft-warn only — never
                block (see project_testspec_unification memory, "mixed version"
                decision). */}
            {testResult.mixed_version && (
                <div className="alert alert-warning d-flex align-items-start mb-8">
                    <i className="bi bi-exclamation-triangle-fill fs-3 me-3 mt-1"></i>
                    <div className="flex-grow-1">
                        <div className="fw-bold fs-6 mb-1">Session นี้รวมงานจาก Component คนละเวอร์ชันกัน</div>
                        <div className="fs-7">
                            Work Run ที่นำมาทดสอบใน Session นี้ถูก pin ไว้กับเอกสารชิ้นส่วนคนละเวอร์ชัน
                            กรุณาตรวจสอบว่าผลทดสอบตรงกับเวอร์ชันของแต่ละ Work Run ก่อนสรุปผล
                        </div>
                    </div>
                </div>
            )}

            {/* ── KPI CARDS (INPROGRESS / PAUSED / COMPLETED) ── */}
            {(isActive || isCompleted) && (
                <div className="row g-5 mb-8">
                    {/* Live Timer */}
                    <div className="col-md-4">
                        <div className="wo-kpi-card">
                            <div className="wo-kpi-header">
                                <span className="wo-kpi-label">ระยะเวลาทดสอบ (LIVE)</span>
                                {isInProgress && <span className="wo-live-dot" />}
                                {isPaused && <span className="wo-live-dot" style={{ background: '#fd7e14' }} />}
                            </div>
                            <TestResultLiveTimer testResult={testResult} />
                            <div className="wo-kpi-sub mt-2">
                                <small className="text-muted">
                                    เริ่ม: {(() => {
                                        const startStr = testResult.started_at
                                            ?? [...(testResult.assignments ?? [])].sort((a, b) => new Date(a.from_time).getTime() - new Date(b.from_time).getTime())[0]?.from_time;
                                        if (!startStr) return "-";
                                        const d = new Date(startStr);
                                        return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })
                                            + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
                                    })()}
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Active Employees */}
                    <div className="col-md-4">
                        <div className="wo-kpi-card">
                            <div className="wo-kpi-header">
                                <span className="wo-kpi-label">ผู้ทดสอบ (Active)</span>
                                <div className="d-flex gap-1">
                                    {isInProgress && (
                                        <button
                                            className="btn btn-sm btn-icon btn-light-primary"
                                            style={{ width: 28, height: 28 }}
                                            title="จัดการผู้ทดสอบ"
                                            onClick={() => setShowAssignEmpModal(true)}
                                        >
                                            <i className="bi bi-person-gear fs-7" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-icon btn-light-secondary"
                                        style={{ width: 28, height: 28 }}
                                        title="ดูประวัติการ assign"
                                        onClick={() => setShowEmpHistoryModal(true)}
                                    >
                                        <i className="bi bi-eye fs-7" />
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex align-items-baseline gap-2">
                                <span className="wo-kpi-big">{activeAssignments.length}</span>
                                <span className="text-muted fs-6">/ {totalCounts.emp} คน</span>
                            </div>
                            <div className="wo-avatar-stack mt-3">
                                {activeAssignments.slice(0, 4).map(a => (
                                    <div key={a.test_result_assignment_id} className="wo-avatar" title={`${a.employee.employee_first_name} ${a.employee.employee_last_name}`}>
                                        {(a.employee.employee_first_name ?? "?")[0]}
                                    </div>
                                ))}
                                {activeAssignments.length > 4 && (
                                    <div className="wo-avatar wo-avatar-more">+{activeAssignments.length - 4}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Machines */}
                    <div className="col-md-4">
                        <div className="wo-kpi-card">
                            <div className="wo-kpi-header">
                                <span className="wo-kpi-label">เครื่องจักร (Active)</span>
                                <div className="d-flex gap-1">
                                    {isInProgress && (
                                        <button
                                            className="btn btn-sm btn-icon btn-light-primary"
                                            style={{ width: 28, height: 28 }}
                                            title="จัดการเครื่องจักร"
                                            onClick={() => setShowAssignMachineModal(true)}
                                        >
                                            <i className="bi bi-gear fs-7" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-icon btn-light-secondary"
                                        style={{ width: 28, height: 28 }}
                                        title="ดูประวัติการ select"
                                        onClick={() => setShowMachineHistoryModal(true)}
                                    >
                                        <i className="bi bi-eye fs-7" />
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex align-items-baseline gap-2">
                                <span className="wo-kpi-big">{activeMachines.length}</span>
                                <span className="text-muted fs-6">/ {totalCounts.mach} เครื่อง</span>
                            </div>
                            <div className="wo-progress-bar mt-3">
                            <div
                                className="wo-progress-fill wo-progress-blue"
                                style={{
                                    width: `${machineUsageRatio}%`,
                                    transition: 'width 0.3s ease'
                                }}
                            />
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BODY ── */}
            <div className="row g-6 align-items-start">

                {/* LEFT 40% */}
                <div className="col-12 col-xl-4">

                    {/* Session Info */}
                    <div className="wo-card mb-6">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">
                                ข้อมูล Session
                            </h3>
                            <StatusBadge status={testResult.session_status} />

                        </div>
                        <div className="wo-card-body">
                            {/* Work Run Sources */}
                            {(testResult.work_run_sources ?? []).length > 0 && (
                                <div className="mb-5">
                                    <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-2">
                                        Work Run ที่นำมาทดสอบ
                                    </span>
                                    <div className="d-flex flex-wrap gap-2">
                                        {testResult.work_run_sources.map((src: any) => (
                                            <span key={src.work_run_id} className="badge badge-light-info fs-7 px-3 py-2">
                                                {src.work_run?.lot_number || `WR#${src.work_run_id}`} · {src.qty_from_run} ชิ้น
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ตารางรายการวัตถุดิบ (Read-only) */}
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">
                                    <thead>
                                        <tr className="fw-bold text-muted bg-light">
                                            <th className="ps-4 min-w-150px rounded-start">วัตถุดิบ</th>
                                            <th className="w-100px text-center">รหัสวัตถุดิบ</th>
                                            <th className="w-110px text-end pe-4 rounded-end">จำนวน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reqRows.length > 0 ? (
                                            reqRows.map((row, i) => (
                                                <tr key={i}>
                                                    <td className="ps-4">
                                                        <span className="text-gray-800 fw-bold d-block fs-6">
                                                            {row.item_name || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="text-center text-muted fw-semibold">
                                                        {row.item_code || "—"}
                                                    </td>
                                                    <td className="text-end pe-4 fw-bolder text-dark">
                                                        {Number(row.required_qty || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="text-center text-muted py-10">
                                                    {loading ? "กำลังโหลดข้อมูล..." : "ไม่มีรายการข้อมูล"}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT 80% — Cost Breakdown */}
                <div className="col-12 col-xl-8">
                    {/* Timeline */}
                    <div className="wo-card mb-6">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">ไทม์ไลน์การผลิต (Production Timeline)</h3>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <button
                                    className={`btn btn-sm fw-bold ${autoZoom ? 'btn-primary' : 'btn-light'}`}
                                    title={autoZoom ? 'แสดงเฉพาะช่วงที่มีกิจกรรม' : 'แสดงทั้งวัน (0–24 น.)'}
                                    onClick={() => setAutoZoom(v => !v)}
                                >
                                    <i className={`bi ${autoZoom ? 'bi-zoom-in' : 'bi-zoom-out'} me-1`} />
                                    {autoZoom ? 'ซูมอัตโนมัติ' : 'ทั้งวัน'}
                                </button>
                                <div className="d-flex align-items-center gap-2 ms-2">
                                    <button className="btn btn-sm btn-icon btn-light" onClick={handlePrevDate}><i className="bi bi-chevron-left" /></button>
                                    <span className="fw-semibold text-gray-700" style={{ cursor: 'pointer', minWidth: 110, textAlign: 'center' }} onClick={handleToday}>
                                        {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <button className="btn btn-sm btn-icon btn-light" onClick={handleNextDate}><i className="bi bi-chevron-right" /></button>
                                </div>
                            </div>
                        </div>
                        <div className="wo-card-body">
                            {effectiveStartedAt ? (
                                <div className="wo-timeline-container">
                                    <div className="wo-timeline-header">
                                        <div className="wo-timeline-label-col"></div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-hours" style={{ position: 'relative', height: 20 }}>
                                                {timelineLabels.map(({ label, percent }) => (
                                                    <span key={label} style={{ position: 'absolute', left: `${percent}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session row */}
                                    <div className="wo-timeline-row">
                                        <div className="wo-timeline-label-col">
                                            <div className="wo-phase-label">
                                                <span className="wo-phase-dot" style={{ backgroundColor: getRunStatusColor(testResult.session_status) }} />
                                                <span className="wo-phase-name" title={testResult.test_result_code || `Session #${testResult.test_result_id}`}>
                                                    {testResult.test_result_code || `Session #${testResult.test_result_id}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                {runBars.length > 0 ? (
                                                    <>
                                                        {/* Run bar */}
                                                        {runBars.map(bar => (
                                                            <div
                                                                key={bar.id}
                                                                className="wo-timeline-bar"
                                                                style={{
                                                                    backgroundColor: getRunStatusColor(testResult.session_status),
                                                                    left: `${bar.leftPercent}%`,
                                                                    width: `${bar.widthPercent}%`
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                    setActivePopover(prev => prev?.type === 'run' ? null : { type: 'run', centerPct });
                                                                }}
                                                            >
                                                                {bar.widthPercent >= 8 && (
                                                                    <span className="wo-bar-text">{getRunStatusLabel(testResult.session_status)}</span>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {activePopover?.type === 'run' && (
                                                            <div
                                                                ref={popoverRef}
                                                                className="wo-timeline-popover"
                                                                style={{
                                                                    left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`,
                                                                    transform: 'translateX(-50%)',
                                                                    '--arrow-left': 'calc(50% - 6px)',
                                                                    position: 'absolute', zIndex: 100
                                                                } as React.CSSProperties}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <div className="wo-timeline-popover-header">
                                                                    <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                        {testResult.test_result_code || `Session #${testResult.test_result_id}`}
                                                                    </span>
                                                                    <span className="wo-emp-status" style={{ backgroundColor: getRunStatusBg(testResult.session_status), color: getRunStatusColor(testResult.session_status) }}>
                                                                        {getRunStatusLabel(testResult.session_status)}
                                                                    </span>
                                                                </div>

                                                                <div className="wo-timeline-popover-list">
                                                                    <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                                        <i className="bi bi-people-fill me-1" />ผู้ทดสอบ ({activeAssignments.length} คน)
                                                                    </div>
                                                                    {activeAssignments.length === 0 ? (
                                                                        <div className="text-muted" style={{ fontSize: 12 }}>ยังไม่มีผู้ทดสอบ</div>
                                                                    ) : (
                                                                        activeAssignments.map(a => (
                                                                            <div key={a.test_result_assignment_id} className="wo-timeline-popover-emp">
                                                                                <div className="wo-popover-avatar">{a.employee?.employee_first_name?.charAt(0) ?? '?'}</div>
                                                                                <span className="flex-1">{a.employee?.employee_first_name} {a.employee?.employee_last_name}</span>
                                                                                <span className="text-muted ms-auto" style={{ fontSize: 11 }}>
                                                                                    {a.from_time ? new Date(a.from_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                {testResult.breaks && testResult.breaks.length > 0 && (
                                                                    <div className="wo-timeline-popover-footer">
                                                                        <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                                                                            <i className="bi bi-clock-history me-1 text-warning" />
                                                                            พัก {testResult.breaks.length} ครั้ง • {formatDurationMs(calcTotalBreakMs(testResult.breaks))}
                                                                        </div>
                                                                        {testResult.breaks.map(b => (
                                                                            <div key={b.break_id} style={{ fontSize: 11, color: '#7e8299', paddingBottom: 2 }}>
                                                                                <span className="fw-semibold text-gray-700">{b.break_type}</span>
                                                                                <span className="ms-2">{formatTimeTL(b.break_start)} – {b.break_end ? formatTimeTL(b.break_end) : 'กำลังพัก...'}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="wo-timeline-bar-empty">
                                                        <span className="text-muted" style={{ fontSize: 11 }}>ไม่มีกิจกรรมวันนี้</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employee rows */}
                                    {employeeRows.length > 0 && (
                                        <>
                                            <div style={{ borderTop: '1px dashed #e4e6ef', margin: '6px 0 2px' }} />
                                            {employeeRows.map(row => (
                                                <div key={row.employee_id} className="wo-timeline-row">
                                                    <div className="wo-timeline-label-col">
                                                        <div className="wo-phase-label">
                                                            <span
                                                                className="wo-phase-dot"
                                                                style={{
                                                                    backgroundColor: row.bars.some(b => b.isActive) ? '#50cd89' : '#a1a5b7'
                                                                }}
                                                            />
                                                            <span className="wo-phase-name" title={row.name}>
                                                                <i className="bi bi-person-fill me-1" style={{ fontSize: 10, color: '#50cd89' }} />{row.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="wo-timeline-bar-col">
                                                        <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                            {row.bars.map(bar => (
                                                                <React.Fragment key={bar.bar_key}>
                                                                    <div
                                                                        className="wo-timeline-bar"
                                                                        style={{ backgroundColor: bar.isActive ? '#50cd89' : '#a1a5b7', left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                            setActivePopover(prev => prev?.type === 'employee' && prev.assignmentId === bar.assignment_id ? null : { type: 'employee', assignmentId: bar.assignment_id, centerPct });
                                                                        }}
                                                                    >
                                                                        {bar.widthPercent >= 8 && <span className="wo-bar-text">{bar.isActive ? 'กำลังทำงาน' : 'เสร็จแล้ว'}</span>}
                                                                    </div>
                                                                    {activePopover?.type === 'employee' && activePopover.assignmentId === bar.assignment_id && (() => {
                                                                        const durationMs = bar.to_time ? new Date(bar.to_time).getTime() - new Date(bar.from_time).getTime() : Date.now() - new Date(bar.from_time).getTime();
                                                                        return (
                                                                            <div ref={popoverRef} className="wo-timeline-popover" style={{ left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`, transform: 'translateX(-50%)', '--arrow-left': 'calc(50% - 6px)' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
                                                                                <div className="wo-timeline-popover-header">
                                                                                    <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}><i className="bi bi-person-fill me-1" style={{ color: '#50cd89' }} />{row.name}</span>
                                                                                    <span className="wo-emp-status" style={{ backgroundColor: bar.isActive ? '#e8fff3' : '#f1f1f4', color: bar.isActive ? '#198754' : '#6c757d' }}>{bar.isActive ? 'กำลังทำงาน' : 'เสร็จแล้ว'}</span>
                                                                                </div>
                                                                                <div className="wo-timeline-popover-list">
                                                                                    <div className="wo-timeline-popover-emp"><i className="bi bi-clock me-1 text-muted" style={{ fontSize: 12 }} /><span className="text-muted" style={{ fontSize: 12 }}>เริ่ม:</span><span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{formatTimeTL(bar.from_time)}</span></div>
                                                                                    <div className="wo-timeline-popover-emp"><i className="bi bi-clock-history me-1 text-muted" style={{ fontSize: 12 }} /><span className="text-muted" style={{ fontSize: 12 }}>สิ้นสุด:</span><span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{bar.to_time ? formatTimeTL(bar.to_time) : 'กำลังทำงาน...'}</span></div>
                                                                                </div>
                                                                                <div className="wo-timeline-popover-footer"><span className="text-muted fw-semibold" style={{ fontSize: 11 }}><i className="bi bi-stopwatch me-1" />ระยะเวลา: {formatDurationMs(durationMs)}</span></div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Machine rows */}
                                    {machineRows.map(row => (
                                        <div key={row.machine_id} className="wo-timeline-row">
                                            <div className="wo-timeline-label-col">
                                                <div className="wo-phase-label">
                                                    <span
                                                        className="wo-phase-dot"
                                                        style={{
                                                            backgroundColor: row.bars.some(b => b.isActive) ? '#17a2b8' : '#a1a5b7'
                                                        }}
                                                    />
                                                    <span className="wo-phase-name" title={row.name}>
                                                        <i className="bi bi-gear-fill me-1" style={{ fontSize: 10, color: '#17a2b8' }} />{row.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-bar-col">
                                                <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                    {row.bars.map(bar => (
                                                        <React.Fragment key={bar.bar_key}>
                                                            <div
                                                                className="wo-timeline-bar"
                                                                style={{
                                                                    backgroundColor: bar.isActive ? '#17a2b8' : '#a1a5b7',
                                                                    left: `${bar.leftPercent}%`,
                                                                    width: `${bar.widthPercent}%`
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                    setActivePopover(prev =>
                                                                        prev?.type === 'machine' && prev.barId === bar.test_result_machine_id
                                                                            ? null
                                                                            : { type: 'machine', machineId: row.machine_id, barId: bar.test_result_machine_id, centerPct }
                                                                    );
                                                                }}
                                                            >
                                                                {bar.widthPercent >= 8 && <span className="wo-bar-text">{bar.isActive ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}</span>}
                                                            </div>

                                                            {activePopover?.type === 'machine' && activePopover.barId === bar.test_result_machine_id && (() => {
                                                                // คำนวณระยะเวลา (Duration)
                                                                const durationMs = bar.to_time
                                                                    ? new Date(bar.to_time).getTime() - new Date(bar.from_time).getTime()
                                                                    : Date.now() - new Date(bar.from_time).getTime();

                                                                return (
                                                                    <div
                                                                        ref={popoverRef}
                                                                        className="wo-timeline-popover"
                                                                        style={{
                                                                            left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`,
                                                                            transform: 'translateX(-50%)',
                                                                            '--arrow-left': 'calc(50% - 6px)'
                                                                        } as React.CSSProperties}
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        <div className="wo-timeline-popover-header">
                                                                            <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                                <i className="bi bi-gear-fill me-1" style={{ color: '#17a2b8' }} />{row.name}
                                                                            </span>
                                                                            <span className="wo-emp-status" style={{
                                                                                backgroundColor: bar.isActive ? '#e1f5fe' : '#f1f1f4',
                                                                                color: bar.isActive ? '#0288d1' : '#6c757d'
                                                                            }}>
                                                                                {bar.isActive ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="wo-timeline-popover-list">
                                                                            <div className="wo-timeline-popover-emp">
                                                                                <i className="bi bi-clock me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                <span className="text-muted" style={{ fontSize: 12 }}>เริ่ม:</span>
                                                                                <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{formatTimeTL(bar.from_time)}</span>
                                                                            </div>
                                                                            <div className="wo-timeline-popover-emp">
                                                                                <i className="bi bi-clock-history me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                <span className="text-muted" style={{ fontSize: 12 }}>สิ้นสุด:</span>
                                                                                <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>
                                                                                    {bar.to_time ? formatTimeTL(bar.to_time) : 'กำลังใช้งาน...'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="wo-timeline-popover-footer">
                                                                            <span className="text-muted fw-semibold" style={{ fontSize: 11 }}>
                                                                                <i className="bi bi-stopwatch me-1" />ระยะเวลา: {formatDurationMs(durationMs)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-clock-history fs-3x text-gray-300 mb-3 d-block" />
                                    Session ยังไม่ได้เริ่มทดสอบ
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Completed: test result items */}
                {isCompleted && (testResult.test_result_items ?? []).length > 0 && (
                    <div className="wo-card mb-6">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">
                                ผลการทดสอบรายหน่วย
                            </h3>
                        </div>

                        <div className="wo-card-body">
                            <div className="table-responsive">
                                <table className="table table-bordered align-middle fs-7 mb-0">
                                    <thead className="table-light">
                                        <tr className="fw-bold text-gray-700 text-center">
                                            <th className="w-60px">ลำดับ</th>
                                            <th className="text-start">คำอธิบาย</th>
                                            <th className="w-120px">Serial No.</th>
                                            <th className="w-100px">WLL วัดได้</th>
                                            <th className="w-100px">Load Test</th>
                                            <th className="w-100px">ผล</th>
                                            <th>หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(testResult.test_result_items as any[]).map((item: any) => (
                                            <tr key={item.test_result_item_id} className="text-center">
                                                <td className="fw-bold">{item.unit_number}</td>
                                                <td className="text-start">{item.description || "—"}</td>
                                                <td>{item.serial_no || "—"}</td>
                                                <td>{item.wll_measured ?? "—"}</td>
                                                <td>{item.load_test_value ?? "—"}</td>
                                                <td>
                                                    <span className={`badge fw-bold ${item.result === "PASSED" ? "badge-light-success" : "badge-light-danger"}`}>
                                                        {item.result}
                                                    </span>
                                                </td>
                                                <td>{item.remark || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* สรุปรายละเอียดการทดสอบ */}
                                <div className="mt-8 border-top pt-5">
                                    <div className="row g-4">
                                        {testResult.test_method && (
                                            <div className="col-6 col-md-4">
                                                <div className="bg-light rounded-3 p-4 h-100">
                                                    <span className="text-muted fw-bold fs-9 text-uppercase d-block mb-2 ls-1">วิธีทดสอบ</span>
                                                    <span className="fw-bold text-gray-800 fs-6">{testResult.test_method}</span>
                                                </div>
                                            </div>
                                        )}

                                        {testResult.standard_reference && (
                                            <div className="col-6 col-md-4">
                                                <div className="bg-light rounded-3 p-4 h-100">
                                                    <span className="text-muted fw-bold fs-9 text-uppercase d-block mb-2 ls-1">มาตรฐานอ้างอิง</span>
                                                    <span className="fw-bold text-gray-800 fs-6">{testResult.standard_reference}</span>
                                                </div>
                                            </div>
                                        )}

                                        {testResult.remark && (
                                            <div className="col-12 mt-2">
                                                <div className="p-4 border border-dashed rounded-3">
                                                    <span className="text-muted fw-bold fs-9 text-uppercase d-block mb-1 ls-1">หมายเหตุเพิ่มเติม</span>
                                                    <span className="text-gray-600 fs-7 italic">{testResult.remark}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* สรุปต้นทุน */}
                <div className="card shadow-sm mb-8">
                    <div className="card-header border-0 pt-5">
                        <div className="card-title">
                            <span className="card-label fw-bold text-gray-900 fs-5">
                                สรุปต้นทุน
                            </span>
                        </div>
                    </div>
                    <div className="card-body pt-3">
                        <div className="row g-5">
                            {/* ── ฝั่งซ้าย: รายละเอียดเครื่องจักร + พนักงาน ── */}
                            <div className="col-lg-7 d-flex flex-column gap-5">

                                {/* ── เครื่องจักร ── */}
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <span className="fs-7 fw-bold text-gray-700">รายละเอียดค่าเครื่องจักร</span>
                                        <span className="badge badge-light-primary fs-9">{machineCostActual.length} เครื่อง</span>
                                    </div>
                                    {machineCostActual.length === 0 ? (
                                        <div className="text-muted fs-8 py-3 ps-2">ยังไม่มีเครื่องจักรที่ใช้งาน</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {machineCostActual.map(m => (
                                                <div key={m.machine_id}
                                                    className="d-flex align-items-center justify-content-between rounded px-4 py-3"
                                                    style={{ background: m.isRunning ? '#fffbeb' : '#f9fafb', border: `1px solid ${m.isRunning ? '#fde68a' : '#e5e7eb'}` }}>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="symbol symbol-35px">
                                                            <span className={`symbol-label ${m.isRunning ? 'bg-warning' : 'bg-light'}`}>
                                                                <i className={`bi bi-gear fs-6 ${m.isRunning ? 'text-white' : 'text-gray-500'}`}></i>
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                {m.machine?.is_second_hand && (
                                                                    <span className="badge badge-sm badge-light-warning">มือสอง</span>
                                                                )}
                                                                <span className="fw-semibold text-gray-800 fs-7">
                                                                    {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                                </span>
                                                                <span className="text-muted fs-8">{formatDurationMs(m.seconds * 1000)}</span>
                                                            </div>
                                                            <div className="d-flex gap-3 fs-8 text-muted">
                                                                <span>
                                                                    <i className="bi bi-graph-down-arrow me-1 text-primary" />
                                                                    {m.noRate ? <span className="text-warning">ยังไม่มี rate</span> : `฿${m.depreciationCost.toFixed(4)}`}
                                                                </span>
                                                                <span>
                                                                    <i className="bi bi-wrench me-1 text-warning" />
                                                                    {m.isRunning
                                                                        ? <span className="text-warning">~฿{m.maintenanceCost.toFixed(4)}</span>
                                                                        : `฿${m.maintenanceCost.toFixed(4)}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`fw-bolder fs-7 ${m.isRunning ? 'text-warning' : 'text-gray-800'}`}>
                                                        {m.isRunning ? '~' : ''}฿{m.totalCost.toFixed(4)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── พนักงาน ── */}
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <span className="fs-7 fw-bold text-gray-700">รายละเอียดค่าพนักงาน</span>
                                        <span className="badge badge-light-success fs-9">{laborBreakdown.length} คน</span>
                                    </div>
                                    {laborBreakdown.length === 0 ? (
                                        <div className="text-muted fs-8 py-3 ps-2">ยังไม่มีพนักงานที่ถูก assign</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {laborBreakdown.map(a => (
                                                <div key={a.employee_id}
                                                    className="d-flex align-items-center justify-content-between rounded px-4 py-3"
                                                    style={{ background: a.isWorking ? '#f0fdf4' : '#f9fafb', border: `1px solid ${a.isWorking ? '#bbf7d0' : '#e5e7eb'}` }}>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="symbol symbol-35px">
                                                            <span className={`symbol-label ${a.isWorking ? 'bg-success' : 'bg-light'}`}>
                                                                <i className={`bi bi-person-fill fs-6 ${a.isWorking ? 'text-white' : 'text-gray-500'}`}></i>
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                <span className="fw-semibold text-gray-800 fs-7">
                                                                    {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                                </span>
                                                                <span className="text-muted fs-8">{formatDurationMs(a.seconds * 1000)}</span>
                                                            </div>
                                                            <div className="d-flex gap-3 fs-8 text-muted flex-wrap">
                                                                <span>
                                                                    <i className="bi bi-cash-stack me-1 text-success" />
                                                                    {(a.employee as any)?.base_salary
                                                                        ? `ฐาน ฿${(a.employee as any).base_salary.toLocaleString()}/ด.`
                                                                        : null}
                                                                </span>
                                                                <span>
                                                                    <i className="bi bi-calendar-day me-1 text-primary" />
                                                                    {(a.employee as any)?.day_rate
                                                                        ? `รายวัน ฿${(a.employee as any).day_rate.toLocaleString()}/วัน`
                                                                        : null}
                                                                </span>
                                                                <span>
                                                                    <i className="bi bi-lightning me-1 text-warning" />
                                                                    {(a.employee as any)?.ot_hourly_rate
                                                                        ? `OT ฿${(a.employee as any).ot_hourly_rate.toLocaleString()}/ชม.`
                                                                        : null}
                                                                </span>
                                                                <span>
                                                                    <i className="bi bi-clock me-1" />
                                                                    {a.hourlyRate > 0 ? `฿${a.hourlyRate.toFixed(2)}/ชม.` : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`fw-bolder fs-7 ${a.isWorking ? 'text-success' : 'text-gray-800'}`}>
                                                        {a.isWorking ? '~' : ''}฿{a.cost.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* ── ฝั่งขวา: ตารางสรุปรวม ── */}
                            <div className="col-lg-5">
                                <div className="fs-7 fw-bold text-gray-600 mb-3">ต้นทุนรวม</div>
                                <div className="bg-light rounded p-4">
                                    {/* ค่าวัตถุดิบ */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="symbol symbol-25px">
                                                <span className="symbol-label">
                                                    <i className="bi bi-box-seam fs-8"></i>
                                                </span>
                                            </span>
                                            <span className="text-gray-600 fs-7">ค่าวัตถุดิบ</span>
                                        </div>
                                        {totalMaterialCost > 0
                                            ? <span className="fw-semibold text-gray-800 fs-7">฿{totalMaterialCost.toFixed(2)}</span>
                                            : <span className="text-muted fs-8 fst-italic">ไม่มีข้อมูล</span>
                                        }
                                    </div>

                                    {/* ค่าเสื่อมราคาเครื่องจักร */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="symbol symbol-25px">
                                                <span className="symbol-label">
                                                    <i className="bi bi-graph-down-arrow fs-8"></i>
                                                </span>
                                            </span>
                                            <span className="text-gray-600 fs-7">ค่าเสื่อมราคาเครื่องจักร</span>
                                        </div>
                                        <span className="fw-semibold text-gray-800 fs-7">
                                            ฿{machineCostActual.reduce((s, m) => s + m.depreciationCost, 0).toFixed(4)}
                                        </span>
                                    </div>

                                    {/* ค่าซ่อมเครื่องจักร — real-time */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="symbol symbol-25px">
                                                <span className="symbol-label">
                                                    <i className="bi bi-wrench fs-8"></i>
                                                </span>
                                            </span>
                                            <div>
                                                <span className="text-gray-600 fs-7">ค่าซ่อมเครื่องจักร</span>
                                                {machineCostActual.some(m => m.isRunning) && (
                                                    <span className="ms-1 text-warning fs-9 fst-italic">(ประมาณการ)</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`fw-semibold fs-7 text-gray-800`}>
                                            ฿{machineCostActual.reduce((s, m) => s + m.maintenanceCost, 0).toFixed(4)}
                                        </span>
                                    </div>

                                    {/* ค่าพนักงาน — split */}
                                    <div className="mb-2">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <span className="symbol symbol-25px">
                                                <span className="symbol-label">
                                                    <i className="bi bi-people fs-8"></i>
                                                </span>
                                            </span>
                                            <span className="text-gray-700 fs-7 fw-bold">ค่าพนักงาน</span>
                                            {isLaborEstimate && (
                                                <span className="badge badge-light-warning fs-9">ประมาณการ</span>
                                            )}
                                        </div>
                                        <div className="ps-7">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="text-gray-600 fs-8">
                                                    <i className="bi bi-cash-stack me-1 text-success" />เงินเดือนฐาน
                                                </span>
                                                <span className="fw-semibold text-gray-800 fs-8">฿{laborSplit.base.toFixed(2)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="text-gray-600 fs-8">
                                                    <i className="bi bi-calendar-day me-1 text-primary" />ค่าแรงรายวัน
                                                </span>
                                                <span className="fw-semibold text-gray-800 fs-8">฿{laborSplit.day.toFixed(2)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="text-gray-600 fs-8">
                                                    <i className="bi bi-lightning me-1 text-warning" />ค่า OT / วันหยุด
                                                </span>
                                                <span className="fw-semibold text-gray-800 fs-8">
                                                    {isLaborEstimate ? <span className="text-muted fst-italic">รอ finalize</span> : `฿${laborSplit.ot.toFixed(2)}`}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                                                <span className="text-gray-700 fs-8 fw-bold">รวมค่าพนักงาน</span>
                                                <span className="fw-bold text-gray-900 fs-7">฿{laborSplit.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="separator separator-dashed my-4"></div>

                                    {/* รวมต้นทุน */}
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-gray-800 fs-6">รวมต้นทุน</span>
                                        <span className="fw-bolder text-primary fs-4">
                                            ฿{(
                                                totalMaterialCost +
                                                machineCostActual.reduce((s, m) => s + m.depreciationCost, 0) +
                                                machineCostActual.reduce((s, m) => s + m.maintenanceCost, 0) +
                                                laborSplit.total
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cost Over Time Chart */}
                {costChartData.length > 1 && (
                    <div className="card shadow-sm mb-8">
                        <div className="card-header border-0 pt-5">
                            <div className="card-title">
                                <span className="card-label fw-bold text-gray-900 fs-5">
                                    ต้นทุนสะสมตามช่วงเวลา
                                </span>
                            </div>
                            <div className="card-toolbar">
                                <span className="text-muted fs-8">แกน X = เวลาที่ผ่านไป (ชม:นาที) &nbsp;|&nbsp; แกน Y = บาท</span>
                            </div>
                        </div>
                        <div className="card-body pt-3 pb-6">
                            {/* Legend chips */}
                            <div className="d-flex flex-wrap gap-3 mb-5">
                                {[
                                    { label: 'ค่าเสื่อมราคา', color: '#0d6efd' },
                                    { label: 'ค่าซ่อมบำรุง', color: '#fd7e14' },
                                    { label: 'ค่าพนักงาน', color: '#198754' },
                                    { label: 'รวม', color: '#6f42c1', dashed: true },
                                ].map(item => (
                                    <span key={item.label} className="d-flex align-items-center gap-1 fs-8 text-gray-700 fw-semibold">
                                        <svg width="22" height="10">
                                            <line x1="0" y1="5" x2="22" y2="5"
                                                stroke={item.color} strokeWidth="2.5"
                                                strokeDasharray={item.dashed ? '4 3' : undefined} />
                                        </svg>
                                        {item.label}
                                    </span>
                                ))}
                            </div>

                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={costChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fill: '#6c757d' }}
                                        tickLine={false}
                                        interval={Math.floor(costChartData.length / 8)}
                                        label={{ value: 'เวลาที่ผ่านไป', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: '#6c757d' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#6c757d' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => v >= 1 ? `฿${v.toFixed(2)}` : `฿${v.toFixed(4)}`}
                                        width={80}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                        formatter={(value: number, name: string) => [`฿${value.toFixed(4)}`, name]}
                                        labelFormatter={(label: string) => `เวลา ${label}`}
                                    />
                                    <Line type="monotone" dataKey="ค่าเสื่อมราคา" stroke="#0d6efd" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="ค่าซ่อมบำรุง" stroke="#fd7e14" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="ค่าพนักงาน" stroke="#198754" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="รวม" stroke="#6f42c1" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Summary row */}
                            <div className="d-flex flex-wrap justify-content-center gap-5 mt-4 pt-4">
                                {[
                                    { label: 'ค่าเสื่อมราคา', key: 'ค่าเสื่อมราคา', color: '#0d6efd', bg: '#e7f1ff' },
                                    { label: 'ค่าซ่อมบำรุง', key: 'ค่าซ่อมบำรุง', color: '#fd7e14', bg: '#fff3e0' },
                                    { label: 'ค่าพนักงาน', key: 'ค่าพนักงาน', color: '#198754', bg: '#d1e7dd' },
                                    { label: 'รวม', key: 'รวม', color: '#6f42c1', bg: '#f0ebff' },
                                ].map(item => {
                                    const last = costChartData[costChartData.length - 1];
                                    const val = last ? (last as unknown as Record<string, number>)[item.key] : 0;
                                    return (
                                        <div key={item.key} className="d-flex flex-column align-items-center px-4 py-2 rounded" style={{ backgroundColor: item.bg, minWidth: 120 }}>
                                            <span className="fs-8 fw-semibold mb-1" style={{ color: item.color }}>{item.label}</span>
                                            <span className="fw-bolder fs-6" style={{ color: item.color }}>฿{val.toFixed(4)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* ── START MODAL ── */}
            <Modal show={showStartModal} onHide={() => !startSaving && setShowStartModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">เริ่มทดสอบ — {testResult.test_result_code}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <p className="form-label fw-bold fs-6">
                                รายการวัตถุดิบ
                            </p>
                            {isPending && (
                                <button className="btn btn-sm btn-light-primary fw-bold" onClick={openReqEditor}>
                                    <i className="bi bi-pencil me-1" />แก้ไข
                                </button>
                            )}
                        </div>

                        {showReqEditor && isPending ? (
                            <div className="border rounded p-4 bg-light-primary">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="fw-bold text-gray-700 fs-7">แก้ไขรายการวัตถุดิบ</span>
                                    <button className="btn btn-sm btn-light-primary fw-bold" onClick={() => setReqRows(r => [...r, { item_code: "", item_name: "", required_qty: "", unit: "" }])}>
                                        <i className="bi bi-plus-lg me-1" />เพิ่มแถว
                                    </button>
                                </div>
                                <div className="table-responsive mb-3">
                                    <table className="table table-bordered align-middle fs-7 mb-0">
                                        <thead className="table-light">
                                            <tr className="fw-bold text-gray-700">
                                                <th>สินค้า</th>
                                                <th className="w-80px text-center">หน่วย</th>
                                                <th className="w-110px">จำนวน</th>
                                                <th className="w-50px" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reqRows.map((row, i) => (
                                                <tr key={i} className={reqErrors[i] ? "table-danger" : ""}>
                                                    <td>
                                                        <select
                                                            className={`form-select form-select-sm ${reqErrors[i] ? "is-invalid" : ""}`}
                                                            value={row.qc_item_id ?? ""}
                                                            onChange={e => {
                                                                const qi = qcItems.find(q => Number(q.id) === Number(e.target.value));
                                                                setReqRows(prev => prev.map((r, idx) => idx !== i ? r : qi
                                                                    ? { ...r, qc_item_id: Number(qi.id), item_code: qi.code, item_name: qi.description, unit: qi.unit_name ?? "", material_list_id: qi.material_list_id }
                                                                    : { ...r, qc_item_id: undefined, item_code: "", item_name: "", unit: "" }
                                                                ));
                                                                setReqErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                                                            }}
                                                        >
                                                            <option value="">-- เลือกสินค้า --</option>
                                                            {qcItems.map(qi => (
                                                                <option key={qi.id} value={Number(qi.id)}>
                                                                    {(qi as any).material_list?.item_name} ({(qi as any).material_list?.item_code})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {reqErrors[i] && <div className="invalid-feedback">{reqErrors[i]}</div>}
                                                    </td>
                                                    <td className="text-center text-muted fw-bold">
                                                        {qcItems.find(q => Number(q.id) === row.qc_item_id)?.unit_name ?? row.unit ?? "—"}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm text-center"
                                                            value={row.required_qty}
                                                            onChange={e => setReqRows(prev => prev.map((r, idx) => idx !== i ? r : { ...r, required_qty: formatIntegerInput(e.target.value) }))}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-icon btn-sm btn-light-danger" onClick={() => setReqRows(prev => prev.filter((_, idx) => idx !== i))} disabled={reqRows.length === 1}>
                                                            <i className="bi bi-trash fs-6" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-end gap-2">
                                    <button className="btn btn-light btn-sm fw-bold" onClick={() => setShowReqEditor(false)} disabled={reqSaving}>ยกเลิก</button>
                                    <button className="btn btn-primary btn-sm fw-bold" onClick={handleSaveReqItems} disabled={reqSaving}>
                                        {reqSaving ? <><span className="spinner-border spinner-border-sm me-2" />กำลังบันทึก...</> : <><i className="bi bi-check2 me-1" />บันทึก</>}
                                    </button>
                                </div>
                            </div>
                        ) : (testResult.required_items ?? []).length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-bordered align-middle fs-7 mb-0">
                                    <thead className="table-light">
                                        <tr className="fw-bold text-gray-700">
                                            <th>รหัสสินค้า</th>
                                            <th>ชื่อสินค้า</th>
                                            <th className="w-80px text-center">หน่วย</th>
                                            <th className="w-100px text-center">จำนวน</th>
                                            {!isPending && <th className="w-100px text-center">ใช้จริง</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(testResult.required_items as any[]).map((it: any, i: number) => (
                                            <tr key={i}>
                                                <td className="fw-bold text-gray-800">{it.item_code || "—"}</td>
                                                <td className="text-gray-700">{it.item_name || "—"}</td>
                                                <td className="text-center text-muted">{it.unit || "—"}</td>
                                                <td className="text-center fw-bold text-primary">{it.required_qty ?? "—"}</td>
                                                {!isPending && <td className="text-center text-muted">{it.qty_consumed_actual ?? "—"}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-muted fs-7 py-3 text-center bg-light rounded">ยังไม่มีรายการวัตถุดิบ</div>
                        )}
                    </div>

                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light" onClick={() => setShowStartModal(false)} disabled={startSaving}>ยกเลิก</button>
                    <button className="btn btn-primary fw-bold" onClick={handleStart} disabled={startSaving}>
                        {startSaving ? <><span className="spinner-border spinner-border-sm me-2" />กำลังเริ่ม...</> : <><i className="bi bi-play-fill me-1" />เริ่มทดสอบ</>}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* ── FINALIZE MODAL ── */}
            <Modal show={showFinalizeForm && !!finalizeForm} onHide={() => { if (!finalizeSaving) { setShowFinalizeForm(false); setFinalizeForm(null); } }} centered size="xl" scrollable>
                <Modal.Header closeButton={!finalizeSaving}>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-clipboard2-data me-2 text-warning" />
                        ป้อนผลการทดสอบ — {testResult?.claimed_qty} หน่วย
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {finalizeForm && (
                        <>
                            {/* Metadata */}
                            <div className="row g-4 mb-6">
                                <div className="col-md-3">
                                    <label className="form-label fw-bold">
                                        ประเภทการทดสอบ
                                        {checklistLoading && <span className="spinner-border spinner-border-sm ms-2" />}
                                    </label>
                                    <select
                                        className="form-select"
                                        value={finalizeForm.test_type}
                                        onChange={e => handleTestTypeChange(e.target.value as TestTypeValue)}
                                    >
                                        {TEST_TYPE_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {[
                                    { label: "วิธีการทดสอบ", field: "test_method" as const, type: "text", placeholder: "e.g. Proof Load Test" },
                                    { label: "มาตรฐานอ้างอิง", field: "standard_reference" as const, type: "text", placeholder: "e.g. BS EN 13414" },
                                    { label: "หมายเหตุ", field: "remark" as const, type: "text", placeholder: "หมายเหตุ (ถ้ามี)" },
                                ].map(({ label, field, type, placeholder }) => (
                                    <div key={field} className="col-md-3">
                                        <label className="form-label fw-bold">{label}</label>
                                        <input
                                            type={type}
                                            className="form-control"
                                            placeholder={placeholder}
                                            value={(finalizeForm as any)[field]}
                                            onChange={e => setFinalizeForm(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                                        />
                                    </div>
                                ))}
                                <div className="col-md-12">
                                    <label className="form-label fw-bold">ผลโดยรวม</label>
                                    <div className="d-flex gap-6 mt-1">
                                        {(["PASSED", "FAILED"] as const).map(s => (
                                            <label key={s} className="d-flex align-items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="form-check-input"
                                                    checked={finalizeForm.overall_status === s}
                                                    onChange={() => setFinalizeForm(prev => prev ? { ...prev, overall_status: s } : prev)}
                                                />
                                                <span className={`fw-bold fs-6 ${s === "PASSED" ? "text-success" : "text-danger"}`}>{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pinned test-section reference (S5). Read-only view of the
                                component version the tested pieces were actually built against
                                — resolved from the feeding runs' pins, not the live template.
                                The manual Product Spec below stays hand-entered: its wire-rope
                                fields (construction/grade/diameter/…) are not a defined
                                projection of arbitrary template section data, so we surface the
                                pinned spec for the tester to read rather than fuzzily autofilling. */}
                            {testResult.resolved_component_version && (() => {
                                const rcv = testResult.resolved_component_version!;
                                const testSections = (rcv.section_data_snapshot ?? []).filter(s => s.is_test_section);
                                return (
                                    <div className="border border-primary rounded p-4 mb-6 bg-light-primary bg-opacity-25">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <h6 className="fw-bold text-gray-700 mb-0">
                                                <i className="bi bi-lock-fill me-2 text-primary" />
                                                สเปคที่ตรึงไว้ (Pinned): {rcv.component_name} · v{rcv.version_no}
                                            </h6>
                                            {testResult.mixed_version && (
                                                <span className="badge badge-light-warning">หลายเวอร์ชัน — แสดงเวอร์ชันล่าสุด</span>
                                            )}
                                        </div>
                                        {testSections.length === 0 ? (
                                            <div className="text-muted fs-8">เวอร์ชันนี้ไม่มีส่วนทดสอบที่ตรึงไว้</div>
                                        ) : (
                                            <div className="row g-3">
                                                {testSections.map(sec => (
                                                    <div key={sec.section_key} className="col-md-6">
                                                        <div className="fw-semibold fs-8 text-gray-600 mb-1">{sec.section_key}</div>
                                                        <pre className="bg-white border rounded p-2 mb-0 fs-8 text-gray-800" style={{ whiteSpace: "pre-wrap" }}>
                                                            {typeof sec.data === "string" ? sec.data : JSON.stringify(sec.data, null, 2)}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Product spec (per-session snapshot) — manual entry (see note above). */}
                            <div className="border rounded p-4 mb-6 bg-light-primary bg-opacity-10">
                                <h6 className="fw-bold text-gray-700 mb-3">
                                    <i className="bi bi-rulers me-2 text-primary" />ข้อมูลจำเพาะสินค้า (Product Spec)
                                </h6>
                                <div className="row g-3">
                                    {SPEC_FIELDS.map(({ field, label, numeric }) => (
                                        <div key={field} className="col-md-4">
                                            <label className="form-label fw-semibold fs-8">{label}</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={finalizeForm.spec[field]}
                                                onChange={e => {
                                                    const v = numeric ? toDecimalInput(e.target.value) : e.target.value;
                                                    setFinalizeForm(prev => prev ? { ...prev, spec: { ...prev.spec, [field]: v } } : prev);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Per-item table */}
                            <h6 className="fw-bold text-gray-700 mb-3">ผลรายหน่วย</h6>
                            <div className="table-responsive mb-5">
                                <table className="table table-bordered align-middle fs-7 mb-0">
                                    <thead className="table-light">
                                        <tr className="fw-bold text-gray-700 text-center">
                                            <th className="w-40px"></th>
                                            <th className="w-60px">ลำดับ</th>
                                            <th className="text-start">คำอธิบาย</th>
                                            <th className="w-120px">Serial No.</th>
                                            <th className="w-100px">WLL วัดได้</th>
                                            <th className="w-100px">Load Test</th>
                                            <th className="w-120px">ผล</th>
                                            <th className="w-150px">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finalizeForm.items.map((item, i) => (
                                            <React.Fragment key={i}>
                                            <tr>
                                                <td className="text-center">
                                                    <button type="button" className="btn btn-icon btn-sm btn-light-primary"
                                                        onClick={() => setExpandedItems(prev => ({ ...prev, [i]: !prev[i] }))}
                                                        title="รายละเอียดการทดสอบ">
                                                        <i className={`bi ${expandedItems[i] ? "bi-chevron-down" : "bi-chevron-right"}`} />
                                                    </button>
                                                </td>
                                                <td className="text-center fw-bold text-gray-600">{item.unit_number}</td>
                                                <td>
                                                    <input type="text" className="form-control form-control-sm" value={item.description}
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], description: e.target.value }; return { ...prev, items }; })}
                                                        placeholder="คำอธิบาย" />
                                                </td>
                                                <td>
                                                    <input type="text" className="form-control form-control-sm text-center" value={item.serial_no}
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], serial_no: e.target.value }; return { ...prev, items }; })}
                                                        placeholder="-" />
                                                </td>
                                                <td>
                                                    <input type="text" className="form-control form-control-sm text-center" value={item.wll_measured}
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], wll_measured: toDecimalInput(e.target.value) }; return { ...prev, items }; })}
                                                        placeholder="0.00" />
                                                </td>
                                                <td>
                                                    <input type="text" className="form-control form-control-sm text-center" value={item.load_test_value}
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], load_test_value: toDecimalInput(e.target.value) }; return { ...prev, items }; })}
                                                        placeholder="0.00" />
                                                </td>
                                                <td className="text-center">
                                                    <select
                                                        className={`form-select form-select-sm fw-bold ${item.result === "PASSED" ? "text-success" : "text-danger"}`}
                                                        value={item.result}
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], result: e.target.value as "PASSED" | "FAILED" }; return { ...prev, items }; })}
                                                    >
                                                        <option value="PASSED">PASSED</option>
                                                        <option value="FAILED">FAILED</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="text" className="form-control form-control-sm" value={item.remark}
                                                        onChange={e => updateItem(i, { remark: e.target.value })}
                                                        placeholder="-" />
                                                </td>
                                            </tr>
                                            {expandedItems[i] && (
                                                <tr className="bg-light">
                                                    <td colSpan={8} className="p-4">
                                                        {/* Test parameters — conditional on test_type */}
                                                        {(finalizeForm.test_type === "PROOF_LOAD" || finalizeForm.test_type === "") && (
                                                            <div className="row g-3 mb-3">
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Required Load (เป้าหมาย)</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.required_load}
                                                                        onChange={e => updateItem(i, { required_load: toDecimalInput(e.target.value) })} placeholder="0.00" />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Hold Time (วินาที)</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.hold_time_sec}
                                                                        onChange={e => updateItem(i, { hold_time_sec: formatIntegerInput(e.target.value) })} placeholder="0" />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Length Before</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.length_before}
                                                                        onChange={e => updateItem(i, { length_before: toDecimalInput(e.target.value) })} placeholder="0.00" />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Length After</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.length_after}
                                                                        onChange={e => updateItem(i, { length_after: toDecimalInput(e.target.value) })} placeholder="0.00" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {finalizeForm.test_type === "BREAKING" && (
                                                            <div className="row g-3 mb-3">
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Breaking Force</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.breaking_force}
                                                                        onChange={e => updateItem(i, { breaking_force: toDecimalInput(e.target.value) })} placeholder="0.00" />
                                                                </div>
                                                                <div className="col-md-3">
                                                                    <label className="form-label fw-bold fs-8">Min Breaking Load</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.min_breaking_load}
                                                                        onChange={e => updateItem(i, { min_breaking_load: toDecimalInput(e.target.value) })} placeholder="0.00" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Load curve — breaking test only */}
                                                        {finalizeForm.test_type === "BREAKING" && (
                                                            <div className="mb-3">
                                                                <div className="d-flex align-items-center gap-3 mb-2">
                                                                    <h6 className="fw-bold text-gray-700 fs-8 mb-0">กราฟ Load–Time</h6>
                                                                    <label className="btn btn-xs btn-light-primary fw-bold mb-0">
                                                                        <i className="bi bi-filetype-csv me-1" />นำเข้า CSV/Excel
                                                                        <input type="file" accept=".csv,.xlsx,.xls" className="d-none"
                                                                            onChange={e => { handleLoadCurveImport(i, e.target.files?.[0]); e.target.value = ""; }} />
                                                                    </label>
                                                                    <button type="button" className="btn btn-xs btn-light fw-bold" onClick={() => addCurvePoint(i)}>
                                                                        <i className="bi bi-plus" />เพิ่มจุด
                                                                    </button>
                                                                    {item.load_curve.length > 0 && (
                                                                        <span className="text-muted fs-8">{item.load_curve.length} จุด</span>
                                                                    )}
                                                                </div>
                                                                {item.load_curve.length > 0 && (
                                                                    <div className="row g-3">
                                                                        <div className="col-md-7">
                                                                            <ResponsiveContainer width="100%" height={180}>
                                                                                <LineChart data={item.load_curve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                                                    <CartesianGrid strokeDasharray="3 3" />
                                                                                    <XAxis dataKey="t" type="number" tick={{ fontSize: 10 }} label={{ value: "Time (s)", position: "insideBottom", offset: -3, fontSize: 10 }} />
                                                                                    <YAxis tick={{ fontSize: 10 }} label={{ value: "Load", angle: -90, position: "insideLeft", fontSize: 10 }} />
                                                                                    <Tooltip />
                                                                                    <Line type="monotone" dataKey="load" stroke="#d9214e" dot={false} strokeWidth={2} />
                                                                                </LineChart>
                                                                            </ResponsiveContainer>
                                                                        </div>
                                                                        <div className="col-md-5">
                                                                            <div className="table-responsive" style={{ maxHeight: 180, overflowY: "auto" }}>
                                                                                <table className="table table-bordered table-sm fs-8 mb-0">
                                                                                    <thead className="table-light"><tr className="fw-bold text-center"><th>Time (s)</th><th>Load</th><th className="w-30px" /></tr></thead>
                                                                                    <tbody>
                                                                                        {item.load_curve.map((pt, pi) => (
                                                                                            <tr key={pi}>
                                                                                                <td><input type="number" className="form-control form-control-sm text-center border-0" value={pt.t}
                                                                                                    onChange={e => updateCurvePoint(i, pi, "t", Number(e.target.value))} /></td>
                                                                                                <td><input type="number" className="form-control form-control-sm text-center border-0" value={pt.load}
                                                                                                    onChange={e => updateCurvePoint(i, pi, "load", Number(e.target.value))} /></td>
                                                                                                <td className="text-center">
                                                                                                    <button type="button" className="btn btn-icon btn-xs btn-light-danger" onClick={() => removeCurvePoint(i, pi)}><i className="bi bi-x" /></button>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {item.result === "FAILED" && (
                                                            <div className="row g-3 mb-3">
                                                                <div className="col-md-6">
                                                                    <label className="form-label fw-bold fs-8 text-danger">เหตุผลที่ไม่ผ่าน (Fail Reason)</label>
                                                                    <input type="text" className="form-control form-control-sm" value={item.fail_reason}
                                                                        onChange={e => updateItem(i, { fail_reason: e.target.value })} placeholder="ระบุเหตุผล" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Inspection checklist */}
                                                        {item.checks.length > 0 ? (
                                                            <>
                                                                <h6 className="fw-bold text-gray-700 fs-8 mb-2">รายการตรวจสอบ (Checklist)</h6>
                                                                <table className="table table-bordered table-sm fs-8 mb-0">
                                                                    <thead className="table-light">
                                                                        <tr className="fw-bold text-gray-700">
                                                                            <th className="text-start">รายการ</th>
                                                                            <th className="w-120px text-center">ผล</th>
                                                                            <th className="w-200px">หมายเหตุ</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {item.checks.map((chk, ci) => (
                                                                            <tr key={ci}>
                                                                                <td className="text-start">{chk.check_name}</td>
                                                                                <td className="text-center">
                                                                                    <select
                                                                                        className={`form-select form-select-sm fw-bold ${chk.status === "PASS" ? "text-success" : chk.status === "FAIL" ? "text-danger" : "text-muted"}`}
                                                                                        value={chk.status}
                                                                                        onChange={e => updateItemCheck(i, ci, { status: e.target.value as CheckRow["status"] })}
                                                                                    >
                                                                                        <option value="NA">N/A</option>
                                                                                        <option value="PASS">PASS</option>
                                                                                        <option value="FAIL">FAIL</option>
                                                                                    </select>
                                                                                </td>
                                                                                <td>
                                                                                    <input type="text" className="form-control form-control-sm" value={chk.note}
                                                                                        onChange={e => updateItemCheck(i, ci, { note: e.target.value })} placeholder="-" />
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </>
                                                        ) : (
                                                            <div className="text-muted fs-8">เลือกประเภทการทดสอบด้านบนเพื่อโหลดรายการตรวจสอบ</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Material actuals */}
                            {(testResult.required_items ?? []).length > 0 && (
                                <div className="mb-5">
                                    <h6 className="fw-bold text-gray-700 mb-3">
                                        <i className="bi bi-box-seam me-2 text-primary" />จำนวนวัตถุดิบที่ใช้จริง
                                    </h6>
                                    <div className="table-responsive">
                                        <table className="table table-bordered align-middle fs-7 mb-0">
                                            <thead className="table-light">
                                                <tr className="fw-bold text-gray-700">
                                                    <th>ชื่อสินค้า</th>
                                                    <th className="w-80px text-center">หน่วย</th>
                                                    <th className="w-110px text-center">ต้องใช้</th>
                                                    <th className="w-130px">ใช้จริง</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(testResult.required_items as any[]).map((it: any) => {
                                                    const itemKey = it.test_result_required_item_id ?? it.id;
                                                    return (
                                                        <tr key={itemKey ?? it.qc_item_id}>
                                                            <td className="fw-bold text-gray-800">{it.item_name || "—"}</td>
                                                            <td className="text-center text-muted">{it.unit || "—"}</td>
                                                            <td className="text-center fw-semibold text-gray-700">{it.required_qty ?? "—"}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm text-center"
                                                                    placeholder="0"
                                                                    value={itemKey != null ? (finalizeActuals[itemKey] ?? "") : ""}
                                                                    onChange={e => {
                                                                        if (itemKey == null) return;
                                                                        setFinalizeActuals(prev => ({ ...prev, [itemKey]: formatIntegerInput(e.target.value) }));
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Test evidence photos (session-level) */}
                            <div className="mb-3">
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <h6 className="fw-bold text-gray-700 mb-0">
                                        <i className="bi bi-camera me-2 text-info" />รูปหลักฐานการทดสอบ
                                    </h6>
                                    <label className="btn btn-sm btn-light-info fw-bold mb-0">
                                        {photoUploading ? <><span className="spinner-border spinner-border-sm me-2" />กำลังอัปโหลด...</> : <><i className="bi bi-upload me-1" />เพิ่มรูป</>}
                                        <input type="file" accept="image/*" multiple className="d-none" onChange={handlePhotoSelect} disabled={photoUploading} />
                                    </label>
                                </div>
                                {sessionPhotos.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-3">
                                        {sessionPhotos.map((p: any) => (
                                            <div key={p.photo_id} className="position-relative border rounded" style={{ width: 110, height: 110 }}>
                                                <img src={p.url} alt={p.caption ?? ""} className="w-100 h-100 rounded" style={{ objectFit: "cover" }} />
                                                <button type="button" className="btn btn-icon btn-xs btn-danger position-absolute top-0 end-0 m-1"
                                                    onClick={() => handleDeletePhoto(p.photo_id)} title="ลบรูป" style={{ width: 22, height: 22 }}>
                                                    <i className="bi bi-x fs-7" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-muted fs-8">ยังไม่มีรูป</div>
                                )}
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light fw-bold" onClick={() => { setShowFinalizeForm(false); setFinalizeForm(null); }} disabled={finalizeSaving}>ยกเลิก</button>
                    <button className="btn btn-success fw-bold" onClick={handleFinalize} disabled={finalizeSaving}>
                        {finalizeSaving ? <><span className="spinner-border spinner-border-sm me-2" />กำลังบันทึก...</> : <><i className="bi bi-check-circle me-2" />ยืนยันผลการทดสอบ</>}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* ── ASSIGN EMPLOYEE MODAL ── */}
            <Modal show={showAssignEmpModal} onHide={() => { setShowAssignEmpModal(false); setEmpSearch(""); }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-person-gear me-2 text-primary" />จัดการผู้ทดสอบ
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex align-items-center position-relative mb-4">
                        <i className="bi bi-search fs-4 position-absolute ms-4 text-muted" />
                        <input
                            type="text"
                            className="form-control form-control-solid ps-12"
                            placeholder="ค้นหาชื่อพนักงาน..."
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                        />
                    </div>
                    <div className="table-responsive" style={{ maxHeight: 400 }}>
                        <table className="table table-row-dashed align-middle gs-0 gy-4">
                            <thead>
                                <tr className="fw-bold text-muted text-uppercase fs-8">
                                    <th>พนักงาน</th>
                                    <th>สถานะ</th>
                                    <th className="text-end">เลือก</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empLoading ? (
                                    <tr><td colSpan={3} className="text-center py-10"><span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...</td></tr>
                                ) : allEmployees.length > 0 ? allEmployees.map(emp => {
                                    const isAssigned = assignedEmpIds.has(emp.employee_id);
                                    return (
                                        <tr key={emp.employee_id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-45px me-4">
                                                        <span className="symbol-label bg-light-primary text-primary fw-bold fs-6">
                                                            {(emp.employee_first_name ?? "?")[0]}
                                                        </span>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-gray-900 fw-bold fs-6">{emp.employee_first_name} {emp.employee_last_name}</span>
                                                        <span className="text-muted fw-semibold fs-7">ID: {emp.employee_id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {isAssigned
                                                    ? <span className="badge badge-light-warning fw-bold">กำลังทดสอบ</span>
                                                    : <span className="badge badge-light-secondary fw-bold">ว่าง</span>}
                                            </td>
                                            <td className="text-end">
                                                {isAssigned ? (
                                                    <button
                                                        className="btn btn-sm btn-light-danger fw-bold"
                                                        onClick={() => handleUnassignEmployee(emp.employee_id)}
                                                        disabled={unassigningEmpId === emp.employee_id}
                                                    >
                                                        {unassigningEmpId === emp.employee_id
                                                            ? <span className="spinner-border spinner-border-sm" />
                                                            : <><i className="bi bi-x me-1" />นำออก</>}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-sm btn-primary fw-bold"
                                                        onClick={() => handleAssignEmployee(emp.employee_id)}
                                                        disabled={assigningEmpId === emp.employee_id}
                                                    >
                                                        {assigningEmpId === emp.employee_id
                                                            ? <span className="spinner-border spinner-border-sm" />
                                                            : <><i className="bi bi-plus me-1" />เพิ่ม</>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className="text-center py-10 text-muted">ไม่พบพนักงาน</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* ── EMPLOYEE HISTORY MODAL ── */}
            <Modal show={showEmpHistoryModal} onHide={() => setShowEmpHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-clock-history me-2 text-primary" />ประวัติการ Assign ผู้ทดสอบ
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(testResult?.assignments ?? []).length === 0 ? (
                        <div className="text-center text-muted py-10">
                            <i className="bi bi-people fs-3x text-gray-300 mb-3 d-block" />
                            ยังไม่มีประวัติการ assign
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-row-dashed align-middle gs-0 gy-3">
                                <thead>
                                    <tr className="fw-bold text-muted text-uppercase fs-8">
                                        <th>พนักงาน</th>
                                        <th>เวลาเริ่ม</th>
                                        <th>เวลาสิ้นสุด</th>
                                        <th className="text-center">ระยะเวลา</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(testResult?.assignments ?? []).map(a => {
                                        const sec = elapsedSeconds(a.from_time, a.to_time);
                                        return (
                                            <tr key={a.test_result_assignment_id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="symbol symbol-35px me-3">
                                                            <span className="symbol-label bg-primary text-white fw-bold fs-7">
                                                                {(a.employee.employee_first_name ?? "?")[0]}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold text-gray-800 fs-7">{a.employee.employee_first_name} {a.employee.employee_last_name}</div>
                                                            <div className="text-muted fs-8">ID: {a.employee_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="text-gray-600 fs-8">{new Date(a.from_time).toLocaleString("th-TH")}</span></td>
                                                <td><span className="text-gray-600 fs-8">{a.to_time ? new Date(a.to_time).toLocaleString("th-TH") : "—"}</span></td>
                                                <td className="text-center"><span className="text-muted fs-8">{fmtSeconds(sec)}</span></td>
                                                <td>
                                                    <span className={`badge fw-bold ${a.to_time === null ? "badge-light-warning" : "badge-light-secondary"}`}>
                                                        {a.to_time === null ? "กำลังทดสอบ" : "เสร็จแล้ว"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light" onClick={() => setShowEmpHistoryModal(false)}>ปิด</button>
                </Modal.Footer>
            </Modal>

            {/* ── ASSIGN MACHINE MODAL ── */}
            <Modal show={showAssignMachineModal} onHide={() => { setShowAssignMachineModal(false); setMachineSearch(""); }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-gear me-2 text-primary" />จัดการเครื่องจักร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex align-items-center position-relative mb-4">
                        <i className="bi bi-search fs-4 position-absolute ms-4 text-muted" />
                        <input
                            type="text"
                            className="form-control form-control-solid ps-12"
                            placeholder="ค้นหาชื่อเครื่องจักร..."
                            value={machineSearch}
                            onChange={e => setMachineSearch(e.target.value)}
                        />
                    </div>
                    <div className="table-responsive" style={{ maxHeight: 400 }}>
                        <table className="table table-row-dashed align-middle gs-0 gy-4">
                            <thead>
                                <tr className="fw-bold text-muted text-uppercase fs-8">
                                    <th>เครื่องจักร</th>
                                    <th>สถานะ</th>
                                    <th className="text-end">เลือก</th>
                                </tr>
                            </thead>
                            <tbody>
                                {machineLoading ? (
                                    <tr><td colSpan={3} className="text-center py-10"><span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...</td></tr>
                                ) : allMachines.length > 0 ? allMachines.map(mc => {
                                    const isAssigned = assignedMachineIds.has(mc.machine_id);
                                    return (
                                        <tr key={mc.machine_id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-45px me-4">
                                                        <span className="symbol-label bg-light-info text-info fw-bold">
                                                            <i className="bi bi-gear-fill" />
                                                        </span>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-gray-900 fw-bold fs-6">{mc.machine_name}</span>
                                                        <span className="text-muted fw-semibold fs-7">{mc.machine_code}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {isAssigned
                                                    ? <span className="badge badge-light-warning fw-bold">กำลังใช้งาน</span>
                                                    : <span className="badge badge-light-success fw-bold">ว่าง</span>}
                                            </td>
                                            <td className="text-end">
                                                {isAssigned ? (
                                                    <button
                                                        className="btn btn-sm btn-light-danger fw-bold"
                                                        onClick={() => handleUnassignMachine(mc.machine_id)}
                                                        disabled={unassigningMachineId === mc.machine_id}
                                                    >
                                                        {unassigningMachineId === mc.machine_id
                                                            ? <span className="spinner-border spinner-border-sm" />
                                                            : <><i className="bi bi-x me-1" />นำออก</>}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-sm btn-primary fw-bold"
                                                        onClick={() => handleAssignMachine(mc.machine_id)}
                                                        disabled={assigningMachineId === mc.machine_id}
                                                    >
                                                        {assigningMachineId === mc.machine_id
                                                            ? <span className="spinner-border spinner-border-sm" />
                                                            : <><i className="bi bi-plus me-1" />เพิ่ม</>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className="text-center py-10 text-muted">ไม่พบเครื่องจักร</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* ── MACHINE HISTORY MODAL ── */}
            <Modal show={showMachineHistoryModal} onHide={() => setShowMachineHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">
                        <i className="bi bi-clock-history me-2 text-primary" />ประวัติการ Select เครื่องจักร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(testResult?.machines ?? []).length === 0 ? (
                        <div className="text-center text-muted py-10">
                            <i className="bi bi-gear fs-3x text-gray-300 mb-3 d-block" />
                            ยังไม่มีประวัติการใช้งานเครื่องจักร
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-row-dashed align-middle gs-0 gy-3">
                                <thead>
                                    <tr className="fw-bold text-muted text-uppercase fs-8">
                                        <th>เครื่องจักร</th>
                                        <th>เวลาเริ่ม</th>
                                        <th>เวลาสิ้นสุด</th>
                                        <th className="text-center">ระยะเวลา</th>
                                        <th className="text-end">ค่าเสื่อม</th>
                                        <th className="text-end">ค่าซ่อม</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(testResult?.machines ?? []).map(m => {
                                        const sec = elapsedSeconds(m.from_time, m.to_time);
                                        const depCost = m.to_time ? (m.cost?.depreciation_cost ?? 0) : (m.cost ? m.cost.depreciation_per_second * sec : 0);
                                        const maintCost = m.to_time ? (m.cost?.maintenance_cost ?? 0) : (m.cost ? m.cost.maintenance_rate_per_second * sec : 0);
                                        return (
                                            <tr key={m.test_result_machine_id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="symbol symbol-35px me-3">
                                                            <span className="symbol-label bg-info text-white fw-bold fs-7">
                                                                <i className="bi bi-gear-fill" />
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold text-gray-800 fs-7">{m.machine.machine_name}</div>
                                                            <div className="text-muted fs-8">{m.machine.machine_code}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="text-gray-600 fs-8">{new Date(m.from_time).toLocaleString("th-TH")}</span></td>
                                                <td><span className="text-gray-600 fs-8">{m.to_time ? new Date(m.to_time).toLocaleString("th-TH") : "—"}</span></td>
                                                <td className="text-center"><span className="text-muted fs-8">{fmtSeconds(sec)}</span></td>
                                                <td className="text-end fw-semibold fs-8">฿{fmtCurrency(depCost)}</td>
                                                <td className="text-end fw-semibold fs-8">฿{fmtCurrency(maintCost)}</td>
                                                <td>
                                                    <span className={`badge fw-bold ${m.to_time === null ? "badge-light-warning" : "badge-light-secondary"}`}>
                                                        {m.to_time === null ? "กำลังใช้งาน" : "เสร็จแล้ว"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light" onClick={() => setShowMachineHistoryModal(false)}>ปิด</button>
                </Modal.Footer>
            </Modal>

        </Content >
    );
};

export default ViewTestResultSession;
