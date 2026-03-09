import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { getSalesOrderById } from '../../../services/salesOrder';
import { getMaterialStockSummary } from '../../../services/materialStockService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { MaterialStockSummary } from '../../../type_interface/MaterialStockType';
import MaterialUsageDetailModal from '../../Tracking/components/MaterialUsageDetailModal';

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
}

interface Material {
    material_list_id: number;
    sales_item_id: number;
    item_code: string;
    item_name: string;
    item_description: string;
    item_num: number;
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
    group_code: string;
    group_name: string;
    created_date: string;
    items: SalesItem[];
    material_list: Material[];
}

const SalesOrderView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [stockMap, setStockMap] = useState<Record<number, MaterialStockSummary>>({});
    const [stockLoading, setStockLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
    const [selectedMaterialName, setSelectedMaterialName] = useState('');

    const fetchData = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getSalesOrderById(Number(id));
            if (result && result.success && result.data) {
                setSalesOrder(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลใบสั่งขายได้");
                navigate('/sales_order/list');
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
        if (id) {
            fetchData();
        }
    }, [id]);

    // ดึงข้อมูล stock สำหรับ material ทั้งหมดเมื่อ salesOrder โหลดเสร็จ
    useEffect(() => {
        if (salesOrder && salesOrder.items.length > 0) {
            fetchStockSummaries();
        }
    }, [salesOrder]);

    const fetchStockSummaries = async () => {
        if (!salesOrder) return;
        setStockLoading(true);
        try {
            const uniqueItemIds = [...new Set(salesOrder.items.map(i => i.sales_item_id))];
            const allStocks: MaterialStockSummary[] = [];
            for (const itemId of uniqueItemIds) {
                const res = await getMaterialStockSummary(itemId);
                if (res.success && res.data) {
                    allStocks.push(...res.data);
                }
            }
            const map: Record<number, MaterialStockSummary> = {};
            for (const s of allStocks) {
                map[s.material_list_id] = s;
            }
            setStockMap(map);
        } catch { /* ignore */ }
        finally { setStockLoading(false); }
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
                <div className="d-flex gap-3 mt-3 mt-md-0">
                    <div className="d-flex align-items-center bg-light p-3 rounded">
                        <div className="d-flex flex-column text-end">
                            <span className="text-muted fs-8 fw-bolder text-uppercase">วันที่แจ้งงาน</span>
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
                                    <th className="min-w-100px text-end pe-4 rounded-end">ราคา/หน่วย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesOrder.items && salesOrder.items.length > 0 ? (
                                    salesOrder.items.map((item, index) => (
                                        <tr key={index}>
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
                                            <td className="text-end pe-4">
                                                <span className="text-gray-800 fw-bolder d-block fs-6">฿{(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-6 text-muted fs-6">ไม่พบรายการสินค้า</td>
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
                        {!stockLoading && Object.keys(stockMap).length > 0 && (
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
                        )}

                        <div className="table-responsive">
                            <table className="table align-middle gs-0 gy-4">
                                <thead>
                                    <tr className="fw-bolder text-muted bg-light">
                                        <th className="ps-4 min-w-60px rounded-start">จำนวน</th>
                                        <th className="min-w-100px">รหัสวัตถุดิบ</th>
                                        <th className="min-w-200px">ชื่อวัตถุดิบ</th>
                                        <th className="min-w-100px text-end">ราคาต้นทุน</th>
                                        <th className="min-w-100px text-end">ราคา/หน่วย</th>
                                        <th className="min-w-200px text-center pe-4 rounded-end">สถานะการใช้งาน</th>
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
                                                <td className="ps-4 text-gray-800 fw-bolder fs-6">{mat.item_num || '-'}</td>
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
                                                <td className="pe-4">
                                                    {stockLoading ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span className="spinner-border spinner-border-sm text-muted"></span>
                                                        </div>
                                                    ) : stock ? (
                                                        <div>
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <span className="text-muted fs-8">
                                                                    ผลิต: {stock.used_in_production} | เทส: {stock.used_in_testing}
                                                                </span>
                                                                <span className={`fw-bold fs-8 ${stock.remaining_quantity <= 0 ? 'text-danger' : 'text-success'}`}>
                                                                    เหลือ {stock.remaining_quantity}
                                                                </span>
                                                            </div>
                                                            <div className="progress h-6px w-100">
                                                                <div
                                                                    className={`progress-bar ${progressColor}`}
                                                                    style={{ width: `${usedPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted fs-8">-</span>
                                                    )}
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
        </Content>
    );
};

export default SalesOrderView;
