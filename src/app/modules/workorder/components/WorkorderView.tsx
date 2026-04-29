import React, { useState, useEffect, useMemo } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import { getWorkOrderById } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import './WorkorderView.css';
import { type WorkOrder, type WorkRun, type WorkRunDetail as WorkRunDetailType, type WorkRunBreak, type WorkRunCost } from '../../../type_interface/WorkOrderType';
import { formatIntegerInput } from '../../../utils/input_format_utils';
import Swal from "sweetalert2";
import { createWorkRun, getSalesItemTestResults, getWorkRunsCostByWorkOrder } from '../../../services/workRunService';
import type { WorkRunSourceAllocation, TestResultSourceAllocation, SalesItemTestResult } from '../../../services/workRunService';

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

const getRunStatusVariant = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return 'warning';
        case 'COMPLETED': return 'success';
        case 'PAUSED': return 'info';
        case 'PENDING': return 'secondary';
        default: return 'secondary';
    }
};

const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};


const formatTimer = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const EMP_AVATAR_COLORS = [
    'linear-gradient(135deg, #50cd89, #1a9c58)',
    'linear-gradient(135deg, #3699ff, #0d6efd)',
    'linear-gradient(135deg, #7239ea, #5014d0)',
    'linear-gradient(135deg, #181c32, #3f4254)',
];

// --- Main Component ---
const WorkorderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [workRuns, setWorkRuns] = useState<WorkRun[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [workRunDetails, setWorkRunDetails] = useState<WorkRunDetailType[]>([]);
    const [costLoading, setCostLoading] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [activePage, setActivePage] = useState(0);

    const [createRunQty, setCreateRunQty] = useState<number>(1);
    const [createRunMode, setCreateRunMode] = useState<'none' | 'from_runs' | 'from_test_results'>('none');
    const [sourceAllocations, setSourceAllocations] = useState<Record<number, number>>({});
    const [testResultAllocations, setTestResultAllocations] = useState<Record<number, number>>({});
    const [salesItemTestResults, setSalesItemTestResults] = useState<SalesItemTestResult[]>([]);
    const [showCreateRunModal, setShowCreateRunModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [loadingTestResults, setLoadingTestResults] = useState(false);

    const sourceTotal = Object.values(sourceAllocations).reduce((sum, v) => sum + (v || 0), 0);
    const testResultTotal = Object.values(testResultAllocations).reduce((sum, v) => sum + (v || 0), 0);
    const completedRunsWithDefects = workRuns.filter(r => r.status === 'COMPLETED' && (r.defect_qty ?? 0) > 0);

    const fetchWorkOrder = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkOrderById(Number(id));
            if (result && result.success && result.data) {
                setWorkOrder(result.data);
                const runs: WorkRun[] = result.data.work_runs || [];
                setWorkRuns(runs);

                // fetch cost data for all started work runs in a single call
                if (runs.some(r => r.start_date !== null)) {
                    setCostLoading(true);
                    getWorkRunsCostByWorkOrder(Number(id))
                        .then(result => {
                            if (result?.success && result.data) {
                                setWorkRunDetails(result.data as WorkRunDetailType[]);
                            }
                        })
                        .catch(() => {})
                        .finally(() => setCostLoading(false));
                } else {
                    setWorkRunDetails([]);
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
        fetchWorkOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAllocationChange = (workRunId: number, value: number, maxQty: number) => {
        setSourceAllocations(prev => ({ ...prev, [workRunId]: Math.min(Math.max(0, value), maxQty) }));
    };

    const openCreateRunModal = () => {
        setCreateRunQty(workOrder?.quantity || 1);
        setCreateRunMode('none');
        setSourceAllocations({});
        setTestResultAllocations({});
        setSalesItemTestResults([]);
        setShowCreateRunModal(true);
    };

    const fetchSalesItemTestResults = async () => {
        if (!workOrder?.sales_item?.sales_item_id) return;
        setLoadingTestResults(true);
        try {
            const result = await getSalesItemTestResults(workOrder.sales_item.sales_item_id);
            if (result && result.success && result.data) {
                setSalesItemTestResults(result.data);
            } else {
                setSalesItemTestResults([]);
            }
        } catch {
            setSalesItemTestResults([]);
        } finally {
            setLoadingTestResults(false);
        }
    };

    const handleCreateWorkRun = async () => {
        if (!workOrder) return;
        setCreating(true);
        try {
            let payload: { quantity: number; rework_sources?: WorkRunSourceAllocation[]; test_result_sources?: TestResultSourceAllocation[] };
            if (createRunMode === 'from_runs') {
                const source_work_runs: WorkRunSourceAllocation[] = Object.entries(sourceAllocations)
                    .filter(([, qty]) => qty > 0)
                    .map(([runId, qty]) => ({ source_work_run_id: Number(runId), qty }));
                payload = { quantity: sourceTotal, rework_sources: source_work_runs };
            } else if (createRunMode === 'from_test_results') {
                const test_result_sources: TestResultSourceAllocation[] = Object.entries(testResultAllocations)
                    .filter(([, qty]) => qty > 0)
                    .map(([runId, qty]) => ({ test_result_id: Number(runId), qty }));
                payload = { quantity: testResultTotal, test_result_sources };
            } else {
                payload = { quantity: createRunQty };
            }
            const result = await createWorkRun(workOrder.work_order_id, payload);
            if (result && result.success) {
                setShowCreateRunModal(false);
                setCreateRunQty(1);
                setSourceAllocations({});
                Swal.fire({ title: 'สร้าง Work Run สำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => fetchWorkOrder());
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถสร้าง Work Run ได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setCreating(false);
        }
    };

    // --- Cost calculation across all work runs ---
    // For COMPLETED runs: use stored cost from backend (t_work_run_cost)
    // For active runs: compute live from machine rates + labor + material
    const runCosts = useMemo(() => {
        const calcSec = (entry: { from_time: string; to_time: string | null }, breaks: WorkRunBreak[]) => {
            const s = new Date(entry.from_time).getTime();
            const e = entry.to_time ? new Date(entry.to_time).getTime() : Date.now();
            const brkMs = breaks.reduce((sum, b) => {
                const bS = new Date(b.break_start).getTime();
                const bE = b.break_end ? new Date(b.break_end).getTime() : Date.now();
                return sum + Math.max(0, Math.min(e, bE) - Math.max(s, bS));
            }, 0);
            return Math.max(0, e - s - brkMs) / 1000;
        };

        return workRunDetails.map(wr => {
            // Use stored cost when work run is COMPLETED
            const stored: WorkRunCost | null = wr.cost ?? null;
            if (wr.status?.toUpperCase() === 'COMPLETED' && stored) {
                return {
                    work_run_id: wr.work_run_id,
                    lot_number: wr.lot_number,
                    status: wr.status,
                    material: stored.material_cost ?? 0,
                    depreciation: stored.depreciation_cost ?? 0,
                    maintenance: stored.maintenance_cost ?? 0,
                    labor: stored.labor_cost ?? 0,
                    total: stored.total_cost ?? 0,
                };
            }

            // Live computation for INPROGRESS / PAUSED runs
            const breaks = wr.breaks ?? [];

            const material = (wr.required_items ?? []).reduce((sum, item) => {
                const ml = item.material_list;
                const cpu = ml ? (ml.cost_per_unit ?? (ml.quantity > 0 ? ml.cost_price / ml.quantity : 0)) : 0;
                return sum + cpu * item.quantity;
            }, 0);

            let depreciation = 0, maintenance = 0;
            (wr.machines ?? []).forEach(m => {
                const sec = calcSec(m, breaks);
                const running = m.to_time === null;
                depreciation += running ? (m.cost?.depreciation_per_second ?? 0) * sec : (m.cost?.depreciation_cost ?? 0);
                maintenance += running ? (m.cost?.maintenance_rate_per_second ?? 0) * sec : (m.cost?.maintenance_cost ?? 0);
            });

            const labor = (wr.assignments ?? []).reduce((sum, a) => {
                const sec = calcSec(a, breaks);
                const salary = a.employee?.salary_base ?? 0;
                return sum + (salary / 30 / 8 / 3600) * sec;
            }, 0);

            return {
                work_run_id: wr.work_run_id,
                lot_number: wr.lot_number,
                status: wr.status,
                material,
                depreciation,
                maintenance,
                labor,
                total: material + depreciation + maintenance + labor,
            };
        });
    }, [workRunDetails]);

    const totalCosts = useMemo(() =>
        runCosts.reduce(
            (acc, r) => ({
                material: acc.material + r.material,
                depreciation: acc.depreciation + r.depreciation,
                maintenance: acc.maintenance + r.maintenance,
                labor: acc.labor + r.labor,
                total: acc.total + r.total,
            }),
            { material: 0, depreciation: 0, maintenance: 0, labor: 0, total: 0 }
        ), [runCosts]);

    const calcElapsedMs = (fromTime: string, toTime: string | null, breaks: WorkRunBreak[]): number => {
        const s = new Date(fromTime).getTime();
        const e = toTime ? new Date(toTime).getTime() : now;
        const brkMs = breaks.reduce((sum, b) => {
            const bS = new Date(b.break_start).getTime();
            const bE = b.break_end ? new Date(b.break_end).getTime() : now;
            return sum + Math.max(0, Math.min(e, bE) - Math.max(s, bS));
        }, 0);
        return Math.max(0, e - s - brkMs);
    };

    const activeRunDetails = workRunDetails.filter(wr => wr.status?.toUpperCase() === 'INPROGRESS');
    const ACTIVE_RUNS_PER_PAGE = 3;
    const totalActivePages = Math.ceil(activeRunDetails.length / ACTIVE_RUNS_PER_PAGE);
    const pagedActiveRuns = activeRunDetails.slice(
        activePage * ACTIVE_RUNS_PER_PAGE,
        (activePage + 1) * ACTIVE_RUNS_PER_PAGE,
    );

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
            <div className="wo-page-header mb-6">
                <div className="wo-page-header-left">
                    <button className="wo-back-btn" onClick={() => navigate('/workorder/workorders_list')}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <div className="wo-header-vdivider" />
                    <span className="wo-header-title">การผลิต <strong>#{workOrder.doc_num}</strong></span>
                    <div className="wo-header-vdivider" />
                    <span className="wo-header-info">
                        <i className="bi bi-box-seam me-1" />สินค้า: {workOrder.sales_item?.item_name || '-'}
                    </span>
                    <div className="wo-header-vdivider" />
                    <span className="wo-header-info">
                        <i className="bi bi-file-text me-1" />ใบสั่งผลิต: {workOrder.work_order_code}
                    </span>
                </div>
                <div className="wo-page-header-right">
                    <div className={`wo-status-pill${workOrder.status?.toUpperCase() === 'COMPLETED' ? ' wo-status-pill-green' : workOrder.status?.toUpperCase() === 'PENDING' ? ' wo-status-pill-grey' : ''}`}>
                        <span className="wo-status-dot" />
                        {workOrder.status?.toUpperCase() === 'INPROGRESS' ? 'IN PROGRESS' :
                         workOrder.status?.toUpperCase() === 'COMPLETED' ? 'COMPLETED' :
                         workOrder.status?.toUpperCase() === 'PENDING' ? 'PENDING' : workOrder.status}
                    </div>
                    <button className="wo-create-btn bg-primary" onClick={openCreateRunModal}>
                        <i className="bi bi-pencil-square text-white" />
                        สร้าง Work Run
                    </button>
                </div>
            </div>

            {/* Active Runs — Live Monitoring Cards */}
            {activeRunDetails.length > 0 && (
                <div className="mb-8">

                    {/* Section header */}
                    <div className="d-flex align-items-center gap-3 mb-5">
                        <div className="wo-pulse-blue" />
                        <span className="fw-bold text-gray-900 fs-5">กำลังดำเนินการอยู่</span>
                        <span className="badge badge-light-primary fw-bold">{activeRunDetails.length} Work Run</span>
                        {totalActivePages > 1 && (
                            <div className="ms-auto d-flex align-items-center gap-2">
                                <button
                                    className="wo-page-btn"
                                    disabled={activePage === 0}
                                    onClick={() => setActivePage(p => Math.max(0, p - 1))}
                                >
                                    <i className="bi bi-chevron-left" />
                                </button>
                                <span className="text-muted fs-8 fw-semibold" style={{ minWidth: 40, textAlign: 'center' }}>
                                    {activePage + 1} / {totalActivePages}
                                </span>
                                <button
                                    className="wo-page-btn"
                                    disabled={activePage >= totalActivePages - 1}
                                    onClick={() => setActivePage(p => Math.min(totalActivePages - 1, p + 1))}
                                >
                                    <i className="bi bi-chevron-right" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cards grid — paginated, 3 per page */}
                    <div className="row g-4 wo-lmc-fade" key={activePage}>
                        {pagedActiveRuns.map(wr => {
                            const activeAssignments = wr.assignments.filter(a => a.to_time === null);
                            const activeMachines    = wr.machines.filter(m => m.to_time === null);
                            const runElapsed = wr.start_date ? calcElapsedMs(wr.start_date, wr.end_date, wr.breaks) : 0;

                            return (
                                <div key={wr.work_run_id} className="col-12 col-lg-6 col-xl-4">
                                    <div
                                        className="wo-lmc-card"
                                        onClick={() => navigate(`/workorder/work_run/${wr.work_run_id}`)}
                                    >
                                        <div className="p-5">

                                            {/* Top row: Lot Number (left) + RUNNING (right) */}
                                            <div className="d-flex align-items-start justify-content-between mb-3">
                                                <div>
                                                    <span className="wo-card-lot-label">Lot Number</span>
                                                    <span className="wo-card-lot-number">{wr.lot_number || `WR-${wr.work_run_id}`}</span>
                                                    <div className="mt-2">
                                                        <span className="badge badge-light-primary fw-bold fs-8">
                                                            <i className="bi bi-box-seam me-1" style={{ fontSize: 10 }} />
                                                            {wr.quantity} ชิ้น
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                    <div className="wo-pulse-blue" />
                                                    <span className="text-primary fw-bold fs-8">RUNNING</span>
                                                </div>
                                            </div>

                                            <div className="separator separator-dashed mb-4" />

                                            {/* Bottom row: Staff + Machine (left) | Timer (right) */}
                                            <div className="d-flex align-items-end justify-content-between gap-4">
                                                <div style={{ minWidth: 0 }}>
                                                    {/* Staff */}
                                                    <div className="mb-3">
                                                        {activeAssignments.length === 0 ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-person text-muted fs-7" />
                                                                <span className="text-muted fs-8 fst-italic">ยังไม่มีพนักงาน</span>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="symbol symbol-30px flex-shrink-0">
                                                                    <span className="symbol-label bg-light-primary text-primary fw-bold fs-8">
                                                                        {activeAssignments[0].employee?.employee_first_name?.[0] ?? '?'}
                                                                    </span>
                                                                </div>
                                                                <span className="fw-semibold text-gray-800 fs-7 text-truncate">
                                                                    {activeAssignments[0].employee?.employee_first_name} {activeAssignments[0].employee?.employee_last_name}
                                                                    {activeAssignments.length > 1 && (
                                                                        <span className="text-muted ms-1 fs-8">+{activeAssignments.length - 1} คน</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Machine */}
                                                    <div>
                                                        {activeMachines.length === 0 ? (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-gear text-muted fs-7" />
                                                                <span className="text-muted fs-8 fst-italic">ยังไม่มีเครื่องจักร</span>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="symbol symbol-30px flex-shrink-0">
                                                                    <span className="symbol-label bg-light-info text-info fw-bold fs-8">
                                                                        <i className="bi bi-gear-fill" />
                                                                    </span>
                                                                </div>
                                                                <span className="fw-semibold text-gray-800 fs-7 text-truncate">
                                                                    {activeMachines[0].machine?.machine_name || activeMachines[0].machine?.machine_code || `#${activeMachines[0].machine_id}`}
                                                                    {activeMachines.length > 1 && (
                                                                        <span className="text-muted ms-1 fs-8">+{activeMachines.length - 1}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Timer — right side */}
                                                <div className="flex-shrink-0">
                                                    <div className="wo-lmc-timer-large">{formatTimer(runElapsed)}</div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}

            <div className="row g-5 mb-8">
                {/* Work Runs List */}
                <div className="col-lg-7">
                    <div className="wo-card">
                        <div className="wo-card-header">
                            <h3 className="wo-card-title">Work Runs</h3>
                            <span className="badge badge-light-primary">{workRuns.length} รายการ</span>
                        </div>
                        <div className="wo-card-body">
                            {workRuns.length === 0 ? (
                                <div className="text-center text-muted py-10">
                                    <i className="bi bi-inbox fs-3x text-gray-300 d-block mb-3" />
                                    ยังไม่มี Work Run สำหรับใบสั่งผลิตนี้
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {workRuns.map(run => (
                                        <div
                                            key={run.work_run_id}
                                            className="border rounded p-4 cursor-pointer"
z                                           onClick={() => navigate(`/workorder/work_run/${run.work_run_id}`)}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)';
                                                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f4ff';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                                (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-bold text-gray-800 fs-6">
                                                            {run.lot_number || `Work Run #${run.work_run_id}`}
                                                        </span>
                                                        <span className="text-muted fs-8">
                                                            {run.start_date ? `เริ่ม: ${formatDateTime(run.start_date)}` : 'ยังไม่เริ่ม'}
                                                            {run.end_date ? ` • สิ้นสุด: ${formatDateTime(run.end_date)}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="d-flex flex-column align-items-end gap-1">
                                                        <span className={`badge badge-light-${getRunStatusVariant(run.status)} fw-bold`}>
                                                            {getRunStatusLabel(run.status)}
                                                        </span>
                                                        <span className="text-muted fs-8">จำนวน: {run.quantity} ชิ้น</span>
                                                    </div>
                                                    {run.usable_qty != null && (
                                                        <span className="badge badge-light-success fs-8">ผ่าน {run.usable_qty}</span>
                                                    )}
                                                    {(run.defect_qty ?? 0) > 0 && (
                                                        <span className="badge badge-light-danger fs-8">เสีย {run.defect_qty}</span>
                                                    )}
                                                    <i className="bi bi-chevron-right text-muted" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                                        <span className="wo-item-value fw-bold">{workOrder.sales_item.quantity}</span>
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

            {/* Cost Summary from all Work Runs */}
            <div className="card shadow-sm mb-8">
                <div className="card-header border-0 pt-5">
                    <div className="card-title">
                        <span className="card-label fw-bold text-gray-900 fs-5">
                            <i className="bi bi-calculator me-2 text-primary"></i>ต้นทุนรวมจากทุก Work Run
                        </span>
                    </div>
                    {costLoading && (
                        <div className="card-toolbar">
                            <span className="spinner-border spinner-border-sm text-primary me-2" />
                            <span className="text-muted fs-8">กำลังโหลดต้นทุน...</span>
                        </div>
                    )}
                </div>
                <div className="card-body pt-4 pb-6">
                    {/* KPI summary row */}
                    <div className="row g-4 mb-6">
                        {[
                            { label: 'ค่าวัตถุดิบ', value: totalCosts.material, icon: 'bi-box-seam', color: 'info', bg: '#e0f9ff' },
                            { label: 'ค่าเสื่อมราคา', value: totalCosts.depreciation, icon: 'bi-graph-down-arrow', color: '', bg: '#e7f1ff' },
                            { label: 'ค่าซ่อมบำรุง', value: totalCosts.maintenance, icon: 'bi-wrench', color: 'warning', bg: '#fff3e0' },
                            { label: 'ค่าพนักงาน', value: totalCosts.labor, icon: 'bi-people-fill', color: 'success', bg: '#d1f5e4' },
                            { label: 'รวมทั้งหมด', value: totalCosts.total, icon: 'bi-cash-stack', color: 'danger', bg: '#fde8e8', bold: true },
                        ].map(item => (
                            <div key={item.label} className="col-6 col-md-4 col-lg">
                                <div className="rounded p-4 h-100" style={{ backgroundColor: item.bg, border: `1px solid ${item.bg}` }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className={`bi ${item.icon} text-${item.color} fs-6`} />
                                        <span className="text-gray-600 fs-8 fw-semibold">{item.label}</span>
                                    </div>
                                    {costLoading ? (
                                        <div className="placeholder-wave"><span className="placeholder col-8 rounded" /></div>
                                    ) : (
                                        <span className={`fw-${item.bold ? 'bolder' : 'bold'} fs-${item.bold ? '4' : '5'} text-${item.color}`}>
                                            ฿{item.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Per-run breakdown table */}
                    {!costLoading && runCosts.length > 0 && (
                        <div className="table-responsive">
                            <table className="table align-middle table-row-bordered fs-7 gy-3">
                                <thead>
                                    <tr className="text-muted fw-bold fs-8 text-uppercase border-bottom border-gray-200">
                                        <th>Work Run</th>
                                        <th>สถานะ</th>
                                        <th className="text-end">ค่าวัตถุดิบ</th>
                                        <th className="text-end">ค่าเสื่อมราคา</th>
                                        <th className="text-end">ค่าซ่อมบำรุง</th>
                                        <th className="text-end">ค่าพนักงาน</th>
                                        <th className="text-end">รวม</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 fw-semibold">
                                    {runCosts.map(r => (
                                        <tr
                                            key={r.work_run_id}
                                            className="cursor-pointer"
                                            onClick={() => navigate(`/workorder/work_run/${r.work_run_id}`)}
                                            style={{ transition: 'background 0.12s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f5f8ff')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                                        >
                                            <td>
                                                <span className="fw-bold text-gray-800">
                                                    {r.lot_number || `#${r.work_run_id}`}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-light-${getRunStatusVariant(r.status)}`}>
                                                    {getRunStatusLabel(r.status)}
                                                </span>
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.material > 0 ? `฿${r.material.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.depreciation > 0 ? `฿${r.depreciation.toFixed(4)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.maintenance > 0 ? `฿${r.maintenance.toFixed(4)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end text-gray-700">
                                                {r.labor > 0 ? `฿${r.labor.toFixed(2)}` : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="text-end fw-bold text-primary">
                                                ฿{r.total.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="fw-bolder border-top-2 border-gray-300">
                                        <td colSpan={2} className="text-end text-gray-600 fs-7 pt-3">รวมทั้งหมด</td>
                                        <td className="text-end text-info pt-3">฿{totalCosts.material.toFixed(2)}</td>
                                        <td className="text-end text-primary pt-3">฿{totalCosts.depreciation.toFixed(4)}</td>
                                        <td className="text-end text-warning pt-3">฿{totalCosts.maintenance.toFixed(4)}</td>
                                        <td className="text-end text-success pt-3">฿{totalCosts.labor.toFixed(2)}</td>
                                        <td className="text-end text-danger fs-6 pt-3">฿{totalCosts.total.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {!costLoading && runCosts.length === 0 && workRuns.length > 0 && (
                        <div className="text-center text-muted py-6 fs-7">
                            <i className="bi bi-hourglass-split fs-3x text-gray-300 d-block mb-3" />
                            Work Run ยังไม่ได้เริ่มดำเนินการ จึงยังไม่มีข้อมูลต้นทุน
                        </div>
                    )}

                    {!costLoading && workRuns.length === 0 && (
                        <div className="text-center text-muted py-6 fs-7">
                            ยังไม่มี Work Run
                        </div>
                    )}
                </div>
            </div>

            {/* Create Work Run Modal */}
            <Modal show={showCreateRunModal} onHide={() => setShowCreateRunModal(false)} centered size='lg'>
                <Modal.Header closeButton><Modal.Title className='fw-bold'>สร้าง Work Run</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='mb-6'>
                        <label className='form-label fw-bold mb-3'>แหล่งที่มาของ Work Run</label>
                        <div className='d-flex gap-4'>
                            <label className='d-flex align-items-center gap-2 cursor-pointer'>
                                <input
                                    type='radio'
                                    className='form-check-input mt-0'
                                    checked={createRunMode === 'none'}
                                    onChange={() => { setCreateRunMode('none'); setSourceAllocations({}); }}
                                />
                                <span className='fw-semibold text-gray-800'>สร้างใหม่</span>
                            </label>
                            <label className='d-flex align-items-center gap-2 cursor-pointer'>
                                <input
                                    type='radio'
                                    className='form-check-input mt-0'
                                    checked={createRunMode === 'from_runs'}
                                    onChange={() => setCreateRunMode('from_runs')}
                                />
                                <span className='fw-semibold text-gray-800'>จาก Work Runs ที่มีของเสีย</span>
                            </label>
                            <label className='d-flex align-items-center gap-2 cursor-pointer'>
                                <input
                                    type='radio'
                                    className='form-check-input mt-0'
                                    checked={createRunMode === 'from_test_results'}
                                    onChange={() => {
                                        setCreateRunMode('from_test_results');
                                        fetchSalesItemTestResults();
                                    }}
                                />
                                <span className='fw-semibold text-gray-800'>จากผลทดสอบของสินค้าชนิดเดียวกัน</span>
                            </label>
                        </div>
                    </div>

                    {createRunMode === 'none' && (
                        <div className='mb-4'>
                            <label className='form-label fw-bold required'>จำนวนที่ต้องการผลิต</label>
                            <input
                                type='text'
                                className='form-control form-control-solid'
                                value={createRunQty === 0 ? '' : String(createRunQty)}
                                onChange={(e) => {
                                    const s = formatIntegerInput(e.target.value);
                                    setCreateRunQty(s === '' ? 0 : Number(s));
                                }}
                            />
                        </div>
                    )}

                    {createRunMode === 'from_runs' && (
                        <div>
                            {completedRunsWithDefects.length === 0 ? (
                                <div className='text-center text-muted py-8'>
                                    <i className='bi bi-exclamation-circle fs-2x text-gray-300 d-block mb-3'></i>
                                    ไม่มี Work Run ที่เสร็จสิ้นและมีของเสีย
                                </div>
                            ) : (
                                <>
                                    <div className='table-responsive mb-4'>
                                        <table className='table align-middle table-row-bordered fs-7 gy-3'>
                                            <thead>
                                                <tr className='text-muted fw-bold fs-8 text-uppercase border-bottom border-gray-200'>
                                                    <th>Work Run</th>
                                                    <th className='text-center'>ของเสียทั้งหมด</th>
                                                    <th className='text-center'>ผลการทดสอบ</th>
                                                    <th className='text-center' style={{ width: 140 }}>จำนวนที่เลือก</th>
                                                </tr>
                                            </thead>
                                            <tbody className='text-gray-700 fw-semibold'>
                                                {completedRunsWithDefects.map(run => (
                                                    <tr key={run.work_run_id}>
                                                        <td>
                                                            <span className='text-gray-800 fw-bold'>#{run.work_run_id}</span>
                                                        </td>
                                                        <td className='text-center'>
                                                            <span className='text-danger fw-bold'>{run.defect_qty}</span>
                                                        </td>
                                                        <td className='text-center'>
                                                            <span className='badge badge-light-success fw-bold fs-8'>
                                                                {run.usable_qty != null ? `ผ่าน ${run.usable_qty}` : '-'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type='text'
                                                                className='form-control form-control-sm form-control-solid text-center'
                                                                value={String(sourceAllocations[run.work_run_id] ?? 0)}
                                                                onChange={(e) => {
                                                                    const s = formatIntegerInput(e.target.value);
                                                                    handleAllocationChange(run.work_run_id, s === '' ? 0 : Number(s), run.defect_qty!);
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className='d-flex align-items-center justify-content-end gap-3 pt-2 border-top border-gray-200'>
                                        <span className='text-muted fs-7 fw-semibold'>จำนวนรวมที่จะผลิต:</span>
                                        <span className='badge badge-light-primary fw-bold fs-6 px-4 py-2'>{sourceTotal} ชิ้น</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {createRunMode === 'from_test_results' && (
                        <div>
                            {loadingTestResults ? (
                                <div className='text-center py-8'>
                                    <span className='spinner-border spinner-border-sm align-middle me-2'></span>
                                    <span className='text-muted'>กำลังโหลดผลทดสอบ...</span>
                                </div>
                            ) : salesItemTestResults.filter(r => (r.failed_item_qty ?? 0) > 0).length === 0 ? (
                                <div className='text-center text-muted py-8'>
                                    <i className='bi bi-exclamation-circle fs-2x text-gray-300 d-block mb-3'></i>
                                    ไม่มีผลทดสอบที่มีของเสีย
                                </div>
                            ) : (
                                <>
                                    <div className='table-responsive mb-4'>
                                        <table className='table align-middle table-row-bordered fs-7 gy-3'>
                                            <thead>
                                                <tr className='text-muted fw-bold fs-8 text-uppercase border-bottom border-gray-200'>
                                                    <th>ผลทดสอบ</th>
                                                    <th className='text-center'>Work Run</th>
                                                    <th className='text-center'>ของเสีย</th>
                                                    <th className='text-center'>วันที่</th>
                                                    <th className='text-center' style={{ width: 140 }}>จำนวนที่เลือก</th>
                                                </tr>
                                            </thead>
                                            <tbody className='text-gray-700 fw-semibold'>
                                                {salesItemTestResults
                                                    .filter(r => (r.failed_item_qty ?? 0) > 0)
                                                    .map(result => (
                                                        <tr key={result.test_result_id}>
                                                            <td>
                                                                <span className='text-gray-800 fw-bold'>#{result.test_result_id}</span>
                                                                {result.doc_num && (
                                                                    <span className='text-muted fs-8 ms-2'>{result.doc_num}</span>
                                                                )}
                                                            </td>
                                                            <td className='text-center'>
                                                                {result.work_run_id != null
                                                                    ? <span className='badge badge-light-secondary fw-bold'>#{result.work_run_id}</span>
                                                                    : <span className='text-muted'>-</span>
                                                                }
                                                            </td>
                                                            <td className='text-center'>
                                                                <span className='text-danger fw-bold'>{result.failed_item_qty}</span>
                                                            </td>
                                                            <td className='text-center'>
                                                                <span className='text-gray-600 fs-8'>
                                                                    {result.created_date
                                                                        ? new Date(result.created_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                                                                        : '-'
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type='text'
                                                                    className='form-control form-control-sm form-control-solid text-center'
                                                                    value={String(testResultAllocations[result.test_result_id] ?? 0)}
                                                                    onChange={(e) => {
                                                                        const s = formatIntegerInput(e.target.value);
                                                                        const val = Math.min(Math.max(0, s === '' ? 0 : Number(s)), result.failed_item_qty);
                                                                        setTestResultAllocations(prev => ({ ...prev, [result.test_result_id]: val }));
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className='d-flex align-items-center justify-content-end gap-3 pt-2 border-top border-gray-200'>
                                        <span className='text-muted fs-7 fw-semibold'>จำนวนรวมที่จะผลิต:</span>
                                        <span className='badge badge-light-primary fw-bold fs-6 px-4 py-2'>{testResultTotal} ชิ้น</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowCreateRunModal(false)}>ยกเลิก</button>
                    <button
                        className='btn btn-primary fw-bold'
                        onClick={handleCreateWorkRun}
                        disabled={
                            creating ||
                            (createRunMode === 'none' && createRunQty < 1) ||
                            (createRunMode === 'from_runs' && sourceTotal < 1) ||
                            (createRunMode === 'from_test_results' && testResultTotal < 1)
                        }
                    >
                        {creating ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-plus-lg me-1'></i>}
                        สร้าง Work Run
                    </button>
                </Modal.Footer>
            </Modal>
        </Content>
    );
};

export default WorkorderView;
