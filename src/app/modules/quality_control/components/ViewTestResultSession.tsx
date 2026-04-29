import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { Content } from "../../../../_metronic/layout/components/content";
import "../../workorder/components/WorkorderView.css";
import {
    getTestResultById,
    startTestResult,
    pauseTestResult,
    resumeTestResult,
    finalizeTestResult,
    deleteTestResult,
    createTestResultRequiredItems,
    getTestResultPickRequests,
    assignEmployeeToTestResult,
    unassignEmployeeFromTestResult,
    assignMachineToTestResult,
    unassignMachineFromTestResult,
} from "../../../services/testResultService";
import type { StartTestResultPayload } from "../../../services/testResultService";
import { getQCWorkOrderById } from "../../../services/qcWorkOrderService";
import { getEmployeeList } from "../../../services/employee";
import { getMachineList } from "../../../services/machineService";
import { formatThaiDate } from "../../../helpers/dataHelpers";
import { formatIntegerInput, toDecimalInput } from "../../../utils/input_format_utils";
import type { Employee } from "../../../type_interface/EmployeeType";
import type { Machine } from "../../../type_interface/MachineType";
import type { TestResultDetail, TestResultBreak } from "../../../type_interface/TestResultType";
import type { QCWorkOrderItem } from "../../../type_interface/QCWorkOrderType";
import type { PickingRequest, PickingRequestListItem } from "../../../type_interface/PickingRequestType";

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

const TestResultLiveTimer: React.FC<{ testResult: TestResultDetail | null }> = ({ testResult }) => {
    const [elapsed, setElapsed] = useState("00:00:00");
    useEffect(() => {
        if (!testResult) { setElapsed("00:00:00"); return; }
        const status = testResult.session_status;
        if (status === "PENDING") { setElapsed("00:00:00"); return; }
        const startStr = testResult.started_at
            ?? [...(testResult.assignments ?? [])].sort((a, b) => new Date(a.from_time).getTime() - new Date(b.from_time).getTime())[0]?.from_time;
        if (!startStr && status !== "INPROGRESS") { setElapsed("00:00:00"); return; }
        const startMs = startStr ? new Date(startStr).getTime() : Date.now();
        const calc = () => {
            const s = Math.floor(Math.max(0, Date.now() - startMs) / 1000);
            setElapsed(`${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`);
        };
        calc();
        if (status === "INPROGRESS") { const iv = setInterval(calc, 1000); return () => clearInterval(iv); }
    }, [testResult]);
    return <span className="wo-timer-value">{elapsed}</span>;
};

// ─── interfaces ──────────────────────────────────────────────────────────────

interface FinalizeItemForm {
    unit_number: number;
    serial_no: string;
    wll_measured: string;
    load_test_value: string;
    description: string;
    result: "PASSED" | "FAILED";
    remark: string;
}

interface FinalizeForm {
    test_date: string;
    tested_by: string;
    test_method: string;
    standard_reference: string;
    overall_status: "PASSED" | "FAILED";
    remark: string;
    items: FinalizeItemForm[];
}

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
    const [startMode, setStartMode] = useState<"auto" | "manual">("auto");
    const [startPickRequests, setStartPickRequests] = useState<PickingRequest[]>([]);
    const [startPickLoading, setStartPickLoading] = useState(false);
    const [startSaving, setStartSaving] = useState(false);
    const [salesItemAllocations, setSalesItemAllocations] = useState<Record<number, string>>({});
    const [materialAllocations, setMaterialAllocations] = useState<Record<number, Record<number, string>>>({});

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

    // อัพเดต now ทุก 30 วินาที สำหรับ realtime timeline
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
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
            const salary = (a.employee as any)?.salary_base ?? 0;
            laborCost += (salary / 30 / 8 / 3600) * effSec;
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
            materialCost += costPerUnit * (ri.required_qty ?? 0);
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

    // Employees already assigned (to disable in picker)
    const assignedEmpIds = useMemo(() =>
        new Set(activeAssignments.map(a => a.employee_id)), [activeAssignments]);
    const assignedMachineIds = useMemo(() =>
        new Set(activeMachines.map(m => m.machine_id)), [activeMachines]);

    const timelineBounds = useMemo(() => {
        const { dayStart, dayEnd } = getFullDayBounds(selectedDate);
        if (!autoZoom || !testResult?.started_at) return { start: dayStart, end: dayEnd };
        const times: number[] = [];
        const runStart = new Date(testResult.started_at).getTime();
        const runEnd = Date.now();
        times.push(runStart, runEnd);
        testResult.machines?.forEach(m => {
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
    }, [autoZoom, testResult, selectedDate]);

    const timelineLabels = useMemo(() => buildTimelineLabels(timelineBounds.start, timelineBounds.end), [timelineBounds]);

    const runBars = useMemo(() => {
        if (!testResult?.started_at) return [];
        const { start, end } = timelineBounds;
        const rS = new Date(testResult.started_at).getTime();
        const rE = now.getTime();
        if (rE <= start.getTime() || rS >= end.getTime()) return [];
        const cs = new Date(Math.max(rS, start.getTime()));
        const ce = new Date(Math.min(rE, end.getTime()));
        const l = timeToPercent(cs, start, end);
        const r = timeToPercent(ce, start, end);
        if (r <= l) return [];
        return [{ id: 'run-bar-0', leftPercent: l, widthPercent: r - l, isCurrent: testResult.session_status !== 'COMPLETED' }];
    }, [testResult, timelineBounds, now]);

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

    type EmpBar = { assignment_id: string; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string | null };
    type EmpRow = { employee_id: number; name: string; bars: EmpBar[] };

    const employeeRows = useMemo(() => {
        if (!testResult?.assignments) return [];
        const { start, end } = timelineBounds;
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
            const cs = new Date(Math.max(aS, start.getTime()));
            const ce = new Date(Math.min(aE, end.getTime()));
            const l = timeToPercent(cs, start, end);
            const r = timeToPercent(ce, start, end);

            grouped.get(a.employee_id)!.bars.push({
                assignment_id: `${a.test_result_assignment_id}`,
                leftPercent: l,
                widthPercent: Math.max(0.5, r - l),
                isActive: a.to_time === null && aE >= new Date().getTime() - 1000,
                from_time: a.from_time,
                to_time: a.to_time
            });
        });

        return Array.from(grouped.values());
    }, [testResult, timelineBounds, now]);

    type MachBar = { test_result_machine_id: string; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string | null };
    type MachRow = { machine_id: number; name: string; machine_code?: string; bars: MachBar[] };

    const machineRows = useMemo(() => {
        if (!testResult?.machines) return [];
        const { start, end } = timelineBounds;
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
            const cs = new Date(Math.max(mS, start.getTime()));
            const ce = new Date(Math.min(mE, end.getTime()));
            const l = timeToPercent(cs, start, end);
            const r = timeToPercent(ce, start, end);

            grouped.get(m.machine_id)!.bars.push({
                test_result_machine_id: `${m.test_result_machine_id}`,
                leftPercent: l,
                widthPercent: Math.max(0.5, r - l),
                isActive: m.to_time === null && mE >= new Date().getTime() - 2000,
                from_time: m.from_time,
                to_time: m.to_time
            });
        });

        return Array.from(grouped.values());
    }, [testResult, timelineBounds, now]);

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

    // ─── start modal (manual allocation) ─────────────────────────────────

    const openStartModal = async () => {
        if (!testResult) return;
        setStartMode("auto");
        setSalesItemAllocations({});
        setMaterialAllocations({});
        setStartPickRequests([]);
        setShowStartModal(true);
        setStartPickLoading(true);
        try {
            const res = await getTestResultPickRequests(testResult.test_result_id);
            setStartPickRequests(res?.success && Array.isArray(res.data) ? res.data : []);
        } catch {
            setStartPickRequests([]);
        } finally {
            setStartPickLoading(false);
        }
    };

    const getPickItemsByCode = (itemCode: string): PickingRequestListItem[] => {
        const result: PickingRequestListItem[] = [];
        startPickRequests.forEach(pr => {
            pr.items.forEach(item => {
                if (item.item_code === itemCode && item.qty_available > 0) {
                    result.push(item);
                }
            });
        });
        return result;
    };

    const handleStart = async () => {
        if (!testResult) return;
        const payload: StartTestResultPayload = { allocation_mode: startMode };
        if (startMode === "manual") {
            const salesSources = Object.entries(salesItemAllocations)
                .filter(([, v]) => v !== "" && Number(v) > 0)
                .map(([id, qty]) => ({ picking_request_item_id: Number(id), qty: Number(qty) }));
            if (salesSources.length > 0) payload.sales_item_sources = salesSources;

            const matSources: StartTestResultPayload["material_sources"] = [];
            for (const reqItem of (testResult.required_items ?? [])) {
                const allocMap = materialAllocations[reqItem.id] ?? {};
                const sources = Object.entries(allocMap)
                    .filter(([, v]) => v !== "" && Number(v) > 0)
                    .map(([id, qty]) => ({ picking_request_item_id: Number(id), qty: Number(qty) }));
                if (sources.length > 0) matSources.push({ required_item_id: reqItem.id, sources });
            }
            if (matSources.length > 0) payload.material_sources = matSources;
        }
        setStartSaving(true);
        try {
            const res = await startTestResult(testResult.test_result_id, payload);
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
        setFinalizeForm({
            test_date: getTodayLocal(),
            tested_by: "",
            test_method: "",
            standard_reference: "",
            overall_status: "PASSED",
            remark: "",
            items: Array.from({ length: qty }, (_, i) => ({
                unit_number: i + 1,
                serial_no: "",
                wll_measured: "",
                load_test_value: "",
                description: desc,
                result: "PASSED",
                remark: "",
            })),
        });
        setShowFinalizeForm(true);
    };

    const handleFinalize = async () => {
        if (!finalizeForm || !testResult) return;
        setFinalizeSaving(true);
        try {
            const material_actuals = Object.entries(finalizeActuals)
                .filter(([, v]) => v !== "")
                .map(([id, qty]) => ({ test_result_required_item_id: Number(id), qty_used: Number(qty) }));
            const payload = {
                ...finalizeForm,
                items: finalizeForm.items.map(it => ({
                    ...it,
                    wll_measured: it.wll_measured === "" ? null : parseFloat(it.wll_measured),
                    load_test_value: it.load_test_value === "" ? null : parseFloat(it.load_test_value),
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
            <div className="d-flex flex-stack mb-8">
                <div className="d-flex align-items-center">
                    <button
                        className="btn btn-sm btn-icon btn-light-primary me-3"
                        onClick={() => qcId ? navigate(`/quality_control/qc_workorders_list/view/${qcId}`) : navigate(-1)}
                    >
                        <i className="bi bi-arrow-left fs-3" />
                    </button>
                    <div className="d-flex flex-column">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <h1 className="text-gray-900 fw-bold fs-2 mb-0">
                                {testResult.test_result_code || `Session #${testResult.test_result_id}`}
                            </h1>
                            <StatusBadge status={testResult.session_status} />
                            {isCompleted && <OverallBadge status={testResult.overall_status} />}
                        </div>
                        <div className="d-flex align-items-center gap-3 mt-1 flex-wrap">
                            <span className="text-muted fw-semibold fs-8">
                                <i className="bi bi-clipboard2-check me-1" />{qcCode}
                            </span>
                            <span className="text-muted fw-semibold fs-8">จำนวน: {testResult.claimed_qty} ชิ้น</span>
                            {testResult.created_date && (
                                <span className="text-muted fs-8">
                                    <i className="bi bi-calendar3 me-1" />{formatThaiDate(testResult.created_date)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="d-flex gap-2">
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
                                <span className="text-muted fs-6">/ {(testResult.assignments ?? []).length} คน</span>
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
                                <span className="text-muted fs-6">/ {(testResult.machines ?? []).length} เครื่อง</span>
                            </div>
                            <div className="wo-progress-bar mt-3">
                                <div
                                    className="wo-progress-fill wo-progress-blue"
                                    style={{ width: `${isCompleted ? 100 : activeMachines.length > 0 ? 60 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BODY ── */}
            <div className="row g-6 align-items-start">

                {/* LEFT 60% */}
                <div className="col-12 col-xl-7">

                    {/* Session Info */}
                    <div className="wo-card mb-6">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">
                                <i className="bi bi-info-circle-fill me-2 text-primary fs-6" />ข้อมูล Session
                            </h3>
                        </div>
                        <div className="wo-card-body">
                            <div className="row g-5 mb-5">
                                <div className="col-6 col-md-3">
                                    <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">สถานะ</span>
                                    <StatusBadge status={testResult.session_status} />
                                </div>
                                <div className="col-6 col-md-3">
                                    <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">จำนวน</span>
                                    <span className="fw-bold fs-6">{testResult.claimed_qty} ชิ้น</span>
                                </div>
                                {testResult.test_date && (
                                    <div className="col-6 col-md-3">
                                        <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">วันที่ทดสอบ</span>
                                        <span className="fw-semibold text-gray-800 fs-7">{formatThaiDate(testResult.test_date)}</span>
                                    </div>
                                )}
                                {testResult.test_method && (
                                    <div className="col-6 col-md-3">
                                        <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">วิธีทดสอบ</span>
                                        <span className="fw-semibold text-gray-800 fs-7">{testResult.test_method}</span>
                                    </div>
                                )}
                                {testResult.standard_reference && (
                                    <div className="col-6 col-md-3">
                                        <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">มาตรฐาน</span>
                                        <span className="fw-semibold text-gray-800 fs-7">{testResult.standard_reference}</span>
                                    </div>
                                )}
                                {testResult.remark && (
                                    <div className="col-12">
                                        <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-1">หมายเหตุ</span>
                                        <span className="text-gray-700 fs-7">{testResult.remark}</span>
                                    </div>
                                )}
                            </div>

                            {/* Work Run Sources */}
                            {(testResult.work_run_sources ?? []).length > 0 && (
                                <div className="mb-5">
                                    <span className="text-muted fw-bold fs-8 text-uppercase d-block mb-2">
                                        <i className="bi bi-diagram-3 me-1" />Work Run ที่นำมาทดสอบ
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


                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="col-lg-8">
                        <div className="wo-card h-100">
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
                                {testResult?.started_at ? (
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

                                                            {/* Break bars (orange, overlaid on run bar) */}
                                                            {breakBars.map(bar => (
                                                                <div
                                                                    key={bar.id}
                                                                    className="wo-timeline-bar"
                                                                    style={{ backgroundColor: '#fd7e14', opacity: 0.85, left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%`, zIndex: 2 }}
                                                                    title={`พัก${bar.isOpen ? ' (ยังพักอยู่)' : ''} · ${formatTimeTL(bar.from_time)} – ${bar.to_time ? formatTimeTL(bar.to_time) : '...'}`}
                                                                >
                                                                    {bar.widthPercent >= 8 && <span className="wo-bar-text">พัก</span>}
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
                                                                <span className="wo-phase-dot" style={{ backgroundColor: row.bars.some(b => b.isActive) ? '#50cd89' : '#a1a5b7' }} />
                                                                <span className="wo-phase-name" title={row.name}>
                                                                    <i className="bi bi-person-fill me-1" style={{ fontSize: 10, color: '#50cd89' }} />{row.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="wo-timeline-bar-col">
                                                            <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                                {row.bars.map(bar => (
                                                                    <React.Fragment key={bar.assignment_id}>
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
                                                        <span className="wo-phase-dot" style={{ backgroundColor: row.bars.some(b => b.isActive) ? '#17a2b8' : '#a1a5b7' }} />
                                                        <span className="wo-phase-name" title={row.name}>
                                                            <i className="bi bi-gear-fill me-1" style={{ fontSize: 10, color: '#17a2b8' }} />{row.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="wo-timeline-bar-col">
                                                    <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                        {row.bars.map(bar => (
                                                            <React.Fragment key={bar.test_result_machine_id}>
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

                                        {/* Legend */}
                                        <div className="d-flex gap-4 mt-4 fs-8 text-muted flex-wrap">
                                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#0d6efd', marginRight: 4 }} />Session</span>
                                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#50cd89', marginRight: 4 }} />ผู้ทดสอบ (กำลังทดสอบ)</span>
                                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#a1a5b7', marginRight: 4 }} />ผู้ทดสอบ (เสร็จแล้ว)</span>
                                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#17a2b8', marginRight: 4 }} />เครื่องจักร (กำลังใช้งาน)</span>
                                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#6c757d', marginRight: 4 }} />เครื่องจักร (เสร็จแล้ว)</span>
                                        </div>
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
                                    <i className="bi bi-clipboard2-check me-2 text-success fs-6" />ผลการทดสอบรายหน่วย
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
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT 40% — Cost Breakdown */}
                <div className="col-12 col-xl-5">
                    <div className="wo-card" style={{ position: "sticky", top: 24 }}>
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">
                                <i className="bi bi-currency-exchange me-2 text-primary fs-6" />ต้นทุน
                            </h3>
                            {isActive && <span className="wo-live-dot" style={isPaused ? { background: '#fd7e14' } : {}} />}
                        </div>
                        <div className="wo-card-body">
                            {liveCosts ? (
                                <div className="wo-cost-summary">
                                    {[
                                        { label: "ค่าพนักงาน", value: liveCosts.labor_cost, icon: "bi-people-fill" },
                                        { label: "ค่าเสื่อมราคา", value: liveCosts.depreciation_cost, icon: "bi-gear-fill" },
                                        { label: "ค่าซ่อมบำรุง", value: liveCosts.maintenance_cost, icon: "bi-tools" },
                                        { label: "ค่าวัตถุดิบ", value: liveCosts.material_cost, icon: "bi-box-seam" },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} className="wo-cost-row">
                                            <span className="d-flex align-items-center gap-2">
                                                <i className={`bi ${icon} text-muted`} />
                                                {label}
                                            </span>
                                            <span className="fw-semibold">฿{fmtCurrency(value as number)}</span>
                                        </div>
                                    ))}
                                    <div className="wo-cost-row wo-cost-total">
                                        <span className="fw-bold" style={{ color: "#181c32" }}>รวมทั้งหมด</span>
                                        <span className="fw-bold" style={{ fontSize: 20, color: "#181c32" }}>
                                            ฿{fmtCurrency(liveCosts.total_cost as number)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-currency-exchange fs-3x text-gray-300 mb-3 d-block" />
                                    ยังไม่มีข้อมูลต้นทุน
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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

                    <div className="my-6">
                        <label className="form-label fw-bold fs-6">รูปแบบการจัดสรรวัตถุดิบ</label>
                        <div className="d-flex gap-3">
                            {(["auto", "manual"] as const).map(mode => (
                                <label key={mode} className={`d-flex align-items-center border rounded px-4 py-3 cursor-pointer flex-grow-1 ${startMode === mode ? "border-primary bg-light-primary" : "border-gray-300"}`}>
                                    <input type="radio" className="form-check-input me-3" checked={startMode === mode} onChange={() => setStartMode(mode)} />
                                    <div>
                                        <span className="fw-bold text-gray-800 d-block">{mode === "auto" ? "อัตโนมัติ" : "เลือกเอง"}</span>
                                        <span className="text-muted fs-8">{mode === "auto" ? "ระบบจัดสรรวัตถุดิบให้อัตโนมัติ" : "เลือกรายการจาก Picking Request"}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {startMode === "manual" && (
                        startPickLoading ? (
                            <div className="text-center text-muted py-8"><span className="spinner-border spinner-border-sm me-2" />กำลังโหลด...</div>
                        ) : (
                            <div>
                                {/* Sales Item Sources */}
                                {(() => {
                                    const allPickItems: PickingRequestListItem[] = [];
                                    startPickRequests.forEach(pr => pr.items.forEach(item => {
                                        if (item.qty_available > 0) allPickItems.push(item);
                                    }));
                                    const reqItemCodes = new Set((testResult.required_items ?? []).map((ri: any) => ri.item_code));
                                    const salesPickItems = allPickItems.filter(pi => !reqItemCodes.has(pi.item_code));
                                    if (salesPickItems.length === 0) return null;
                                    const totalAllocated = Object.values(salesItemAllocations).reduce((s, v) => s + (Number(v) || 0), 0);
                                    return (
                                        <div className="mb-5 border rounded p-4">
                                            <div className="d-flex justify-content-between mb-3">
                                                <span className="fw-bold text-gray-800 fs-6"><i className="bi bi-box me-2 text-info" />สินค้า (Non-produced)</span>
                                                <span className="text-muted fs-8">จัดสรรแล้ว: <span className={`fw-bold ${totalAllocated >= testResult.claimed_qty ? "text-success" : "text-warning"}`}>{totalAllocated}</span> / {testResult.claimed_qty}</span>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="table table-row-dashed align-middle gs-0 gy-2 mb-0">
                                                    <thead><tr className="fw-bold text-muted fs-8"><th>Picking Request</th><th>รหัสสินค้า</th><th className="text-center">คงเหลือ</th><th className="text-center" style={{ width: 130 }}>จัดสรร</th></tr></thead>
                                                    <tbody>
                                                        {salesPickItems.map(pi => (
                                                            <tr key={pi.picking_request_item_id}>
                                                                <td><span className="fw-semibold text-gray-700 fs-7">{pi.picking_request_code}</span></td>
                                                                <td><span className="text-muted fs-7">{pi.item_code}</span></td>
                                                                <td className="text-center"><span className="fw-semibold fs-7">{pi.qty_available} {pi.unit}</span></td>
                                                                <td><input type="text" className="form-control form-control-sm text-center" placeholder="0" value={salesItemAllocations[pi.picking_request_item_id] ?? ""} onChange={e => setSalesItemAllocations(prev => ({ ...prev, [pi.picking_request_item_id]: formatIntegerInput(e.target.value) }))} /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Material Sources */}
                                {(testResult.required_items ?? []).length > 0 && (
                                    <div>
                                        <div className="fs-7 fw-bold text-muted text-uppercase mb-3"><i className="bi bi-box-seam me-1" />วัตถุดิบที่ต้องใช้</div>
                                        {(testResult.required_items as any[]).map((reqItem: any) => {
                                            const availableItems = getPickItemsByCode(reqItem.item_code);
                                            const allocMap = materialAllocations[reqItem.id] ?? {};
                                            const totalAllocated = Object.values(allocMap).reduce((s, v) => s + (Number(v) || 0), 0);
                                            const reqQty = reqItem.required_qty ?? 0;
                                            return (
                                                <div key={reqItem.id} className="mb-4 border rounded p-4">
                                                    <div className="d-flex justify-content-between mb-3">
                                                        <span className="fw-bold text-gray-800 fs-6">{reqItem.item_name} <span className="text-muted fs-8">({reqItem.item_code})</span></span>
                                                        <span className="text-muted fs-8">ต้องใช้: <span className="fw-bold text-gray-700">{reqQty}</span> | จัดสรร: <span className={`fw-bold ${totalAllocated >= reqQty ? "text-success" : "text-warning"}`}>{totalAllocated}</span></span>
                                                    </div>
                                                    {availableItems.length === 0 ? (
                                                        <div className="text-muted fs-7 text-center py-3 bg-light rounded">ไม่พบ Picking ที่มีวัตถุดิบนี้</div>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-row-dashed align-middle gs-0 gy-2 mb-0">
                                                                <thead><tr className="fw-bold text-muted fs-8"><th>Picking Request</th><th>รหัสสินค้า</th><th className="text-center">คงเหลือ</th><th className="text-center" style={{ width: 130 }}>จัดสรร</th></tr></thead>
                                                                <tbody>
                                                                    {availableItems.map(pi => (
                                                                        <tr key={pi.picking_request_item_id}>
                                                                            <td><span className="fw-semibold text-gray-700 fs-7">{pi.picking_request_code}</span></td>
                                                                            <td><span className="text-muted fs-7">{pi.item_code}</span></td>
                                                                            <td className="text-center"><span className="fw-semibold fs-7">{pi.qty_available} {pi.unit}</span></td>
                                                                            <td><input type="text" className="form-control form-control-sm text-center" placeholder="0" value={allocMap[pi.picking_request_item_id] ?? ""} onChange={e => { const v = formatIntegerInput(e.target.value); setMaterialAllocations(prev => ({ ...prev, [reqItem.id]: { ...(prev[reqItem.id] ?? {}), [pi.picking_request_item_id]: v } })); }} /></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {(testResult.required_items ?? []).length === 0 && startPickRequests.length === 0 && (
                                    <div className="text-center text-muted py-6 border border-dashed rounded">ไม่พบรายการ Picking Request</div>
                                )}
                            </div>
                        )
                    )}
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
                                {[
                                    { label: "วันที่ทดสอบ", field: "test_date" as const, type: "date" },
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

                            {/* Per-item table */}
                            <h6 className="fw-bold text-gray-700 mb-3">ผลรายหน่วย</h6>
                            <div className="table-responsive mb-5">
                                <table className="table table-bordered align-middle fs-7 mb-0">
                                    <thead className="table-light">
                                        <tr className="fw-bold text-gray-700 text-center">
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
                                            <tr key={i}>
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
                                                        onChange={e => setFinalizeForm(prev => { if (!prev) return prev; const items = [...prev.items]; items[i] = { ...items[i], remark: e.target.value }; return { ...prev, items }; })}
                                                        placeholder="-" />
                                                </td>
                                            </tr>
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
