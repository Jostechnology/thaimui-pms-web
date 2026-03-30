import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import type { WorkOrder, StatusCount, EmployeeWorkload, DashboardKPI } from '../../../type_interface/WorkOrderType';
import { WorkOrderStatusEnum } from '../../../type_interface/WorkOrderType';
import { getWorkOrderList } from '../../../services/workorder';

// ==========================================
// STATUS CONFIG — Color + Label mapping (matches backend enum)
// ==========================================
const STATUS_CONFIG: Record<WorkOrderStatusEnum, { color: string; badgeClass: string; label: string }> = {
    [WorkOrderStatusEnum.READY]: { color: '#009EF7', badgeClass: 'badge-light-primary', label: 'พร้อมดำเนินการ' },
    [WorkOrderStatusEnum.INPROGRESS]: { color: '#FFA800', badgeClass: 'badge-light-warning', label: 'กำลังดำเนินการ' },
    [WorkOrderStatusEnum.WAIT_TEST]: { color: '#8950FC', badgeClass: 'badge-light-info', label: 'รอทดสอบ' },
    [WorkOrderStatusEnum.TESTING]: { color: '#7239EA', badgeClass: 'badge-light-info', label: 'กำลังทดสอบ' },
    [WorkOrderStatusEnum.COMPLETED]: { color: '#50CD89', badgeClass: 'badge-light-success', label: 'เสร็จสิ้น' },
};

// ==========================================
// CUSTOM TOOLTIP COMPONENTS
// ==========================================
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
                    {payload[0].value} งาน
                </p>
            </div>
        );
    }
    return null;
};

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
const WorkorderDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // ดึงข้อมูลทั้งหมดด้วย limit สูง (ไม่มี pagination สำหรับ dashboard)
            const result = await getWorkOrderList(1, 999, '', '', '');
            if (result && result.success) {
                setWorkOrders(result.data?.items || []);
            } else {
                setError('ไม่สามารถดึงข้อมูลได้');
                setWorkOrders([]);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            setWorkOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // ==========================================
    // COMPUTED DATA
    // ==========================================
    const kpi: DashboardKPI = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const activeStatuses: WorkOrderStatusEnum[] = [
            WorkOrderStatusEnum.READY,
            WorkOrderStatusEnum.INPROGRESS,
            WorkOrderStatusEnum.WAIT_TEST,
            WorkOrderStatusEnum.TESTING,
        ];
        const waitingStatuses: WorkOrderStatusEnum[] = [
            WorkOrderStatusEnum.READY,
            WorkOrderStatusEnum.WAIT_TEST,
        ];

        const normalizeStatus = (s: string): WorkOrderStatusEnum =>
            s as WorkOrderStatusEnum;

        const active = workOrders.filter(wo => activeStatuses.includes(normalizeStatus(wo.status))).length;
        const completed = workOrders.filter(wo => normalizeStatus(wo.status) === WorkOrderStatusEnum.COMPLETED).length;
        const waiting = workOrders.filter(wo => waitingStatuses.includes(normalizeStatus(wo.status))).length;
        const overdue = workOrders.filter(wo => {
            if (normalizeStatus(wo.status) === WorkOrderStatusEnum.COMPLETED) return false;
            return new Date(wo.created_date) < sevenDaysAgo;
        }).length;

        return { total: workOrders.length, active, COMPLETED: completed, waiting, overdue };
    }, [workOrders]);

    const statusDistribution: StatusCount[] = useMemo(() => {
        const counts: Partial<Record<WorkOrderStatusEnum, number>> = {};
        workOrders.forEach(wo => {
            const key = wo.status as WorkOrderStatusEnum;
            counts[key] = (counts[key] || 0) + 1;
        });
        return (Object.keys(STATUS_CONFIG) as WorkOrderStatusEnum[])
            .filter(status => (counts[status] || 0) > 0)
            .map(status => ({
                status: STATUS_CONFIG[status].label,  // แสดงเป็นภาษาไทย
                count: counts[status] || 0,
                color: STATUS_CONFIG[status].color,
            }));
    }, [workOrders]);

    const employeeWorkload: EmployeeWorkload[] = useMemo(() => {
        const map = new Map<number, EmployeeWorkload>();
        workOrders.forEach(wo => {
            const isCompleted = (wo.status as WorkOrderStatusEnum) === WorkOrderStatusEnum.COMPLETED;
            wo.current_phase?.employee_list?.forEach(emp => {
                const existing = map.get(emp.employee_id);
                if (existing) {
                    if (isCompleted) existing.COMPLETED_tasks++;
                    else existing.active_tasks++;
                } else {
                    map.set(emp.employee_id, {
                        employee_id: emp.employee_id,
                        employee_name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                        active_tasks: isCompleted ? 0 : 1,
                        COMPLETED_tasks: isCompleted ? 1 : 0,
                    });
                }
            });
        });
        return Array.from(map.values()).sort((a, b) => b.active_tasks - a.active_tasks);
    }, [workOrders]);

    const pieData = useMemo(() => {
        const COLORS = ['#009EF7', '#50CD89', '#FFC700', '#F1416C', '#7239EA', '#FFA800', '#1BC5BD', '#8950FC'];
        return employeeWorkload.map((emp, i) => ({
            name: emp.employee_name,
            value: emp.active_tasks + emp.COMPLETED_tasks,
            fill: COLORS[i % COLORS.length],
        }));
    }, [employeeWorkload]);

    const recentOrders = useMemo(() => {
        return [...workOrders]
            .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
            .slice(0, 8);
    }, [workOrders]);

    const handleRefresh = () => {
        fetchDashboardData();
    };

    // ==========================================
    // SKELETON LOADING
    // ==========================================
    if (isLoading) {
        return (
            <Content>
                <div className='d-flex flex-stack mb-8'>
                    <div>
                        <div className='bg-secondary rounded' style={{ width: 280, height: 32 }}></div>
                        <div className='bg-secondary rounded mt-2' style={{ width: 220, height: 18 }}></div>
                    </div>
                </div>
                <div className='row g-5 g-xl-8 mb-8'>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className='col'>
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

    // ==========================================
    // ERROR STATE
    // ==========================================
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

    // ==========================================
    // KPI CARDS CONFIG
    // ==========================================
    const kpiCards = [
        {
            title: 'ใบสั่งผลิตทั้งหมด',
            value: kpi.total,
            icon: 'bi-clipboard2-data',
            bgClass: 'bg-light-primary',
            iconColor: 'text-primary',
            subtitle: 'Total Work Orders',
        },
        {
            title: 'กำลังดำเนินการ',
            value: kpi.active,
            icon: 'bi-gear-wide-connected',
            bgClass: 'bg-light-warning',
            iconColor: 'text-warning',
            subtitle: 'In Progress',
        },
        {
            title: 'เสร็จสมบูรณ์',
            value: kpi.COMPLETED,
            icon: 'bi-check-circle',
            bgClass: 'bg-light-success',
            iconColor: 'text-success',
            subtitle: 'Completed',
        },
        {
            title: 'รอดำเนินการ',
            value: kpi.waiting,
            icon: 'bi-hourglass-split',
            bgClass: 'bg-light-info',
            iconColor: 'text-info',
            subtitle: 'Waiting',
        },
        {
            title: 'เกินกำหนด',
            value: kpi.overdue,
            icon: 'bi-exclamation-triangle',
            bgClass: 'bg-light-danger',
            iconColor: 'text-danger',
            subtitle: '> 7 วัน',
        },
    ];

    return (
        <Content>
            {/* ==================== HEADER ==================== */}
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
                        <i className='bi bi-kanban me-3 text-primary'></i>
                        แดชบอร์ดใบสั่งผลิต
                    </h1>
                    <span className='text-muted fw-semibold fs-6'>
                        ภาพรวมและติดตามสถานะใบสั่งผลิตทั้งหมดในระบบ
                        {workOrders.length > 0 && (
                            <span className='ms-2 text-primary fw-bold'>({workOrders.length} รายการ)</span>
                        )}
                    </span>
                </div>
                <div className='d-flex align-items-center gap-3'>
                    <button
                        className='btn btn-sm btn-light-primary fw-bold px-4'
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <i className='bi bi-arrow-clockwise me-2'></i>Refresh
                    </button>
                    <button
                        className='btn btn-sm btn-primary fw-bold px-5 shadow-sm'
                        onClick={() => navigate('/workorder/workorders_list')}
                    >
                        <i className='bi bi-list-task me-2'></i>ดูทั้งหมด
                    </button>
                </div>
            </div>

            {/* ==================== KPI CARDS ==================== */}
            <div className='row g-5 g-xl-8 mb-8'>
                {kpiCards.map((card, idx) => (
                    <div key={idx} className='col'>
                        <div className='card card-flush shadow-sm border-0 h-100 hover-elevate-up'
                            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                            <div className='card-body d-flex align-items-center py-6 px-6'>
                                <div className={`symbol symbol-55px me-4`}>
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
                {/* --- Status Distribution Bar Chart --- */}
                <div className='col-xl-7'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>สถานะใบสั่งผลิต</span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>จำนวนใบสั่งผลิตแยกตามสถานะ</span>
                            </h3>
                        </div>
                        <div className='card-body pt-2 pb-4'>
                            {statusDistribution.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <BarChart
                                        data={statusDistribution}
                                        layout='vertical'
                                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        barCategoryGap="25%"
                                    >
                                        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' horizontal={false} />
                                        <XAxis type='number' allowDecimals={false} tick={{ fill: '#a1a5b7', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            dataKey='status'
                                            type='category'
                                            width={120}
                                            tick={{ fill: '#5e6278', fontSize: 13, fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                        <Bar dataKey='count' radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className='text-center text-muted py-20'>
                                    <i className='bi bi-bar-chart fs-3x text-gray-300 mb-4 d-block'></i>
                                    ไม่พบข้อมูลสถานะ
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Employee Workload Pie Chart --- */}
                <div className='col-xl-5'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>ภาระงานพนักงาน</span>
                                <span className='text-muted mt-1 fw-semibold fs-7'>การกระจายงานของพนักงานแต่ละคน</span>
                            </h3>
                        </div>
                        <div className='card-body d-flex flex-center pt-2 pb-4'>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx='50%'
                                            cy='45%'
                                            innerRadius={65}
                                            outerRadius={110}
                                            paddingAngle={3}
                                            dataKey='value'
                                            stroke='none'
                                        >
                                            {pieData.map((entry, index) => (
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
                                    <i className='bi bi-people fs-3x text-gray-300 mb-4 d-block'></i>
                                    ไม่พบข้อมูลภาระงาน
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== RECENT ORDERS TABLE ==================== */}
            <div className='card card-flush shadow-sm border-0 mb-8'>
                <div className='card-header border-0 pt-6'>
                    <h3 className='card-title align-items-start flex-column'>
                        <span className='card-label fw-bold text-gray-900'>ใบสั่งผลิตล่าสุด</span>
                        <span className='text-muted mt-1 fw-semibold fs-7'>แสดง {recentOrders.length} รายการล่าสุด</span>
                    </h3>
                    <div className='card-toolbar'>
                        <button
                            className='btn btn-sm btn-light-primary fw-bold'
                            onClick={() => navigate('/workorder/workorders_list')}
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
                                    <th className='min-w-120px'>รหัสใบสั่งผลิต</th>
                                    <th className='min-w-150px'>สินค้า</th>
                                    <th className='min-w-130px text-center'>สถานะ</th>
                                    <th className='min-w-150px'>ขั้นตอนปัจจุบัน</th>
                                    <th className='min-w-150px'>ผู้รับผิดชอบ</th>
                                    <th className='min-w-120px text-center'>วันที่สร้าง</th>
                                    <th className='text-end min-w-80px'>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {recentOrders.length > 0 ? recentOrders.map((wo) => {
                                    const statusKey = wo.status as WorkOrderStatusEnum;
                                    const config = STATUS_CONFIG[statusKey] || { color: '#A1A5B7', badgeClass: 'badge-light-secondary', label: wo.status };
                                    const employees = wo.current_phase?.employee_list || [];

                                    return (
                                        <tr key={wo.work_order_id} style={{ transition: 'background 0.15s' }}>
                                            <td>
                                                <span className='text-gray-800 fw-bold fs-6'>{wo.doc_num}</span>
                                            </td>
                                            <td>
                                                <div className='d-flex flex-column'>
                                                    <span className='text-gray-800 fw-bold fs-7'>
                                                        {wo.sales_item?.item_name || '-'}
                                                    </span>
                                                    {wo.sales_item?.item_code && (
                                                        <span className='text-muted fs-8'>{wo.sales_item.item_code}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='text-center'>
                                                <span className={`badge ${config.badgeClass} fw-bold px-4 py-2`}>
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className='d-flex flex-column'>
                                                    <span className='text-gray-800 fw-bold fs-7'>
                                                        {wo.current_phase?.phase_name || '-'}
                                                    </span>
                                                    {wo.current_phase && (
                                                        <span className='text-muted fs-8'>
                                                            {wo.current_phase.phase_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    {employees.length > 0 ? (
                                                        <div className='symbol-group symbol-hover'>
                                                            {employees.slice(0, 3).map((emp) => (
                                                                <div key={emp.employee_id} className='symbol symbol-30px' title={`${emp.employee_first_name} ${emp.employee_last_name}`}>
                                                                    <span className='symbol-label bg-light-primary text-primary fw-bold fs-8'>
                                                                        {emp.employee_first_name?.charAt(0) || '?'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {employees.length > 3 && (
                                                                <div className='symbol symbol-30px'>
                                                                    <span className='symbol-label bg-light-dark text-gray-600 fw-bold fs-8'>
                                                                        +{employees.length - 3}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className='text-muted fs-8'>ยังไม่ได้มอบหมาย</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='text-center'>
                                                <span className='text-gray-700 fw-semibold'>
                                                    {new Date(wo.created_date).toLocaleDateString('th-TH', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-primary btn-active-color-white btn-active-primary'
                                                    title="ดูรายละเอียด"
                                                    onClick={() => navigate(`/workorder/workorders_detail/${wo.work_order_id}`)}
                                                >
                                                    <i className='bi bi-eye fs-4'></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className='text-center py-15'>
                                            <i className='bi bi-inbox fs-3x text-gray-300 mb-4 d-block'></i>
                                            <span className='text-muted'>ไม่พบข้อมูลใบสั่งผลิต</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ==================== QUICK ACTIONS ==================== */}
            <div className='row g-5 g-xl-8'>
                <div className='col-md-6'>
                    <div
                        className='card card-flush shadow-sm border-0 cursor-pointer hover-elevate-up'
                        style={{
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            background: 'linear-gradient(135deg, #009EF7 0%, #0078c4 100%)',
                        }}
                        onClick={() => navigate('/workorder/workorders_list')}
                    >
                        <div className='card-body d-flex align-items-center py-8 px-8'>
                            <div className='symbol symbol-60px me-5'>
                                <span className='symbol-label bg-white bg-opacity-20 rounded-circle'>
                                    <i className='bi bi-plus-lg text-white fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='text-white fw-bold fs-3'>สร้างใบสั่งผลิตใหม่</span>
                                <span className='text-white text-opacity-75 fw-semibold fs-7'>
                                    เปิดใบสั่งผลิตและกำหนดขั้นตอนการผลิต
                                </span>
                            </div>
                            <i className='bi bi-chevron-right text-white fs-2x ms-auto'></i>
                        </div>
                    </div>
                </div>
                <div className='col-md-6'>
                    <div
                        className='card card-flush shadow-sm border-0 cursor-pointer hover-elevate-up'
                        style={{
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            background: 'linear-gradient(135deg, #50CD89 0%, #3ba76d 100%)',
                        }}
                        onClick={() => navigate('/workorder/workorders_list')}
                    >
                        <div className='card-body d-flex align-items-center py-8 px-8'>
                            <div className='symbol symbol-60px me-5'>
                                <span className='symbol-label bg-white bg-opacity-20 rounded-circle'>
                                    <i className='bi bi-clipboard2-check text-white fs-2x'></i>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='text-white fw-bold fs-3'>ดูใบสั่งผลิตทั้งหมด</span>
                                <span className='text-white text-opacity-75 fw-semibold fs-7'>
                                    จัดการ ค้นหา และติดตามใบสั่งผลิตทุกรายการ
                                </span>
                            </div>
                            <i className='bi bi-chevron-right text-white fs-2x ms-auto'></i>
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default WorkorderDashboard;
