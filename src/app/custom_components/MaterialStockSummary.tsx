import React, { useState, useEffect } from 'react';
import { getMaterialStockSummary } from '../services/materialStockService';
import type { MaterialStockSummary as StockSummaryType } from '../type_interface/MaterialStockType';

interface Props {
    salesItemId: number;
    /** ถ้ามี stockData จากภายนอก จะไม่ fetch ซ้ำ */
    externalData?: StockSummaryType[];
}

const MaterialStockSummary: React.FC<Props> = ({ salesItemId, externalData }) => {
    const [summaries, setSummaries] = useState<StockSummaryType[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (externalData) {
            setSummaries(externalData);
            return;
        }
        if (!salesItemId) return;

        (async () => {
            setLoading(true);
            try {
                const res = await getMaterialStockSummary(salesItemId);
                if (res.success && res.data) {
                    setSummaries(res.data);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [salesItemId, externalData]);

    if (loading) {
        return (
            <div className="d-flex align-items-center py-4">
                <span className="spinner-border spinner-border-sm me-2"></span>
                <span className="text-muted">กำลังโหลดข้อมูลสต็อกวัตถุดิบ...</span>
            </div>
        );
    }

    if (summaries.length === 0) return null;

    const getStockBadge = (item: StockSummaryType) => {
        const pct = item.total_quantity > 0
            ? (item.remaining_quantity / item.total_quantity) * 100
            : 0;
        if (item.remaining_quantity <= 0) return 'badge-light-danger';
        if (pct <= 20) return 'badge-light-warning';
        return 'badge-light-success';
    };

    const getProgressColor = (item: StockSummaryType) => {
        const pct = item.total_quantity > 0
            ? (item.remaining_quantity / item.total_quantity) * 100
            : 0;
        if (item.remaining_quantity <= 0) return 'bg-danger';
        if (pct <= 20) return 'bg-warning';
        return 'bg-success';
    };

    return (
        <div className="card card-flush shadow-sm border-0 mb-5">
            <div className="card-header py-4 px-6">
                <div className="d-flex align-items-center">
                    <i className="bi bi-box-seam text-primary fs-3 me-2"></i>
                    <h5 className="fw-bold text-gray-800 mb-0">
                        สรุปยอดวัตถุดิบคงเหลือ (Material Stock Summary)
                    </h5>
                </div>
            </div>
            <div className="card-body py-4 px-6">
                <div className="table-responsive">
                    <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-3">
                        <thead>
                            <tr className="fw-bold text-muted fs-7 text-uppercase">
                                <th>รหัส</th>
                                <th>ชื่อวัตถุดิบ</th>
                                <th className="text-center">จำนวนทั้งหมด</th>
                                <th className="text-center">ใช้ในผลิต</th>
                                <th className="text-center">ใช้ในเทส</th>
                                <th className="text-center">คงเหลือ</th>
                                <th style={{ minWidth: 120 }}>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaries.map(item => {
                                const remainingPct = item.total_quantity > 0
                                    ? (item.remaining_quantity / item.total_quantity) * 100
                                    : 0;

                                return (
                                    <tr key={item.material_list_id}>
                                        <td className="text-muted fs-7">{item.item_code}</td>
                                        <td className="fw-semibold text-gray-800">
                                            {item.item_name}
                                            {item.item_group && <span className="badge badge-light-info ms-2 fs-8">{item.item_group}</span>}
                                        </td>
                                        <td className="text-center fw-bold">{item.total_quantity}</td>
                                        <td className="text-center text-primary">{item.used_in_production}</td>
                                        <td className="text-center text-info">{item.used_in_testing}</td>
                                        <td className="text-center">
                                            <span className={`badge fs-7 ${getStockBadge(item)}`}>
                                                {item.remaining_quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="progress h-6px bg-light-secondary">
                                                <div
                                                    className={`progress-bar ${getProgressColor(item)}`}
                                                    role="progressbar"
                                                    style={{ width: remainingPct > 0 ? `${Math.min(remainingPct, 100)}%` : '100%', opacity: remainingPct > 0 ? 1 : 0.25 }}
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {summaries.some(s => s.remaining_quantity <= 0) && (
                    <div className="alert alert-danger d-flex align-items-center py-3 mt-3 mb-0">
                        <i className="bi bi-exclamation-octagon text-danger me-3 fs-4"></i>
                        <span>
                            มีวัตถุดิบที่หมดสต็อก กรุณาตรวจสอบก่อนดำเนินการผลิตหรือเทส
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaterialStockSummary;
