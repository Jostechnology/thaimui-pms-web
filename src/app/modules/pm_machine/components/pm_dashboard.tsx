import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import { getpmMachineList } from '../../../services/pm_machineService';
import { getMachineList } from '../../../services/machineService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PmRepairItem {
    maintenance_id: number;
    machine_id: number;
    maintenance_date: string;
    maintenance_type: string;
    description: string | null;
    performed_by: string | null;
    fix_cost: number | null;
    machine?: { machine_id: number; machine_name: string; machine_code: string };
    created_date?: string;
}

interface DashboardKPI {
    total: number;
    preventive: number;
    corrective: number;
    totalCost: number;
    totalMachines: number;
}

interface MachineUnderRepair {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    maintenance_type: string;
    start_date: string;
    technician: string;
    progress: number; // 0-100
    status: 'กำลังซ่อม' | 'รอชิ้นส่วน' | 'ทดสอบ';
}

interface MachineCostData {
    name: string;
    cost: number;
    color: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MACHINES_UNDER_REPAIR: MachineUnderRepair[] = [
    { machine_id: 1, machine_code: 'MC-001', machine_name: 'เครื่องกลึง CNC #1', maintenance_type: 'Corrective', start_date: '2026-03-10', technician: 'สมชาย ใจดี', progress: 65, status: 'กำลังซ่อม' },
    { machine_id: 2, machine_code: 'MC-005', machine_name: 'เครื่องเชื่อม MIG #3', maintenance_type: 'Preventive', start_date: '2026-03-11', technician: 'วิชัย สุขสันต์', progress: 30, status: 'รอชิ้นส่วน' },
    { machine_id: 3, machine_code: 'MC-012', machine_name: 'เครื่องตัดเลเซอร์', maintenance_type: 'Corrective', start_date: '2026-03-09', technician: 'ประสิทธิ์ มานะ', progress: 90, status: 'ทดสอบ' },
    { machine_id: 4, machine_code: 'MC-008', machine_name: 'เครื่องพับโลหะ #2', maintenance_type: 'Corrective', start_date: '2026-03-12', technician: 'อนุชา แก้วใส', progress: 10, status: 'กำลังซ่อม' },
    { machine_id: 5, machine_code: 'MC-003', machine_name: 'เครื่องเจียร์ระนาบ', maintenance_type: 'Preventive', start_date: '2026-03-11', technician: 'สมชาย ใจดี', progress: 50, status: 'กำลังซ่อม' },
];

const MOCK_TOP_COST: MachineCostData[] = [
    { name: 'เครื่องตัดเลเซอร์', cost: 185000, color: '#F1416C' },
    { name: 'เครื่องกลึง CNC #1', cost: 142500, color: '#FFC700' },
    { name: 'เครื่องเชื่อม MIG #3', cost: 98000, color: '#009EF7' },
    { name: 'เครื่องพับโลหะ #2', cost: 76500, color: '#7239EA' },
    { name: 'เครื่องเจียร์ระนาบ', cost: 54200, color: '#50CD89' },
];

// ─── Custom Tooltip Components ────────────────────────────────────────────────

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(30, 30, 46, 0.95)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                color: '#fff',
                fontSize: '13px'
            }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
                <p style={{ margin: '4px 0 0', color: payload[0].color }}>
                    {payload[0].value} รายการ
                </p>
            </div>
        );
    }
    return null;
};

const CustomCostTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(30, 30, 46, 0.95)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                color: '#fff',
                fontSize: '13px'
            }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
                <p style={{ margin: '4px 0 0', color: payload[0].color }}>
                    {payload[0].value.toLocaleString('th-TH')} บาท
                </p>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(30, 30, 46, 0.95)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                color: '#fff',
                fontSize: '13px'
            }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
                <p style={{ margin: '4px 0 0', color: payload[0].payload.fill }}>
                    {payload[0].value} รายการ
                </p>
            </div>
        );
    }
    return null;
};

// ─── Main Dashboard Component ─────────────────────────────────────────────────

const PmDashbord: React.FC = () => {
    const navigate = useNavigate();
    const [repairs, setRepairs] = useState<PmRepairItem[]>([]);
    const [totalMachines, setTotalMachines] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // ดึงข้อมูลทั้งหมดพร้อมกัน
            const [repairRes, machineRes] = await Promise.all([
                getpmMachineList(1, 999, '', ''),
                getMachineList(1, 999, '', ''),
            ]);

            if (repairRes && repairRes.success) {
                setRepairs(repairRes.items || []);
            } else {
                setRepairs([]);
            }

            if (machineRes && machineRes.success) {
                const machineData = machineRes.data;
                setTotalMachines(machineData?.total || machineData?.items?.length || 0);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            setRepairs([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // ─── Computed Data ────────────────────────────────────────────────────────

    const kpi: DashboardKPI = useMemo(() => {
        const total = repairs.length;
        const preventive = repairs.filter(r => r.maintenance_type === 'Preventive').length;
        const corrective = repairs.filter(r => r.maintenance_type === 'Corrective').length;
        const totalCost = repairs.reduce((sum, r) => sum + (r.fix_cost || 0), 0);

        return { total, preventive, corrective, totalCost, totalMachines };
    }, [repairs, totalMachines]);

    // Top 5 เครื่องจักรที่ซ่อมบ่อยที่สุด
    const machineRepairDistribution = useMemo(() => {
        const counts: Record<string, { name: string; count: number }> = {};
        repairs.forEach(r => {
            const machineName = r.machine?.machine_name || 'ไม่ระบุ';
            if (!counts[machineName]) {
                counts[machineName] = { name: machineName, count: 0 };
            }
            counts[machineName].count++;
        });

        const COLORS = ['#009EF7', '#50CD89', '#FFC700', '#F1416C', '#7239EA'];
        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item, index) => ({
                name: item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name,
                count: item.count,
                color: COLORS[index % COLORS.length],
            }));
    }, [repairs]);

    // สัดส่วน Preventive vs Corrective
    const typeDistribution = useMemo(() => {
        const preventive = repairs.filter(r => r.maintenance_type === 'Preventive').length;
        const corrective = repairs.filter(r => r.maintenance_type === 'Corrective').length;
        const data = [];
        if (preventive > 0) data.push({ name: 'ซ่อมเชิงป้องกัน', value: preventive, fill: '#009EF7' });
        if (corrective > 0) data.push({ name: 'ซ่อมเชิงแก้ไข', value: corrective, fill: '#FFC700' });
        return data;
    }, [repairs]);

    // 8 รายการล่าสุด
    const recentRepairs = useMemo(() => {
        return [...repairs]
            .sort((a, b) => new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime())
            .slice(0, 8);
    }, [repairs]);

    const handleRefresh = () => {
        fetchDashboardData();
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // ─── Skeleton Loading ─────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <Content>
                <div className='d-flex flex-stack mb-8'>
                    <div>
                        <div className='bg-secondary rounded' style={{ width: 320, height: 32 }}></div>
                        <div className='bg-secondary rounded mt-2' style={{ width: 240, height: 18 }}></div>
                    </div>
                </div>
                <div className='row g-5 g-xl-8 mb-8'>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className='col-md-6 col-xl-3'>
                            <div className='card card-flush shadow-sm border-0 h-100'>
                                <div className='card-body d-flex align-items-center py-6 px-6'>
                                    <div className='bg-secondary rounded-circle me-4' style={{ width: 52, height: 52 }}></div>
                                    <div className='flex-grow-1'>
                                        <div className='bg-secondary rounded mb-2' style={{ width: '60%', height: 28 }}></div>
                                        <div className='bg-secondary rounded' style={{ width: '80%', height: 14 }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className='row g-5 g-xl-8 mb-8'>
                    <div className='col-xl-7'>
                        <div className='card card-flush shadow-sm border-0 h-100'>
                            <div className='card-body'>
                                <div className='bg-secondary rounded' style={{ width: '100%', height: 300 }}></div>
                            </div>
                        </div>
                    </div>
                    <div className='col-xl-5'>
                        <div className='card card-flush shadow-sm border-0 h-100'>
                            <div className='card-body'>
                                <div className='bg-secondary rounded' style={{ width: '100%', height: 300 }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Content>
        );
    }

    // ─── Error State ──────────────────────────────────────────────────────────

    if (error) {
        return (
            <Content>
                <div className='d-flex flex-center flex-column py-20'>
                    <i className='bi bi-exclamation-triangle-fill text-danger fs-3x mb-4'></i>
                    <span className='text-danger fw-bold fs-5 mb-2'>{error}</span>
                    <button className='btn btn-sm btn-primary mt-4' onClick={handleRefresh}>
                        <i className='bi bi-arrow-clockwise me-2'></i>ลองใหม่
                    </button>
                </div>
            </Content>
        );
    }

    // ─── KPI Cards Config ─────────────────────────────────────────────────────

    const kpiCards = [
        {
            title: 'รายการซ่อมทั้งหมด',
            value: kpi.total,
            icon: 'bi-wrench-adjustable-circle',
            bgClass: 'bg-light-primary',
            iconColor: 'text-primary',
            subtitle: 'Total Repairs',
        },
        {
            title: 'ซ่อมเชิงป้องกัน',
            value: kpi.preventive,
            icon: 'bi-shield-check',
            bgClass: 'bg-light-info',
            iconColor: 'text-info',
            subtitle: 'Preventive',
        },
        {
            title: 'ซ่อมเชิงแก้ไข',
            value: kpi.corrective,
            icon: 'bi-tools',
            bgClass: 'bg-light-warning',
            iconColor: 'text-warning',
            subtitle: 'Corrective',
        },
        {
            title: 'ค่าใช้จ่ายรวม',
            value: kpi.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            icon: 'bi-cash-stack',
            bgClass: 'bg-light-success',
            iconColor: 'text-success',
            subtitle: 'บาท',
        },
    ];

    return (
        <Content>
            {/* ==================== HEADER ==================== */}
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
                        แดชบอร์ดการซ่อมบำรุง
                    </h1>
                    <span className='text-muted fw-semibold fs-6'>
                        ภาพรวมระบบซ่อมบำรุงเครื่องจักร
                        {repairs.length > 0 && (
                            <span className='ms-2 text-primary fw-bold'>({repairs.length} รายการ)</span>
                        )}
                    </span>
                </div>
                <div className='d-flex align-items-center gap-3'>
                    <button
                        className='btn btn-light-primary fw-bold px-6'
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <i className='bi bi-arrow-clockwise me-2'></i>รีเฟรช
                    </button>
                </div>
            </div>

            {/* ==================== KPI CARDS ==================== */}
            <div className='row g-5 g-xl-8 mb-8'>
                {kpiCards.map((card, idx) => (
                    <div key={idx} className='col-md-6 col-xl-3'>
                        <div className='card card-flush shadow-sm border-0 h-100 hover-elevate-up'
                            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div className='card-body d-flex align-items-center py-6 px-6'>
                                <div className='symbol symbol-55px me-4'>
                                    <span className={`symbol-label ${card.bgClass} rounded-circle`}>
                                        <i className={`bi ${card.icon} ${card.iconColor} fs-2x`}></i>
                                    </span>
                                </div>
                                <div className='d-flex flex-column'>
                                    <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{card.value}</span>
                                    <span className='text-gray-800 fw-bold fs-7 mt-1'>{card.title}</span>
                                    <span className='text-gray-500 fw-semibold fs-8'>{card.subtitle}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ==================== CHARTS SECTION ==================== */}
            <div className='row g-5 g-xl-8 mb-8'>
                {/* --- Machine Repair Distribution Bar Chart --- */}
                <div className='col-xl-7'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>เครื่องจักรที่ซ่อมบ่อย (Top 5)</span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>จำนวนรายการซ่อมแยกตามเครื่องจักร</span>
                            </h3>
                        </div>
                        <div className='card-body pt-2 pb-4'>
                            {machineRepairDistribution.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <BarChart
                                        data={machineRepairDistribution}
                                        layout='vertical'
                                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        barCategoryGap="25%"
                                    >
                                        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' horizontal={false} />
                                        <XAxis type='number' allowDecimals={false} tick={{ fill: '#a1a5b7', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            dataKey='name'
                                            type='category'
                                            width={140}
                                            tick={{ fill: '#5e6278', fontSize: 13, fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                        <Bar dataKey='count' radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {machineRepairDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className='text-center text-muted py-20'>
                                    <i className='bi bi-bar-chart fs-3x text-gray-300 mb-4 d-block'></i>
                                    ไม่พบข้อมูลรายการซ่อม
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Preventive vs Corrective Pie Chart --- */}
                <div className='col-xl-5'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>สัดส่วนประเภทการซ่อม</span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>Preventive vs Corrective</span>
                            </h3>
                        </div>
                        <div className='card-body d-flex flex-center pt-2 pb-4'>
                            {typeDistribution.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <PieChart>
                                        <Pie
                                            data={typeDistribution}
                                            cx='50%'
                                            cy='45%'
                                            innerRadius={65}
                                            outerRadius={110}
                                            paddingAngle={3}
                                            dataKey='value'
                                            stroke='none'
                                        >
                                            {typeDistribution.map((entry, index) => (
                                                <Cell key={`pie-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend
                                            layout='horizontal'
                                            verticalAlign='bottom'
                                            align='center'
                                            iconType='circle'
                                            iconSize={10}
                                            formatter={(value: string) => (
                                                <span style={{ color: '#5e6278', fontSize: 12, fontWeight: 600 }}>{value}</span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className='text-center text-muted py-20'>
                                    <i className='bi bi-pie-chart fs-3x text-gray-300 mb-4 d-block'></i>
                                    ไม่พบข้อมูลประเภทการซ่อม
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== MACHINES UNDER REPAIR + TOP COST ==================== */}
            <div className='row g-5 g-xl-8 mb-8'>
                {/* --- เครื่องจักรที่กำลังซ่อม --- */}
                <div className='col-xl-7'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>
                                    <i className='bi bi-cone-striped text-warning me-2'></i>
                                    เครื่องจักรที่กำลังซ่อม
                                </span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>
                                    {MOCK_MACHINES_UNDER_REPAIR.length} เครื่องอยู่ระหว่างดำเนินการ
                                </span>
                            </h3>
                        </div>
                        <div className='card-body pt-0'>
                            <div className='table-responsive'>
                                <table className='table align-middle table-row-dashed fs-6 gy-4'>
                                    <thead>
                                        <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                            <th className='min-w-150px'>เครื่องจักร</th>
                                            <th className='min-w-100px'>ช่างซ่อม</th>
                                            <th className='min-w-80px text-center'>สถานะ</th>
                                            <th className='min-w-120px'>ความคืบหน้า</th>
                                        </tr>
                                    </thead>
                                    <tbody className='text-gray-600 fw-semibold'>
                                        {MOCK_MACHINES_UNDER_REPAIR.map((m) => {
                                            const statusColor = m.status === 'กำลังซ่อม' ? 'warning'
                                                : m.status === 'รอชิ้นส่วน' ? 'danger'
                                                : 'info';
                                            const progressColor = m.progress >= 75 ? 'success'
                                                : m.progress >= 40 ? 'primary'
                                                : 'warning';
                                            return (
                                                <tr key={m.machine_id}>
                                                    <td>
                                                        <div className='d-flex align-items-center'>
                                                            <div className='symbol symbol-35px me-3'>
                                                                <span className='symbol-label bg-light-danger'>
                                                                    <i className='bi bi-gear-wide-connected text-danger fs-5'></i>
                                                                </span>
                                                            </div>
                                                            <div className='d-flex flex-column'>
                                                                <span className='text-gray-800 fw-bold fs-7'>{m.machine_name}</span>
                                                                <span className='text-muted fs-8'>{m.machine_code}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className='text-gray-700 fs-7'>{m.technician}</span>
                                                    </td>
                                                    <td className='text-center'>
                                                        <span className={`badge badge-light-${statusColor} fw-bold px-3 py-2`}>
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className='d-flex align-items-center gap-2'>
                                                            <div className='progress h-6px w-100' style={{ minWidth: 80 }}>
                                                                <div
                                                                    className={`progress-bar bg-${progressColor}`}
                                                                    role='progressbar'
                                                                    style={{ width: `${m.progress}%` }}
                                                                />
                                                            </div>
                                                            <span className='text-muted fw-bold fs-8 w-30px text-end'>{m.progress}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- ค่าใช้จ่ายสูงสุด Top 5 Bar Chart --- */}
                <div className='col-xl-5'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>
                                    <i className='bi bi-cash-coin text-success me-2'></i>
                                    ค่าใช้จ่ายซ่อมสูงสุด (Top 5)
                                </span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>ค่าใช้จ่ายรวมแยกตามเครื่องจักร</span>
                            </h3>
                        </div>
                        <div className='card-body pt-2 pb-4'>
                            <ResponsiveContainer width='100%' height={320}>
                                <BarChart
                                    data={MOCK_TOP_COST}
                                    layout='vertical'
                                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                    barCategoryGap='25%'
                                >
                                    <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' horizontal={false} />
                                    <XAxis
                                        type='number'
                                        tick={{ fill: '#a1a5b7', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                                    />
                                    <YAxis
                                        dataKey='name'
                                        type='category'
                                        width={130}
                                        tick={{ fill: '#5e6278', fontSize: 12, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomCostTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                    <Bar dataKey='cost' radius={[0, 6, 6, 0]} maxBarSize={28}>
                                        {MOCK_TOP_COST.map((entry, index) => (
                                            <Cell key={`cost-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== RECENT REPAIRS TABLE ==================== */}
            <div className='card card-flush shadow-sm border-0 mb-8'>
                <div className='card-header border-0 pt-6'>
                    <h3 className='card-title align-items-start flex-column'>
                        <span className='card-label fw-bold text-gray-900'>รายการซ่อมล่าสุด</span>
                        <span className='text-muted mt-1 fw-semibold fs-7'>แสดง {recentRepairs.length} รายการล่าสุด</span>
                    </h3>
                    <div className='card-toolbar'>
                        <button
                            className='btn btn-sm btn-light-primary fw-bold'
                            onClick={() => navigate('/pm_machine/item')}
                        >
                            ดูทั้งหมด <i className='bi bi-arrow-right ms-1'></i>
                        </button>
                    </div>
                </div>
                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='ps-4 min-w-50px'>#</th>
                                    <th className='min-w-150px'>เครื่องจักร</th>
                                    <th className='min-w-120px'>วันที่ซ่อม</th>
                                    <th className='min-w-120px text-center'>ประเภท</th>
                                    <th className='min-w-100px'>ราคา (บาท)</th>
                                    <th className='min-w-200px'>รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {recentRepairs.length > 0 ? recentRepairs.map((item, index) => (
                                    <tr key={item.maintenance_id} style={{ transition: 'background 0.15s' }}>
                                        <td className='ps-4 text-muted'>{index + 1}</td>
                                        <td>
                                            <div className='d-flex align-items-center'>
                                                <div className='symbol symbol-35px me-3'>
                                                    <span className='symbol-label bg-light-primary'>
                                                        <i className='bi bi-gear-wide-connected text-primary fs-5'></i>
                                                    </span>
                                                </div>
                                                <div className='d-flex flex-column'>
                                                    <span className='text-gray-800 fw-bold fs-7'>
                                                        {item.machine?.machine_name || '-'}
                                                    </span>
                                                    {item.machine?.machine_code && (
                                                        <span className='text-muted fs-8'>{item.machine.machine_code}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className='text-gray-700 fw-semibold'>
                                                {formatDate(item.maintenance_date)}
                                            </span>
                                        </td>
                                        <td className='text-center'>
                                            <span className={`badge ${item.maintenance_type === 'Preventive'
                                                ? 'badge-light-primary'
                                                : 'badge-light-warning'
                                                } fw-bold px-4 py-2`}>
                                                {item.maintenance_type === 'Preventive' ? 'ซ่อมเชิงป้องกัน' : 'ซ่อมเชิงแก้ไข'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className='fw-bold text-success'>
                                                {item.fix_cost != null ? item.fix_cost.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                            </span>
                                        </td>
                                        <td className='text-muted'>
                                            {item.description || '-'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className='text-center py-15'>
                                            <i className='bi bi-inbox fs-3x text-gray-300 mb-4 d-block'></i>
                                            <span className='text-muted'>ไม่พบข้อมูลรายการซ่อม</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default PmDashbord;
