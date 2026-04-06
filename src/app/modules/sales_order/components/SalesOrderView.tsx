import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getSalesOrderById, completeSalesItem, assignBranchToSalesOrder } from '../../../services/salesOrder';
import { getMaterialStockSummary } from '../../../services/materialStockService';
import { getBranchList } from '../../../services/branchService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { useMasterData } from '../../../context/MasterDataContext';
import { getUserAction } from '../../../helpers/pageAccess';
import type { MaterialStockSummary } from '../../../type_interface/MaterialStockType';
import MaterialUsageDetailModal from '../../Tracking/components/MaterialUsageDetailModal';
import SalesItemTrackingModal from '../../quality_control/components/SalesItemTrackingModal';

interface SalesItem {
    sales_item_id: number;
    item_code: string;
    item_num: number;
    item_name: string;
    item_description: string;
    doc_num: number;
    doc_entry: number;
    work_order_id: number;
    unit_price: number;
    cost_price: number;
    producing_qty: number;
    produced_qty: number;
    unavailable_for_test_qty: number;
    passed_qty: number;
    failed_qty: number;
    num_qc_work_order : number;
    num_qc_successed_work_order : number;
    produce: boolean;
    test: boolean;
    work_order: { work_order_id: number; work_order_code: string } | null;
    status: 'PENDING' | 'INPROGRESS' | 'COMPLETED';
    is_completable: boolean;
}

interface Material {
    material_list_id: number;
    sales_item_id: number;
    item_code: string;
    item_name: string;
    item_description: string;
    original_num: number;
    remaining_num: number;
    cost_price: number;
    unit_price: number;
}

interface SalesOrder {
    sales_order_id: number;
    doc_entry: number;
    doc_num: number;
    card_code: string;
    card_name: string;
    slp_code: string;
    slp_name: string;
    bpl_code: string;
    bpl_name: string;
    branch_code: string;
    branch_name: string;
    group_code: string;
    group_name: string;
    created_date: string;
    status: 'INPROGRESS' | 'COMPLETED';
    items: SalesItem[];
    material_list: Material[];
}

interface Branch {
    branch_id: number;
    branch_code: string;
    branch_name: string;
}

const SalesOrderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();
    const { masterData } = useMasterData();
    const allowedActions = getUserAction(masterData.actionList, "SALE_ORDER", "UNASSIGNED_SO");

    const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [stockMap, setStockMap] = useState<Record<number, MaterialStockSummary>>({});
    const [stockLoading, setStockLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
    const [selectedMaterialName, setSelectedMaterialName] = useState('');
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedSalesItemId, setSelectedSalesItemId] = useState<number | null>(null);
    const [completingId, setCompletingId] = useState<number | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [assigningBranch, setAssigningBranch] = useState(false);

    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const [result, branchResult] = await Promise.all([
                getSalesOrderById(Number(id)),
                getBranchList(),
            ]);
            if (result && result.success && result.data) {
                setSalesOrder(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลใบสั่งขายได้");
                navigate('/sales_order/list');
            }
            if (branchResult && branchResult.success) {
                setBranches(branchResult.data || []);
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    const handleAssignBranch = async (branchId: number) => {
        if (!salesOrder) return;
        setAssigningBranch(true);
        try {
            const result = await assignBranchToSalesOrder(salesOrder.doc_entry, branchId);
            if (result && result.success) {
                await fetchData();
            } else {
                alertMessage((result as any)?.message || "ไม่สามารถกำหนดสาขาผลิตได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาด");
        } finally {
            setAssigningBranch(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const handleComplete = async (e: React.MouseEvent, salesItemId: number) => {
        e.stopPropagation();
        setCompletingId(salesItemId);
        try {
            const result = await completeSalesItem(salesItemId);
            if (result && result.success) {
                await fetchData();
            } else {
                alertMessage(result?.error || "ไม่สามารถเปลี่ยนสถานะได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาด");
        } finally {
            setCompletingId(null);
        }
    };

    const openMaterialDetail = (mat: Material) => {
        setSelectedMaterialId(mat.material_list_id);
        setSelectedMaterialName(mat.item_name);
        setShowDetailModal(true);
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
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

    if (!salesOrder) {
        return (
            <Content>
                <div className="d-flex flex-column flex-center py-20">
                    <i className="bi bi-exclamation-triangle fs-3x text-warning mb-4" />
                    <span className="text-gray-600 fs-5">ไม่พบข้อมูลใบสั่งขาย</span>
                    <button className="btn btn-primary mt-5" onClick={() => navigate('/sales_order/list')}>
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
                        <button className="btn btn-sm btn-icon btn-light" onClick={() => navigate('/sales_order/list')}>
                            <i className="bi bi-arrow-left fs-4" />
                        </button>
                        <h1 className="fw-bolder text-gray-900 fs-2qx mb-0">
                            ใบสั่งขาย #{salesOrder.doc_num}
                        </h1>
                    </div>
                    <p className="text-muted fs-6 ms-11">
                        Doc Entry: {salesOrder.doc_entry}
                    </p>
                </div>
                <div className="d-flex gap-3 mt-3 mt-md-0 align-items-center">
                    <span className={`badge fs-6 py-3 px-4 ${salesOrder.status === 'COMPLETED' ? 'badge-light-success' : 'badge-light-warning'}`}>
                        {salesOrder.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
                    </span>
                    <div className="d-flex align-items-center bg-light p-3 rounded">
                        <div className="d-flex flex-column text-end">
                            <span className="text-muted fs-8 fw-bolder text-uppercase">วันที่สร้าง</span>
                            <span className="fw-bolder text-gray-800 fs-6">{formatDate(salesOrder.created_date)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-5 mb-8">
                {/* ===== Customer Info ===== */}
                <div className="col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header align-items-center">
                            <h3 className="card-title fw-bolder mb-0"><i className="bi bi-person-badge fs-2 me-2 text-primary"></i> ข้อมูลลูกค้า</h3>
                        </div>
                        <div className="card-body">
                            <div className="row mb-4">
                                <div className="col-sm-4 text-muted fw-bolder">รหัสลูกค้า:</div>
                                <div className="col-sm-8 fw-bold">{salesOrder.card_code}</div>
                            </div>
                            <div className="row mb-4">
                                <div className="col-sm-4 text-muted fw-bolder">ชื่อลูกค้า:</div>
                                <div className="col-sm-8 fw-bolder fs-5 text-gray-800">{salesOrder.card_name}</div>
                            </div>
                            <div className="row">
                                <div className="col-sm-4 text-muted fw-bolder">กลุ่มลูกค้า:</div>
                                <div className="col-sm-8 fw-bold">{salesOrder.group_name} ({salesOrder.group_code})</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Sales Info ===== */}
                <div className="col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header align-items-center">
                            <h3 className="card-title fw-bolder mb-0"><i className="bi bi-briefcase fs-2 me-2 text-primary"></i> ข้อมูลการขาย</h3>
                        </div>
                        <div className="card-body">
                            <div className="row mb-4">
                                <div className="col-sm-4 text-muted fw-bolder">ตัวแทนขาย:</div>
                                <div className="col-sm-8 fw-bold d-flex align-items-center">
                                    <span className="badge badge-light-primary me-2">{salesOrder.slp_code}</span>
                                    {salesOrder.slp_name}
                                </div>
                            </div>
                            <div className="row mb-4">
                                <div className="col-sm-4 text-muted fw-bolder">สาขา (Branch):</div>
                                <div className="col-sm-8 fw-bold">
                                    <i className="bi bi-shop me-2 text-muted"></i>
                                    {salesOrder.bpl_name}
                                </div>
                            </div>
                            <div className="row mb-4">
                                <div className="col-sm-4 text-muted fw-bolder">สาขาผลิต:</div>
                                <div className="col-sm-8">
                                    {allowedActions.edit ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <select
                                                className="form-select form-select-sm"
                                                value={branches.find(b => b.branch_code === salesOrder.branch_code)?.branch_id ?? ''}
                                                disabled={assigningBranch}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val) handleAssignBranch(Number(val));
                                                }}
                                            >
                                                <option value="">-- เลือกสาขาผลิต --</option>
                                                {branches.map(b => (
                                                    <option key={b.branch_id} value={b.branch_id}>
                                                        {b.branch_name} ({b.branch_code})
                                                    </option>
                                                ))}
                                            </select>
                                            {assigningBranch && <span className="spinner-border spinner-border-sm text-primary" />}
                                        </div>
                                    ) : (
                                        <div className="fw-bold">
                                            <i className="bi bi-building me-2 text-muted"></i>
                                            {salesOrder.branch_name ? salesOrder.branch_name : <span className="badge badge-light-warning">ยังไม่ระบุสาขาผลิต</span>}
                                            {salesOrder.branch_code && <span className="badge badge-light-info ms-2">{salesOrder.branch_code}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-sm-4 text-muted fw-bolder">วันที่สร้าง:</div>
                                <div className="col-sm-8 fw-bold">{formatDateTime(salesOrder.created_date)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Items List ===== */}
            <div className="card shadow-sm mb-8">
                <div className="card-header align-items-center py-5">
                    <h3 className="card-title fw-bolder align-items-start flex-column">
                        <span className="card-label fw-bolder text-gray-800"><i className="bi bi-box-seam fs-2 me-2 text-primary"></i> รายการสินค้า ({salesOrder.items.length})</span>
                    </h3>
                    <div className="card-toolbar">
                        <span className="text-muted fs-7">
                            <i className="bi bi-hand-index me-1"></i>คลิกที่รายการเพื่อดูสถานะการผลิตและทดสอบ
                        </span>
                    </div>
                </div>
                <div className="card-body py-3">
                    <div className="table-responsive">
                        <table className="table align-middle gs-0 gy-4">
                            <thead>
                                <tr className="fw-bolder text-muted bg-light">
                                    <th className="ps-4 min-w-50px rounded-start">ลำดับ</th>
                                    <th className="min-w-100px">รหัสสินค้า</th>
                                    <th className="min-w-200px">รายละเอียดสินค้า</th>
                                    <th className="min-w-80px text-center">จำนวน</th>
                                    <th className="min-w-100px text-end">ราคาต้นทุน</th>
                                    <th className="min-w-100px text-end">ราคา/หน่วย</th>
                                    <th className="min-w-200px text-center">ความคืบหน้าการผลิต</th>
                                    <th className="min-w-120px text-center">สถานะ</th>
                                    <th className="min-w-150px text-center pe-4 rounded-end">การดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesOrder.items && salesOrder.items.length > 0 ? (
                                    salesOrder.items.map((item, index) => (
                                        <tr
                                            key={index}
                                            onClick={() => { setSelectedSalesItemId(item.sales_item_id); setShowTrackingModal(true); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="ps-4">
                                                <span className="text-gray-800 fw-bolder d-block fs-6">{index + 1}</span>
                                            </td>
                                            <td>
                                                <span className="text-muted fw-bold d-block fs-7">{item.item_code}</span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="text-gray-800 fw-bolder fs-6">{item.item_name}</span>
                                                    <span className="text-muted fw-bold d-block fs-7">{item.item_description || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className="text-gray-800 fw-bolder d-block fs-6">{item.item_num || '-'}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className="text-gray-800 fw-bolder d-block fs-6">฿{(item.cost_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className="text-gray-800 fw-bolder d-block fs-6">฿{(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const passed = item.passed_qty ?? 0;
                                                    const failed = item.failed_qty ?? 0;
                                                    const num_qc_work_order = item.num_qc_work_order ?? 0;
                                                    const num_qc_successed_work_order = item.num_qc_successed_work_order ?? 0;

                                                    const noOrders = num_qc_work_order === 0;
                                                    const qcComplete = !noOrders && num_qc_successed_work_order === num_qc_work_order;
                                                    const qcPartial = !noOrders && num_qc_successed_work_order < num_qc_work_order;

                                                    const qcBadgeClass = noOrders
                                                    ? 'badge badge-light text-muted'
                                                    : qcComplete
                                                        ? 'badge badge-light-success'
                                                        : qcPartial
                                                        ? 'badge badge-light-warning'
                                                        : 'badge badge-light-danger';

                                                    const qcIcon = noOrders
                                                    ? 'bi-slash-circle'
                                                    : qcComplete
                                                        ? 'bi-patch-check-fill'
                                                        : qcPartial
                                                        ? 'bi-hourglass-split'
                                                        : 'bi-x-circle-fill';

                                                    const stats = [
                                                    // { label: 'กำลังผลิต', value: item.producing_qty ?? 0, icon: 'bi-gear-fill', color: 'text-warning' },
                                                    { label: 'ผลิตแล้ว', value: item.produced_qty ?? 0, icon: 'bi-check2-circle', color: 'text-primary' },
                                                    // { label: 'กำลังเทส', value: testing, icon: 'bi-hourglass-split', color: 'text-info' },
                                                    { label: 'ผ่าน', value: passed, icon: 'bi-patch-check-fill', color: 'text-success' },
                                                    { label: 'ไม่ผ่าน', value: failed, icon: 'bi-x-circle-fill', color: 'text-danger' },
                                                    ];

                                                    return (
                                                    <div className="d-flex flex-wrap gap-3 align-items-center">
                                                        {stats.map(({ label, value, icon, color }) => (
                                                        <div key={label} className="d-flex align-items-center gap-1">
                                                            <i className={`bi ${icon} ${color} fs-7`}></i>
                                                            <span className="fw-bold text-gray-800 fs-7">{value}</span>
                                                            <span className="text-muted fs-8">{label}</span>
                                                        </div>
                                                        ))}

                                                        
                                                    </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="text-center">
                                                {(() => {
                                                    const statusLabel = item.status === 'COMPLETED' ? 'เสร็จสิ้น'
                                                        : item.status === 'INPROGRESS' ? 'กำลังผลิต'
                                                        : 'รอดำเนินการ';
                                                    const statusClass = item.status === 'COMPLETED' ? 'badge-light-success'
                                                        : item.status === 'INPROGRESS' ? 'badge-light-warning'
                                                        : 'badge-light-secondary';
                                                    return (
                                                        <div className="d-flex flex-column align-items-center gap-2">
                                                            <span className={`badge ${statusClass}`}>{statusLabel}</span>
                                                            {item.is_completable && (
                                                                <button
                                                                    className="btn btn-sm btn-success py-1 px-3"
                                                                    disabled={completingId === item.sales_item_id}
                                                                    onClick={(e) => handleComplete(e, item.sales_item_id)}
                                                                >
                                                                    {completingId === item.sales_item_id
                                                                        ? <span className="spinner-border spinner-border-sm" />
                                                                        : 'ทำเครื่องหมายเสร็จ'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="text-center pe-4">
                                                <div className="d-flex flex-column align-items-center gap-2">
                                                    {item.produce && !item.work_order && (
                                                        <button
                                                            className="btn btn-sm btn-light-primary py-1 px-3"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/workorder/workorders_create?doc_entry=${item.doc_entry}&sales_item_id=${item.sales_item_id}`);
                                                            }}
                                                        >
                                                            <i className="bi bi-gear me-1"></i>สร้างใบสั่งผลิต
                                                        </button>
                                                    )}
                                                    {item.test && item.num_qc_work_order === 0 && (
                                                        <button
                                                            className="btn btn-sm btn-light-warning py-1 px-3"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/quality_control/qc_workorders_list/create?doc_entry=${item.doc_entry}&sales_item_id=${item.sales_item_id}`);
                                                            }}
                                                        >
                                                            <i className="bi bi-clipboard2-check me-1"></i>สร้างใบสั่ง QC
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center py-6 text-muted fs-6">ไม่พบรายการสินค้า</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ===== Material List with Stock Overview ===== */}
            {salesOrder.material_list && salesOrder.material_list.length > 0 && (
                <div className="card shadow-sm mb-8">
                    <div className="card-header align-items-center py-5">
                        <h3 className="card-title fw-bolder align-items-start flex-column">
                            <span className="card-label fw-bolder text-gray-800">
                                <i className="bi bi-tools fs-2 me-2 text-warning"></i> รายการวัตถุดิบ ({salesOrder.material_list.length})
                            </span>
                        </h3>
                        <div className="card-toolbar">
                            <span className="text-muted fs-7">
                                <i className="bi bi-hand-index me-1"></i>คลิกที่รายการเพื่อดูรายละเอียดการใช้งาน
                            </span>
                        </div>
                    </div>
                    <div className="card-body py-3">
                        {/* Summary Cards */}
                        {/* {!stockLoading && Object.keys(stockMap).length > 0 && (
                            <div className="row g-4 mb-6">
                                <div className="col-md-3">
                                    <div className="border rounded p-4 text-center">
                                        <div className="text-muted fw-semibold fs-7 mb-1">วัตถุดิบทั้งหมด</div>
                                        <div className="fs-2 fw-bold text-gray-800">
                                            {Object.values(stockMap).reduce((sum, s) => sum + s.total_quantity, 0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="border rounded p-4 text-center">
                                        <div className="text-muted fw-semibold fs-7 mb-1">ใช้ในผลิต</div>
                                        <div className="fs-2 fw-bold text-primary">
                                            {Object.values(stockMap).reduce((sum, s) => sum + s.used_in_production, 0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="border rounded p-4 text-center">
                                        <div className="text-muted fw-semibold fs-7 mb-1">ใช้ในเทส / อื่นๆ</div>
                                        <div className="fs-2 fw-bold text-info">
                                            {Object.values(stockMap).reduce((sum, s) => sum + s.used_in_testing, 0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="border rounded p-4 text-center">
                                        <div className="text-muted fw-semibold fs-7 mb-1">คงเหลือ</div>
                                        <div className={`fs-2 fw-bold ${Object.values(stockMap).some(s => s.remaining_quantity <= 0) ? 'text-danger' : 'text-success'}`}>
                                            {Object.values(stockMap).reduce((sum, s) => sum + s.remaining_quantity, 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )} */}

                        <div className="table-responsive">
                            <table className="table align-middle gs-0 gy-4">
                                <thead>
                                    <tr className="fw-bolder text-muted bg-light">
                                        <th className="ps-4 min-w-60px rounded-start">จำนวน</th>
                                        <th className="min-w-100px">รหัสวัตถุดิบ</th>
                                        <th className="min-w-200px">ชื่อวัตถุดิบ</th>
                                        <th className="min-w-100px text-end">ราคาต้นทุน</th>
                                        <th className="min-w-100px text-end">ราคา/หน่วย</th>
                                        <th className="min-w-200px text-center pe-4 rounded-end">จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesOrder.material_list.map((mat, index) => {
                                        const stock = stockMap[mat.material_list_id];
                                        const usedPct = stock && stock.total_quantity > 0
                                            ? Math.min(100, ((stock.used_in_production + stock.used_in_testing) / stock.total_quantity) * 100)
                                            : 0;
                                        const progressColor = !stock ? 'bg-secondary'
                                            : stock.remaining_quantity <= 0 ? 'bg-danger'
                                                : usedPct >= 80 ? 'bg-warning'
                                                    : 'bg-success';

                                        return (
                                            <tr
                                                key={index}
                                                onClick={() => openMaterialDetail(mat)}
                                                className="cursor-pointer"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td className="ps-4 text-gray-800 fw-bolder fs-6">{mat.original_num ?? '-'}</td>
                                                <td className="text-gray-800 fw-bold">{mat.item_code}</td>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-gray-800 fw-bolder fs-6">{mat.item_name}</span>
                                                        {mat.item_description && (
                                                            <span className="text-muted fs-7">{mat.item_description}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-end fw-bold">฿{(mat.cost_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="text-end fw-bold">฿{(mat.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="text-center fw-bold pe-4">
                                                    เหลือ {mat.remaining_num} <span className='text-success tw-bold'>จาก {mat.original_num}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Material Usage Detail Modal */}
            <MaterialUsageDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                materialListId={selectedMaterialId}
                materialName={selectedMaterialName}
            />

            {/* Sales Item Tracking Modal */}
            <SalesItemTrackingModal
                show={showTrackingModal}
                onHide={() => setShowTrackingModal(false)}
                salesItemId={selectedSalesItemId}
            />
        </Content>
    );
};

export default SalesOrderView;
