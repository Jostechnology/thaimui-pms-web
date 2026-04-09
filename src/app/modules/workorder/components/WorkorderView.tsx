import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getWorkOrderById } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import './WorkorderView.css';
import { type WorkOrder, type WorkRunDetail as WorkRunDetailType, type WorkRunBreak } from '../../../type_interface/WorkOrderType';
import { getWorkRunById } from '../../../services/workRunService';

// --- Helper functions ---
const getRunStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return '#0d6efd';
        case 'COMPLETED': return '#198754';
        case 'PAUSED': return '#fd7e14';
        case 'PENDING': return '#6c757d';
        default: return '#adb5bd';
    }
};

const getRunStatusBg = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return '#e7f1ff';
        case 'COMPLETED': return '#d1e7dd';
        case 'PAUSED': return '#fff3e0';
        case 'PENDING': return '#f8f9fa';
        default: return '#f8f9fa';
    }
};

const getStatusBadgeClass = (status: string) => {
    const k = status?.toUpperCase();
    if (k === 'COMPLETED') return 'wo-badge-success';
    if (k === 'INPROGRESS') return 'wo-badge-primary';
    if (k === 'PENDING') return 'wo-badge-info';
    return 'wo-badge-secondary';
};

const getRunStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return 'กำลังดำเนินการ';
        case 'COMPLETED': return 'เสร็จสิ้น';
        case 'PAUSED': return 'หยุดชั่วคราว';
        case 'PENDING': return 'รอดำเนินการ';
        default: return status;
    }
};

const calcTotalBreakMs = (breaks?: WorkRunBreak[]): number => {
    if (!breaks || breaks.length === 0) return 0;
    return breaks.reduce((total, b) => {
        const start = new Date(b.break_start).getTime();
        const end = b.break_end ? new Date(b.break_end).getTime() : Date.now();
        return total + Math.max(0, end - start);
    }, 0);
};

const formatDurationMs = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
};

const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

// --- Timeline helpers ---
const getFullDayBounds = (date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(24, 0, 0, 0);
    return { dayStart, dayEnd };
};

/** Position a timestamp as a percentage within [boundsStart, boundsEnd]. */
const timeToPercent = (time: Date, boundsStart: Date, boundsEnd: Date): number => {
    const totalMs = boundsEnd.getTime() - boundsStart.getTime();
    if (totalMs === 0) return 0;
    return Math.max(0, Math.min(100, ((time.getTime() - boundsStart.getTime()) / totalMs) * 100));
};

/** Pick a reasonable tick interval (in minutes) for a given visible range (ms). */
const pickIntervalMin = (rangeMs: number): number => {
    const hours = rangeMs / 3600000;
    if (hours <= 0.5)  return 5;
    if (hours <= 1)    return 10;
    if (hours <= 2)    return 15;
    if (hours <= 4)    return 30;
    if (hours <= 8)    return 60;
    if (hours <= 16)   return 120;
    return 180;
};

/** Generate labelled tick marks for a dynamic time range. */
const buildTimelineLabels = (boundsStart: Date, boundsEnd: Date) => {
    const rangeMs = boundsEnd.getTime() - boundsStart.getTime();
    const intervalMs = pickIntervalMin(rangeMs) * 60000;
    const labels: { label: string; percent: number }[] = [];
    // first tick >= boundsStart
    const firstTick = new Date(Math.ceil(boundsStart.getTime() / intervalMs) * intervalMs);
    for (let t = firstTick; t <= boundsEnd; t = new Date(t.getTime() + intervalMs)) {
        const pct = ((t.getTime() - boundsStart.getTime()) / rangeMs) * 100;
        if (pct < 0 || pct > 100) continue;
        labels.push({
            label: t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            percent: pct,
        });
    }
    return labels;
};

// --- Live Timer ---
const WorkRunLiveTimer: React.FC<{ workRun: WorkRunDetailType | null }> = ({ workRun }) => {
    const [elapsed, setElapsed] = useState('00:00:00');

    useEffect(() => {
        if (!workRun?.start_date) { setElapsed('00:00:00'); return; }
        const status = workRun.status?.toUpperCase();
        if (status === 'PENDING') { setElapsed('00:00:00'); return; }

        const startMs = new Date(workRun.start_date).getTime();

        const calc = () => {
            const now = workRun.end_date ? new Date(workRun.end_date).getTime() : Date.now();
            const totalMs = Math.max(0, now - startMs);
            const breakMs = calcTotalBreakMs(workRun.breaks);
            const workMs = Math.max(0, totalMs - breakMs);
            const s = Math.floor(workMs / 1000);
            const h = Math.floor(s / 3600).toString().padStart(2, '0');
            const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
            const sec = (s % 60).toString().padStart(2, '0');
            setElapsed(`${h}:${m}:${sec}`);
        };
        calc();

        if (status === 'INPROGRESS') {
            const interval = setInterval(calc, 1000);
            return () => clearInterval(interval);
        }
    }, [workRun]);

    return <span className="wo-timer-value">{elapsed}</span>;
};

// --- Main Component ---
const WorkorderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [selectedWorkRun, setSelectedWorkRun] = useState<WorkRunDetailType | null>(null);
    const [selectedWorkRunId, setSelectedWorkRunId] = useState<number | null>(null);
    const [workRunLoading, setWorkRunLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [autoZoom, setAutoZoom] = useState(true);

    type ActivePopover =
        | { type: 'run'; centerPct: number }
        | { type: 'machine'; machineId: number; centerPct: number }
        | { type: 'employee'; assignmentId: number; centerPct: number }
        | null;
    const [activePopover, setActivePopover] = useState<ActivePopover>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const fetchWorkRunDetail = async (workRunId: number) => {
        setWorkRunLoading(true);
        try {
            const result = await getWorkRunById(workRunId);
            if (result?.success && result.data) {
                setSelectedWorkRun(result.data);
                if (result.data.start_date) {
                    setSelectedDate(new Date(result.data.start_date));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setWorkRunLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkOrderById(Number(id));
            if (result?.success && result.data) {
                setWorkOrder(result.data);
                const firstRun = result.data.work_runs?.[0];
                if (firstRun) {
                    setSelectedWorkRunId(firstRun.work_run_id);
                    await fetchWorkRunDetail(firstRun.work_run_id);
                }
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลใบสั่งผลิตได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    useEffect(() => {
        if (selectedWorkRunId && !dataLoading) {
            fetchWorkRunDetail(selectedWorkRunId);
        }
    }, [selectedWorkRunId]);

    useEffect(() => {
        if (!activePopover) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setActivePopover(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover]);

    const activeAssignments = useMemo(() => selectedWorkRun?.assignments?.filter(a => a.to_time === null) ?? [], [selectedWorkRun]);
    const allAssignments = useMemo(() => selectedWorkRun?.assignments ?? [], [selectedWorkRun]);
    const activeMachines = useMemo(() => selectedWorkRun?.machines?.filter(m => m.to_time === null) ?? [], [selectedWorkRun]);

    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    const handleToday = useCallback(() => setSelectedDate(new Date()), []);

    // --- Dynamic timeline bounds ---
    const timelineBounds = useMemo(() => {
        const { dayStart, dayEnd } = getFullDayBounds(selectedDate);
        if (!autoZoom || !selectedWorkRun?.start_date) return { start: dayStart, end: dayEnd };

        const times: number[] = [];
        const runStart = new Date(selectedWorkRun.start_date).getTime();
        const runEnd = selectedWorkRun.end_date ? new Date(selectedWorkRun.end_date).getTime() : Date.now();
        times.push(runStart, runEnd);

        selectedWorkRun.machines?.forEach(m => {
            times.push(new Date(m.from_time).getTime());
            times.push(m.to_time ? new Date(m.to_time).getTime() : Date.now());
        });

        // Only consider times on the selected date
        const dayTimes = times.filter(t => t >= dayStart.getTime() && t <= dayEnd.getTime());
        if (dayTimes.length === 0) return { start: dayStart, end: dayEnd };

        const PADDING_MS = 20 * 60 * 1000; // 20 min padding on each side
        const start = new Date(Math.max(dayStart.getTime(), Math.min(...dayTimes) - PADDING_MS));
        const end   = new Date(Math.min(dayEnd.getTime(),   Math.max(...dayTimes) + PADDING_MS));
        return { start, end };
    }, [autoZoom, selectedWorkRun, selectedDate]);

    const timelineLabels = useMemo(
        () => buildTimelineLabels(timelineBounds.start, timelineBounds.end),
        [timelineBounds]
    );

    // --- Bar computations (all use dynamic timelineBounds) ---
    const runBarInfo = useMemo(() => {
        if (!selectedWorkRun?.start_date) return null;
        const runStart = new Date(selectedWorkRun.start_date);
        const runEnd = selectedWorkRun.end_date ? new Date(selectedWorkRun.end_date) : new Date();
        const { start, end } = timelineBounds;
        if (runEnd < start || runStart > end) return null;
        const cs = new Date(Math.max(runStart.getTime(), start.getTime()));
        const ce = new Date(Math.min(runEnd.getTime(), end.getTime()));
        const left  = timeToPercent(cs, start, end);
        const right = timeToPercent(ce, start, end);
        return { leftPercent: left, widthPercent: Math.max(2, right - left) };
    }, [selectedWorkRun, timelineBounds]);

    const breakBars = useMemo(() => {
        if (!selectedWorkRun?.breaks) return [];
        const { start, end } = timelineBounds;
        return (selectedWorkRun.breaks as WorkRunBreak[]).map(b => {
            const bStart = new Date(b.break_start);
            const bEnd = b.break_end ? new Date(b.break_end) : new Date();
            if (bEnd < start || bStart > end) return null;
            const cs = new Date(Math.max(bStart.getTime(), start.getTime()));
            const ce = new Date(Math.min(bEnd.getTime(), end.getTime()));
            return {
                break_id: b.break_id,
                leftPercent: timeToPercent(cs, start, end),
                widthPercent: Math.max(0.5, timeToPercent(ce, start, end) - timeToPercent(cs, start, end)),
                break_type: b.break_type,
            };
        }).filter(Boolean) as { break_id: number; leftPercent: number; widthPercent: number; break_type: string }[];
    }, [selectedWorkRun, timelineBounds]);

    const machineBars = useMemo(() => {
        if (!selectedWorkRun?.machines) return [];
        const { start, end } = timelineBounds;
        return selectedWorkRun.machines.map(m => {
            const mStart = new Date(m.from_time);
            const mEnd = m.to_time ? new Date(m.to_time) : new Date();
            if (mEnd < start || mStart > end) return null;
            const cs = new Date(Math.max(mStart.getTime(), start.getTime()));
            const ce = new Date(Math.min(mEnd.getTime(), end.getTime()));
            const left  = timeToPercent(cs, start, end);
            const right = timeToPercent(ce, start, end);
            return {
                work_run_machine_id: m.work_run_machine_id,
                machine_id: m.machine_id,
                machine_name: m.machine?.machine_name ?? `Machine #${m.machine_id}`,
                isActive: m.to_time === null,
                leftPercent: left,
                widthPercent: Math.max(2, right - left),
            };
        }).filter(Boolean) as { work_run_machine_id: number; machine_id: number; machine_name: string; isActive: boolean; leftPercent: number; widthPercent: number }[];
    }, [selectedWorkRun, timelineBounds]);

    // Group assignments by employee, compute bar positions per assignment
    const employeeRows = useMemo(() => {
        if (!selectedWorkRun?.assignments) return [];
        const { start, end } = timelineBounds;
        const grouped = new Map<number, {
            employee_id: number;
            name: string;
            initial: string;
            bars: { assignment_id: number; leftPercent: number; widthPercent: number; isActive: boolean; from_time: string; to_time: string | null }[];
        }>();

        selectedWorkRun.assignments.forEach(a => {
            const aStart = new Date(a.from_time);
            const aEnd = a.to_time ? new Date(a.to_time) : new Date();
            if (aEnd < start || aStart > end) return;
            const cs = new Date(Math.max(aStart.getTime(), start.getTime()));
            const ce = new Date(Math.min(aEnd.getTime(), end.getTime()));
            const left = timeToPercent(cs, start, end);
            const right = timeToPercent(ce, start, end);

            if (!grouped.has(a.employee_id)) {
                const firstName = a.employee?.employee_first_name ?? '';
                const lastName = a.employee?.employee_last_name ?? '';
                grouped.set(a.employee_id, {
                    employee_id: a.employee_id,
                    name: `${firstName} ${lastName}`.trim() || `Emp #${a.employee_id}`,
                    initial: firstName.charAt(0) || '?',
                    bars: [],
                });
            }
            grouped.get(a.employee_id)!.bars.push({
                assignment_id: a.work_run_assignment_id,
                leftPercent: left,
                widthPercent: Math.max(2, right - left),
                isActive: a.to_time === null,
                from_time: a.from_time,
                to_time: a.to_time,
            });
        });

        return Array.from(grouped.values());
    }, [selectedWorkRun, timelineBounds]);

    if (dataLoading) {
        return (
            <Content>
                <div className="d-flex flex-center py-20">
                    <span className="spinner-border spinner-border-lg text-primary" />
                    <span className="ms-3 fs-5 text-gray-500">กำลังโหลดข้อมูล...</span>
                </div>
            </Content>
        );
    }

    if (!workOrder) {
        return (
            <Content>
                <div className="d-flex flex-column flex-center py-20">
                    <i className="bi bi-exclamation-triangle fs-3x text-warning mb-4" />
                    <span className="text-gray-600 fs-5">ไม่พบข้อมูลใบสั่งผลิต</span>
                    <button className="btn btn-primary mt-5" onClick={() => navigate('/workorder/workorders_list')}>
                        กลับหน้ารายการ
                    </button>
                </div>
            </Content>
        );
    }

    return (
        <Content>
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-8">
                <div>
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <button className="btn btn-sm btn-icon btn-light" onClick={() => navigate('/workorder/workorders_list')}>
                            <i className="bi bi-arrow-left fs-4" />
                        </button>
                        <h1 className="fw-bolder text-gray-900 fs-2qx mb-0">การผลิต #{workOrder.doc_num}</h1>
                    </div>
                    <p className="text-muted fs-6 ms-11">
                        {workOrder.sales_item
                            ? `สินค้า: ${workOrder.sales_item.item_name}${workOrder.sales_item.item_group ? ` [${workOrder.sales_item.item_group}]` : ''} • ${workOrder.sales_item.item_description ?? "ไม่มีรายละเอียด"}`
                            : "ไม่พบข้อมูลสินค้า"}
                    </p>
                    <p className="text-muted fs-6 ms-11">{`ใบสั่งผลิต: ${workOrder.work_order_code}`}</p>
                </div>
                <div className="d-flex gap-3 mt-3 mt-md-0">
                    <span className={`wo-status-badge ${getStatusBadgeClass(workOrder.status)}`}>{workOrder.status}</span>
                    <button className="btn btn-light-primary fw-bold px-5" onClick={() => navigate(`/workorder/workorders_detail/${workOrder.work_order_id}`)}>
                        <i className="bi bi-pencil-square me-2" /> จัดการ Work Run
                    </button>
                </div>
            </div>

            {/* Work Run Selector */}
            {workOrder.work_runs && workOrder.work_runs.length > 0 && (
                <div className="d-flex align-items-center gap-3 mb-8 flex-wrap">
                    <span className="text-muted fw-semibold fs-7">Work Run:</span>
                    {workOrder.work_runs.map(run => (
                        <div key={run.work_run_id} className="d-flex align-items-center gap-1">
                            <button
                                className={`btn btn-sm fw-bold ${selectedWorkRunId === run.work_run_id ? 'btn-primary' : 'btn-light'}`}
                                onClick={() => setSelectedWorkRunId(run.work_run_id)}
                            >
                                {run.lot_number || `#${run.work_run_id}`}
                                <span className={`ms-2 badge badge-sm ${run.status === 'COMPLETED' ? 'badge-light-success' : run.status === 'INPROGRESS' ? 'badge-light-warning' : run.status === 'PAUSED' ? 'badge-light-info' : 'badge-light-secondary'}`}>
                                    {getRunStatusLabel(run.status)}
                                </span>
                            </button>
                            <button
                                className="btn btn-sm btn-icon btn-light-primary"
                                title={`ไปหน้า Work Run`}
                                onClick={() => navigate(`/workorder/work_run/${run.work_run_id}`)}
                            >
                                <i className="bi bi-box-arrow-up-right fs-6"></i>
                            </button>
                        </div>
                    ))}
                    {workRunLoading && <span className="spinner-border spinner-border-sm text-primary ms-2" />}
                </div>
            )}

            {/* KPI Cards */}
            <div className="row g-5 mb-8">
                {/* Live Timer */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">ระยะเวลาดำเนินการ (LIVE)</span>
                            {selectedWorkRun?.status?.toUpperCase() === 'INPROGRESS' && <span className="wo-live-dot" />}
                            {selectedWorkRun?.status?.toUpperCase() === 'PAUSED' && <span className="wo-live-dot" style={{ background: '#fd7e14' }} />}
                        </div>
                        <WorkRunLiveTimer workRun={selectedWorkRun} />
                        <div className="wo-kpi-sub mt-2">
                            <small className="text-muted">เริ่ม: {formatDateTime(selectedWorkRun?.start_date ?? null)}</small>
                            {selectedWorkRun?.status?.toUpperCase() === 'PAUSED' && (
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
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="wo-kpi-big">{activeAssignments.length}</span>
                            <span className="text-muted fs-6">/ {allAssignments.length} คน</span>
                        </div>
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
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="wo-kpi-big">{activeMachines.length}</span>
                            <span className="text-muted fs-6">/ {selectedWorkRun?.machines?.length ?? 0} เครื่อง</span>
                        </div>
                        <div className="wo-progress-bar mt-3">
                            <div className="wo-progress-fill wo-progress-blue" style={{ width: `${selectedWorkRun?.status?.toUpperCase() === 'COMPLETED' ? 100 : activeMachines.length > 0 ? 60 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Workforce + Timeline */}
            <div className="row g-5 mb-8">
                {/* Workforce */}
                <div className="col-lg-4">
                    <div className="wo-card h-100">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">การจัดการแรงงาน</h3>
                            <span className="badge badge-light-primary">{activeAssignments.length} คน</span>
                        </div>
                        <div className="wo-card-body">
                            {activeAssignments.length > 0 ? (
                                <div className="wo-employee-list">
                                    {activeAssignments.map(a => (
                                        <div key={a.work_run_assignment_id} className="wo-employee-item">
                                            <div className="wo-employee-avatar">
                                                {a.employee?.employee_first_name?.charAt(0) ?? '?'}
                                            </div>
                                            <div className="wo-employee-info">
                                                <div className="wo-employee-name">
                                                    {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                </div>
                                                <div className="wo-employee-role">
                                                    เริ่ม {formatTime(a.from_time)}
                                                </div>
                                            </div>
                                            <span className="wo-emp-status wo-emp-active">ACTIVE</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-people fs-3x text-gray-300 mb-3 d-block" />
                                    ยังไม่มีพนักงาน
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
                            {selectedWorkRun?.start_date ? (
                                <div className="wo-timeline-container">
                                    <div className="wo-timeline-header">
                                        <div className="wo-timeline-label-col"></div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-hours" style={{ position: 'relative', height: 20 }}>
                                                {timelineLabels.map(({ label, percent }) => (
                                                    <span
                                                        key={label}
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${percent}%`,
                                                            transform: 'translateX(-50%)',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
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
                                                <span className="wo-phase-dot" style={{ backgroundColor: getRunStatusColor(selectedWorkRun.status) }} />
                                                <span className="wo-phase-name" title={selectedWorkRun.lot_number || `Run #${selectedWorkRun.work_run_id}`}>
                                                    {selectedWorkRun.lot_number || `Run #${selectedWorkRun.work_run_id}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                {runBarInfo ? (
                                                    <>
                                                        <div
                                                            className="wo-timeline-bar"
                                                            style={{
                                                                backgroundColor: getRunStatusColor(selectedWorkRun.status),
                                                                left: `${runBarInfo.leftPercent}%`,
                                                                width: `${runBarInfo.widthPercent}%`,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const centerPct = runBarInfo.leftPercent + runBarInfo.widthPercent / 2;
                                                                setActivePopover(prev => prev?.type === 'run' ? null : { type: 'run', centerPct });
                                                            }}
                                                        >
                                                            {runBarInfo.widthPercent >= 8 && (
                                                                <span className="wo-bar-text">{getRunStatusLabel(selectedWorkRun.status)}</span>
                                                            )}
                                                        </div>
                                                        {/* Break overlays */}
                                                        {breakBars.map(bb => (
                                                            <div
                                                                key={bb.break_id}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0, bottom: 0,
                                                                    left: `${bb.leftPercent}%`,
                                                                    width: `${bb.widthPercent}%`,
                                                                    backgroundColor: '#fd7e14',
                                                                    opacity: 0.75,
                                                                    borderRadius: 3,
                                                                    zIndex: 2,
                                                                }}
                                                                title={`พัก: ${bb.break_type}`}
                                                            />
                                                        ))}
                                                        {/* Run Popover */}
                                                        {activePopover?.type === 'run' && (
                                                            <div
                                                                ref={popoverRef}
                                                                className="wo-timeline-popover"
                                                                style={{
                                                                    left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`,
                                                                    transform: 'translateX(-50%)',
                                                                    '--arrow-left': 'calc(50% - 6px)',
                                                                } as React.CSSProperties}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <div className="wo-timeline-popover-header">
                                                                    <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                        {selectedWorkRun.lot_number || `Run #${selectedWorkRun.work_run_id}`}
                                                                    </span>
                                                                    <span className="wo-emp-status" style={{
                                                                        backgroundColor: getRunStatusBg(selectedWorkRun.status),
                                                                        color: getRunStatusColor(selectedWorkRun.status),
                                                                    }}>
                                                                        {getRunStatusLabel(selectedWorkRun.status)}
                                                                    </span>
                                                                </div>
                                                                {/* Employees */}
                                                                <div className="wo-timeline-popover-list">
                                                                    <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                                        <i className="bi bi-people-fill me-1" />พนักงาน ({activeAssignments.length} คน)
                                                                    </div>
                                                                    {activeAssignments.length === 0 ? (
                                                                        <div className="text-muted" style={{ fontSize: 12 }}>ยังไม่มีพนักงาน</div>
                                                                    ) : (
                                                                        activeAssignments.map(a => (
                                                                            <div key={a.work_run_assignment_id} className="wo-timeline-popover-emp">
                                                                                <div className="wo-popover-avatar">
                                                                                    {a.employee?.employee_first_name?.charAt(0) ?? '?'}
                                                                                </div>
                                                                                <span className="flex-1">
                                                                                    {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                                                </span>
                                                                                <span className="text-muted ms-auto" style={{ fontSize: 11 }}>
                                                                                    {formatTime(a.from_time)}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                                {/* Breaks */}
                                                                {selectedWorkRun.breaks && selectedWorkRun.breaks.length > 0 && (
                                                                    <div className="wo-timeline-popover-footer">
                                                                        <div className="text-muted fw-semibold mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                                            <i className="bi bi-clock-history me-1 text-warning" />
                                                                            พัก {selectedWorkRun.breaks.length} ครั้ง • {formatDurationMs(calcTotalBreakMs(selectedWorkRun.breaks))}
                                                                        </div>
                                                                        {selectedWorkRun.breaks.map((b: WorkRunBreak) => (
                                                                            <div key={b.break_id} style={{ fontSize: 11, color: '#7e8299', paddingBottom: 2 }}>
                                                                                <span className="fw-semibold text-gray-700">{b.break_type}</span>
                                                                                <span className="ms-2">{formatTime(b.break_start)} – {b.break_end ? formatTime(b.break_end) : 'กำลังพัก...'}</span>
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
                                                                <i className="bi bi-person-fill me-1" style={{ fontSize: 10, color: '#50cd89' }} />
                                                                {row.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="wo-timeline-bar-col">
                                                        <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                            {row.bars.map(bar => (
                                                                <React.Fragment key={bar.assignment_id}>
                                                                    <div
                                                                        className="wo-timeline-bar"
                                                                        style={{
                                                                            backgroundColor: bar.isActive ? '#50cd89' : '#a1a5b7',
                                                                            left: `${bar.leftPercent}%`,
                                                                            width: `${bar.widthPercent}%`,
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                            setActivePopover(prev =>
                                                                                prev?.type === 'employee' && prev.assignmentId === bar.assignment_id
                                                                                    ? null
                                                                                    : { type: 'employee', assignmentId: bar.assignment_id, centerPct }
                                                                            );
                                                                        }}
                                                                    >
                                                                        {bar.widthPercent >= 8 && (
                                                                            <span className="wo-bar-text">
                                                                                {bar.isActive ? 'กำลังทำงาน' : 'เสร็จแล้ว'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {activePopover?.type === 'employee' && activePopover.assignmentId === bar.assignment_id && (() => {
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
                                                                                    '--arrow-left': 'calc(50% - 6px)',
                                                                                } as React.CSSProperties}
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <div className="wo-timeline-popover-header">
                                                                                    <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                                        <i className="bi bi-person-fill me-1" style={{ color: '#50cd89' }} />
                                                                                        {row.name}
                                                                                    </span>
                                                                                    <span className="wo-emp-status" style={{
                                                                                        backgroundColor: bar.isActive ? '#e8fff3' : '#f1f1f4',
                                                                                        color: bar.isActive ? '#198754' : '#6c757d',
                                                                                    }}>
                                                                                        {bar.isActive ? 'กำลังทำงาน' : 'เสร็จแล้ว'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="wo-timeline-popover-list">
                                                                                    <div className="wo-timeline-popover-emp">
                                                                                        <i className="bi bi-clock me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                        <span className="text-muted" style={{ fontSize: 12 }}>เริ่ม:</span>
                                                                                        <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{formatTime(bar.from_time)}</span>
                                                                                    </div>
                                                                                    <div className="wo-timeline-popover-emp">
                                                                                        <i className="bi bi-clock-history me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                        <span className="text-muted" style={{ fontSize: 12 }}>สิ้นสุด:</span>
                                                                                        <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>
                                                                                            {bar.to_time ? formatTime(bar.to_time) : 'กำลังทำงาน...'}
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
                                        </>
                                    )}

                                    {/* Machine rows */}
                                    {selectedWorkRun.machines && selectedWorkRun.machines.length > 0 && (
                                        <>
                                            <div style={{ borderTop: '1px dashed #e4e6ef', margin: '6px 0 2px' }} />
                                            {selectedWorkRun.machines.map(m => {
                                                const bar = machineBars.find(mb => mb.work_run_machine_id === m.work_run_machine_id);
                                                return (
                                                    <div key={m.work_run_machine_id} className="wo-timeline-row">
                                                        <div className="wo-timeline-label-col">
                                                            <div className="wo-phase-label">
                                                                <span className="wo-phase-dot" style={{ backgroundColor: m.to_time === null ? '#17a2b8' : '#6c757d' }} />
                                                                <span className="wo-phase-name" title={m.machine?.machine_name ?? `Machine #${m.machine_id}`}>
                                                                    <i className="bi bi-gear-fill me-1" style={{ fontSize: 10, color: '#17a2b8' }} />
                                                                    {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="wo-timeline-bar-col">
                                                            <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                                {bar ? (
                                                                    <>
                                                                        <div
                                                                            className="wo-timeline-bar"
                                                                            style={{
                                                                                backgroundColor: m.to_time === null ? '#17a2b8' : '#6c757d',
                                                                                left: `${bar.leftPercent}%`,
                                                                                width: `${bar.widthPercent}%`,
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const centerPct = bar.leftPercent + bar.widthPercent / 2;
                                                                                setActivePopover(prev =>
                                                                                    prev?.type === 'machine' && prev.machineId === m.machine_id
                                                                                        ? null
                                                                                        : { type: 'machine', machineId: m.machine_id, centerPct }
                                                                                );
                                                                            }}
                                                                        >
                                                                            {bar.widthPercent >= 8 && (
                                                                                <span className="wo-bar-text">
                                                                                    {m.to_time === null ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {/* Machine Popover */}
                                                                        {activePopover?.type === 'machine' && activePopover.machineId === m.machine_id && (() => {
                                                                            const durationMs = m.to_time
                                                                                ? new Date(m.to_time).getTime() - new Date(m.from_time).getTime()
                                                                                : Date.now() - new Date(m.from_time).getTime();
                                                                            return (
                                                                                <div
                                                                                    ref={popoverRef}
                                                                                    className="wo-timeline-popover"
                                                                                    style={{
                                                                                        left: `${Math.min(Math.max(activePopover.centerPct, 15), 85)}%`,
                                                                                        transform: 'translateX(-50%)',
                                                                                        '--arrow-left': 'calc(50% - 6px)',
                                                                                    } as React.CSSProperties}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                >
                                                                                    <div className="wo-timeline-popover-header">
                                                                                        <span className="fw-bold text-gray-800" style={{ fontSize: 13 }}>
                                                                                            <i className="bi bi-gear-fill me-1" style={{ color: '#17a2b8' }} />
                                                                                            {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                                                        </span>
                                                                                        <span className="wo-emp-status" style={{
                                                                                            backgroundColor: m.to_time === null ? '#e0f9ff' : '#f1f1f4',
                                                                                            color: m.to_time === null ? '#17a2b8' : '#6c757d',
                                                                                        }}>
                                                                                            {m.to_time === null ? 'กำลังใช้งาน' : 'เสร็จแล้ว'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="wo-timeline-popover-list">
                                                                                        {m.machine?.machine_code && (
                                                                                            <div className="wo-timeline-popover-emp">
                                                                                                <i className="bi bi-upc me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                                <span className="text-muted" style={{ fontSize: 12 }}>รหัส:</span>
                                                                                                <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{m.machine.machine_code}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="wo-timeline-popover-emp">
                                                                                            <i className="bi bi-clock me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                            <span className="text-muted" style={{ fontSize: 12 }}>เริ่ม:</span>
                                                                                            <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>{formatTime(m.from_time)}</span>
                                                                                        </div>
                                                                                        <div className="wo-timeline-popover-emp">
                                                                                            <i className="bi bi-clock-history me-1 text-muted" style={{ fontSize: 12 }} />
                                                                                            <span className="text-muted" style={{ fontSize: 12 }}>สิ้นสุด:</span>
                                                                                            <span className="ms-1 fw-semibold text-gray-700" style={{ fontSize: 12 }}>
                                                                                                {m.to_time ? formatTime(m.to_time) : 'กำลังใช้งาน...'}
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
                                                                    </>
                                                                ) : (
                                                                    <div className="wo-timeline-bar-empty">
                                                                        <span className="text-muted" style={{ fontSize: 11 }}>ไม่มีกิจกรรมวันนี้</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}

                                    {/* Legend */}
                                    <div className="d-flex gap-4 mt-4 fs-8 text-muted flex-wrap">
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#0d6efd', marginRight: 4 }} />Work Run</span>
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#fd7e14', marginRight: 4 }} />พัก</span>
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#50cd89', marginRight: 4 }} />พนักงาน (กำลังทำงาน)</span>
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#a1a5b7', marginRight: 4 }} />พนักงาน (เสร็จแล้ว)</span>
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#17a2b8', marginRight: 4 }} />เครื่องจักร (กำลังใช้งาน)</span>
                                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#6c757d', marginRight: 4 }} />เครื่องจักร (เสร็จแล้ว)</span>
                                    </div>
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

            {/* Bottom: Assignments + Sales Item Info */}
            <div className="row g-5 mb-8">
                {/* Assignment details */}
                <div className="col-lg-7">
                    <div className="wo-card">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">รายละเอียด Work Run</h3>
                            {selectedWorkRun && (
                                <span className="wo-phase-status-badge" style={{
                                    backgroundColor: getRunStatusBg(selectedWorkRun.status),
                                    color: getRunStatusColor(selectedWorkRun.status),
                                }}>
                                    {getRunStatusLabel(selectedWorkRun.status)}
                                </span>
                            )}
                        </div>
                        <div className="wo-card-body">
                            {selectedWorkRun ? (
                                <div className="wo-phase-list">
                                    {/* Work run summary */}
                                    <div className="wo-phase-card">
                                        <div className="wo-phase-card-header">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="d-flex flex-column">
                                                    <div className="fw-bold text-gray-800">
                                                        {selectedWorkRun.lot_number || `Work Run #${selectedWorkRun.work_run_id}`}
                                                    </div>
                                                    <div className="text-muted fs-8">
                                                        {selectedWorkRun.start_date ? `เริ่ม: ${formatDateTime(selectedWorkRun.start_date)}` : 'ยังไม่เริ่ม'}
                                                        {selectedWorkRun.end_date ? ` • สิ้นสุด: ${formatDateTime(selectedWorkRun.end_date)}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <span className="text-muted fs-8">จำนวน: {selectedWorkRun.quantity}</span>
                                            </div>
                                        </div>

                                        {/* Active employees */}
                                        {activeAssignments.length > 0 && (
                                            <div className="wo-phase-card-body">
                                                <div className="fs-8 text-muted mb-2">พนักงาน ({activeAssignments.length} คน)</div>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {activeAssignments.map(a => (
                                                        <span key={a.work_run_assignment_id} className="wo-chip">
                                                            <span className="wo-chip-avatar">{a.employee?.employee_first_name?.charAt(0) ?? '?'}</span>
                                                            {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Active machines */}
                                        {activeMachines.length > 0 && (
                                            <div className="wo-phase-card-body" style={{ borderTop: '1px dashed #e5e7eb' }}>
                                                <div className="fs-8 text-muted mb-2">เครื่องจักร ({activeMachines.length} เครื่อง)</div>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {activeMachines.map(m => (
                                                        <span key={m.work_run_machine_id} className="wo-chip">
                                                            <i className="bi bi-gear-fill me-1 text-info" />
                                                            {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Breaks */}
                                        {selectedWorkRun.breaks && selectedWorkRun.breaks.length > 0 && (
                                            <div className="px-3 pb-3 pt-2 border-top border-dashed">
                                                <div className="fs-8 fw-bold text-warning mb-2 d-flex align-items-center">
                                                    <i className="bi bi-clock-history me-1" />
                                                    พักทั้งหมด {selectedWorkRun.breaks.length} ครั้ง
                                                    <span className="ms-2 text-muted">({formatDurationMs(calcTotalBreakMs(selectedWorkRun.breaks))})</span>
                                                </div>
                                                <div className="d-flex flex-column gap-1">
                                                    {selectedWorkRun.breaks.map((b: WorkRunBreak) => (
                                                        <div key={b.break_id} className="d-flex align-items-center justify-content-between px-2 py-1 rounded" style={{ background: '#fff8f0', fontSize: '11px' }}>
                                                            <span className="fw-semibold text-gray-700">{b.break_type}</span>
                                                            <span className="text-muted">
                                                                {formatTime(b.break_start)} - {b.break_end ? formatTime(b.break_end) : 'กำลังพัก...'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedWorkRun.status?.toUpperCase() === 'COMPLETED' && (
                                            <div className="d-flex align-items-center gap-2 px-3 pb-3 pt-2 border-top">
                                                <span className="d-inline-flex align-items-center text-success fw-semibold fs-7">
                                                    <i className="bi bi-check-circle-fill me-1" /> เสร็จสิ้นแล้ว
                                                </span>
                                                {selectedWorkRun.usable_qty != null && (
                                                    <span className="text-muted fs-8">• ใช้งานได้ {selectedWorkRun.usable_qty} ชิ้น</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="d-flex justify-content-end px-3 pb-3">
                                            <button
                                                className="btn btn-sm btn-light-primary d-flex align-items-center gap-1"
                                                style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px' }}
                                                onClick={() => navigate(`/workorder/work_run/${selectedWorkRun.work_run_id}`)}
                                            >
                                                <i className="bi bi-box-arrow-up-right" style={{ fontSize: '12px' }} />
                                                จัดการ Work Run
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">ยังไม่มีข้อมูล Work Run</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sales Item Info */}
                <div className="col-lg-5">
                    <div className="wo-card mb-5">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">ข้อมูลสินค้า</h3>
                        </div>
                        <div className="wo-card-body">
                            {workOrder.sales_item ? (
                                <div className="wo-item-detail">
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">รหัสสินค้า</span>
                                        <span className="wo-item-value">{workOrder.sales_item.item_code}</span>
                                    </div>
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">ชื่อสินค้า</span>
                                        <span className="wo-item-value fw-bold">{workOrder.sales_item.item_name}</span>
                                    </div>
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">หมวดหมู่</span>
                                        <span className="wo-item-value">{workOrder.sales_item.item_group || '-'}</span>
                                    </div>
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">รายละเอียด</span>
                                        <span className="wo-item-value">{workOrder.sales_item.item_description}</span>
                                    </div>
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">เลขที่เอกสาร</span>
                                        <span className="wo-item-value">{workOrder.sales_item.doc_num}</span>
                                    </div>
                                    <div className="wo-item-row">
                                        <span className="wo-item-label">จำนวนทั้งหมด</span>
                                        <span className="wo-item-value fw-bold">{workOrder.sales_item.item_num}</span>
                                    </div>
                                    <div className="separator separator-dashed my-4"></div>
                                    <div className="wo-cost-summary mt-5">
                                        <div className="wo-cost-row">
                                            <span>ราคาต้นทุน</span>
                                            <span className="fw-bold">฿{workOrder.sales_item.cost_price.toLocaleString()}</span>
                                        </div>
                                        <div className="wo-cost-row">
                                            <span>ราคาขาย</span>
                                            <span className="fw-bold">฿{workOrder.sales_item.unit_price.toLocaleString()}</span>
                                        </div>
                                        <div className="wo-cost-row wo-cost-total">
                                            <span>กำไร</span>
                                            <span className="fw-bold text-success">
                                                ฿{(workOrder.sales_item.unit_price - workOrder.sales_item.cost_price).toLocaleString()}
                                                <small className="ms-2 text-muted">
                                                    ({Math.round(((workOrder.sales_item.unit_price - workOrder.sales_item.cost_price) / workOrder.sales_item.unit_price) * 100)}%)
                                                </small>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-8">
                                    <i className="bi bi-box-seam fs-3x text-gray-300 mb-3 d-block" />
                                    ยังไม่มีข้อมูลสินค้า
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Components & Materials */}
                    {workOrder.item_components && workOrder.item_components.length > 0 && (
                        <div className="wo-card mb-5">
                            <div className="wo-card-header">
                                <h3 className="wo-card-title">ส่วนประกอบ & วัสดุ</h3>
                                <span className="badge badge-light-info">{workOrder.item_components.length} ชิ้น</span>
                            </div>
                            <div className="wo-card-body">
                                <div className="d-flex flex-column gap-4">
                                    {workOrder.item_components.map((comp, idx) => (
                                        <div key={comp.item_component_id} className="border rounded p-3" style={{ backgroundColor: '#f9fafb' }}>
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                                                    style={{ width: 28, height: 28, backgroundColor: '#e0e7ff', color: '#4f46e5', fontSize: 12 }}>
                                                    {idx + 1}
                                                </div>
                                                <span className="fw-bold text-gray-800 fs-6">{comp.component_name}</span>
                                            </div>
                                            {comp.material_usages && comp.material_usages.length > 0 ? (
                                                <div className="d-flex flex-column gap-2">
                                                    {comp.material_usages.map(usage => (
                                                        <div key={usage.usage_id} className="d-flex align-items-center justify-content-between px-3 py-2 rounded" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                                                            <div className="d-flex flex-column">
                                                                <span className="fw-semibold text-gray-700 fs-7">
                                                                    {usage.material_list?.item_name || '-'}
                                                                    {usage.material_list?.item_group && <span className="badge badge-light-info ms-2 fs-8">{usage.material_list.item_group}</span>}
                                                                </span>
                                                                <span className="text-muted fs-8">{usage.material_list?.item_code || '-'}</span>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <span className="badge badge-light-primary fs-8">จำนวน: {usage.quantity_used}</span>
                                                                {usage.material_list?.unit_price != null && (
                                                                    <span className="text-muted fs-8">฿{usage.material_list.unit_price.toLocaleString()}/หน่วย</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-muted fs-8 text-center py-2">ไม่มีวัสดุที่ใช้</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Content>
    );
};

export default WorkorderView;
