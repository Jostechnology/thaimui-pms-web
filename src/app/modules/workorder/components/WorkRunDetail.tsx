import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getLaborSplit, estimateLiveLaborSplit, LaborCostSplit } from '../../../utils/labor_cost_utils';
import { getEmployeeList, getEmployeeTotalCount } from '../../../services/employee';
import { getMachineList, getMachineTotalCount } from '../../../services/machineService';
import {
    getWorkRunById,
    completeWorkRun,
    startWorkRun,
    pauseWorkRun,
    resumeWorkRun,
    assignEmployee,
    unassignEmployee,
    assignMachine,
    unassignMachine,
    createWorkRunRequiredItems,
    updateWorkRunRequiredItem,
    deleteWorkRunRequiredItem,
    getWorkRunMaterialOfWorkOrder,
    getWorkRunPickRequests,
} from '../../../services/workRunService';
import type { MaterialSourceEntry } from '../../../services/workRunService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { WorkRunDetail as WorkRunDetailType, WorkRunRequiredItem, WorkRunBreak } from '../../../type_interface/WorkOrderType';
import './WorkorderView.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
const calcTotalBreakMs = (breaks?: WorkRunBreak[]): number => {
    if (!breaks?.length) return 0;
    return breaks.reduce((t, b) => {
        const s = new Date(b.break_start).getTime();
        const e = b.break_end ? new Date(b.break_end).getTime() : Date.now();
        return t + Math.max(0, e - s);
    }, 0);
};
// const formatDateTimeTL = (dateStr: string | null) => {
//     if (!dateStr) return '-';
//     const d = new Date(dateStr);
//     return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
//         d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
// };
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
const WorkRunLiveTimer: React.FC<{ workRun: WorkRunDetailType | null }> = ({ workRun }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    useEffect(() => {
        if (!workRun?.start_date) { setElapsed('00:00:00'); return; }
        const status = workRun.status?.toUpperCase();
        if (status === 'PENDING') { setElapsed('00:00:00'); return; }
        const startMs = new Date(workRun.start_date).getTime();
        const calc = () => {
            const now = workRun.end_date ? new Date(workRun.end_date).getTime() : Date.now();
            const workMs = Math.max(0, now - startMs - calcTotalBreakMs(workRun.breaks));
            const s = Math.floor(workMs / 1000);
            setElapsed(`${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`);
        };
        calc();
        if (status === 'INPROGRESS') { const iv = setInterval(calc, 1000); return () => clearInterval(iv); }
    }, [workRun]);
    return <span className="wo-timer-value">{elapsed}</span>;
};
import type { Machine } from '../../../type_interface/MachineType';
import { formatIntegerInput } from '../../../utils/input_format_utils';
import { validateRequired, validatePositiveNumber } from '../../../utils/validate_utils';
import { PickingRequest, PickingRequestListItem } from '../../../type_interface/PickingRequestType';
import { Material } from '../../../type_interface/MaterialType';

interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
}

const WorkRunDetail: React.FC = () => {
    const navigate = useNavigate();
    const { workRunId } = useParams<{ workRunId: string }>();

    const [now, setNow] = useState(new Date());
    const [workRun, setWorkRun] = useState<WorkRunDetailType | null>(null);

    // Employee assign modal
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [empSearch, setEmpSearch] = useState('');
    const [showAssignEmpModal, setShowAssignEmpModal] = useState(false);

    // Machine assign modal
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [machineLoading, setMachineLoading] = useState(false);
    const [machineSearch, setMachineSearch] = useState('');
    const [showAssignMachineModal, setShowAssignMachineModal] = useState(false);

    // History modals
    const [showEmpHistoryModal, setShowEmpHistoryModal] = useState(false);
    const [showMachineHistoryModal, setShowMachineHistoryModal] = useState(false);

    // Complete modal
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeForm, setCompleteForm] = useState({ completion_remark: '', defect_qty: 0, usable_qty: 0 });
    const [materialActuals, setMaterialActuals] = useState<Record<number, string>>({});

    // Required item modal
    const [showRequiredItemModal, setShowRequiredItemModal] = useState(false);
    const [editingRequiredItem, setEditingRequiredItem] = useState<WorkRunRequiredItem | null>(null);
    // Add mode — staged list
    const [stagedItems, setStagedItems] = useState<{ material: Material; quantity: string }[]>([]);
    const [currentPicker, setCurrentPicker] = useState({ material_list_id: 0, quantity: '' });
    const [pickerErrors, setPickerErrors] = useState<Record<string, string>>({});
    // Edit mode
    const [editQty, setEditQty] = useState('');
    const [editQtyError, setEditQtyError] = useState('');
    const [materialList, setMaterialList] = useState<Material[]>([]);
    const [materialLoading, setMaterialLoading] = useState(false);

    // Start modal
    const [showStartModal, setShowStartModal] = useState(false);
    const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
    const [pickRequests, setPickRequests] = useState<PickingRequest[]>([]);
    const [pickRequestsLoading, setPickRequestsLoading] = useState(false);
    // manual allocations: { [required_item_id]: { [picking_request_item_id]: qty_string } }
    const [manualAllocations, setManualAllocations] = useState<Record<number, Record<number, string>>>({});

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [costTick, setCostTick] = useState(0);

    // Timeline state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [autoZoom, setAutoZoom] = useState(true);

    // to count
    const [totalCounts, setTotalCounts] = useState({ emp: 0, mach: 0 });
    type ActivePopover =
        | { type: 'run'; centerPct: number }
        | { type: 'machine'; machineId: number; centerPct: number }
        | { type: 'employee'; assignmentId: number; centerPct: number }
        | null;
    const [activePopover, setActivePopover] = useState<ActivePopover>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const normalizeKey = (s?: string | null) => (s ? s.toString().toUpperCase().replace(/\s+/g, '_') : '');

    const workRunStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        PAUSED: 'หยุดชั่วคราว',
        COMPLETED: 'เสร็จสิ้น',
        CANCELLED: 'ยกเลิก',
    };

    const getWorkRunStatusBadge = (status: string) => {
        const k = normalizeKey(status);
        if (k === 'COMPLETED') return 'badge-light-success';
        if (k === 'INPROGRESS') return 'badge-light-warning';
        if (k === 'PAUSED') return 'badge-light-info';
        if (k === 'CANCELLED') return 'badge-light-danger';
        return 'badge-light-secondary';
    };

    // --- Fetch ---
    const fetchWorkRun = async () => {
        setLoading();
        try {
            const result = await getWorkRunById(Number(workRunId));
            if (result?.success && result.data) {
                setWorkRun(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
            }
        } catch {
            alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
        } finally {
            setUnLoading();
        }
    };

    useEffect(() => { fetchWorkRun(); }, [workRunId]);

    useEffect(() => {
        const hasActiveMachine = workRun?.machines?.some(m => m.to_time === null) ?? false;
        const hasActiveEmployee = workRun?.assignments?.some(a => a.to_time === null) ?? false;
        if (!hasActiveMachine && !hasActiveEmployee) return;
        const interval = setInterval(() => setCostTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [workRun]);

    // Fetch employees when modal opens
    useEffect(() => {
        if (showAssignEmpModal && allEmployees.length === 0) {
            setEmpLoading(true);
            getEmployeeList(1, 10, '').then(res => {
                setAllEmployees(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
            }).catch(() => setAllEmployees([])).finally(() => setEmpLoading(false));
        }
    }, [showAssignEmpModal]);

    // Fetch machines when modal opens
    useEffect(() => {
        if (showAssignMachineModal && allMachines.length === 0) {
            setMachineLoading(true);
            getMachineList(1, 200, '', '').then(res => {
                setAllMachines(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
            }).catch(() => setAllMachines([])).finally(() => setMachineLoading(false));
        }
    }, [showAssignMachineModal]);

    // Fetch material list when required item modal opens in add mode
    useEffect(() => {
        if (showRequiredItemModal && !editingRequiredItem && materialList.length === 0) {
            setMaterialLoading(true);
            getWorkRunMaterialOfWorkOrder(Number(workRunId)).then(res => {
                setMaterialList(res?.success && Array.isArray(res.data) ? res.data : []);
            }).catch(() => setMaterialList([])).finally(() => setMaterialLoading(false));
        }
    }, [showRequiredItemModal]);

    // Fetch pick requests when start modal opens
    useEffect(() => {
        if (showStartModal) {
            setPickRequestsLoading(true);
            getWorkRunPickRequests(Number(workRunId)).then(res => {
                setPickRequests(res?.success && Array.isArray(res.data) ? res.data : []);
            }).catch(() => setPickRequests([])).finally(() => setPickRequestsLoading(false));
        }
    }, [showStartModal]);

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

    // for realtime Timeline
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000); // update every 30 s.

        return () => clearInterval(timer);
    }, []);

    // สำหรับเลื่อนวันที่ไปหาวันที่จบงาน (เฉพาะกรณีงานเก่าที่เสร็จแล้ว)
    useEffect(() => {
        if (workRun && workRun.end_date) {
            const endDate = new Date(workRun.end_date);
            const today = new Date();

            // ถ้าวันที่งานจบ "เก่ากว่าวันนี้" (เช่นจบเมื่อวาน) ให้ดีดหน้าจอไปวันนั้น
            // แต่ถ้างานยังไม่จบ หรือเพิ่งจบวันนี้ มันจะไม่ทำอะไร (หน้าจอจะค้างที่ "วันนี้" ตามค่าเริ่มต้น)
            if (endDate.toDateString() !== today.toDateString() && endDate < today) {
                setSelectedDate(endDate);
            }
        }
    }, [workRun]);

    //to count
    useEffect(() => {
        loadCounts(); // เรียกใช้ตอนโหลดหน้า ข้อมูลจะไม่หายเมื่อ Reload
    }, []);

    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    const handleToday = useCallback(() => setSelectedDate(new Date()), []);

    const activeAssignments = useMemo(() => workRun?.assignments?.filter(a => a.to_time === null) ?? [], [workRun]);
    const allAssignmentsTL = useMemo(() => workRun?.assignments ?? [], [workRun]);
    const activeMachines = useMemo(() => workRun?.machines?.filter(m => m.to_time === null) ?? [], [workRun]);

    const machineUsageRatio = allMachines?.length > 0
        ? (activeMachines.length / allMachines.length) * 100
        : 0;

    const timelineBounds = useMemo(() => {
        const { dayStart, dayEnd } = getFullDayBounds(selectedDate);
        if (!autoZoom || !workRun?.start_date) return { start: dayStart, end: dayEnd };
        const times: number[] = [];
        const runStart = new Date(workRun.start_date).getTime();
        const runEnd = workRun.end_date ? new Date(workRun.end_date).getTime() : Date.now();
        times.push(runStart, runEnd);
        workRun.machines?.forEach(m => {
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
    }, [autoZoom, workRun, selectedDate]);

    const timelineLabels = useMemo(() => buildTimelineLabels(timelineBounds.start, timelineBounds.end), [timelineBounds]);

    const runBarInfo = useMemo(() => {
        if (!workRun?.start_date) return null;
        const { start, end } = timelineBounds;
        const runStart = new Date(workRun.start_date);
        const runEnd = workRun.end_date ? new Date(workRun.end_date) : new Date();
        if (runEnd < start || runStart > end) return null;
        const cs = new Date(Math.max(runStart.getTime(), start.getTime()));
        const ce = new Date(Math.min(runEnd.getTime(), end.getTime()));
        return { leftPercent: timeToPercent(cs, start, end), widthPercent: Math.max(2, timeToPercent(ce, start, end) - timeToPercent(cs, start, end)) };
    }, [workRun, timelineBounds]);

    const runBars = useMemo(() => {
        if (!workRun?.start_date) return [];
        const { start, end } = timelineBounds;
        const breaks = workRun.breaks || [];

        const rS = new Date(workRun.start_date).getTime();
        const rE = workRun.end_date ? new Date(workRun.end_date).getTime() : new Date().getTime();

        // 1. สร้างช่วงเวลาที่ 'น่าจะ' มีการทำงาน (ตั้งแต่เริ่มจนถึงปัจจุบัน/จบงาน)
        let intervals = [{ s: rS, e: rE }];

        // 2. เจาะรูช่วงพัก (หั่นก้อนงานออกเมื่อเจอช่วงพัก)
        breaks.forEach(brk => {
            const bS = new Date(brk.break_start).getTime();
            const bE = brk.break_end ? new Date(brk.break_end).getTime() : new Date().getTime();

            let nextIntervals = [];
            intervals.forEach(interval => {
                // ถ้าช่วงพักทับซ้อนกับช่วงงานที่เรามี
                if (bS < interval.e && bE > interval.s) {
                    // เก็บเฉพาะส่วนที่ "ไม่อยู่" ในช่วงพัก
                    if (bS > interval.s) nextIntervals.push({ s: interval.s, e: bS });
                    if (bE < interval.e) nextIntervals.push({ s: bE, e: interval.e });
                } else {
                    nextIntervals.push(interval);
                }
            });
            intervals = nextIntervals;
        });

        // 3. กรองและวาดเฉพาะก้อนที่อยู่ในหน้าจอปัจจุบัน (Crucial Step!)
        return intervals
            .map((interval, idx) => {
                // เช็คว่าก้อนนี้อยู่ในช่วง Timeline ที่เรากำลังมองอยู่ (start - end) หรือไม่
                if (interval.e <= start.getTime() || interval.s >= end.getTime()) return null;

                const cs = new Date(Math.max(interval.s, start.getTime()));
                const ce = new Date(Math.min(interval.e, end.getTime()));

                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);

                // ป้องกันแท่งที่กว้างติดลบหรือ 0
                if (r <= l) return null;

                return {
                    id: `run-bar-${idx}`,
                    leftPercent: l,
                    widthPercent: r - l,
                    isCurrent: !workRun.end_date && interval.e >= new Date().getTime() - 2000
                };
            })
            .filter((bar): bar is any => bar !== null && bar.widthPercent > 0);
    }, [workRun, timelineBounds, now]);

    const breakBars = useMemo(() => {
        if (!workRun?.breaks) return [];
        const { start, end } = timelineBounds;
        return (workRun.breaks as WorkRunBreak[]).map(b => {
            const bS = new Date(b.break_start); const bE = b.break_end ? new Date(b.break_end) : new Date();
            if (bE < start || bS > end) return null;
            const cs = new Date(Math.max(bS.getTime(), start.getTime()));
            const ce = new Date(Math.min(bE.getTime(), end.getTime()));
            return { break_id: b.break_id, leftPercent: timeToPercent(cs, start, end), widthPercent: Math.max(0.5, timeToPercent(ce, start, end) - timeToPercent(cs, start, end)), break_type: b.break_type };
        }).filter(Boolean) as { break_id: number; leftPercent: number; widthPercent: number; break_type: string }[];
    }, [workRun, timelineBounds]);

    const machineBars = useMemo(() => {
        if (!workRun?.machines) return [];
        const { start, end } = timelineBounds;
        return workRun.machines.map(m => {
            const mS = new Date(m.from_time); const mE = m.to_time ? new Date(m.to_time) : new Date();
            if (mE < start || mS > end) return null;
            const cs = new Date(Math.max(mS.getTime(), start.getTime()));
            const ce = new Date(Math.min(mE.getTime(), end.getTime()));
            const l = timeToPercent(cs, start, end); const r = timeToPercent(ce, start, end);
            return { work_run_machine_id: m.work_run_machine_id, machine_id: m.machine_id, machine_name: m.machine?.machine_name ?? `Machine #${m.machine_id}`, isActive: m.to_time === null, leftPercent: l, widthPercent: Math.max(2, r - l) };
        }).filter(Boolean) as { work_run_machine_id: number; machine_id: number; machine_name: string; isActive: boolean; leftPercent: number; widthPercent: number }[];
    }, [workRun, timelineBounds]);

    const employeeRows = useMemo(() => {
        if (!workRun?.assignments) return [];
        const { start, end } = timelineBounds;
        const breaks = workRun.breaks || []; // ดึงช่วงเวลาพักทั้งหมดมา

        const grouped = new Map();

        workRun.assignments.forEach(a => {
            let aS = new Date(a.from_time).getTime();
            let aE = a.to_time ? new Date(a.to_time).getTime() : new Date().getTime();

            // สร้างช่วงเวลาทำงานเบื้องต้น (แบบยังไม่หักพัก)
            let workIntervals = [{ s: aS, e: aE }];

            // --- Logic การ "เจาะรู" ช่วงเวลาพัก ---
            breaks.forEach(brk => {
                const bS = new Date(brk.break_start).getTime();
                const bE = brk.break_end ? new Date(brk.break_end).getTime() : new Date().getTime();

                let nextIntervals = [];
                workIntervals.forEach(interval => {
                    // ถ้าช่วงพักทับซ้อนกับช่วงงาน
                    if (bS < interval.e && bE > interval.s) {
                        // ส่วนก่อนพัก (ถ้ามี)
                        if (bS > interval.s) {
                            nextIntervals.push({ s: interval.s, e: bS });
                        }
                        // ส่วนหลังพัก (ถ้ามี)
                        if (bE < interval.e) {
                            nextIntervals.push({ s: bE, e: interval.e });
                        }
                    } else {
                        // ไม่ทับกัน เก็บช่วงงานเดิมไว้
                        nextIntervals.push(interval);
                    }
                });
                workIntervals = nextIntervals;
            });
            // ------------------------------------

            if (!grouped.has(a.employee_id)) {
                const fn = a.employee?.employee_first_name ?? '';
                const ln = a.employee?.employee_last_name ?? '';
                grouped.set(a.employee_id, {
                    employee_id: a.employee_id,
                    name: `${fn} ${ln}`.trim() || `Emp #${a.employee_id}`,
                    bars: []
                });
            }

            // นำช่วงเวลาที่ถูกตัดแบ่งแล้วมาสร้างเป็นแท่งกราฟ (Bars)
            workIntervals.forEach((interval, idx) => {
                if (interval.e < start.getTime() || interval.s > end.getTime()) return;

                const cs = new Date(Math.max(interval.s, start.getTime()));
                const ce = new Date(Math.min(interval.e, end.getTime()));
                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);

                grouped.get(a.employee_id).bars.push({
                    assignment_id: `${a.work_run_assignment_id}-${idx}`, // ป้องกัน key ซ้ำ
                    leftPercent: l,
                    widthPercent: Math.max(0.5, r - l),
                    isActive: a.to_time === null && interval.e >= new Date().getTime() - 1000,
                    from_time: new Date(interval.s).toISOString(),
                    to_time: a.to_time && interval.e === aE ? a.to_time : new Date(interval.e).toISOString()
                });
            });
        });

        return Array.from(grouped.values());
    }, [workRun, timelineBounds, now]);

    const machineRows = useMemo(() => {
        if (!workRun?.machines) return [];
        const { start, end } = timelineBounds;
        const breaks = workRun.breaks || [];

        // ใช้ Map เพื่อ Group ตาม machine_id (เพื่อให้เครื่องเดิมอยู่บรรทัดเดียวกัน)
        const grouped = new Map();

        workRun.machines.forEach(m => {
            const mS = new Date(m.from_time).getTime();
            const mE = m.to_time ? new Date(m.to_time).getTime() : new Date().getTime();

            // --- เริ่มต้น Logic การตัดแบ่งช่วงเวลาด้วย Break ---
            let workIntervals = [{ s: mS, e: mE }];

            breaks.forEach(brk => {
                const bS = new Date(brk.break_start).getTime();
                const bE = brk.break_end ? new Date(brk.break_end).getTime() : new Date().getTime();

                let nextIntervals = [];
                workIntervals.forEach(interval => {
                    // เช็คว่าช่วงพัก (bS-bE) ทับซ้อนกับช่วงงาน (interval) หรือไม่
                    if (bS < interval.e && bE > interval.s) {
                        // ส่วนของงาน "ก่อน" เริ่มพัก
                        if (bS > interval.s) {
                            nextIntervals.push({ s: interval.s, e: bS });
                        }
                        // ส่วนของงาน "หลัง" จบพัก
                        if (bE < interval.e) {
                            nextIntervals.push({ s: bE, e: interval.e });
                        }
                    } else {
                        // ไม่มีการทับซ้อน เก็บช่วงงานนี้ไว้เหมือนเดิม
                        nextIntervals.push(interval);
                    }
                });
                workIntervals = nextIntervals;
            });
            // ---------------------------------------------

            // ตรวจสอบ/สร้างกลุ่มเครื่องจักรใน Map
            if (!grouped.has(m.machine_id)) {
                grouped.set(m.machine_id, {
                    machine_id: m.machine_id,
                    name: m.machine?.machine_name || `Machine #${m.machine_id}`,
                    machine_code: m.machine?.machine_code,
                    bars: []
                });
            }

            // แปลงช่วงเวลาที่ตัดแบ่งแล้ว (workIntervals) ให้เป็นก้อน Bar สำหรับวาดบน Timeline
            workIntervals.forEach((interval, idx) => {
                // ถ้าช่วงย่อยนี้อยู่นอกขอบเขต Timeline ที่แสดงผล ให้ข้ามไป
                if (interval.e < start.getTime() || interval.s > end.getTime()) return;

                const cs = new Date(Math.max(interval.s, start.getTime()));
                const ce = new Date(Math.min(interval.e, end.getTime()));

                const l = timeToPercent(cs, start, end);
                const r = timeToPercent(ce, start, end);

                grouped.get(m.machine_id).bars.push({
                    // ใช้ composite key เพื่อไม่ให้ key ซ้ำกันใน React loop
                    work_run_machine_id: `${m.work_run_machine_id}-${idx}`,
                    leftPercent: l,
                    widthPercent: Math.max(0.5, r - l), // กำหนดความกว้างขั้นต่ำนิดหน่อยให้พอมองเห็น
                    isActive: m.to_time === null && interval.e >= new Date().getTime() - 2000,
                    from_time: new Date(interval.s).toISOString(),
                    to_time: m.to_time && interval.e === mE ? m.to_time : new Date(interval.e).toISOString()
                });
            });
        });

        return Array.from(grouped.values());
    }, [workRun, timelineBounds, now]);

    const filteredEmployees = React.useMemo(() => {
        if (!empSearch) return allEmployees;
        const q = empSearch.toLowerCase();
        return allEmployees.filter(emp => {
            const fullName = `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase();
            return fullName.includes(q) || String(emp.employee_id).includes(q);
        });
    }, [allEmployees, empSearch]);

    const filteredMachines = React.useMemo(() => {
        if (!machineSearch) return allMachines;
        const q = machineSearch.toLowerCase();
        return allMachines.filter(m => m.machine_name.toLowerCase().includes(q) || m.machine_code.toLowerCase().includes(q));
    }, [allMachines, machineSearch]);

    const pastAssignments = useMemo(() => workRun?.assignments?.filter(a => a.to_time !== null) ?? [], [workRun]);
    const pastMachines = useMemo(() => workRun?.machines?.filter(m => m.to_time !== null) ?? [], [workRun]);

    const calcElapsedSeconds = (entry: { from_time: string; to_time: string | null }, breaks: WorkRunBreak[]): number => {
        const start = new Date(entry.from_time).getTime();
        const end = entry.to_time ? new Date(entry.to_time).getTime() : Date.now();
        const breakOverlapMs = (breaks ?? []).reduce((sum, b) => {
            const bStart = new Date(b.break_start).getTime();
            const bEnd = b.break_end ? new Date(b.break_end).getTime() : Date.now();
            return sum + Math.max(0, Math.min(end, bEnd) - Math.max(start, bStart));
        }, 0);
        return Math.max(0, end - start - breakOverlapMs) / 1000;
    };

    const laborBreakdown = React.useMemo(() => {
        if (!workRun?.assignments) return [];
        const breaks = workRun.breaks ?? [];
        type LaborEntry = { employee_id: number; employee: typeof workRun.assignments[0]['employee']; seconds: number; hourlyRate: number; cost: number; isWorking: boolean };
        const map = new Map<number, LaborEntry>();
        for (const a of workRun.assignments) {
            const seconds = calcElapsedSeconds(a, breaks);
            const isWorking = a.to_time === null;
            const baseSalary = (a.employee as any)?.base_salary ?? 0;
            const dayRate = (a.employee as any)?.day_rate ?? 0;
            // Live estimate: base/30/8 + day/8 (per hour). OT multipliers applied by backend on completion.
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
    }, [workRun, costTick]);

    const totalLaborCost = React.useMemo(
        () => laborBreakdown.reduce((s, a) => s + a.cost, 0),
        [laborBreakdown]
    );

    /**
     * Labor split into base / day / ot.
     * For COMPLETED runs, read the authoritative values stored on WorkRunCost.
     * For live runs, fall back to an estimate (base+day only — OT/holiday/weekend
     * multipliers are computed by backend at completion and not displayed live).
     */
    const laborSplit: LaborCostSplit = useMemo(() => {
        const isCompleted = (workRun?.status || '').toUpperCase() === 'COMPLETED';
        if (isCompleted && workRun?.cost) {
            return getLaborSplit(workRun.cost as any);
        }
        return estimateLiveLaborSplit(workRun?.assignments ?? [], workRun?.breaks ?? []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workRun, costTick]);

    const isLaborEstimate = (workRun?.status || '').toUpperCase() !== 'COMPLETED';

    const finalMaterialCost = useMemo(() => {
        // For completed runs, use the stored actual material cost for accuracy.
        if (workRun?.status?.toUpperCase() === 'COMPLETED' && workRun.cost?.material_cost != null) {
            return workRun.cost.material_cost;
        }
        // For active runs or runs without a stored cost, calculate from required items.
        if (workRun?.required_items?.length) {
            return workRun.required_items.reduce((sum, item) => {
                const batchQty = item.material_list?.quantity ?? 0;
                const batchCost = item.material_list?.cost_price ?? 0;
                const cpu = batchQty > 0 ? (item.material_list?.cost_per_unit ?? batchCost / batchQty) : 0;
                return sum + cpu * item.quantity;
            }, 0);
        }
        return 0;
    }, [workRun]);

    const status = normalizeKey(workRun?.status);
    const isCompleted = status === 'COMPLETED';
    const isActive = status === 'INPROGRESS' || status === 'PAUSED';

    // --- Lifecycle ---
    const openStartModal = () => {
        setAllocationMode('auto');
        setManualAllocations({});
        setPickRequests([]);
        setShowStartModal(true);
    };

    const closeStartModal = () => {
        setShowStartModal(false);
        setAllocationMode('auto');
        setManualAllocations({});
    };

    const handleManualQtyChange = (requiredItemId: number, pickItemId: number, value: string) => {
        const formatted = formatIntegerInput(value);
        setManualAllocations(prev => ({
            ...prev,
            [requiredItemId]: { ...(prev[requiredItemId] ?? {}), [pickItemId]: formatted },
        }));
    };

    // Flatten all pick request items matching a required item by item_code
    const getPickItemsForRequired = (requiredItem: { item_code: string }) => {
        const result: (PickingRequestListItem & { picking_request_code: string })[] = [];
        pickRequests.forEach(pr => {
            pr.items.forEach(item => {
                if (item.item_code === requiredItem.item_code && item.qty_available > 0) {
                    result.push({ ...item, picking_request_code: pr.picking_request_code ?? "" });
                }
            });
        });
        return result;
    };

    const handleStart = async () => {
        const payload: { allocation_mode: 'auto' | 'manual'; material_sources?: MaterialSourceEntry[] } = {
            allocation_mode: allocationMode,
        };

        if (allocationMode === 'manual') {
            const materialSources: MaterialSourceEntry[] = [];
            for (const reqItem of (workRun?.required_items ?? [])) {
                const allocMap = manualAllocations[reqItem.id] ?? {};
                const sources = Object.entries(allocMap)
                    .filter(([, v]) => v !== '' && Number(v) > 0)
                    .map(([pickItemId, qty]) => ({ picking_request_item_id: Number(pickItemId), qty: Number(qty) }));
                if (sources.length > 0) {
                    materialSources.push({ required_item_id: reqItem.id, sources });
                }
            }
            if (materialSources.length > 0) {
                payload.material_sources = materialSources;
            }
        }

        setLoading();
        try {
            const result = await startWorkRun(Number(workRunId), payload);
            if (result?.success) {
                closeStartModal();
                Swal.fire({ title: 'เริ่มงานสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถเริ่มงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handlePause = async () => {
        const result = await Swal.fire({
            title: 'พักงาน',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { LUNCHBREAK: 'พักเที่ยง', RESTBREAK: 'พักเบรค', OTHER: 'อื่นๆ' },
            inputValue: 'LUNCHBREAK',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักงาน',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;
        setLoading();
        try {
            const res = await pauseWorkRun(Number(workRunId), { break_type: result.value });
            if (res?.success) {
                Swal.fire({ title: 'พักงานสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถพักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleResume = async () => {
        setLoading();
        try {
            const res = await resumeWorkRun(Number(workRunId));
            if (res?.success) {
                Swal.fire({ title: 'ทำงานต่อสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถดำเนินการได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Employee assign/unassign ---
    const handleAssignEmployee = async (emp: Employee) => {
        setLoading();
        try {
            const res = await assignEmployee(Number(workRunId), emp.employee_id);
            if (res?.success) {
                setShowAssignEmpModal(false);
                setEmpSearch('');
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถกำหนดพนักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleUnassignEmployee = async (employeeId: number) => {
        setLoading();
        try {
            const res = await unassignEmployee(Number(workRunId), employeeId);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถยกเลิกพนักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Machine assign/unassign ---
    const handleAssignMachine = async (machine: Machine) => {
        setLoading();
        try {
            const res = await assignMachine(Number(workRunId), machine.machine_id);
            if (res?.success) {
                setShowAssignMachineModal(false);
                setMachineSearch('');
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถกำหนดเครื่องจักรได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleUnassignMachine = async (machineId: number) => {
        setLoading();
        try {
            const res = await unassignMachine(Number(workRunId), machineId);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถยกเลิกเครื่องจักรได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const loadCounts = async () => {
        const [empCount, machCount] = await Promise.all([
            getEmployeeTotalCount(),
            getMachineTotalCount()
        ]);
        setTotalCounts({ emp: empCount, mach: machCount });
    };

    // --- Required Items ---
    const openAddRequiredItem = () => {
        setEditingRequiredItem(null);
        setStagedItems([]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
        setShowRequiredItemModal(true);
    };

    const openEditRequiredItem = (item: WorkRunRequiredItem) => {
        setEditingRequiredItem(item);
        setEditQty(String(item.quantity));
        setEditQtyError('');
        setShowRequiredItemModal(true);
    };

    const closeRequiredItemModal = () => {
        setShowRequiredItemModal(false);
        setEditingRequiredItem(null);
        setStagedItems([]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
        setEditQtyError('');
    };

    // Add current picker row to staged list
    const handleAddToStaged = () => {
        const newErrors: Record<string, string> = {};
        if (currentPicker.material_list_id === 0) newErrors.material_list_id = 'กรุณาเลือกวัตถุดิบ';
        const qtyErr = validateRequired(currentPicker.quantity, 'จำนวน') ?? validatePositiveNumber(currentPicker.quantity, 'จำนวน');
        if (qtyErr) newErrors.quantity = qtyErr;
        if (Object.keys(newErrors).length > 0) { setPickerErrors(newErrors); return; }

        const selected = materialList.find(m => m.material_list_id === currentPicker.material_list_id)!;
        const alreadyStaged = stagedItems.some(s => s.material.material_list_id === selected.material_list_id);
        if (alreadyStaged) { setPickerErrors({ material_list_id: 'วัตถุดิบนี้อยู่ในรายการแล้ว' }); return; }

        setStagedItems(prev => [...prev, { material: selected, quantity: currentPicker.quantity }]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
    };

    const handleSaveRequiredItem = async () => {
        if (editingRequiredItem) {
            const qtyErr = validateRequired(editQty, 'จำนวน') ?? validatePositiveNumber(editQty, 'จำนวน');
            if (qtyErr) { setEditQtyError(qtyErr); return; }
            setLoading();
            try {
                const res = await updateWorkRunRequiredItem(editingRequiredItem.id, { quantity: Number(editQty) });
                if (res?.success) { closeRequiredItemModal(); fetchWorkRun(); }
                else Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
            finally { setUnLoading(); }
        } else {
            if (stagedItems.length === 0) return;
            setLoading();
            try {
                const payload = stagedItems.map(s => ({
                    item_code: s.material.item_code,
                    item_name: s.material.item_name,
                    quantity: Number(s.quantity),
                    unit: s.material.unit_name,
                    material_list_id: s.material.material_list_id,
                }));
                const res = await createWorkRunRequiredItems(Number(workRunId), payload);
                if (res?.success) { closeRequiredItemModal(); fetchWorkRun(); }
                else Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
            finally { setUnLoading(); }
        }
    };

    const handleDeleteRequiredItem = async (item: WorkRunRequiredItem) => {
        const confirm = await Swal.fire({
            title: `ลบ "${item.item_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;
        setLoading();
        try {
            const res = await deleteWorkRunRequiredItem(item.id);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Complete Work Run ---
    const handleCompleteWorkRun = async () => {
        setLoading();
        try {
            const material_actuals = Object.entries(materialActuals)
                .filter(([, v]) => v !== '')
                .map(([id, qty]) => ({ work_run_required_item_id: Number(id), qty_used: Number(qty) }));
            const result = await completeWorkRun(Number(workRunId), {
                completion_remark: completeForm.completion_remark || undefined,
                defect_qty: completeForm.defect_qty,
                usable_qty: completeForm.usable_qty,
                ...(material_actuals.length > 0 ? { material_actuals } : {}),
            });
            if (result?.success) {
                setShowCompleteModal(false);
                Swal.fire({ title: 'Work Run เสร็จสิ้น', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถปิด Work Run ได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Machine cost (rate จาก backend, คำนวณ real-time ที่ frontend) ---
    const formatDurationMs = (ms: number): string => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
    };

    const machineCostActual = useMemo(() => {
        if (!workRun?.machines) return [];
        const breaks = workRun.breaks ?? [];
        const map = new Map<number, {
            machine_id: number; machine: typeof workRun.machines[0]['machine'];
            depreciationCost: number; maintenanceCost: number; totalCost: number;
            seconds: number; isRunning: boolean; noRate: boolean;
        }>();
        for (const m of workRun.machines) {
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
    }, [workRun, costTick]);

    const costChartData = useMemo(() => {
        if (!workRun?.start_date) return [];
        const startMs = new Date(workRun.start_date).getTime();
        const endMs = workRun.end_date ? new Date(workRun.end_date).getTime() : Date.now();
        const totalMs = endMs - startMs;
        if (totalMs <= 0) return [];

        const POINTS = 60;
        const step = totalMs / POINTS;
        const breaks = workRun.breaks ?? [];
        const isCompleted = workRun.status?.toUpperCase() === 'COMPLETED';

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

        // For completed runs, calculate an effective overall labor rate to ensure the graph
        // ends at the exact stored final cost.
        let effectiveLaborRate = 0;
        const storedLabor = workRun.cost
            ? ((workRun.cost as any).base_labor_cost ?? 0) + ((workRun.cost as any).day_labor_cost ?? 0) + ((workRun.cost as any).ot_labor_cost ?? 0)
            : null;
        if (isCompleted && storedLabor != null) {
            const totalLaborSec = (workRun.assignments ?? []).reduce((sum, a) => sum + calcElapsedSeconds(a, breaks), 0);
            if (totalLaborSec > 0) {
                effectiveLaborRate = storedLabor / totalLaborSec;
            }
        }

        const data = [];
        for (let i = 0; i <= POINTS; i++) {
            const t = startMs + i * step;
            let depreciation = 0;
            let maintenance = 0;
            (workRun.machines ?? []).forEach(m => {
                const sec = effectiveSec(m, t); // duration up to time 't'
                const isRunning = m.to_time === null;

                let depreciationRate = 0;
                let maintenanceRate = 0;

                // Use live per-second rates for running machines or any machine if the run itself is not completed.
                if (isRunning || !isCompleted) {
                    depreciationRate = m.cost?.depreciation_per_second ?? 0;
                    maintenanceRate = m.cost?.maintenance_rate_per_second ?? 0;
                } else {
                    // It's a completed machine usage. Calculate its effective rate.
                    const totalSec = calcElapsedSeconds(m, breaks);
                    if (totalSec > 0) {
                        depreciationRate = (m.cost?.depreciation_cost ?? 0) / totalSec;
                        maintenanceRate = (m.cost?.maintenance_cost ?? 0) / totalSec;
                    }
                }
                depreciation += depreciationRate * sec;
                maintenance += maintenanceRate * sec;
            });
            let labor = 0;
            // If completed and we have an effective rate, use it for consistency.
            if (isCompleted && effectiveLaborRate > 0) {
                (workRun.assignments ?? []).forEach(a => {
                    const sec = effectiveSec(a, t);
                    labor += effectiveLaborRate * sec;
                });
            } else { // Otherwise, calculate live from pay rates (base + day; OT handled at finalize).
                (workRun.assignments ?? []).forEach(a => {
                    const sec = effectiveSec(a, t);
                    const baseSalary = (a.employee as any)?.base_salary ?? 0;
                    const dayRate = (a.employee as any)?.day_rate ?? 0;
                    labor += ((baseSalary / 30 / 8 / 3600) + (dayRate / 8 / 3600)) * sec;
                });
            }
            const elapsedMin = Math.round((t - startMs) / 60000);
            const hh = Math.floor(elapsedMin / 60).toString().padStart(2, '0');
            const mm = (elapsedMin % 60).toString().padStart(2, '0');
            data.push({
                elapsedMin,
                label: `${hh}:${mm}`,
                ค่าเสื่อมราคา: parseFloat(depreciation.toFixed(4)),
                ค่าซ่อมบำรุง: parseFloat(maintenance.toFixed(4)),
                ค่าพนักงาน: parseFloat(labor.toFixed(4)),
                รวม: parseFloat((finalMaterialCost + depreciation + maintenance + labor).toFixed(4)),
            });
        }
        return data;
    }, [workRun, costTick, finalMaterialCost]);

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10 bg-white p-5 rounded shadow-sm'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon me-3'>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            {workRun?.lot_number || `Work Run #${workRun?.work_run_id || workRunId}`}
                        </h1>
                        <div className='d-flex align-items-center gap-2 mt-1'>
                            {workRun && (
                                <span className={`badge ${getWorkRunStatusBadge(workRun.status)} fw-bold fs-8`}>
                                    {workRunStatusThaiMap[normalizeKey(workRun.status)] || workRun.status}
                                </span>
                            )}
                            {workRun && (

                                <span className='text-muted fw-semibold fs-8'>
                                    <div className="vr mx-3"></div>
                                    จำนวน: {workRun.quantity}
                                </span>
                            )}
                            {workRun?.created_date && (
                                <span className='text-muted fs-8'>
                                    <div className="vr mx-3"></div>
                                    สร้างเมื่อ {new Date(workRun.created_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className='d-flex gap-2'>
                    {status === 'PENDING' && (
                        <button className='btn btn-sm btn-primary fw-bold px-6' onClick={openStartModal}>
                            <i className='bi bi-play-fill me-1'></i> เริ่มงาน
                        </button>
                    )}
                    {status === 'INPROGRESS' && (
                        <button className='btn btn-sm btn-warning fw-bold px-6' onClick={handlePause}>
                            <i className='bi bi-pause-fill me-1'></i> พักงาน
                        </button>
                    )}
                    {status === 'PAUSED' && (
                        <button className='btn btn-sm btn-primary fw-bold px-6' onClick={handleResume}>
                            <i className='bi bi-play-fill me-1'></i> ทำงานต่อ
                        </button>
                    )}
                    {isActive && (
                        <button
                            className='btn btn-sm btn-success fw-bold px-6'
                            onClick={() => {
                                const actuals: Record<number, string> = {};
                                (workRun?.required_items ?? []).forEach(item => { actuals[item.id] = ''; });
                                setMaterialActuals(actuals);
                                setCompleteForm({ completion_remark: '', defect_qty: 0, usable_qty: workRun?.quantity || 0 });
                                setShowCompleteModal(true);
                            }}
                        >
                            <i className='bi bi-check-circle me-1'></i> ปิด Work Run
                        </button>
                    )}

                </div>
            </div>

            {/* Completion Info */}
            {workRun && (workRun.defect_qty != null || workRun.usable_qty != null || workRun.completion_remark) && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-body py-5'>
                        <div className='row g-4'>
                            {workRun.usable_qty != null && (
                                <div className='col-md-4'>
                                    <span className='text-muted fs-8 fw-bold d-block'>จำนวนที่ใช้งานได้</span>
                                    <span className='text-success fw-bold fs-5'>{workRun.usable_qty}</span>
                                </div>
                            )}
                            {workRun.defect_qty != null && (
                                <div className='col-md-4'>
                                    <span className='text-muted fs-8 fw-bold d-block'>จำนวนของเสีย</span>
                                    <span className='text-danger fw-bold fs-5'>{workRun.defect_qty}</span>
                                </div>
                            )}
                            {workRun.completion_remark && (
                                <div className='col-md-12'>
                                    <span className='text-muted fs-8 fw-bold d-block'>หมายเหตุการปิดงาน</span>
                                    <span className='text-gray-700 fs-7'>{workRun.completion_remark}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="row g-5 mb-8">
                {/* Live Timer */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">ระยะเวลาดำเนินการ (LIVE)</span>
                            {workRun?.status?.toUpperCase() === 'INPROGRESS' && <span className="wo-live-dot" />}
                            {workRun?.status?.toUpperCase() === 'PAUSED' && <span className="wo-live-dot" style={{ background: '#fd7e14' }} />}
                        </div>
                        <WorkRunLiveTimer workRun={workRun} />
                        <div className="wo-kpi-sub mt-2">
                            <small className="text-muted">เริ่ม: {workRun?.start_date ? new Date(workRun.start_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(workRun.start_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}</small>
                            {workRun?.status?.toUpperCase() === 'PAUSED' && (
                                <small className="text-warning ms-2">⏸ พักชั่วคราว</small>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Employees */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">พนักงานที่ปฏิบัติงาน (ACTIVE)</span>
                            <div className="d-flex gap-1">
                                {isActive && (
                                    <button
                                        className="btn btn-sm btn-icon btn-light-primary"
                                        style={{ width: 28, height: 28 }}
                                        title="เพิ่มพนักงาน"
                                        onClick={() => setShowAssignEmpModal(true)}
                                    >
                                        <i className="bi bi-plus-lg fs-7"></i>
                                    </button>
                                )}
                                <button
                                    className="btn btn-sm btn-icon btn-light-secondary"
                                    style={{ width: 28, height: 28 }}
                                    title="ดูประวัติการมอบหมาย"
                                    onClick={() => setShowEmpHistoryModal(true)}
                                >
                                    <i className="bi bi-eye fs-7"></i>
                                </button>
                            </div>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="wo-kpi-big">{activeAssignments.length}</span>
                            <span className="text-muted fs-6">/ {totalCounts.emp} คน</span>                        </div>
                        <div className="wo-avatar-stack mt-3">
                            {activeAssignments.slice(0, 4).map(a => (
                                <div key={a.work_run_assignment_id} className="wo-avatar" title={`${a.employee?.employee_first_name} ${a.employee?.employee_last_name}`}>
                                    {a.employee?.employee_first_name?.charAt(0) ?? '?'}
                                </div>
                            ))}
                            {activeAssignments.length > 4 && <div className="wo-avatar wo-avatar-more">+{activeAssignments.length - 4}</div>}
                        </div>
                    </div>
                </div>

                {/* Machines */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">เครื่องจักรที่ใช้งาน</span>
                            <div className="d-flex gap-1">
                                {isActive && (
                                    <button
                                        className="btn btn-sm btn-icon btn-light-primary"
                                        style={{ width: 28, height: 28 }}
                                        title="เพิ่มเครื่องจักร"
                                        onClick={() => setShowAssignMachineModal(true)}
                                    >
                                        <i className="bi bi-plus-lg fs-7"></i>
                                    </button>
                                )}
                                <button
                                    className="btn btn-sm btn-icon btn-light-secondary"
                                    style={{ width: 28, height: 28 }}
                                    title="ดูประวัติการใช้งาน"
                                    onClick={() => setShowMachineHistoryModal(true)}
                                >
                                    <i className="bi bi-eye fs-7"></i>
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

            {/* Required Items (compact) + Timeline */}
            <div className="row g-5 mb-8">
                {/* Required Items Quick Panel */}
                <div className="col-lg-4">
                    <div className="wo-card h-100">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">
                                <i className="bi bi-box-seam me-2 text-primary fs-6"></i>รายการวัตถุดิบที่ต้องใช้
                            </h3>
                            {!isCompleted && (
                                <button
                                    className="btn btn-sm btn-icon btn-light-primary"
                                    style={{ width: 28, height: 28 }}
                                    title="เพิ่มรายการวัตถุดิบ"
                                    onClick={openAddRequiredItem}
                                >
                                    <i className="bi bi-plus-lg fs-7"></i>
                                </button>
                            )}
                        </div>
                        <div className="wo-card-body">
                            {(!workRun?.required_items || workRun.required_items.length === 0) ? (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-box-seam fs-3x text-gray-300 mb-3 d-block" />
                                    ยังไม่มีรายการวัตถุดิบ
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {workRun.required_items.map(item => {
                                        const batchQty = item.material_list?.quantity ?? 0;
                                        const batchCost = item.material_list?.cost_price ?? 0;
                                        const costPerUnit = batchQty > 0 ? (item.material_list?.cost_per_unit ?? batchCost / batchQty) : 0;
                                        const lineCost = costPerUnit * item.quantity;
                                        return (
                                            <div
                                                key={item.id}
                                                className="d-flex align-items-center rounded px-3 py-2"
                                                style={{ background: '#f8f9fa', border: '1px solid #e4e6ef', cursor: 'pointer' }}
                                                onClick={() => openEditRequiredItem(item)}
                                            >
                                                <div className="flex-grow-1 me-2 min-w-0">
                                                    <div className="fw-bold text-gray-800 fs-7 text-truncate">{item.item_name}</div>
                                                    <div className="text-muted fs-8">{item.item_code} · {item.unit}</div>
                                                </div>
                                                <div className="text-end me-2">
                                                    <div className="fw-semibold text-gray-700 fs-7">{item.quantity}</div>
                                                    {lineCost > 0 && <div className="text-muted fs-8">฿{lineCost.toFixed(2)}</div>}
                                                </div>
                                                {!isCompleted && (
                                                    <button
                                                        className="btn btn-sm btn-icon btn-light-danger flex-shrink-0"
                                                        style={{ width: 24, height: 24, padding: 0 }}
                                                        title="ลบรายการ"
                                                        onClick={e => { e.stopPropagation(); handleDeleteRequiredItem(item); }}
                                                    >
                                                        <i className="bi bi-trash fs-8"></i>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="d-flex justify-content-between pt-2 border-top fs-8 text-muted fw-bold mt-1">
                                        <span>ต้นทุนวัตถุดิบรวม</span>
                                        <span className="text-primary fw-bolder">
                                            ฿{workRun.required_items.reduce((sum, item) => {
                                                const bq = item.material_list?.quantity ?? 0;
                                                const bc = item.material_list?.cost_price ?? 0;
                                                const cpu = bq > 0 ? (item.material_list?.cost_per_unit ?? bc / bq) : 0;
                                                return sum + cpu * item.quantity;
                                            }, 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
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
                            {workRun?.start_date ? (
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

                                    {/* Work Run row */}
                                    <div className="wo-timeline-row">
                                        <div className="wo-timeline-label-col">
                                            <div className="wo-phase-label">
                                                <span className="wo-phase-dot" style={{ backgroundColor: getRunStatusColor(workRun.status) }} />
                                                <span className="wo-phase-name" title={workRun.lot_number || `Run #${workRun.work_run_id}`}>
                                                    {workRun.lot_number || `Run #${workRun.work_run_id}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                {runBars.length > 0 ? (
                                                    <>
                                                        {/* วาดแท่ง Work Run ที่ถูกตัดแบ่งแล้ว */}
                                                        {runBars.map(bar => (
                                                            <div
                                                                key={bar.id}
                                                                className="wo-timeline-bar"
                                                                style={{
                                                                    backgroundColor: getRunStatusColor(workRun.status),
                                                                    left: `${bar.leftPercent}%`,
                                                                    width: `${bar.widthPercent}%`
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                    setActivePopover(prev => prev?.type === 'run' ? null : { type: 'run', centerPct });
                                                                }}
                                                            >
                                                                {/* แสดงข้อความเฉพาะแท่งที่ยาวพอ */}
                                                                {bar.widthPercent >= 8 && (
                                                                    <span className="wo-bar-text">{getRunStatusLabel(workRun.status)}</span>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {activePopover?.type === 'run' && (
                                                            <div
                                                                ref={popoverRef}
                                                                className="wo-timeline-popover"
                                                                style={{
                                                                    // คำนวณตำแหน่งให้อยู่ตรงกลางของแท่งที่คลิก โดยไม่ให้ล้นขอบซ้าย/ขวา (15% - 85%)
                                                                    left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`,
                                                                    transform: 'translateX(-50%)',
                                                                    '--arrow-left': 'calc(50% - 6px)',
                                                                    position: 'absolute',
                                                                    zIndex: 100
                                                                } as React.CSSProperties}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <div className="wo-timeline-popover-header">
                                                                    <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                        {workRun.lot_number || `Run #${workRun.work_run_id}`}
                                                                    </span>
                                                                    <span className="wo-emp-status" style={{ backgroundColor: getRunStatusBg(workRun.status), color: getRunStatusColor(workRun.status) }}>
                                                                        {getRunStatusLabel(workRun.status)}
                                                                    </span>
                                                                </div>

                                                                <div className="wo-timeline-popover-list">
                                                                    <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                                        <i className="bi bi-people-fill me-1" />พนักงาน ({activeAssignments.length} คน)
                                                                    </div>
                                                                    {activeAssignments.length === 0 ? (
                                                                        <div className="text-muted" style={{ fontSize: 12 }}>ยังไม่มีพนักงาน</div>
                                                                    ) : (
                                                                        activeAssignments.map(a => (
                                                                            <div key={a.work_run_assignment_id} className="wo-timeline-popover-emp">
                                                                                <div className="wo-popover-avatar">{a.employee?.employee_first_name?.charAt(0) ?? '?'}</div>
                                                                                <span className="flex-1">{a.employee?.employee_first_name} {a.employee?.employee_last_name}</span>
                                                                                <span className="text-muted ms-auto" style={{ fontSize: 11 }}>
                                                                                    {a.from_time ? new Date(a.from_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                {/* ส่วนแสดงประวัติการพัก (Breaks) */}
                                                                {workRun.breaks && workRun.breaks.length > 0 && (
                                                                    <div className="wo-timeline-popover-footer">
                                                                        <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                                                                            <i className="bi bi-clock-history me-1 text-warning" />
                                                                            พัก {workRun.breaks.length} ครั้ง • {formatDurationMs(calcTotalBreakMs(workRun.breaks))}
                                                                        </div>
                                                                        {workRun.breaks.map(b => (
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
                                                        <React.Fragment key={bar.work_run_machine_id}>
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
                                                                    // ปรับการเช็ค popover ให้รองรับ machineId และ barId
                                                                    setActivePopover(prev =>
                                                                        prev?.type === 'machine' && prev.barId === bar.work_run_machine_id
                                                                            ? null
                                                                            : { type: 'machine', machineId: row.machine_id, barId: bar.work_run_machine_id, centerPct }
                                                                    );
                                                                }}
                                                            >
                                                                {bar.widthPercent >= 8 && <span className="wo-bar-text">{bar.isActive ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}</span>}
                                                            </div>

                                                            {/* Popover Logic สำหรับเครื่องจักร (ถอดแบบมาจากพนักงาน) */}
                                                            {activePopover?.type === 'machine' && activePopover.barId === bar.work_run_machine_id && (() => {
                                                                // คำนวณระยะเวลา (Duration)
                                                                const durationMs = bar.to_time
                                                                    ? new Date(bar.to_time).getTime() - new Date(bar.from_time).getTime()
                                                                    : now.getTime() - new Date(bar.from_time).getTime();

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
                                    Work Run ยังไม่ได้เริ่มดำเนินการ
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* สรุปต้นทุน */}
            <div className="card shadow-sm mb-8">
                <div className="card-header border-0 pt-5">
                    <div className="card-title">
                        <span className="card-label fw-bold text-gray-900 fs-5">
                            <i className="bi bi-calculator me-2 text-primary"></i>สรุปต้นทุน
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
                                    <span className="symbol symbol-30px">
                                        <span className="symbol-label bg-light-primary">
                                            <i className="bi bi-gear-fill text-primary fs-7"></i>
                                        </span>
                                    </span>
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
                                    <span className="symbol symbol-30px">
                                        <span className="symbol-label bg-light-success">
                                            <i className="bi bi-people-fill text-success fs-7"></i>
                                        </span>
                                    </span>
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
                                    {finalMaterialCost > 0
                                        ? <span className="fw-semibold text-gray-800 fs-7">฿{finalMaterialCost.toFixed(2)}</span>
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
                                    <span className={`fw-semibold fs-7 ${machineCostActual.some(m => m.isRunning) ? 'text-warning' : 'text-gray-800'}`}>
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
                                            finalMaterialCost +
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
                                <i className="bi bi-graph-up me-2 text-primary"></i>ต้นทุนสะสมตามช่วงเวลา
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
                        <div className="d-flex flex-wrap justify-content-center gap-5 mt-4 pt-4 border-top border-dashed">
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

            {/* Employee History Modal (view-only) */}
            <Modal show={showEmpHistoryModal} onHide={() => setShowEmpHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>
                        <i className='bi bi-clock-history me-2 text-primary'></i>ประวัติการมอบหมายพนักงาน
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(workRun?.assignments ?? []).length === 0 ? (
                        <div className='text-center text-muted py-10'>
                            <i className='bi bi-people fs-3x text-gray-300 mb-3 d-block' />
                            ยังไม่มีประวัติการมอบหมาย
                        </div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table table-row-dashed align-middle gs-0 gy-3'>
                                <thead>
                                    <tr className='fw-bold text-muted text-uppercase fs-8'>
                                        <th>พนักงาน</th>
                                        <th>เวลาเริ่ม</th>
                                        <th>เวลาสิ้นสุด</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(workRun?.assignments ?? []).map(a => (
                                        <tr key={a.work_run_assignment_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-35px me-3'>
                                                        <span className='symbol-label bg-primary text-white fw-bold fs-7'>
                                                            {a.employee?.employee_first_name?.charAt(0) ?? '?'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className='fw-bold text-gray-800 fs-7'>
                                                            {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                        </div>
                                                        <div className='text-muted fs-8'>ID: {a.employee_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className='text-gray-600 fs-8'>{a.from_time ? new Date(a.from_time).toLocaleString('th-TH') : '-'}</span></td>
                                            <td><span className='text-gray-600 fs-8'>{a.to_time ? new Date(a.to_time).toLocaleString('th-TH') : '-'}</span></td>
                                            <td>
                                                <span className={`badge ${a.to_time === null ? 'badge-light-success' : 'badge-light-secondary'}`}>
                                                    {a.to_time === null ? 'กำลังทำงาน' : 'เสร็จแล้ว'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowEmpHistoryModal(false)}>ปิด</button>
                </Modal.Footer>
            </Modal>

            {/* Machine History Modal (view-only) */}
            <Modal show={showMachineHistoryModal} onHide={() => setShowMachineHistoryModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>
                        <i className='bi bi-clock-history me-2 text-primary'></i>ประวัติการใช้งานเครื่องจักร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(workRun?.machines ?? []).length === 0 ? (
                        <div className='text-center text-muted py-10'>
                            <i className='bi bi-gear fs-3x text-gray-300 mb-3 d-block' />
                            ยังไม่มีประวัติการใช้งานเครื่องจักร
                        </div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table table-row-dashed align-middle gs-0 gy-3'>
                                <thead>
                                    <tr className='fw-bold text-muted text-uppercase fs-8'>
                                        <th>เครื่องจักร</th>
                                        <th>เวลาเริ่ม</th>
                                        <th>เวลาสิ้นสุด</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(workRun?.machines ?? []).map(m => (
                                        <tr key={m.work_run_machine_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-35px me-3'>
                                                        <span className='symbol-label bg-info text-white fw-bold fs-7'>
                                                            <i className='bi bi-gear-fill'></i>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className='fw-bold text-gray-800 fs-7'>
                                                            {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                        </div>
                                                        <div className='text-muted fs-8'>{m.machine?.machine_code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className='text-gray-600 fs-8'>{m.from_time ? new Date(m.from_time).toLocaleString('th-TH') : '-'}</span></td>
                                            <td><span className='text-gray-600 fs-8'>{m.to_time ? new Date(m.to_time).toLocaleString('th-TH') : '-'}</span></td>
                                            <td>
                                                <span className={`badge ${m.to_time === null ? 'badge-light-info' : 'badge-light-secondary'}`}>
                                                    {m.to_time === null ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowMachineHistoryModal(false)}>ปิด</button>
                </Modal.Footer>
            </Modal>

            {/* Required Item Add/Edit Modal */}
            <Modal show={showRequiredItemModal} onHide={closeRequiredItemModal} centered size={editingRequiredItem ? undefined : 'lg'}>
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>{editingRequiredItem ? 'แก้ไขรายการวัตถุดิบ' : 'เพิ่มรายการวัตถุดิบ'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editingRequiredItem ? (
                        <>
                            <div className='mb-4'>
                                <label className='form-label fw-bold'>วัตถุดิบ</label>
                                <div className='form-control form-control-lg bg-light text-gray-700'>
                                    {editingRequiredItem.item_code} — {editingRequiredItem.item_name}
                                    <span className='text-muted ms-2 fs-8'>({editingRequiredItem.unit})</span>
                                </div>
                            </div>
                            <div className='mb-4'>
                                <label className='form-label fw-bold required'>จำนวน</label>
                                <input
                                    type='text'
                                    className={`form-control form-control-lg ${editQtyError ? 'is-invalid' : ''}`}
                                    value={editQty}
                                    onChange={e => {
                                        setEditQty(formatIntegerInput(e.target.value));
                                        if (editQtyError) setEditQtyError('');
                                    }}
                                />
                                {editQtyError && <div className='invalid-feedback'>{editQtyError}</div>}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Picker row */}
                            <div className='row g-3 align-items-end mb-4'>
                                <div className='col'>
                                    <label className='form-label fw-bold required'>วัตถุดิบ</label>
                                    {materialLoading ? (
                                        <div className='form-control form-control-lg text-muted'>กำลังโหลด...</div>
                                    ) : (
                                        <select
                                            className={`form-select form-select-solid ${pickerErrors.material_list_id ? 'is-invalid' : ''}`}
                                            value={currentPicker.material_list_id}
                                            onChange={e => {
                                                setCurrentPicker(prev => ({ ...prev, material_list_id: Number(e.target.value) }));
                                                if (pickerErrors.material_list_id) setPickerErrors(prev => { const n = { ...prev }; delete n.material_list_id; return n; });
                                            }}
                                        >
                                            <option value={0}>-- เลือกวัตถุดิบ --</option>
                                            {materialList.map(m => (
                                                <option key={m.material_list_id} value={m.material_list_id}>
                                                    {m.item_name} ({m.unit_name})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {pickerErrors.material_list_id && <div className='invalid-feedback'>{pickerErrors.material_list_id}</div>}
                                </div>
                                <div className='col-auto' style={{ minWidth: 120 }}>
                                    <label className='form-label fw-bold required'>จำนวน</label>
                                    <input
                                        type='text'
                                        className={`form-control form-control-lg ${pickerErrors.quantity ? 'is-invalid' : ''}`}
                                        placeholder='0'
                                        value={currentPicker.quantity}
                                        onChange={e => {
                                            setCurrentPicker(prev => ({ ...prev, quantity: formatIntegerInput(e.target.value) }));
                                            if (pickerErrors.quantity) setPickerErrors(prev => { const n = { ...prev }; delete n.quantity; return n; });
                                        }}
                                    />
                                    {pickerErrors.quantity && <div className='invalid-feedback'>{pickerErrors.quantity}</div>}
                                </div>
                                <div className='col-auto'>
                                    <button className='btn btn-light-primary fw-bold' onClick={handleAddToStaged}>
                                        <i className='bi bi-plus-lg me-1'></i> เพิ่ม
                                    </button>
                                </div>
                            </div>

                            {/* Staged list */}
                            {stagedItems.length > 0 ? (
                                <div className='table-responsive'>
                                    <table className='table table-row-dashed align-middle gs-0 gy-2'>
                                        <thead>
                                            <tr className='fw-bold text-muted text-uppercase fs-8'>
                                                <th>รหัสสินค้า</th>
                                                <th>ชื่อวัตถุดิบ</th>
                                                <th>จำนวน</th>
                                                <th>หน่วย</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stagedItems.map((s, idx) => (
                                                <tr key={s.material.material_list_id}>
                                                    <td><span className='text-muted fw-semibold fs-7'>{s.material.item_code}</span></td>
                                                    <td><span className='fw-bold text-gray-800 fs-7'>{s.material.item_name}</span></td>
                                                    <td><span className='fw-semibold text-gray-700 fs-7'>{s.quantity}</span></td>
                                                    <td><span className='text-muted fs-7'>{s.material.unit_name}</span></td>
                                                    <td className='text-end'>
                                                        <i
                                                            className='bi bi-x-circle text-danger cursor-pointer fs-5'
                                                            onClick={() => setStagedItems(prev => prev.filter((_, i) => i !== idx))}
                                                        ></i>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className='text-center text-muted fs-7 py-6 border border-dashed border-gray-300 rounded'>
                                    ยังไม่มีรายการ — เลือกวัตถุดิบและกด "เพิ่ม"
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={closeRequiredItemModal}>ยกเลิก</button>
                    <button
                        className='btn btn-primary fw-bold'
                        onClick={handleSaveRequiredItem}
                        disabled={!editingRequiredItem && stagedItems.length === 0}
                    >
                        <i className='bi bi-check2 me-1'></i>
                        {editingRequiredItem ? 'บันทึก' : `บันทึก (${stagedItems.length} รายการ)`}
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Manage Employee Modal (+ button) */}
            <Modal show={showAssignEmpModal} onHide={() => { setShowAssignEmpModal(false); setEmpSearch(''); }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>
                        จัดการพนักงาน
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative mb-4'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input type='text' className='form-control form-control-lg w-100 ps-13' placeholder='ค้นหาชื่อพนักงาน...' value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
                    </div>
                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead><tr className='fw-bold text-muted text-uppercase fs-7'><th>พนักงาน</th><th>สถานะ</th><th className='text-end'>เลือก</th></tr></thead>
                            <tbody>
                                {empLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>
                                ) : filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                                    const assignedEntry = activeAssignments.find(a => a.employee_id === emp.employee_id);
                                    const isAssigned = !!assignedEntry;
                                    return (
                                        <tr key={emp.employee_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-45px me-5'><span className='symbol-label bg-light-primary text-primary fw-bold'>{emp.employee_first_name?.charAt(0)}</span></div>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-gray-900 fw-bold fs-6'>{emp.employee_first_name} {emp.employee_last_name}</span>
                                                        <span className='text-muted fw-semibold fs-7'>ID: {emp.employee_id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${emp.status === 'ACTIVE' ? 'badge-light-success' : 'badge-light-danger'} fw-bold`}>{emp.status}</span></td>
                                            <td className='text-end'>
                                                {isAssigned ? (
                                                    <button
                                                        className='btn btn-sm btn-light-danger fw-bold'
                                                        onClick={() => handleUnassignEmployee(emp.employee_id)}
                                                    >
                                                        <i className='bi bi-x me-1'></i>นำออก
                                                    </button>
                                                ) : (
                                                    <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleAssignEmployee(emp)}>
                                                        <i className='bi bi-plus me-1'></i>เพิ่ม
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className='text-center py-10'>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Manage Machine Modal (+ button) */}
            <Modal show={showAssignMachineModal} onHide={() => { setShowAssignMachineModal(false); setMachineSearch(''); }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>
                        <i className='bi bi-gear me-2 text-primary'></i>จัดการเครื่องจักร
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative mb-4'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input type='text' className='form-control form-control-lg w-100 ps-13' placeholder='ค้นหาชื่อเครื่องจักร...' value={machineSearch} onChange={e => setMachineSearch(e.target.value)} />
                    </div>
                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead><tr className='fw-bold text-muted text-uppercase fs-7'><th>เครื่องจักร</th><th>สถานะ</th><th className='text-end'>เลือก</th></tr></thead>
                            <tbody>
                                {machineLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>
                                ) : filteredMachines.length > 0 ? filteredMachines.map(m => {
                                    const isAssigned = activeMachines.some(am => am.machine_id === m.machine_id);
                                    return (
                                        <tr key={m.machine_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-45px me-5'><span className='symbol-label bg-light-info text-info fw-bold'><i className='bi bi-gear-fill'></i></span></div>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-gray-900 fw-bold fs-6'>{m.machine_name}</span>
                                                        <span className='text-muted fw-semibold fs-7'>{m.machine_code}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${m.status === 'IDLE' ? 'badge-light-success' : m.status === 'RUNNING' ? 'badge-light-warning' : 'badge-light-danger'} fw-bold`}>{m.status}</span></td>
                                            <td className='text-end'>
                                                {isAssigned ? (
                                                    <button
                                                        className='btn btn-sm btn-light-danger fw-bold'
                                                        onClick={() => handleUnassignMachine(m.machine_id)}
                                                    >
                                                        <i className='bi bi-x me-1'></i>นำออก
                                                    </button>
                                                ) : (
                                                    <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleAssignMachine(m)}>
                                                        <i className='bi bi-plus me-1'></i>เพิ่ม
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className='text-center py-10'>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Start Work Run Modal */}
            <Modal show={showStartModal} onHide={closeStartModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>เริ่ม Work Run</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Allocation mode toggle */}
                    <div className='mb-6'>
                        <label className='form-label fw-bold fs-6'>รูปแบบการจัดสรรวัตถุดิบ</label>
                        <div className='d-flex gap-3'>
                            <label className={`d-flex align-items-center border rounded px-4 py-3 cursor-pointer flex-grow-1 ${allocationMode === 'auto' ? 'border-primary bg-light-primary' : 'border-gray-300'}`}>
                                <input
                                    type='radio'
                                    className='form-check-input me-3'
                                    name='allocation_mode'
                                    checked={allocationMode === 'auto'}
                                    onChange={() => setAllocationMode('auto')}
                                />
                                <div>
                                    <span className='fw-bold text-gray-800 d-block'>อัตโนมัติ</span>
                                    <span className='text-muted fs-8'>ระบบจัดสรรวัตถุดิบให้อัตโนมัติ</span>
                                </div>
                            </label>
                            <label className={`d-flex align-items-center border rounded px-4 py-3 cursor-pointer flex-grow-1 ${allocationMode === 'manual' ? 'border-primary bg-light-primary' : 'border-gray-300'}`}>
                                <input
                                    type='radio'
                                    className='form-check-input me-3'
                                    name='allocation_mode'
                                    checked={allocationMode === 'manual'}
                                    onChange={() => setAllocationMode('manual')}
                                />
                                <div>
                                    <span className='fw-bold text-gray-800 d-block'>เลือกเอง</span>
                                    <span className='text-muted fs-8'>เลือกรายการวัตถุดิบจาก Picking Request</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Manual allocation UI */}
                    {allocationMode === 'manual' && (
                        <div>
                            {pickRequestsLoading ? (
                                <div className='text-center text-muted py-10'>กำลังโหลดรายการ Picking...</div>
                            ) : (workRun?.required_items ?? []).length === 0 ? (
                                <div className='text-center text-muted py-6 border border-dashed border-gray-300 rounded'>
                                    ยังไม่มีรายการวัตถุดิบที่ต้องใช้
                                </div>
                            ) : (
                                (workRun?.required_items ?? []).map(reqItem => {
                                    const availableItems = getPickItemsForRequired(reqItem);
                                    const allocMap = manualAllocations[reqItem.id] ?? {};
                                    const totalAllocated = Object.values(allocMap).reduce((sum, v) => sum + (Number(v) || 0), 0);

                                    return (
                                        <div key={reqItem.id} className='mb-6 border border-gray-200 rounded p-4'>
                                            <div className='d-flex justify-content-between align-items-center mb-3'>
                                                <div>
                                                    <span className='fw-bold text-gray-800 fs-6'>{reqItem.item_name}</span>
                                                    <span className='text-muted fs-8 ms-2'>({reqItem.item_code})</span>
                                                </div>
                                                <div className='text-end'>
                                                    <span className='text-muted fs-8'>ต้องใช้: </span>
                                                    <span className='fw-bold text-gray-700'>{reqItem.quantity}</span>
                                                    <span className='text-muted fs-8'> {reqItem.unit}</span>
                                                    <span className='mx-2 text-muted'>|</span>
                                                    <span className='text-muted fs-8'>จัดสรรแล้ว: </span>
                                                    <span className={`fw-bold ${totalAllocated >= reqItem.quantity ? 'text-success' : 'text-warning'}`}>
                                                        {totalAllocated}
                                                    </span>
                                                </div>
                                            </div>

                                            {availableItems.length === 0 ? (
                                                <div className='text-muted fs-7 py-3 text-center bg-light rounded'>
                                                    ไม่พบรายการ Picking ที่มีวัตถุดิบนี้
                                                </div>
                                            ) : (
                                                <div className='table-responsive'>
                                                    <table className='table table-row-dashed align-middle gs-0 gy-2 mb-0'>
                                                        <thead>
                                                            <tr className='fw-bold text-muted text-uppercase fs-8'>
                                                                <th>Picking Request</th>
                                                                <th>รหัสสินค้า</th>
                                                                <th className='text-center'>คงเหลือ</th>
                                                                <th className='text-center' style={{ width: 140 }}>จำนวนที่จัดสรร</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {availableItems.map(pi => (
                                                                <tr key={pi.picking_request_item_id}>
                                                                    <td>
                                                                        <span className='fw-semibold text-gray-700 fs-7'>{pi.picking_request_code}</span>
                                                                    </td>
                                                                    <td>
                                                                        <span className='text-muted fs-7'>{pi.item_code}</span>
                                                                    </td>
                                                                    <td className='text-center'>
                                                                        <span className='fw-semibold text-gray-700 fs-7'>{pi.qty_available} {pi.unit}</span>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type='text'
                                                                            className='form-control form-control-sm text-center'
                                                                            placeholder='0'
                                                                            value={allocMap[pi.picking_request_item_id] ?? ''}
                                                                            onChange={e => handleManualQtyChange(reqItem.id, pi.picking_request_item_id, e.target.value)}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={closeStartModal}>ยกเลิก</button>
                    <button className='btn btn-primary fw-bold' onClick={handleStart}>
                        <i className='bi bi-play-fill me-1'></i> เริ่มงาน
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Complete Work Run Modal */}
            <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} centered>
                <Modal.Header closeButton><Modal.Title className='fw-bold'>ปิด Work Run</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>จำนวนที่ใช้งานได้</label>
                        <input
                            type='text'
                            className='form-control form-control-lg'
                            value={completeForm.usable_qty === 0 ? '' : String(completeForm.usable_qty)}
                            onChange={e => {
                                const s = formatIntegerInput(e.target.value);
                                setCompleteForm(prev => ({ ...prev, usable_qty: s === '' ? 0 : Number(s) }));
                            }}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>จำนวนของเสีย</label>
                        <input
                            type='text'
                            className='form-control form-control-lg'
                            value={completeForm.defect_qty === 0 ? '' : String(completeForm.defect_qty)}
                            onChange={e => {
                                const s = formatIntegerInput(e.target.value);
                                setCompleteForm(prev => ({ ...prev, defect_qty: s === '' ? 0 : Number(s) }));
                            }}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>หมายเหตุ (ไม่บังคับ)</label>
                        <textarea
                            className='form-control form-control-lg'
                            rows={3}
                            value={completeForm.completion_remark}
                            onChange={e => setCompleteForm(prev => ({ ...prev, completion_remark: e.target.value }))}
                        />
                    </div>
                    {(workRun?.required_items ?? []).length > 0 && (
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>
                                <i className='bi bi-box-seam me-2 text-primary'></i>จำนวนวัตถุดิบที่ใช้จริง
                            </label>
                            <div className='table-responsive'>
                                <table className='table table-bordered align-middle fs-7 mb-0'>
                                    <thead className='table-light'>
                                        <tr className='fw-bold text-gray-700'>
                                            <th>รหัสสินค้า</th>
                                            <th>ชื่อวัตถุดิบ</th>
                                            <th className='w-80px text-center'>หน่วย</th>
                                            <th className='w-110px text-center'>ต้องใช้</th>
                                            <th className='w-130px'>ใช้จริง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(workRun?.required_items ?? []).map(item => (
                                            <tr key={item.id}>
                                                <td className='text-muted fw-semibold'>{item.item_code}</td>
                                                <td className='fw-bold text-gray-800'>{item.item_name}</td>
                                                <td className='text-center text-muted'>{item.unit}</td>
                                                <td className='text-center fw-semibold text-gray-700'>{item.quantity}</td>
                                                <td>
                                                    <input
                                                        type='text'
                                                        className='form-control form-control-sm text-center'
                                                        placeholder='0'
                                                        value={materialActuals[item.id] ?? ''}
                                                        onChange={e => {
                                                            const s = formatIntegerInput(e.target.value);
                                                            setMaterialActuals(prev => ({ ...prev, [item.id]: s }));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowCompleteModal(false)}>ยกเลิก</button>
                    <button className='btn btn-success fw-bold' onClick={handleCompleteWorkRun}>
                        <i className='bi bi-check-circle me-1'></i> ยืนยันปิด Work Run
                    </button>
                </Modal.Footer>
            </Modal>
        </Content>
    );
};

export default WorkRunDetail;
