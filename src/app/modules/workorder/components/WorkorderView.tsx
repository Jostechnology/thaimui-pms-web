import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getWorkOrderById, updateWorkPhase } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import Swal from 'sweetalert2';
import './WorkorderView.css';

// --- Interfaces ---
interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
}

interface SalesItem {
    cost_price: number;
    doc_num: string;
    item_code: string;
    item_description: string;
    item_name: string;
    item_num: number;
    sales_item_id: number;
    unit_price: number;
}

interface WorkPhaseBreak {
    break_id: number;
    work_phase_id: number;
    break_start: string;
    break_end: string | null;
    break_type: string;
}

interface WorkPhase {
    created_date: string;
    employee_list: Employee[];
    end_date: string | null;
    phase_name: string;
    phase_status: string;
    start_date: string | null;
    work_order_id: number;
    work_phase_id: number;
    breaks?: WorkPhaseBreak[];
}

interface WorkOrderData {
    created_date: string;
    current_phase: WorkPhase | null;
    doc_num: string;
    sales_item: SalesItem | null;
    status: string;
    work_order_id: number;
    work_phases: WorkPhase[];
}

// --- Helper functions ---
const getPhaseStatusColor = (status: string) => {
    switch (status) {
        case 'InProgress':
        case 'In Progress': return '#0d6efd';
        case 'Completed': return '#198754';
        case 'Paused': return '#fd7e14';
        case 'Pending': return '#6c757d';
        default: return '#adb5bd';
    }
};

const getPhaseStatusBg = (status: string) => {
    switch (status) {
        case 'InProgress':
        case 'In Progress': return '#e7f1ff';
        case 'Completed': return '#d1e7dd';
        case 'Paused': return '#fff3e0';
        case 'Pending': return '#f8f9fa';
        default: return '#f8f9fa';
    }
};

const getStatusBadgeClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'finished') return 'wo-badge-success';
    if (s === 'inprogress' || s === 'in progress' || s === 'working') return 'wo-badge-primary';
    if (s === 'paused') return 'wo-badge-warning';
    if (s === 'ready') return 'wo-badge-info';
    if (s === 'wait_confirm') return 'wo-badge-warning';
    if (s === 'pending') return 'wo-badge-secondary';
    return 'wo-badge-secondary';
};

const getPhaseStatusLabel = (status: string) => {
    switch (status) {
        case 'InProgress': return 'กำลังดำเนินงาน';
        case 'Completed': return 'เสร็จสิ้น';
        case 'Paused': return 'พักงาน';
        case 'Pending': return 'รอดำเนินการ';
        case 'Cancel': return 'ยกเลิก';
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

// --- Live Timer Component (subtracts break time) ---
const LiveTimer: React.FC<{ startDate: string | null; breaks?: WorkPhaseBreak[]; isPaused?: boolean }> = ({ startDate, breaks, isPaused }) => {
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
    }, [startDate, breaks, isPaused]);

    return <span className={`wo-timer-value ${isPaused ? 'text-warning' : ''}`} style={isPaused ? { animation: 'wo-pulse 1.5s ease-in-out infinite' } : {}}>{elapsed}</span>;
};

// --- Main Component ---
const WorkorderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkOrderById(Number(id));
            if (result && result.success && result.data) {
                setWorkOrder(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลใบสั่งงานได้");
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

    // --- Computed values ---
    const allEmployees = useMemo(() => {
        if (!workOrder) return [];
        const empMap = new Map<number, Employee & { phaseName: string; startTime: string | null }>();
        workOrder.work_phases.forEach(phase => {
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
    }, [workOrder]);

    const activeEmployeeCount = useMemo(() => {
        if (!workOrder?.current_phase) return 0;
        return workOrder.current_phase.employee_list.length;
    }, [workOrder]);

    const totalEmployeeCount = useMemo(() => allEmployees.length, [allEmployees]);

    const completedPhases = useMemo(() => {
        if (!workOrder) return 0;
        return workOrder.work_phases.filter(p => p.phase_status === 'Completed').length;
    }, [workOrder]);

    const totalPhases = useMemo(() => workOrder?.work_phases.length || 0, [workOrder]);
    const progressPercent = useMemo(() => totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0, [completedPhases, totalPhases]);

    // Navigate date
    const handlePrevDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    const handleNextDate = () => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });

    // --- Status Update Handler ---
    const handleStatusUpdate = useCallback(async (workPhaseId: number, newStatus: string, breakType?: string) => {
        if (statusUpdating) return;
        setStatusUpdating(true);
        try {
            const payload: any = { work_phase_id: workPhaseId, phase_status: newStatus };
            if (breakType) payload.break_type = breakType;

            const result = await updateWorkPhase([payload]);
            if (result.success) {
                await fetchData(); // Refresh data
                Swal.fire({
                    icon: 'success',
                    title: 'อัปเดตสถานะสำเร็จ',
                    text: `สถานะถูกเปลี่ยนเป็น ${getPhaseStatusLabel(newStatus)}`,
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        } finally {
            setStatusUpdating(false);
        }
    }, [statusUpdating]);

    // Start phase
    const handleStart = (phaseId: number) => {
        Swal.fire({
            title: 'เริ่มงาน?',
            text: 'ยืนยันเริ่มดำเนินการขั้นตอนนี้',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            confirmButtonText: 'เริ่มงาน',
            cancelButtonText: 'ยกเลิก',
        }).then((r) => { if (r.isConfirmed) handleStatusUpdate(phaseId, 'InProgress'); });
    };

    // Pause phase — choose break type
    const handlePause = (phaseId: number) => {
        Swal.fire({
            title: 'พักงาน',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { 'Lunch': 'พักเที่ยง', 'Short Break': 'พักเบรก', 'Other': 'อื่นๆ' },
            inputValue: 'Short Break',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักงาน',
            cancelButtonText: 'ยกเลิก',
        }).then((r) => { if (r.isConfirmed) handleStatusUpdate(phaseId, 'Paused', r.value); });
    };

    // Resume phase
    const handleResume = (phaseId: number) => {
        handleStatusUpdate(phaseId, 'InProgress');
    };

    // Complete phase
    const handleComplete = (phaseId: number) => {
        Swal.fire({
            title: 'เสร็จสิ้น?',
            text: 'ยืนยันว่าขั้นตอนนี้เสร็จสิ้นแล้ว ไม่สามารถย้อนกลับได้',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'ยืนยันเสร็จสิ้น',
            cancelButtonText: 'ยกเลิก',
        }).then((r) => { if (r.isConfirmed) handleStatusUpdate(phaseId, 'Completed'); });
    };

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
                    <span className="text-gray-600 fs-5">ไม่พบข้อมูลใบสั่งงาน</span>
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

            {/* ===== KPI Cards ===== */}
            <div className="row g-5 mb-8">
                {/* Live Timer */}
                <div className="col-md-4">
                    <div className="wo-kpi-card">
                        <div className="wo-kpi-header">
                            <span className="wo-kpi-label">ระยะเวลาดำเนินการ (LIVE)</span>
                            {(workOrder.current_phase?.phase_status === 'InProgress') && (
                                <span className="wo-live-dot" />
                            )}
                            {workOrder.current_phase?.phase_status === 'Paused' && (
                                <span className="wo-live-dot" style={{ background: '#fd7e14' }} />
                            )}
                        </div>
                        <LiveTimer
                            startDate={workOrder.current_phase?.start_date || workOrder.created_date}
                            breaks={workOrder.current_phase?.breaks}
                            isPaused={workOrder.current_phase?.phase_status === 'Paused'}
                        />
                        <div className="wo-kpi-sub mt-2">
                            <small className="text-muted">เริ่ม: {formatDateTime(workOrder.created_date)}</small>
                            {workOrder.current_phase?.phase_status === 'Paused' && (
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
                                {completedPhases}/{totalPhases} ขั้นตอน
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
                                <span className="fw-semibold text-gray-700">
                                    {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <button className="btn btn-sm btn-icon btn-light" onClick={handleNextDate}>
                                    <i className="bi bi-chevron-right" />
                                </button>
                            </div>
                        </div>
                        <div className="wo-card-body">
                            {workOrder.work_phases.length > 0 ? (
                                <div className="wo-timeline-container">
                                    {/* Timeline header */}
                                    <div className="wo-timeline-header">
                                        <div className="wo-timeline-label-col">ขั้นตอน</div>
                                        <div className="wo-timeline-bar-col">
                                            <div className="wo-timeline-hours">
                                                {Array.from({ length: 8 }, (_, i) => (
                                                    <span key={i}>{String(8 + i * 2).padStart(2, '0')}:00</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline rows */}
                                    {workOrder.work_phases.map((phase, idx) => (
                                        <div key={phase.work_phase_id} className="wo-timeline-row">
                                            <div className="wo-timeline-label-col">
                                                <div className="wo-phase-label">
                                                    <span className="wo-phase-dot" style={{ backgroundColor: getPhaseStatusColor(phase.phase_status) }} />
                                                    <span className="wo-phase-name">{phase.phase_name}</span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-bar-col">
                                                <div className="wo-timeline-track">
                                                    <div
                                                        className="wo-timeline-bar"
                                                        style={{
                                                            backgroundColor: getPhaseStatusColor(phase.phase_status),
                                                            left: `${Math.min((idx * 12) + 2, 85)}%`,
                                                            width: `${Math.max(15, 30 - idx * 3)}%`,
                                                            opacity: phase.phase_status === 'Pending' ? 0.5 : 1,
                                                        }}
                                                    >
                                                        <span className="wo-bar-text">
                                                            {getPhaseStatusLabel(phase.phase_status)}
                                                        </span>
                                                        {phase.employee_list.length > 0 && (
                                                            <span className="wo-bar-badge">{phase.employee_list.length} คน</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                            {workOrder.work_phases.length > 0 ? (
                                <div className="wo-phase-list">
                                    {workOrder.work_phases.map((phase, idx) => (
                                        <div key={phase.work_phase_id}
                                            className={`wo-phase-card ${workOrder.current_phase?.work_phase_id === phase.work_phase_id ? 'wo-phase-active' : ''}`}
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

                                            {/* Action Buttons */}
                                            <div className="d-flex align-items-center gap-2 px-3 pb-3 pt-2 border-top">
                                                {phase.phase_status === 'Pending' && (
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleStart(phase.work_phase_id)}
                                                        disabled={statusUpdating}
                                                    >
                                                        <i className="bi bi-play-fill me-1" /> เริ่มงาน
                                                    </button>
                                                )}
                                                {phase.phase_status === 'InProgress' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-warning"
                                                            onClick={() => handlePause(phase.work_phase_id)}
                                                            disabled={statusUpdating}
                                                        >
                                                            <i className="bi bi-pause-fill me-1" /> พักงาน
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleComplete(phase.work_phase_id)}
                                                            disabled={statusUpdating}
                                                        >
                                                            <i className="bi bi-check-lg me-1" /> เสร็จสิ้น
                                                        </button>
                                                    </>
                                                )}
                                                {phase.phase_status === 'Paused' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleResume(phase.work_phase_id)}
                                                            disabled={statusUpdating}
                                                        >
                                                            <i className="bi bi-play-fill me-1" /> ทำงานต่อ
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleComplete(phase.work_phase_id)}
                                                            disabled={statusUpdating}
                                                        >
                                                            <i className="bi bi-check-lg me-1" /> เสร็จสิ้น
                                                        </button>
                                                    </>
                                                )}
                                                {phase.phase_status === 'Completed' && (
                                                    <span className="d-inline-flex align-items-center text-success fw-semibold fs-7">
                                                        <i className="bi bi-check-circle-fill me-1" /> เสร็จสิ้นแล้ว
                                                    </span>
                                                )}
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

                    {/* Current Phase Info */}
                    {workOrder.current_phase && (
                        <div className="wo-card">
                            <div className="wo-card-header">
                                <h3 className="wo-card-title">ขั้นตอนปัจจุบัน</h3>
                                <span className="wo-phase-status-badge" style={{
                                    backgroundColor: getPhaseStatusBg(workOrder.current_phase.phase_status),
                                    color: getPhaseStatusColor(workOrder.current_phase.phase_status)
                                }}>
                                    {workOrder.current_phase.phase_status}
                                </span>
                            </div>
                            <div className="wo-card-body">
                                <div className="wo-current-phase-name">
                                    {workOrder.current_phase.phase_name}
                                </div>
                                <div className="d-flex flex-wrap gap-3 mt-3">
                                    <div className="wo-mini-stat">
                                        <i className="bi bi-calendar3 text-primary me-2" />
                                        เริ่ม: {formatDateTime(workOrder.current_phase.start_date)}
                                    </div>
                                    <div className="wo-mini-stat">
                                        <i className="bi bi-people text-primary me-2" />
                                        พนักงาน: {workOrder.current_phase.employee_list.length} คน
                                    </div>
                                </div>
                                {workOrder.current_phase.employee_list.length > 0 && (
                                    <div className="mt-4">
                                        {workOrder.current_phase.employee_list.map(emp => (
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
        </Content>
    );
};

export default WorkorderView;
