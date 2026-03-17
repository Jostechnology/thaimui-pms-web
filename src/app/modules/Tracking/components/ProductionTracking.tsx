import React, { useState, useEffect, useCallback } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getAllMaterialTracking } from '../../../services/materialStockService';
import type { MaterialStockSummary } from '../../../type_interface/MaterialStockType';
import MaterialUsageDetailModal from './MaterialUsageDetailModal';

const ProductionTracking: React.FC = () => {
    const [materials, setMaterials] = useState<MaterialStockSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
    const [selectedMaterialName, setSelectedMaterialName] = useState('');

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllMaterialTracking({ search, type: 'production' });
            if (res.success && res.data) {
                setMaterials(res.data);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleSearch = () => {
        fetchMaterials();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') fetchMaterials();
    };

    const getStockBadge = (item: MaterialStockSummary) => {
        if (item.remaining_quantity <= 0) return 'badge-light-danger';
        const pct = item.total_quantity > 0 ? (item.remaining_quantity / item.total_quantity) * 100 : 0;
        if (pct <= 20) return 'badge-light-warning';
        return 'badge-light-success';
    };

    const getProgressColor = (item: MaterialStockSummary) => {
        if (item.remaining_quantity <= 0) return 'bg-danger';
        const pct = item.total_quantity > 0 ? (item.remaining_quantity / item.total_quantity) * 100 : 0;
        if (pct <= 20) return 'bg-warning';
        return 'bg-success';
    };

    const openDetail = (item: MaterialStockSummary) => {
        setSelectedMaterialId(item.material_list_id);
        setSelectedMaterialName(item.item_name);
        setShowDetailModal(true);
    };

    return (
        <Content>
            <div className="mb-6">
                <h1 className="text-gray-900 fw-bold fs-2qx mb-1">
                    <i className="bi bi-gear-wide-connected text-primary fs-2qx me-3"></i>
                    การติดตามการผลิต (Production Tracking)
                </h1>
                <span className="text-muted fw-semibold fs-6">
                    ติดตามการใช้วัตถุดิบในกระบวนการผลิต — คลิกรายการเพื่อดูว่าไปอยู่ที่เอกสารไหนบ้าง ใช้ไปเท่าไร
                </span>
            </div>

            {/* Search & Refresh */}
            <div className="card card-flush shadow-sm border-0 mb-6">
                <div className="card-body py-5 px-8">
                    <div className="row align-items-end">
                        <div className="col-md-8 mb-3 mb-md-0">
                            <label className="form-label fw-bold fs-7 text-gray-700">ค้นหาวัตถุดิบ</label>
                            <input
                                type="text"
                                className="form-control form-control-solid"
                                placeholder="ค้นหาตามรหัส หรือชื่อวัตถุดิบ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="col-md-2 mb-3 mb-md-0">
                            <button className="btn btn-primary fw-bold w-100" onClick={handleSearch}>
                                <i className="bi bi-search me-1"></i> ค้นหา
                            </button>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-light-primary fw-bold w-100"
                                onClick={() => { setSearch(''); fetchMaterials(); }}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i> รีเฟรช
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="d-flex align-items-center justify-content-center py-10">
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    <span className="text-muted">กำลังโหลดข้อมูล...</span>
                </div>
            )}

            {!loading && materials.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="row g-5 mb-6">
                        <div className="col-md-3">
                            <div className="card card-flush border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center py-5">
                                    <div className="symbol symbol-50px me-4">
                                        <span className="symbol-label bg-light-primary">
                                            <i className="bi bi-box-seam text-primary fs-2"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <div className="fs-4 fw-bold text-gray-800">{materials.length}</div>
                                        <div className="text-muted fw-semibold fs-7">รายการวัตถุดิบ</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card card-flush border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center py-5">
                                    <div className="symbol symbol-50px me-4">
                                        <span className="symbol-label bg-light-primary">
                                            <i className="bi bi-gear text-primary fs-2"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <div className="fs-4 fw-bold text-gray-800">
                                            {materials.reduce((sum, s) => sum + s.used_in_production, 0)}
                                        </div>
                                        <div className="text-muted fw-semibold fs-7">ใช้ในผลิตทั้งหมด</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card card-flush border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center py-5">
                                    <div className="symbol symbol-50px me-4">
                                        <span className="symbol-label bg-light-success">
                                            <i className="bi bi-check-circle text-success fs-2"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <div className="fs-4 fw-bold text-gray-800">
                                            {materials.filter(s => s.remaining_quantity > 0).length}
                                        </div>
                                        <div className="text-muted fw-semibold fs-7">ยังมีสต็อก</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card card-flush border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center py-5">
                                    <div className="symbol symbol-50px me-4">
                                        <span className="symbol-label bg-light-danger">
                                            <i className="bi bi-exclamation-triangle text-danger fs-2"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <div className="fs-4 fw-bold text-gray-800">
                                            {materials.filter(s => s.remaining_quantity <= 0).length}
                                        </div>
                                        <div className="text-muted fw-semibold fs-7">หมดสต็อก</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    {materials.some(s => s.remaining_quantity <= 0) && (
                        <div className="alert alert-danger d-flex align-items-center py-3 mb-5">
                            <i className="bi bi-exclamation-octagon text-danger me-3 fs-3"></i>
                            <div>
                                <span className="fw-bold">แจ้งเตือน:</span> มีวัตถุดิบที่หมดสต็อก กรุณาตรวจสอบก่อนดำเนินการผลิต
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="card card-flush shadow-sm border-0">
                        <div className="card-header py-4 px-6">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-table text-primary fs-4 me-2"></i>
                                <h5 className="fw-bold text-gray-800 mb-0">รายการวัตถุดิบทั้งหมด</h5>
                            </div>
                            <span className="text-muted fs-7">คลิกแถวเพื่อดูรายละเอียดการใช้งาน</span>
                        </div>
                        <div className="card-body py-4 px-6">
                            <div className="table-responsive">
                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3 table-hover">
                                    <thead>
                                        <tr className="fw-bold text-muted fs-7 text-uppercase">
                                            <th>#</th>
                                            <th>รหัส</th>
                                            <th>ชื่อวัตถุดิบ</th>
                                            <th>รายละเอียด</th>
                                            <th className="text-center">จำนวนทั้งหมด</th>
                                            <th className="text-center">ใช้ในผลิต</th>
                                            <th className="text-center">ใช้ในเทส</th>
                                            <th className="text-center">คงเหลือ</th>
                                            <th style={{ minWidth: 140 }}>สถานะ</th>
                                            <th className="text-center">ดู</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {materials.map((item, idx) => {
                                            const usedPct = item.total_quantity > 0
                                                ? ((item.used_in_production + item.used_in_testing) / item.total_quantity) * 100
                                                : 0;
                                            return (
                                                <tr
                                                    key={item.material_list_id}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => openDetail(item)}
                                                    title="คลิกเพื่อดูรายละเอียดการใช้งาน"
                                                >
                                                    <td className="text-muted fs-7">{idx + 1}</td>
                                                    <td className="text-muted fs-7 fw-semibold">{item.item_code}</td>
                                                    <td className="fw-semibold text-gray-800">{item.item_name}</td>
                                                    <td className="text-muted fs-7">{item.item_description}</td>
                                                    <td className="text-center fw-bold">{item.total_quantity}</td>
                                                    <td className="text-center text-primary fw-bold">{item.used_in_production}</td>
                                                    <td className="text-center text-info fw-semibold">{item.used_in_testing}</td>
                                                    <td className="text-center">
                                                        <span className={`badge fs-7 ${getStockBadge(item)}`}>
                                                            {item.remaining_quantity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="progress h-8px flex-grow-1 me-2">
                                                                <div
                                                                    className={`progress-bar ${getProgressColor(item)}`}
                                                                    role="progressbar"
                                                                    style={{ width: `${Math.min(usedPct, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-muted fs-8 fw-semibold" style={{ minWidth: 35 }}>
                                                                {Math.round(usedPct)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            className="btn btn-sm btn-icon btn-light-primary"
                                                            onClick={(e) => { e.stopPropagation(); openDetail(item); }}
                                                            title="ดูรายละเอียด"
                                                        >
                                                            <i className="bi bi-eye fs-5"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {!loading && materials.length === 0 && (
                <div className="card card-flush shadow-sm border-0">
                    <div className="card-body py-10 text-center">
                        <i className="bi bi-inbox text-muted fs-2x mb-3 d-block"></i>
                        <span className="text-muted fs-6">ไม่พบข้อมูลวัตถุดิบ</span>
                    </div>
                </div>
            )}

            <MaterialUsageDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                materialListId={selectedMaterialId}
                materialName={selectedMaterialName}
            />
        </Content>
    );
};

export default ProductionTracking;
