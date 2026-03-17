import React, { useMemo } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate } from "react-router-dom";
import { useQuery } from 'react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import { getSalesOrderList, SalesOrderSummary } from '../../../services/salesOrder';

const SalesOrderDashboard: React.FC = () => {
    const navigate = useNavigate();

    const { data, isLoading, isError, refetch } = useQuery(
        ['salesOrderDashboard'],
        () => getSalesOrderList(1, 1000, ''),
        { refetchOnWindowFocus: false }
    );

    const salesOrders: SalesOrderSummary[] = data?.items || [];
    const handleRefresh = () => refetch();

    // KPI Calculations
    const kpi = useMemo(() => {
        const total = salesOrders.length;
        const totalItems = salesOrders.reduce((sum, so) => sum + so.sales_items_count, 0);
        const totalWorkOrders = salesOrders.reduce((sum, so) => sum + so.work_orders_count, 0);

        // Count unique customers
        const uniqueCustomers = new Set(salesOrders.map(so => so.card_code));

        return { total, totalItems, totalWorkOrders, customers: uniqueCustomers.size };
    }, [salesOrders]);

    // Top branches Chart
    const branchDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        salesOrders.forEach(so => {
            const branch = so.bpl_name || 'ไม่ระบุสาขา';
            counts[branch] = (counts[branch] || 0) + 1;
        });

        const COLORS = ['#009EF7', '#50CD89', '#FFC700', '#F1416C', '#7239EA'];
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // เรียงจากมากไปน้อย
            .slice(0, 5) // เอาแค่ 5 อันดับแรก
            .map(([name, count], index) => ({
                name: name.length > 20 ? name.substring(0, 20) + '...' : name,
                count,
                color: COLORS[index % COLORS.length]
            }));
    }, [salesOrders]);

    // Sales Rep Chart
    const slpDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        salesOrders.forEach(so => {
            const slp = so.slp_name || 'ไม่ระบุตัวแทน';
            counts[slp] = (counts[slp] || 0) + 1;
        });

        const COLORS = ['#7239EA', '#FFA800', '#1BC5BD', '#8950FC', '#F1416C'];
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // เรียงจากมากไปน้อย
            .slice(0, 5) // เอาแค่ 5 อันดับแรก
            .map(([name, value], index) => ({
                name: name.length > 15 ? name.substring(0, 15) + '...' : name,
                value,
                fill: COLORS[index % COLORS.length]
            }));
    }, [salesOrders]);

    const recentOrders = useMemo(() => {
        return [...salesOrders]
            .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
            .slice(0, 10);
    }, [salesOrders]);

    if (isLoading) {
        return (
            <Content>
                <div className='d-flex flex-stack mb-8'>
                    <div className='bg-secondary rounded' style={{ width: 280, height: 32 }}></div>
                </div>
                <div className='row g-5 g-xl-8 mb-8'>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className='col'>
                            <div className='card card-flush shadow-sm h-100 py-6 px-6'>
                                <div className='bg-secondary rounded mb-2' style={{ width: 50, height: 50 }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Content>
        );
    }

    if (isError) {
        return (
            <Content>
                <div className='d-flex flex-center flex-column py-20'>
                    <i className='bi bi-exclamation-triangle-fill text-danger fs-3x mb-4'></i>
                    <span className='text-danger fw-bold fs-5 mb-2'>เกิดข้อผิดพลาดในการดึงข้อมูล</span>
                    <button className='btn btn-sm btn-primary mt-4' onClick={handleRefresh}>
                        <i className='bi bi-arrow-clockwise me-2'></i>ลองใหม่
                    </button>
                </div>
            </Content>
        );
    }

    const kpiCards = [
        {
            title: 'ใบสั่งขายทั้งหมด',
            value: kpi.total,
            icon: 'bi-receipt',
            bgClass: 'bg-light-primary',
            iconColor: 'text-primary',
            subtitle: 'Total Sales Orders',
        },
        {
            title: 'จำนวนลูกค้า (ราย)',
            value: kpi.customers,
            icon: 'bi-person-badge',
            bgClass: 'bg-light-success',
            iconColor: 'text-success',
            subtitle: 'Unique Customers',
        },
        {
            title: 'สินค้าที่ต้องผลิต',
            value: kpi.totalItems,
            icon: 'bi-box-seam',
            bgClass: 'bg-light-warning',
            iconColor: 'text-warning',
            subtitle: 'Total Sales Items',
        },
        {
            title: 'ใบสั่งผลิตที่ผูกไว้',
            value: kpi.totalWorkOrders,
            icon: 'bi-gear-wide-connected',
            bgClass: 'bg-light-info',
            iconColor: 'text-info',
            subtitle: 'Total Work Orders',
        },
    ];

    const CustomPieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'rgba(30, 30, 46, 0.95)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
                    <p style={{ margin: '4px 0 0', color: payload[0].payload.fill }}>{payload[0].value} ออเดอร์</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Content>
            {/* ==================== HEADER ==================== */}
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
                        <i className='bi bi-graph-up-arrow me-3 text-primary'></i>
                        Sales Order Dashboard
                    </h1>
                    <span className='text-muted fw-semibold fs-6'>
                        ภาพรวมใบสั่งขายและลูกค้าในระบบ
                    </span>
                </div>
                <div className='d-flex align-items-center gap-3'>
                    <button className='btn btn-sm btn-light-primary fw-bold px-4' onClick={handleRefresh} disabled={isLoading}>
                        <i className='bi bi-arrow-clockwise me-2'></i>Refresh
                    </button>
                    <button className='btn btn-sm btn-primary fw-bold px-5 shadow-sm' onClick={() => navigate('/sales_order/list')}>
                        <i className='bi bi-list-task me-2'></i>ดูรายการทั้งหมด
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
                {/* --- Branch Distribution Bar Chart --- */}
                <div className='col-xl-7'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>ยอดขายรายสาขา (Top 5)</span>
                            </h3>
                        </div>
                        <div className='card-body pt-2 pb-4'>
                            {branchDistribution.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <BarChart data={branchDistribution} layout='vertical' margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray='3 3' stroke='#f1f1f4' horizontal={false} />
                                        <XAxis type='number' allowDecimals={false} tick={{ fill: '#a1a5b7', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis dataKey='name' type='category' width={140} tick={{ fill: '#5e6278', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                        <Bar dataKey='count' radius={[0, 6, 6, 0]} maxBarSize={28}>
                                            {branchDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className='text-center text-muted py-20'>ไม่พบข้อมูล</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Sales Rep Pie Chart --- */}
                <div className='col-xl-5'>
                    <div className='card card-flush shadow-sm border-0 h-100'>
                        <div className='card-header border-0 pt-6'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900'>ตัวแทนขาย (Top 5)</span>
                            </h3>
                        </div>
                        <div className='card-body d-flex flex-center pt-2 pb-4'>
                            {slpDistribution.length > 0 ? (
                                <ResponsiveContainer width='100%' height={320}>
                                    <PieChart>
                                        <Pie data={slpDistribution} cx='50%' cy='45%' innerRadius={65} outerRadius={110} paddingAngle={3} dataKey='value' stroke='none'>
                                            {slpDistribution.map((entry, index) => (
                                                <Cell key={`pie-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend layout='horizontal' verticalAlign='bottom' align='center' iconType='circle' iconSize={10} formatter={(value) => <span style={{ color: '#5e6278', fontSize: 12, fontWeight: 600 }}>{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className='text-center text-muted py-20'>ไม่พบข้อมูล</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== RECENT ORDERS TABLE ==================== */}
            <div className='card card-flush shadow-sm border-0 mb-8'>
                <div className='card-header border-0 pt-6'>
                    <h3 className='card-title align-items-start flex-column'>
                        <span className='card-label fw-bold text-gray-900'>ใบสั่งขายล่าสุด</span>
                    </h3>
                    <div className='card-toolbar'>
                        <button className='btn btn-sm btn-light-primary fw-bold' onClick={() => navigate('/sales_order/list')}>
                            ดูทั้งหมด <i className='bi bi-arrow-right ms-1'></i>
                        </button>
                    </div>
                </div>
                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-120px'>Doc Num</th>
                                    <th className='min-w-200px'>ลูกค้า</th>
                                    <th className='min-w-150px'>ตัวแทนขาย</th>
                                    <th className='min-w-150px'>สาขา</th>
                                    <th className='min-w-100px text-center'>สินค้า/ใบสั่งผลิต</th>
                                    <th className='min-w-120px text-center'>วันที่ระบบแจ้ง</th>
                                    <th className='min-w-80px text-center'>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {recentOrders.length > 0 ? recentOrders.map((so) => (
                                    <tr key={so.doc_entry} className="hover:bg-light transition-all">
                                        <td><span className='text-gray-800 fw-bold fs-6'>{so.doc_num}</span></td>
                                        <td>
                                            <div className='d-flex flex-column'>
                                                <span className='text-gray-800 fw-bold fs-6'>{so.card_name}</span>
                                                <span className='text-muted fs-8'>{so.card_code}</span>
                                            </div>
                                        </td>
                                        <td><span className='text-gray-700'>{so.slp_name || '-'}</span></td>
                                        <td><span className='text-gray-700'>{so.bpl_name || '-'}</span></td>
                                        <td className='text-center'>
                                            <div className="d-flex flex-column gap-1 align-items-center">
                                                <span className="badge badge-light-primary px-2">{so.sales_items_count} สินค้า</span>
                                                {so.work_orders_count > 0 && (
                                                    <span className="badge badge-light-success px-2">{so.work_orders_count} ใบสั่งผลิต</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className='text-center'>
                                            {so.created_date ? new Date(so.created_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className='text-center'>
                                            <button
                                                onClick={() => navigate(`/sales_order/view/${so.doc_entry}`)}
                                                className="btn btn-icon btn-light-primary btn-sm"
                                                title="ดูรายละเอียด"
                                            >
                                                <i className="bi bi-eye fs-5"></i>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className='text-center py-10 text-muted'>ไม่พบข้อมูลรายการล่าสุด</td>
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

export default SalesOrderDashboard;
