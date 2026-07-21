import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getEmployeeList } from '../../../services/employee';
import { getMachineList } from '../../../services/machineService';
import {
    getWorkRunById,
    assignEmployee,
    unassignEmployee,
    assignMachine,
    unassignMachine,
} from '../../../services/workRunService';
import type { WorkRunDetail as WorkRunDetailType, WorkRunBreak } from '../../../type_interface/WorkOrderType';
import type { Machine } from '../../../type_interface/MachineType';
import './WorkorderView.css';
import './ProductionConsole.css';

interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
    is_active?: boolean;
    photo_url?: string | null;
}

// --- Timeline & status helpers (same conventions as WorkRunDetail) ---
const getRunStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return '#0d6efd'; case 'COMPLETED': return '#198754';
        case 'PAUSED': return '#fd7e14'; case 'PENDING': return '#6c757d';
        default: return '#adb5bd';
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

// หั่นช่วงเวลาทำงานออกเป็นก้อนย่อยรอบช่วงพัก (logic เดียวกับ WorkRunDetail)
const splitByBreaks = (startMs: number, endMs: number, breaks: WorkRunBreak[]) => {
    let intervals = [{ s: startMs, e: endMs }];
    breaks.forEach(brk => {
        const bS = new Date(brk.break_start).getTime();
        const bE = brk.break_end ? new Date(brk.break_end).getTime() : Date.now();
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
    return intervals;
};

// นาฬิกาปัจจุบัน — แยก component เพื่อไม่ให้ทั้งหน้า re-render ทุกวินาที
const LiveClock: React.FC = () => {
    const [t, setT] = useState(new Date());
    useEffect(() => {
        const iv = setInterval(() => setT(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);
    return (
        <div className="pc-clock">
            <span className="pc-clock-time">{t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="pc-clock-date">{t.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
    );
};

const RunLiveTimer: React.FC<{ workRun: WorkRunDetailType | null }> = ({ workRun }) => {
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
    return <span className="pc-timer">{elapsed}</span>;
};

const ProductionConsole: React.FC = () => {
    const navigate = useNavigate();
    const { workRunId } = useParams<{ workRunId: string }>();

    const [workRun, setWorkRun] = useState<WorkRunDetailType | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [empSearch, setEmpSearch] = useState('');
    const [machineSearch, setMachineSearch] = useState('');
    const [busyKey, setBusyKey] = useState<string | null>(null);

    // Timeline state
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [autoZoom, setAutoZoom] = useState(true);

    const fetchWorkRun = useCallback(async () => {
        try {
            const result = await getWorkRunById(Number(workRunId));
            if (result?.success && result.data) {
                setWorkRun(result.data);
            }
        } catch { /* silent — poll will retry */ }
        finally { setInitialLoading(false); }
    }, [workRunId]);

    useEffect(() => { fetchWorkRun(); }, [fetchWorkRun]);

    // Poll ทุก 15 วิ ให้หน้าจอหน้างานอัปเดตเองโดยไม่ต้องกดรีเฟรช
    useEffect(() => {
        const iv = setInterval(fetchWorkRun, 15000);
        return () => clearInterval(iv);
    }, [fetchWorkRun]);

    // tick สำหรับให้แท่ง timeline ของงานที่ยังไม่จบยืดตามเวลาจริง
    useEffect(() => {
        const iv = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        getEmployeeList(1, 200, '').then(res => {
            setAllEmployees(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
        }).catch(() => setAllEmployees([]));
        getMachineList(1, 200, '', '', 'all').then(res => {
            setAllMachines(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
        }).catch(() => setAllMachines([]));
    }, []);

    // เด้งไปวันที่งานจบ กรณีเปิดดูงานเก่าที่จบไปแล้ว
    useEffect(() => {
        if (workRun?.end_date) {
            const endDate = new Date(workRun.end_date);
            const today = new Date();
            if (endDate.toDateString() !== today.toDateString() && endDate < today) {
                setSelectedDate(endDate);
            }
        }
    }, [workRun]);

    const status = workRun?.status?.toUpperCase() ?? '';
    const isActive = status === 'INPROGRESS' || status === 'PAUSED';

    const activeEmpMap = useMemo(() => {
        const m = new Map<number, { from_time: string }>();
        workRun?.assignments?.forEach(a => { if (a.to_time === null) m.set(a.employee_id, { from_time: a.from_time }); });
        return m;
    }, [workRun]);

    const activeMachMap = useMemo(() => {
        const m = new Map<number, { from_time: string }>();
        workRun?.machines?.forEach(mc => { if (mc.to_time === null) m.set(mc.machine_id, { from_time: mc.from_time }); });
        return m;
    }, [workRun]);

    const employeeCards = useMemo(() => {
        const q = empSearch.toLowerCase();
        return allEmployees
            .filter(emp => {
                if (!q) return true;
                const fullName = `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase();
                return fullName.includes(q) || String(emp.employee_id).includes(q);
            })
            .sort((a, b) => {
                const ai = activeEmpMap.has(a.employee_id) ? 0 : (a.is_active === false ? 2 : 1);
                const bi = activeEmpMap.has(b.employee_id) ? 0 : (b.is_active === false ? 2 : 1);
                if (ai !== bi) return ai - bi;
                return `${a.employee_first_name} ${a.employee_last_name}`.localeCompare(`${b.employee_first_name} ${b.employee_last_name}`, 'th');
            });
    }, [allEmployees, empSearch, activeEmpMap]);

    const machineCards = useMemo(() => {
        const q = machineSearch.toLowerCase();
        return allMachines
            .filter(m => !q || m.machine_name.toLowerCase().includes(q) || m.machine_code.toLowerCase().includes(q))
            .sort((a, b) => {
                const ai = activeMachMap.has(a.machine_id) ? 0 : (a.is_active === false ? 2 : 1);
                const bi = activeMachMap.has(b.machine_id) ? 0 : (b.is_active === false ? 2 : 1);
                if (ai !== bi) return ai - bi;
                return a.machine_name.localeCompare(b.machine_name, 'th');
            });
    }, [allMachines, machineSearch, activeMachMap]);

    // --- Toggle handlers (แตะการ์ด = เข้า/ออกงาน) ---
    const toastOk = (title: string) =>
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title, timer: 1800, showConfirmButton: false });

    const showError = (msg?: string) =>
        Swal.fire('เกิดข้อผิดพลาด', msg || 'ไม่สามารถดำเนินการได้', 'error');

    const toggleEmployee = async (emp: Employee) => {
        if (!isActive || busyKey) return;
        const name = `${emp.employee_first_name} ${emp.employee_last_name}`.trim();
        const isIn = activeEmpMap.has(emp.employee_id);
        if (emp.is_active === false && !isIn) return; // ปิดใช้งาน = เข้างานไม่ได้ (แต่ยังนำออกได้)
        if (isIn) {
            const c = await Swal.fire({
                title: 'ออกจากงาน?', text: name, icon: 'question',
                showCancelButton: true, confirmButtonText: 'ออกจากงาน', cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#f1416c',
            });
            if (!c.isConfirmed) return;
        }
        setBusyKey(`emp-${emp.employee_id}`);
        try {
            const res = isIn
                ? await unassignEmployee(Number(workRunId), emp.employee_id)
                : await assignEmployee(Number(workRunId), emp.employee_id);
            if (res?.success) {
                toastOk(isIn ? `${name} ออกจากงานแล้ว` : `${name} เข้างานแล้ว`);
                await fetchWorkRun();
            } else {
                showError(res?.message);
            }
        } catch { showError('ไม่สามารถเชื่อมต่อ API ได้'); }
        finally { setBusyKey(null); }
    };

    const toggleMachine = async (machine: Machine) => {
        if (!isActive || busyKey) return;
        const isIn = activeMachMap.has(machine.machine_id);
        if (machine.is_active === false && !isIn) return; // ปิดใช้งาน = เลือกไม่ได้ (แต่ยังหยุดใช้ได้)
        if (isIn) {
            const c = await Swal.fire({
                title: 'หยุดใช้เครื่องจักร?', text: machine.machine_name, icon: 'question',
                showCancelButton: true, confirmButtonText: 'หยุดใช้งาน', cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#f1416c',
            });
            if (!c.isConfirmed) return;
        }
        setBusyKey(`mach-${machine.machine_id}`);
        try {
            const res = isIn
                ? await unassignMachine(Number(workRunId), machine.machine_id)
                : await assignMachine(Number(workRunId), machine.machine_id);
            if (res?.success) {
                toastOk(isIn ? `หยุดใช้ ${machine.machine_name} แล้ว` : `เริ่มใช้ ${machine.machine_name} แล้ว`);
                await fetchWorkRun();
            } else {
                showError(res?.message);
            }
        } catch { showError('ไม่สามารถเชื่อมต่อ API ได้'); }
        finally { setBusyKey(null); }
    };

    // --- Timeline computation (ถอดแบบจาก WorkRunDetail) ---
    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    const handleToday = useCallback(() => setSelectedDate(new Date()), []);

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
        workRun.assignments?.forEach(a => {
            times.push(new Date(a.from_time).getTime());
            times.push(a.to_time ? new Date(a.to_time).getTime() : Date.now());
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

    const runBars = useMemo(() => {
        if (!workRun?.start_date) return [];
        const { start, end } = timelineBounds;
        const rS = new Date(workRun.start_date).getTime();
        const rE = workRun.end_date ? new Date(workRun.end_date).getTime() : Date.now();
        return splitByBreaks(rS, rE, workRun.breaks || [])
            .map((iv, idx) => {
                if (iv.e <= start.getTime() || iv.s >= end.getTime()) return null;
                const l = timeToPercent(new Date(Math.max(iv.s, start.getTime())), start, end);
                const r = timeToPercent(new Date(Math.min(iv.e, end.getTime())), start, end);
                if (r <= l) return null;
                return { id: `run-bar-${idx}`, leftPercent: l, widthPercent: r - l };
            })
            .filter((b): b is { id: string; leftPercent: number; widthPercent: number } => b !== null);
    }, [workRun, timelineBounds, now]);

    type TimelineRow = { key: number; name: string; icon: string; color: string; bars: { id: string; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string }[] };

    const buildRows = useCallback((
        entries: { key: number; name: string; from_time: string; to_time: string | null; entryId: number }[],
        color: string, icon: string,
    ): TimelineRow[] => {
        if (!workRun) return [];
        const { start, end } = timelineBounds;
        const breaks = workRun.breaks || [];
        const grouped = new Map<number, TimelineRow>();
        entries.forEach(en => {
            const eS = new Date(en.from_time).getTime();
            const eE = en.to_time ? new Date(en.to_time).getTime() : Date.now();
            if (!grouped.has(en.key)) grouped.set(en.key, { key: en.key, name: en.name, icon, color, bars: [] });
            splitByBreaks(eS, eE, breaks).forEach((iv, idx) => {
                if (iv.e < start.getTime() || iv.s > end.getTime()) return;
                const l = timeToPercent(new Date(Math.max(iv.s, start.getTime())), start, end);
                const r = timeToPercent(new Date(Math.min(iv.e, end.getTime())), start, end);
                grouped.get(en.key)!.bars.push({
                    id: `${en.entryId}-${idx}`,
                    leftPercent: l,
                    widthPercent: Math.max(0.5, r - l),
                    isActive: en.to_time === null && iv.e >= Date.now() - 2000,
                    from_time: new Date(iv.s).toISOString(),
                    to_time: en.to_time && iv.e === eE ? en.to_time : new Date(iv.e).toISOString(),
                });
            });
        });
        return Array.from(grouped.values());
    }, [workRun, timelineBounds]);

    const employeeRows = useMemo(() => buildRows(
        (workRun?.assignments ?? []).map(a => ({
            key: a.employee_id,
            name: `${a.employee?.employee_first_name ?? ''} ${a.employee?.employee_last_name ?? ''}`.trim() || `Emp #${a.employee_id}`,
            from_time: a.from_time, to_time: a.to_time, entryId: a.work_run_assignment_id,
        })), '#50cd89', 'bi-person-fill',
    ), [buildRows, workRun, now]);

    const machineRows = useMemo(() => buildRows(
        (workRun?.machines ?? []).map(m => ({
            key: m.machine_id,
            name: m.machine?.machine_name || `Machine #${m.machine_id}`,
            from_time: m.from_time, to_time: m.to_time, entryId: m.work_run_machine_id,
        })), '#17a2b8', 'bi-gear-fill',
    ), [buildRows, workRun, now]);

    // เส้นเวลาปัจจุบันบน timeline (แสดงเฉพาะเมื่อ "ตอนนี้" อยู่ในช่วงที่มองอยู่)
    const nowPercent = useMemo(() => {
        const t = now.getTime();
        if (t < timelineBounds.start.getTime() || t > timelineBounds.end.getTime()) return null;
        return timeToPercent(now, timelineBounds.start, timelineBounds.end);
    }, [now, timelineBounds]);

    const activeEmpCount = activeEmpMap.size;
    const activeMachCount = activeMachMap.size;

    return (
        <div className="pc-root">
            {/* Top bar */}
            <header className="pc-topbar">
                <div className="d-flex align-items-center gap-3">
                    <button onClick={() => navigate(-1)} className="btn btn-icon btn-light pc-back-btn" title="กลับ">
                        <i className="bi bi-chevron-left fs-2"></i>
                    </button>
                    <div className="d-flex flex-column">
                        <span className="pc-title">
                            {workRun?.lot_number || `Work Run #${workRun?.work_run_id || workRunId}`}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                            {workRun && (
                                <span className="pc-status-badge" style={{ color: getRunStatusColor(workRun.status), borderColor: getRunStatusColor(workRun.status) }}>
                                    {status === 'INPROGRESS' && <span className="wo-live-dot me-1" />}
                                    {getRunStatusLabel(workRun.status)}
                                </span>
                            )}
                            {workRun && <span className="pc-sub-info">จำนวน {workRun.quantity}</span>}
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-4">
                    <div className="pc-timer-block">
                        <span className="pc-timer-label">เวลาทำงานสะสม</span>
                        <RunLiveTimer workRun={workRun} />
                    </div>
                    <LiveClock />
                </div>
            </header>

            {initialLoading ? (
                <div className="pc-loading">
                    <div className="spinner-border text-primary" role="status" />
                    <span className="text-muted mt-3">กำลังโหลดข้อมูล...</span>
                </div>
            ) : (
                <>
                    {!isActive && (
                        <div className="pc-banner">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            Work Run ยังไม่อยู่ในสถานะทำงาน ({getRunStatusLabel(workRun?.status ?? '')}) — ไม่สามารถบันทึกเข้า-ออกงานได้
                        </div>
                    )}

                    <main className="pc-body">
                        {/* Employees */}
                        <section className="pc-panel">
                            <div className="pc-panel-header">
                                <div className="pc-panel-title">
                                    <i className="bi bi-people-fill" style={{ color: '#50cd89' }}></i>
                                    พนักงาน
                                    <span className="pc-count-badge" style={{ background: '#e8fff3', color: '#198754' }}>
                                        เข้างาน {activeEmpCount}
                                    </span>
                                </div>
                                <input
                                    className="form-control pc-search"
                                    placeholder="ค้นหาพนักงาน..."
                                    value={empSearch}
                                    onChange={e => setEmpSearch(e.target.value)}
                                />
                            </div>
                            <div className="pc-grid">
                                {employeeCards.length === 0 && <div className="pc-empty">ไม่พบพนักงาน</div>}
                                {employeeCards.map(emp => {
                                    const isIn = activeEmpMap.has(emp.employee_id);
                                    const busy = busyKey === `emp-${emp.employee_id}`;
                                    const isDisabledEntity = emp.is_active === false;
                                    const name = `${emp.employee_first_name} ${emp.employee_last_name}`.trim();
                                    return (
                                        <button
                                            key={emp.employee_id}
                                            className={`pc-card ${isIn ? 'pc-card-in' : ''} ${isDisabledEntity ? 'pc-card-disabled' : ''}`}
                                            disabled={!isActive || busy || (isDisabledEntity && !isIn)}
                                            onClick={() => toggleEmployee(emp)}
                                        >
                                            <div className={`pc-avatar ${isIn ? 'pc-avatar-in' : ''}`}>
                                                {busy
                                                    ? <span className="spinner-border spinner-border-sm" />
                                                    : (emp.photo_url
                                                        ? <img src={emp.photo_url} alt={name} className="pc-avatar-img" />
                                                        : (emp.employee_first_name?.charAt(0) ?? '?'))}
                                                {isIn && !busy && <span className="pc-avatar-dot" />}
                                            </div>
                                            <span className="pc-card-name" title={name}>{name}</span>
                                            <span className={`pc-card-state ${isIn ? 'pc-state-in' : ''}`}>
                                                {isDisabledEntity && !isIn
                                                    ? 'ปิดใช้งาน'
                                                    : isIn
                                                        ? `เข้างาน ${formatTimeTL(activeEmpMap.get(emp.employee_id)!.from_time)}`
                                                        : (isActive ? 'แตะเพื่อเข้างาน' : 'ยังไม่เข้างาน')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Machines */}
                        <section className="pc-panel">
                            <div className="pc-panel-header">
                                <div className="pc-panel-title">
                                    <i className="bi bi-gear-fill" style={{ color: '#17a2b8' }}></i>
                                    เครื่องจักร
                                    <span className="pc-count-badge" style={{ background: '#e1f5fe', color: '#0288d1' }}>
                                        ใช้งาน {activeMachCount}
                                    </span>
                                </div>
                                <input
                                    className="form-control pc-search"
                                    placeholder="ค้นหาเครื่องจักร..."
                                    value={machineSearch}
                                    onChange={e => setMachineSearch(e.target.value)}
                                />
                            </div>
                            <div className="pc-grid">
                                {machineCards.length === 0 && <div className="pc-empty">ไม่พบเครื่องจักร</div>}
                                {machineCards.map(machine => {
                                    const isIn = activeMachMap.has(machine.machine_id);
                                    const busy = busyKey === `mach-${machine.machine_id}`;
                                    const isDisabledEntity = machine.is_active === false;
                                    return (
                                        <button
                                            key={machine.machine_id}
                                            className={`pc-card ${isIn ? 'pc-card-in pc-card-machine-in' : ''} ${isDisabledEntity ? 'pc-card-disabled' : ''}`}
                                            disabled={!isActive || busy || (isDisabledEntity && !isIn)}
                                            onClick={() => toggleMachine(machine)}
                                        >
                                            <div className={`pc-avatar pc-avatar-machine ${isIn ? 'pc-avatar-machine-in' : ''}`}>
                                                {busy
                                                    ? <span className="spinner-border spinner-border-sm" />
                                                    : (machine.photo_url
                                                        ? <img src={machine.photo_url} alt={machine.machine_name} className="pc-avatar-img" />
                                                        : <i className="bi bi-gear-fill"></i>)}
                                                {isIn && !busy && <span className="pc-avatar-dot pc-avatar-dot-machine" />}
                                            </div>
                                            <span className="pc-card-name" title={machine.machine_name}>{machine.machine_name}</span>
                                            <span className="pc-card-code">{machine.machine_code}</span>
                                            <span className={`pc-card-state ${isIn ? 'pc-state-in-machine' : ''}`}>
                                                {isDisabledEntity && !isIn
                                                    ? 'ปิดใช้งาน'
                                                    : isIn
                                                        ? `เริ่มใช้ ${formatTimeTL(activeMachMap.get(machine.machine_id)!.from_time)}`
                                                        : (isActive ? 'แตะเพื่อเริ่มใช้' : 'ยังไม่ใช้งาน')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </main>

                    {/* Timeline */}
                    <section className="pc-timeline-section">
                        <div className="wo-card">
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
                                    <div className="wo-timeline-container" style={{ position: 'relative' }}>
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
                                                    {runBars.length > 0 ? runBars.map(bar => (
                                                        <div
                                                            key={bar.id}
                                                            className="wo-timeline-bar"
                                                            style={{ backgroundColor: getRunStatusColor(workRun.status), left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                                                        >
                                                            {bar.widthPercent >= 8 && <span className="wo-bar-text">{getRunStatusLabel(workRun.status)}</span>}
                                                        </div>
                                                    )) : (
                                                        <div className="wo-timeline-bar-empty">
                                                            <span className="text-muted" style={{ fontSize: 11 }}>ไม่มีกิจกรรมวันนี้</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Employee rows */}
                                        {employeeRows.length > 0 && <div style={{ borderTop: '1px dashed #e4e6ef', margin: '6px 0 2px' }} />}
                                        {employeeRows.map(row => (
                                            <div key={`emp-${row.key}`} className="wo-timeline-row">
                                                <div className="wo-timeline-label-col">
                                                    <div className="wo-phase-label">
                                                        <span className="wo-phase-dot" style={{ backgroundColor: row.bars.some(b => b.isActive) ? row.color : '#a1a5b7' }} />
                                                        <span className="wo-phase-name" title={row.name}>
                                                            <i className={`bi ${row.icon} me-1`} style={{ fontSize: 10, color: row.color }} />{row.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="wo-timeline-bar-col">
                                                    <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                        {row.bars.map(bar => (
                                                            <div
                                                                key={bar.id}
                                                                className="wo-timeline-bar"
                                                                title={`${formatTimeTL(bar.from_time)} – ${bar.isActive ? 'กำลังทำงาน' : formatTimeTL(bar.to_time)}`}
                                                                style={{ backgroundColor: bar.isActive ? row.color : '#a1a5b7', left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                                                            >
                                                                {bar.widthPercent >= 8 && <span className="wo-bar-text">{bar.isActive ? 'กำลังทำงาน' : 'เสร็จแล้ว'}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Machine rows */}
                                        {machineRows.length > 0 && <div style={{ borderTop: '1px dashed #e4e6ef', margin: '6px 0 2px' }} />}
                                        {machineRows.map(row => (
                                            <div key={`mach-${row.key}`} className="wo-timeline-row">
                                                <div className="wo-timeline-label-col">
                                                    <div className="wo-phase-label">
                                                        <span className="wo-phase-dot" style={{ backgroundColor: row.bars.some(b => b.isActive) ? row.color : '#a1a5b7' }} />
                                                        <span className="wo-phase-name" title={row.name}>
                                                            <i className={`bi ${row.icon} me-1`} style={{ fontSize: 10, color: row.color }} />{row.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="wo-timeline-bar-col">
                                                    <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                        {row.bars.map(bar => (
                                                            <div
                                                                key={bar.id}
                                                                className="wo-timeline-bar"
                                                                title={`${formatTimeTL(bar.from_time)} – ${bar.isActive ? 'กำลังใช้งาน' : formatTimeTL(bar.to_time)}`}
                                                                style={{ backgroundColor: bar.isActive ? row.color : '#a1a5b7', left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
                                                            >
                                                                {bar.widthPercent >= 8 && <span className="wo-bar-text">{bar.isActive ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* เส้นเวลาปัจจุบัน */}
                                        {nowPercent !== null && (
                                            <div className="pc-nowline" style={{ left: `calc(var(--pc-label-w) + (100% - var(--pc-label-w)) * ${(nowPercent / 100).toFixed(4)})` }} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted py-10">
                                        <i className="bi bi-clock-history fs-3x text-gray-300 mb-3 d-block" />
                                        Work Run ยังไม่ได้เริ่มดำเนินการ
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default ProductionConsole;
