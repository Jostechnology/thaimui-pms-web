import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getWorkOrderById } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import './WorkorderView.css';
import { WorkPhaseStatusEnum, type WorkOrder, type WorkPhase, type WorkPhaseBreak, type ItemComponent, type WorkRunDetail as WorkRunDetailType } from '../../../type_interface/WorkOrderType';
import type { Employee } from '../../../type_interface/EmployeeType';
import { getWorkRunById } from '../../../services/workRunService';
import ItemComponentDetailModal from './ItemComponentDetailModal';

// --- Helper functions ---
const getPhaseStatusColor = (status: string) => {
    switch (status) {
        case WorkPhaseStatusEnum.INPROGRESS: return '#0d6efd';
        case WorkPhaseStatusEnum.COMPLETED: return '#198754';
        case WorkPhaseStatusEnum.PAUSED: return '#fd7e14';
        case WorkPhaseStatusEnum.PENDING: return '#6c757d';
        default: return '#adb5bd';
    }
};

const getPhaseStatusBg = (status: string) => {
    switch (status) {
        case WorkPhaseStatusEnum.INPROGRESS: return '#e7f1ff';
        case WorkPhaseStatusEnum.COMPLETED: return '#d1e7dd';
        case WorkPhaseStatusEnum.PAUSED: return '#fff3e0';
        case WorkPhaseStatusEnum.PENDING: return '#f8f9fa';
        default: return '#f8f9fa';
    }
};

const getStatusBadgeClass = (status: string) => {
    if (status === WorkPhaseStatusEnum.COMPLETED) return 'wo-badge-success';
    if (status === WorkPhaseStatusEnum.INPROGRESS) return 'wo-badge-primary';
    if (status === WorkPhaseStatusEnum.PENDING) return 'wo-badge-info';
    return 'wo-badge-secondary';
};

const getPhaseStatusLabel = (status: string) => {
    switch (status) {
        case WorkPhaseStatusEnum.INPROGRESS: return 'กำลังดำเนินการ';
        case WorkPhaseStatusEnum.COMPLETED: return 'เสร็จสิ้น';
        case WorkPhaseStatusEnum.PAUSED: return 'หยุดชั่วคราว';
        case WorkPhaseStatusEnum.PENDING: return 'รอดำเนินการ';
        default: return status;
    }
};

/** Calculate total break time in ms for a phase */
const calcTotalBreakMs = (breaks?: WorkPhaseBreak[]): number => {
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

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

// --- Timeline date helpers ---
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;
const TIMELINE_TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 14

/** Check if two date ranges overlap */
const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

/** Get day start/end boundaries for the timeline */
const getDayBounds = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(TIMELINE_END_HOUR, 0, 0, 0);
    return { dayStart, dayEnd };
};

/** Convert a time to percentage position on timeline (0-100) */
const timeToPercent = (time: Date, dayStart: Date): number => {
    const diffMs = time.getTime() - dayStart.getTime();
    const totalMs = TIMELINE_TOTAL_HOURS * 3600000;
    return Math.max(0, Math.min(100, (diffMs / totalMs) * 100));
};

interface PhaseBarInfo {
    leftPercent: number;
    widthPercent: number;
    isActive: boolean;
}

/** Calculate the bar position for a phase on a given day */
const getPhaseBarInfo = (phase: WorkPhase, selectedDate: Date): PhaseBarInfo | null => {
    if (!phase.start_date) return null;
    const phaseStart = new Date(phase.start_date);
    const phaseEnd = phase.end_date ? new Date(phase.end_date) : new Date(); // ongoing = now
    const { dayStart, dayEnd } = getDayBounds(selectedDate);

    // Check if phase overlaps with this day's timeline window
    if (phaseEnd.getTime() < dayStart.getTime() || phaseStart.getTime() > dayEnd.getTime()) {
        return null; // no overlap
    }

    const clampedStart = new Date(Math.max(phaseStart.getTime(), dayStart.getTime()));
    const clampedEnd = new Date(Math.min(phaseEnd.getTime(), dayEnd.getTime()));

    const leftPercent = timeToPercent(clampedStart, dayStart);
    const rightPercent = timeToPercent(clampedEnd, dayStart);
    const widthPercent = Math.max(2, rightPercent - leftPercent); // min 2% so it's visible

    return { leftPercent, widthPercent, isActive: true };
};

// --- Live Timer Component (subtracts break time) ---
const LiveTimer: React.FC<{ startDate: string | null; breaks?: WorkPhaseBreak[]; isPAUSED?: boolean }> = ({ startDate, breaks, isPAUSED }) => {
    const [elapsed, setElapsed] = useState('00:00:00');

    useEffect(() => {
        if (!startDate) return;
        const start = new Date(startDate).getTime();

        const update = () => {
            const now = Date.now();
            const totalMs = Math.max(0, now - start);
            const breakMs = calcTotalBreakMs(breaks);
            const workMs = Math.max(0, totalMs - breakMs);
            const hours = Math.floor(workMs / 3600000);
            const minutes = Math.floor((workMs % 3600000) / 60000);
            const seconds = Math.floor((workMs % 60000) / 1000);
            setElapsed(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startDate, breaks, isPAUSED]);

    return <span className={`wo-timer-value ${isPAUSED ? 'text-warning' : ''}`} style={isPAUSED ? { animation: 'wo-pulse 1.5s ease-in-out infinite' } : {}}>{elapsed}</span>;
};

// --- Work Order Total Live Timer (sum of all phases' working time) ---
// เวลารวม = ผลรวม (duration แต่ละ phase - เวลาพัก) ของทุก phase
// - เสร็จสิ้น: end_date - start_date - breaks (คงที่)
// - กำลังดําเนินการ: now - start_date - breaks (นับต่อ live)
// - หยุดชั่วคราว: now - start_date - breaks (break ที่ยังไม่จบใช้ now เป็น end → เวลาทำงานหยุดนับ)
// - รอดําเนินการ: ข้าม (ยังไม่มี start_date)
const WorkOrderLiveTimer: React.FC<{ phases: WorkPhase[] }> = ({ phases }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    const hasActivePhase = phases.some(p => p.phase_status === WorkPhaseStatusEnum.INPROGRESS);

    useEffect(() => {
        const calcTotal = () => {
            let totalWorkMs = 0;
            const now = Date.now();
            for (const phase of phases) {
                if (!phase.start_date) continue;
                const start = new Date(phase.start_date).getTime();
                const end = phase.end_date ? new Date(phase.end_date).getTime() : now;
                const phaseMs = Math.max(0, end - start);
                const breakMs = calcTotalBreakMs(phase.breaks);
                totalWorkMs += Math.max(0, phaseMs - breakMs);
            }
            const hours = Math.floor(totalWorkMs / 3600000);
            const minutes = Math.floor((totalWorkMs % 3600000) / 60000);
            const seconds = Math.floor((totalWorkMs % 60000) / 1000);
            setElapsed(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        calcTotal();

        // ถ้ามี phase ที่กำลังดำเนินการอยู่ → นับเวลาต่อทุกวินาที
        // ถ้าทุก phase เสร็จ/พัก/รอ → ไม่ต้อง interval (เวลาไม่เปลี่ยน)
        if (hasActivePhase) {
            const interval = setInterval(calcTotal, 1000);
            return () => clearInterval(interval);
        }
    }, [phases, hasActivePhase]);

    return <span className={`wo-timer-value`}>{elapsed}</span>;
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
    const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
    const [clickedBarPixel, setClickedBarPixel] = useState<{ barCenterPx: number; trackWidthPx: number } | null>(null);

    const fetchWorkRunDetail = async (workRunId: number) => {
        setWorkRunLoading(true);
        try {
            const result = await getWorkRunById(workRunId);
            if (result && result.success && result.data) {
                setSelectedWorkRun(result.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setWorkRunLoading(false);
        }
    };

    const [viewComponentId, setViewComponentId] = useState<number | null>(null);
    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkOrderById(Number(id));
            if (result && result.success && result.data) {
                setWorkOrder(result.data);
                // Auto-select the first work run
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

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (selectedWorkRunId && !dataLoading) {
            fetchWorkRunDetail(selectedWorkRunId);
        }
    }, [selectedWorkRunId]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setSelectedPhaseId(null);
        if (selectedPhaseId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [selectedPhaseId]);

    // --- Computed values (scoped to selected work run) ---
    const activeWorkPhases = useMemo(() => selectedWorkRun?.work_phases || [], [selectedWorkRun]);
    const activeCurrentPhase = useMemo(() => selectedWorkRun?.current_phase || null, [selectedWorkRun]);

    const allEmployees = useMemo(() => {
        const empMap = new Map<number, Employee & { phaseName: string; startTime: string | null }>();
        activeWorkPhases.forEach(phase => {
            phase.employee_list.forEach(emp => {
                if (!empMap.has(emp.employee_id)) {
                    empMap.set(emp.employee_id, {
                        ...emp,
                        phaseName: phase.phase_name,
                        startTime: phase.start_date
                    });
                }
            });
        });
        return Array.from(empMap.values());
    }, [activeWorkPhases]);

    const activeEmployeeCount = useMemo(() => {
        if (!activeCurrentPhase) return 0;
        return activeCurrentPhase.employee_list.length;
    }, [activeCurrentPhase]);

    const totalEmployeeCount = useMemo(() => allEmployees.length, [allEmployees]);

    const COMPLETEDPhases = useMemo(() => {
        return activeWorkPhases.filter(p => p.phase_status === WorkPhaseStatusEnum.COMPLETED).length;
    }, [activeWorkPhases]);

    const totalPhases = useMemo(() => activeWorkPhases.length, [activeWorkPhases]);
    const progressPercent = useMemo(() => totalPhases > 0 ? Math.round((COMPLETEDPhases / totalPhases) * 100) : 0, [COMPLETEDPhases, totalPhases]);

    // Navigate date
    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    const handleToday = useCallback(() => setSelectedDate(new Date()), []);

    // Phases that have activity on the selected date
    const phasesOnDate = useMemo(() => {
        return activeWorkPhases.map(phase => ({
            phase,
            barInfo: getPhaseBarInfo(phase, selectedDate),
        }));
    }, [activeWorkPhases, selectedDate]);

    const hasActivityOnDate = useMemo(() => phasesOnDate.some(p => p.barInfo !== null), [phasesOnDate]);



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
            {/* ===== Header ===== */}
            <div className="d-flex flex-wrap justify-content-between align-items-start mb-8">
                <div>
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <button className="btn btn-sm btn-icon btn-light" onClick={() => navigate('/workorder/workorders_list')}>
                            <i className="bi bi-arrow-left fs-4" />
                        </button>
                        <h1 className="fw-bolder text-gray-900 fs-2qx mb-0">
                            การผลิต #{workOrder.doc_num}
                        </h1>
                    </div>
                    <p className="text-muted fs-6 ms-11">
                        {workOrder.sales_item
                            ? `สินค้า: ${workOrder.sales_item.item_name} • ${workOrder.sales_item.item_description}`
                            : `Work Order ID: ${workOrder.work_order_id}`
                        }
                    </p>
                </div>
                <div className="d-flex gap-3 mt-3 mt-md-0">
                    <span className={`wo-status-badge ${getStatusBadgeClass(workOrder.status)}`}>
                        {workOrder.status}
                    </span>
                    <button className="btn btn-light-primary fw-bold px-5" onClick={() => navigate(`/workorder/workorders_detail/${workOrder.work_order_id}`)}>
                        <i className="bi bi-pencil-square me-2" /> จัดการขั้นตอน
                    </button>
                </div>
            </div>

            {/* ===== Work Run Selector ===== */}
            {workOrder.work_runs && workOrder.work_runs.length > 0 && (
                <div className="d-flex align-items-center gap-3 mb-8 flex-wrap">
                    <span className="text-muted fw-semibold fs-7">Work Run:</span>
                    {workOrder.work_runs.map(run => (
                        <button
                            key={run.work_run_id}
                            className={`btn btn-sm fw-bold ${selectedWorkRunId === run.work_run_id ? 'btn-primary' : 'btn-light'}`}
                            onClick={() => setSelectedWorkRunId(run.work_run_id)}
                        >
                            #{run.work_run_id}
                            <span className={`ms-2 badge badge-sm ${run.status === 'COMPLETED' ? 'badge-light-success' : run.status === 'INPROGRESS' ? 'badge-light-warning' : 'badge-light-secondary'}`}>
                                {run.status}
                            </span>
                        </button>
                    ))}
                    {workRunLoading && <span className="spinner-border spinner-border-sm text-primary ms-2" />}
                </div>
            )}

            {/* ===== KPI Cards ===== */}
            <div className="row g-5 mb-8">
                {/* Live Timer */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">ระยะเวลาดำเนินการทั้งหมด (LIVE)</span>
                            {activeWorkPhases.some(p => p.phase_status === WorkPhaseStatusEnum.INPROGRESS) && (
                                <span className="wo-live-dot" />
                            )}
                            {activeCurrentPhase?.phase_status === WorkPhaseStatusEnum.PAUSED && (
                                <span className="wo-live-dot" style={{ background: '#fd7e14' }} />
                            )}
                        </div>
                        <WorkOrderLiveTimer phases={activeWorkPhases} />
                        <div className="wo-kpi-sub mt-2">
                            <small className="text-muted">เริ่ม: {formatDateTime(workOrder.created_date)}</small>
                            {activeCurrentPhase?.phase_status === WorkPhaseStatusEnum.PAUSED && (
                                <small className="text-warning ms-2">⏸ พักชั่วคราว</small>
                            )}
                        </div>
                        <div className="wo-progress-bar mt-3">
                            <div className="wo-progress-fill wo-progress-blue" style={{ width: `${Math.min(progressPercent + 10, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Active employees */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">คนงานที่ปฏิบัติงาน (ACTIVE)</span>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="wo-kpi-big">{activeEmployeeCount}</span>
                            <span className="text-muted fs-6">/ {totalEmployeeCount} คน</span>
                        </div>
                        <div className="wo-avatar-stack mt-3">
                            {allEmployees.slice(0, 4).map((emp, i) => (
                                <div key={emp.employee_id} className="wo-avatar" title={`${emp.employee_first_name} ${emp.employee_last_name}`}>
                                    {emp.employee_first_name.charAt(0)}
                                </div>
                            ))}
                            {allEmployees.length > 4 && (
                                <div className="wo-avatar wo-avatar-more">+{allEmployees.length - 4}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phase Progress */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">ความคืบหน้า</span>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="wo-kpi-big">{progressPercent}%</span>
                            <span className={`wo-kpi-change ${progressPercent > 50 ? 'text-success' : 'text-warning'}`}>
                                {COMPLETEDPhases}/{totalPhases} ขั้นตอน
                            </span>
                        </div>
                        <div className="wo-progress-bar mt-3">
                            <div className="wo-progress-fill wo-progress-green" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Main Content: Workforce + Timeline ===== */}
            <div className="row g-5 mb-8">
                {/* Workforce Management */}
                <div className="col-lg-4">
                    <div className="wo-card h-100">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">การจัดการแรงงาน</h3>
                            <span className="badge badge-light-primary">{totalEmployeeCount} คน</span>
                        </div>
                        <div className="wo-card-body">
                            {allEmployees.length > 0 ? (
                                <div className="wo-employee-list">
                                    {allEmployees.map((emp) => (
                                        <div key={emp.employee_id} className="wo-employee-item">
                                            <div className="wo-employee-avatar">
                                                {emp.employee_first_name.charAt(0)}
                                            </div>
                                            <div className="wo-employee-info">
                                                <div className="wo-employee-name">
                                                    {emp.employee_first_name} {emp.employee_last_name}
                                                </div>
                                                <div className="wo-employee-role">
                                                    {emp.phaseName} • เริ่ม {formatTime(emp.startTime)}
                                                </div>
                                            </div>
                                            <span className={`wo-emp-status ${emp.status === 'ว่างงาน' ? 'wo-emp-idle' : 'wo-emp-active'}`}>
                                                {emp.status}
                                            </span>
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

                {/* Production Timeline */}
                <div className="col-lg-8">
                    <div className="wo-card h-100">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">ไทม์ไลน์การผลิต (Production Timeline)</h3>
                            <div className="d-flex align-items-center gap-3">
                                <button className="btn btn-sm btn-icon btn-light" onClick={handlePrevDate}>
                                    <i className="bi bi-chevron-left" />
                                </button>
                                <span className="fw-semibold text-gray-700" style={{ cursor: 'pointer', minWidth: 110, textAlign: 'center' }} onClick={handleToday}>
                                    {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <button className="btn btn-sm btn-icon btn-light" onClick={handleNextDate}>
                                    <i className="bi bi-chevron-right" />
                                </button>
                            </div>
                        </div>
                        <div className="wo-card-body">
                            {activeWorkPhases.length > 0 ? (
                                <div className="wo-timeline-container">
                                    {/* Timeline header */}
                                    <div className="wo-timeline-header">
                                        <div className="wo-timeline-label-col">ขั้นตอน</div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-hours">
                                                {Array.from({ length: 10 }, (_, i) => (
                                                    <span key={i}>{String(TIMELINE_START_HOUR + i * 2).padStart(2, '0')}:00</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline rows */}
                                    {phasesOnDate.map(({ phase, barInfo }) => (
                                        <div key={phase.work_phase_id} className="wo-timeline-row">
                                            <div className="wo-timeline-label-col">
                                                <div className="wo-phase-label">
                                                    <span className="wo-phase-dot" style={{ backgroundColor: getPhaseStatusColor(phase.phase_status) }} />
                                                    <span className="wo-phase-name">{phase.phase_name}</span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-bar-col">
                                                <div className="wo-timeline-track" style={{ position: 'relative' }}>
                                                    {barInfo ? (
                                                        <div
                                                            className="wo-timeline-bar"
                                                            style={{
                                                                backgroundColor: getPhaseStatusColor(phase.phase_status),
                                                                left: `${barInfo.leftPercent}%`,
                                                                width: `${barInfo.widthPercent}%`,
                                                                opacity: phase.phase_status === WorkPhaseStatusEnum.PENDING ? 0.5 : 1,
                                                                cursor: 'pointer',
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const barEl = e.currentTarget;
                                                                const trackEl = barEl.parentElement!;
                                                                const barRect = barEl.getBoundingClientRect();
                                                                const trackRect = trackEl.getBoundingClientRect();
                                                                const barCenterPx = (barRect.left + barRect.width / 2) - trackRect.left;
                                                                setClickedBarPixel({ barCenterPx, trackWidthPx: trackRect.width });
                                                                setSelectedPhaseId(prev => prev === phase.work_phase_id ? null : phase.work_phase_id);
                                                            }}
                                                        >
                                                            <span className="wo-bar-text">
                                                                {getPhaseStatusLabel(phase.phase_status)}
                                                            </span>
                                                            {phase.employee_list.length > 0 && (
                                                                <span className="wo-bar-badge">{phase.employee_list.length} คน</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="wo-timeline-bar-empty">
                                                            <span className="text-muted" style={{ fontSize: 11 }}>ไม่มีกิจกรรมวันนี้</span>
                                                        </div>
                                                    )}

                                                    {/* Employee Popover */}
                                                    {selectedPhaseId === phase.work_phase_id && (() => {
                                                        const barCenter = barInfo ? barInfo.leftPercent + barInfo.widthPercent / 2 : 50;
                                                        // Clamp popover so it doesn't overflow left/right
                                                        const popoverLeft = Math.max(5, Math.min(barCenter - 15, 65));
                                                        // Calculate arrow position in pixels so it points at the bar center
                                                        const trackW = clickedBarPixel?.trackWidthPx || 1;
                                                        const popoverLeftPx = (popoverLeft / 100) * trackW;
                                                        const barCenterPx = clickedBarPixel?.barCenterPx ?? ((barCenter / 100) * trackW);
                                                        const arrowLeftPx = Math.max(12, Math.min(barCenterPx - popoverLeftPx, 300));
                                                        return (
                                                            <div className="wo-timeline-popover" style={{ left: `${popoverLeft}%`, '--arrow-left': `${arrowLeftPx}px` } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
                                                                <div className="wo-timeline-popover-header">
                                                                    <span className="fw-bold">{phase.phase_name}</span>
                                                                    <button className="btn btn-sm btn-icon btn-light" style={{ width: 24, height: 24 }} onClick={() => setSelectedPhaseId(null)}>
                                                                        <i className="bi bi-x fs-6" />
                                                                    </button>
                                                                </div>
                                                                <div className="wo-timeline-popover-status" style={{ color: getPhaseStatusColor(phase.phase_status) }}>
                                                                    {getPhaseStatusLabel(phase.phase_status)}
                                                                </div>
                                                                {phase.employee_list.length > 0 ? (
                                                                    <div className="wo-timeline-popover-list">
                                                                        <div className="fs-8 text-muted mb-2">พนักงาน ({phase.employee_list.length} คน)</div>
                                                                        {phase.employee_list.map(emp => (
                                                                            <div key={emp.employee_id} className="wo-timeline-popover-emp">
                                                                                <div className="wo-popover-avatar">{emp.employee_first_name.charAt(0)}</div>
                                                                                <span>{emp.employee_first_name} {emp.employee_last_name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-muted fs-8 py-2">ยังไม่มีพนักงาน</div>
                                                                )}
                                                                {phase.start_date && (
                                                                    <div className="wo-timeline-popover-footer">
                                                                        <small className="text-muted">เริ่ม: {formatDateTime(phase.start_date)}</small>
                                                                        {phase.end_date && <small className="text-muted"> • สิ้นสุด: {formatDateTime(phase.end_date)}</small>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {!hasActivityOnDate && (
                                        <div className="text-center text-muted py-6">
                                            <i className="bi bi-calendar-x fs-2x text-gray-300 mb-2 d-block" />
                                            ไม่มีกิจกรรมในวันที่เลือก
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-clock-history fs-3x text-gray-300 mb-3 d-block" />
                                    ยังไม่มีขั้นตอนการผลิต
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Bottom Section: Phase Details + Item Info ===== */}
            <div className="row g-5 mb-8">
                {/* Phase List Detail */}
                <div className="col-lg-7">
                    <div className="wo-card">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">รายละเอียดขั้นตอนทั้งหมด</h3>
                            <span className="text-muted fs-7">{totalPhases} ขั้นตอน</span>
                        </div>
                        <div className="wo-card-body">
                            {activeWorkPhases.length > 0 ? (
                                <div className="wo-phase-list">
                                    {activeWorkPhases.map((phase, idx) => (
                                        <div key={phase.work_phase_id}
                                            className={`wo-phase-card ${activeCurrentPhase?.work_phase_id === phase.work_phase_id ? 'wo-phase-active' : ''}`}
                                        >
                                            <div className="wo-phase-card-header">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="wo-phase-number" style={{ backgroundColor: getPhaseStatusBg(phase.phase_status), color: getPhaseStatusColor(phase.phase_status) }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-gray-800">{phase.phase_name}</div>
                                                        <div className="text-muted fs-8">
                                                            {phase.start_date ? `เริ่ม: ${formatDateTime(phase.start_date)}` : 'ยังไม่เริ่ม'}
                                                            {phase.end_date ? ` • สิ้นสุด: ${formatDateTime(phase.end_date)}` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="wo-phase-status-badge" style={{ backgroundColor: getPhaseStatusBg(phase.phase_status), color: getPhaseStatusColor(phase.phase_status) }}>
                                                    {getPhaseStatusLabel(phase.phase_status)}
                                                </span>
                                            </div>

                                            {/* Employee list */}
                                            {phase.employee_list.length > 0 && (
                                                <div className="wo-phase-card-body">
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {phase.employee_list.map(emp => (
                                                            <span key={emp.employee_id} className="wo-chip">
                                                                <span className="wo-chip-avatar">{emp.employee_first_name.charAt(0)}</span>
                                                                {emp.employee_first_name} {emp.employee_last_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Break Summary */}
                                            {phase.breaks && phase.breaks.length > 0 && (
                                                <div className="px-3 pb-3 pt-2 border-top border-dashed">
                                                    <div className="fs-8 fw-bold text-warning mb-2 d-flex align-items-center">
                                                        <i className="bi bi-clock-history me-1" />
                                                        พักทั้งหมด {phase.breaks.length} ครั้ง
                                                        <span className="ms-2 text-muted">({formatDurationMs(calcTotalBreakMs(phase.breaks))})</span>
                                                    </div>
                                                    <div className="d-flex flex-column gap-1">
                                                        {phase.breaks.map(b => (
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

                                            {/* Status Label */}
                                            {phase.phase_status === WorkPhaseStatusEnum.COMPLETED && (
                                                <div className="d-flex align-items-center gap-2 px-3 pb-3 pt-2 border-top">
                                                    <span className="d-inline-flex align-items-center text-success fw-semibold fs-7">
                                                        <i className="bi bi-check-circle-fill me-1" /> เสร็จสิ้นแล้ว
                                                    </span>
                                                </div>
                                            )}

                                            {/* View cost detail button */}
                                            <div className="d-flex justify-content-end px-3 pb-3">
                                                <button
                                                    className="btn btn-sm btn-light-primary d-flex align-items-center gap-1"
                                                    style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px' }}
                                                    onClick={() => navigate(`/workorder/workorders_phase_detail/${phase.work_phase_id}`)}
                                                >
                                                    <i className="bi bi-bar-chart-line" style={{ fontSize: '12px' }} />
                                                    ดูต้นทุน
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10">
                                    ยังไม่มีขั้นตอนการผลิต
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sales Item Info / Cost */}
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
                                    <div className="d-flex flex-column gap-2">
                                        <span className="text-muted fw-bold fs-8 text-uppercase">ความคืบหน้าการผลิต</span>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-gray-600 fs-7">กำลังผลิต</span>
                                            <span className="badge badge-light-warning fw-bold">{workOrder.sales_item.producing_qty ?? 0}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-gray-600 fs-7">ผลิตแล้ว</span>
                                            <span className="badge badge-light-primary fw-bold">{workOrder.sales_item.produced_qty ?? 0}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-gray-600 fs-7">รอทดสอบ</span>
                                            <span className="badge badge-light-info fw-bold">{workOrder.sales_item.queued_for_test_qty ?? 0}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-gray-600 fs-7">ทดสอบแล้ว</span>
                                            <span className="badge badge-light-success fw-bold">{workOrder.sales_item.tested_qty ?? 0}</span>
                                        </div>
                                    </div>
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
                                            <button
                                                className="btn btn-sm btn-light-primary d-flex align-items-center gap-1 ms-auto"
                                                style={{ padding: '6px 12px', borderRadius: '6px' }}
                                                onClick={() => setViewComponentId(comp.item_component_id)}
                                            >
                                                <i className="bi bi-eye" />
                                                ดูรายละเอียด
                                            </button>
                                            </div>
                                            {comp.material_usages && comp.material_usages.length > 0 ? (
                                                <div className="d-flex flex-column gap-2">
                                                    {comp.material_usages.map(usage => (
                                                        <div key={usage.usage_id} className="d-flex align-items-center justify-content-between px-3 py-2 rounded" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
                                                            <div className="d-flex flex-column">
                                                                <span className="fw-semibold text-gray-700 fs-7">{usage.material_list?.item_name || '-'}</span>
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

                    {/* Current Phase Info */}
                    {activeCurrentPhase && (
                        <div className="wo-card">
                            <div className="wo-card-header">
                                <h3 className="wo-card-title">ขั้นตอนปัจจุบัน</h3>
                                <span className="wo-phase-status-badge" style={{
                                    backgroundColor: getPhaseStatusBg(activeCurrentPhase.phase_status),
                                    color: getPhaseStatusColor(activeCurrentPhase.phase_status)
                                }}>
                                    {activeCurrentPhase.phase_status}
                                </span>
                            </div>
                            <div className="wo-card-body">
                                <div className="wo-current-phase-name">
                                    {activeCurrentPhase.phase_name}
                                </div>
                                <div className="d-flex flex-wrap gap-3 mt-3">
                                    <div className="wo-mini-stat">
                                        <i className="bi bi-calendar3 text-primary me-2" />
                                        เริ่ม: {formatDateTime(activeCurrentPhase.start_date)}
                                    </div>
                                    <div className="wo-mini-stat">
                                        <i className="bi bi-people text-primary me-2" />
                                        พนักงาน: {activeCurrentPhase.employee_list.length} คน
                                    </div>
                                </div>
                                {activeCurrentPhase.employee_list.length > 0 && (
                                    <div className="mt-4">
                                        {activeCurrentPhase.employee_list.map(emp => (
                                            <div key={emp.employee_id} className="wo-employee-item wo-employee-compact">
                                                <div className="wo-employee-avatar wo-avatar-sm">
                                                    {emp.employee_first_name.charAt(0)}
                                                </div>
                                                <div className="wo-employee-info">
                                                    <div className="wo-employee-name fs-7">{emp.employee_first_name} {emp.employee_last_name}</div>
                                                </div>
                                                <span className={`wo-emp-status ${emp.status === 'ว่างงาน' ? 'wo-emp-idle' : 'wo-emp-active'}`}>
                                                    {emp.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {
                <ItemComponentDetailModal
                    show={viewComponentId !== null}
                    itemComponentId={viewComponentId}
                    workOrder={workOrder}
                    mode="view"
                    onClose={() => setViewComponentId(null)}
                />
            }
        </Content>
    );
};

export default WorkorderView;
