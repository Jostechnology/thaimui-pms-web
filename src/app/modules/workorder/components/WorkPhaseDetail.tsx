import React, { useState, useEffect, useMemo } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getWorkRunDetail } from '../../../services/workRunService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { WorkRunCostDetailData } from '../../../type_interface/WorkOrderType';

// --- Helpers ---
const formatDuration = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h 00m`;
    return `${m}m`;
};

const formatNumber = (n: number): string =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

const getStatusBadgeClass = (status: string): string => {
    const s = status?.toLowerCase().replace(/\s/g, '');
    if (s === 'inprogress') return 'badge bg-primary';
    if (s === 'completed') return 'badge bg-success';
    if (s === 'paused') return 'badge bg-warning text-dark';
    return 'badge bg-secondary';
};

const getStatusLabel = (status: string): string => {
    switch (status?.toUpperCase()) {
        case 'INPROGRESS': return 'IN PROGRESS';
        case 'COMPLETED': return 'COMPLETED';
        case 'PAUSED': return 'PAUSED';
        case 'PENDING': return 'PENDING';
        default: return status?.toUpperCase() || 'UNKNOWN';
    }
};

const avatarBgs = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
];

type SortField = 'time' | 'cost';
type SortDir = 'asc' | 'desc';

// --- Main Component ---
// This component shows the cost/time breakdown for a Work Run
// Route: /workorder/work_run_cost/:workRunId
const WorkPhaseDetail: React.FC = () => {
    const navigate = useNavigate();
    // Supports both old route (:phaseId) and new route (:workRunId) — both map to work run id now
    const params = useParams<{ phaseId?: string; workRunId?: string }>();
    const runId = params.workRunId ?? params.phaseId;

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [data, setData] = useState<WorkRunCostDetailData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('cost');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkRunDetail(Number(runId));
            if (result?.success && result.data) {
                setData(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลรายละเอียด Work Run ได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [runId]);

    const filteredEmployees = useMemo(() => {
        if (!data) return [];
        let list = data.employee_breakdown;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(emp =>
                `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase().includes(q)
            );
        }
        return [...list].sort((a, b) => {
            const valA = sortField === 'time' ? a.time_spent_seconds : a.net_cost;
            const valB = sortField === 'time' ? b.time_spent_seconds : b.net_cost;
            return sortDir === 'asc' ? valA - valB : valB - valA;
        });
    }, [data, search, sortField, sortDir]);

    const totalPages = Math.ceil(filteredEmployees.length / pageSize);
    const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    if (dataLoading) {
        return (
            <Content>
                <div className="d-flex justify-content-center align-items-center py-20">
                    <span className="spinner-border spinner-border-lg text-primary" />
                    <span className="ms-3 fs-5 text-muted">กำลังโหลดข้อมูล...</span>
                </div>
            </Content>
        );
    }

    if (!data) {
        return (
            <Content>
                <div className="d-flex flex-column align-items-center py-20">
                    <i className="bi bi-exclamation-triangle fs-1 text-warning mb-4" />
                    <span className="text-muted fs-5">ไม่พบข้อมูล Work Run</span>
                    <button className="btn btn-primary mt-5" onClick={() => navigate(-1)}>กลับ</button>
                </div>
            </Content>
        );
    }

    return (
        <Content>
            <div className="container-fluid" style={{ maxWidth: 1100 }}>
                {/* Header */}
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-5">
                    <div>
                        <h1 className="fw-bolder text-dark mb-1 d-flex align-items-center gap-3 fs-2">
                            {data.lot_number || `Work Run #${data.work_run_id}`}
                            <span className={`${getStatusBadgeClass(data.status)} fs-8 px-3 py-1`}>
                                {getStatusLabel(data.status)}
                            </span>
                        </h1>
                        <div className="d-flex align-items-center gap-4 text-muted fs-7 mt-1">
                            {data.start_date && (
                                <span><i className="bi bi-play-circle me-1" />เริ่ม: {formatDateTime(data.start_date)}</span>
                            )}
                            {data.end_date && (
                                <span><i className="bi bi-stop-circle me-1" />สิ้นสุด: {formatDateTime(data.end_date)}</span>
                            )}
                        </div>
                    </div>
                    <button
                        className="btn btn-light-primary btn-sm d-flex align-items-center gap-1"
                        onClick={() => navigate(`/workorder/work_run/${data.work_run_id}`)}
                    >
                        <i className="bi bi-arrow-left" /> กลับ Work Run
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="row g-4 mb-5">
                    <div className="col-md-4">
                        <div className="card border border-gray-200 shadow-sm h-100">
                            <div className="card-body d-flex justify-content-between align-items-center py-4 px-5">
                                <div>
                                    <div className="text-primary fw-bold fs-7 mb-2">เวลาทำงานทั้งหมด</div>
                                    <div className="fw-bolder text-dark" style={{ fontSize: '2rem', lineHeight: 1 }}>
                                        {formatDuration(data.total_work_seconds)}
                                    </div>
                                    <div className="text-muted fs-8 mt-1">หักเวลาพักแล้ว</div>
                                </div>
                                <div className="d-flex align-items-center justify-content-center rounded-3 bg-light-primary" style={{ width: 48, height: 48 }}>
                                    <i className="bi bi-clock text-primary fs-3" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card border border-gray-200 shadow-sm h-100">
                            <div className="card-body d-flex justify-content-between align-items-center py-4 px-5">
                                <div>
                                    <div className="text-success fw-bold fs-7 mb-2">ค่าแรงงานทั้งหมด</div>
                                    <div className="fw-bolder text-dark" style={{ fontSize: '2rem', lineHeight: 1 }}>
                                        {formatNumber(data.total_labor_cost)}
                                        <span className="text-muted fw-semibold fs-6 ms-2">THB</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-center rounded-3 bg-light-success" style={{ width: 48, height: 48 }}>
                                    <i className="bi bi-cash-stack text-success fs-3" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card border border-gray-200 shadow-sm h-100">
                            <div className="card-body d-flex justify-content-between align-items-center py-4 px-5">
                                <div>
                                    <div className="text-info fw-bold fs-7 mb-2">เครื่องจักร</div>
                                    <div className="fw-bolder text-dark" style={{ fontSize: '2rem', lineHeight: 1 }}>
                                        {data.machine_breakdown.length}
                                        <span className="text-muted fw-semibold fs-6 ms-2">เครื่อง</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-center rounded-3 bg-light-info" style={{ width: 48, height: 48 }}>
                                    <i className="bi bi-gear text-info fs-3" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Machine Breakdown */}
                {data.machine_breakdown.length > 0 && (
                    <div className="card border border-gray-200 shadow-sm mb-5">
                        <div className="card-header border-0 d-flex align-items-center gap-2 fw-bold fs-5 text-dark py-4">
                            <i className="bi bi-gear text-info" />
                            เวลาใช้งานเครื่องจักร
                        </div>
                        <div className="card-body pt-0 px-4 pb-4">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead>
                                        <tr className="text-muted fw-bold fs-8 text-uppercase border-bottom">
                                            <th className="ps-3">เครื่องจักร</th>
                                            <th>เริ่ม</th>
                                            <th>สิ้นสุด</th>
                                            <th className="text-end">เวลาที่ใช้</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.machine_breakdown.map((m) => (
                                            <tr key={m.machine_id}>
                                                <td className="ps-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-light-info"
                                                            style={{ width: 36, height: 36, flexShrink: 0 }}>
                                                            <i className="bi bi-gear-fill text-info" />
                                                        </div>
                                                        <span className="fw-bold text-dark fs-7">{m.machine_name || `Machine #${m.machine_id}`}</span>
                                                    </div>
                                                </td>
                                                <td className="text-muted fs-8">{formatDateTime(m.from_time)}</td>
                                                <td className="text-muted fs-8">{m.to_time ? formatDateTime(m.to_time) : 'กำลังใช้งาน...'}</td>
                                                <td className="text-end">
                                                    <span className="badge bg-light-info text-info fw-bold px-3 py-2 fs-8">
                                                        {formatDuration(m.time_spent_seconds)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Labor Breakdown Table */}
                <div className="card border border-gray-200 shadow-sm">
                    <div className="card-header border-0 d-flex justify-content-between align-items-center flex-wrap gap-3 py-4">
                        <div className="d-flex align-items-center gap-2 fw-bold fs-5 text-dark">
                            <i className="bi bi-table text-primary" />
                            รายงานการทำงานของแต่ละคน
                        </div>
                        <div className="position-relative">
                            <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted fs-7" />
                            <input
                                type="text"
                                className="form-control form-control-sm ps-8"
                                placeholder="ค้นหาพนักงาน..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                style={{ width: 220 }}
                            />
                        </div>
                    </div>

                    <div className="card-body pt-0 px-4 pb-4">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead>
                                    <tr className="text-muted fw-bold fs-8 text-uppercase border-bottom">
                                        <th className="ps-3">พนักงาน</th>
                                        <th role="button" className={sortField === 'time' ? 'text-primary' : ''} onClick={() => toggleSort('time')}>
                                            เวลาที่ใช้
                                            <span className="ms-1 fs-9">{sortField === 'time' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                                        </th>
                                        <th>
                                            เรทค่าจ้าง
                                            <i className="bi bi-info-circle ms-1 text-muted fs-9" title="เงินเดือน ÷ 30 วัน ÷ 8 ชม." />
                                        </th>
                                        <th role="button" className={`text-end ${sortField === 'cost' ? 'text-primary' : ''}`} onClick={() => toggleSort('cost')}>
                                            รวม (THB)
                                            <span className="ms-1 fs-9">{sortField === 'cost' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEmployees.map((emp, idx) => (
                                        <tr key={emp.employee_id}>
                                            <td className="ps-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                                                        style={{ width: 40, height: 40, background: avatarBgs[idx % avatarBgs.length], fontSize: 15, flexShrink: 0 }}
                                                    >
                                                        {emp.employee_first_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-dark fs-7">{emp.employee_first_name} {emp.employee_last_name}</div>
                                                        <div className="text-muted fs-8">{emp.status}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light-primary text-primary fw-bold px-3 py-2 fs-8">
                                                    {formatDuration(emp.time_spent_seconds)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="fw-semibold text-gray-700 fs-7">
                                                    {formatNumber(emp.hourly_rate)}
                                                    <span className="text-muted fs-8 ms-1">THB/Hr</span>
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <span className="fw-bolder text-dark fs-6">{formatNumber(emp.net_cost)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedEmployees.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center text-muted py-10">
                                                <i className="bi bi-people fs-1 d-block mb-3 text-gray-300" />
                                                ไม่พบข้อมูลพนักงาน
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {filteredEmployees.length > 0 && (
                                    <tfoot>
                                        <tr className="border-top border-2">
                                            <td colSpan={3} className="text-end py-4">
                                                <span className="fw-bold text-muted text-uppercase fs-8">รวมทั้งหมด</span>
                                            </td>
                                            <td className="text-end py-4">
                                                <span className="fw-bolder text-primary" style={{ fontSize: '1.4rem' }}>
                                                    {formatNumber(data.total_labor_cost)}
                                                    <span className="text-muted fw-semibold fs-7 ms-1">THB</span>
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {filteredEmployees.length > 0 && (
                            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                                <div className="text-primary fs-8">
                                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} entries
                                </div>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>
                                                <i className="bi bi-chevron-left" />
                                            </button>
                                        </li>
                                        {Array.from({ length: totalPages }, (_, i) => (
                                            <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                                <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                                            </li>
                                        ))}
                                        <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>
                                                <i className="bi bi-chevron-right" />
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default WorkPhaseDetail;
