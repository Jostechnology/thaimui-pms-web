import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../../../_metronic/layout/components/content';
import { useAppLoading } from '../../context/AppLoadingContext';
import { useAlertModal } from '../../context/ModalContext';
import { getReportDefinitions } from '../../services/reportService';
import type { ReportDefinition } from '../../type_interface/ReportType';

const CATEGORY_LABEL: Record<string, string> = {
    WAREHOUSE: 'คลังสินค้า',
    PRODUCTION: 'การผลิต',
    QUALITY: 'คุณภาพ',
    HR: 'พนักงาน',
    SALES: 'การขาย',
    COST: 'ต้นทุน',
    OTHER: 'อื่น ๆ',
};

const CATEGORY_COLOR: Record<string, string> = {
    WAREHOUSE: 'bg-light-primary text-primary',
    PRODUCTION: 'bg-light-success text-success',
    QUALITY: 'bg-light-warning text-warning',
    HR: 'bg-light-info text-info',
    SALES: 'bg-light-danger text-danger',
    COST: 'bg-light-dark text-dark',
    OTHER: 'bg-light-secondary text-gray-700',
};

const ReportsList: React.FC = () => {
    const navigate = useNavigate();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [items, setItems] = useState<ReportDefinition[]>([]);
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    useEffect(() => {
        (async () => {
            setLoading();
            const res = await getReportDefinitions();
            if (res.success && res.data) {
                setItems(res.data.items || []);
            } else {
                alertMessage(res.message || 'ดึงรายการรายงานไม่สำเร็จ');
            }
            setUnLoading();
        })();
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach((r) => set.add(r.category));
        return Array.from(set);
    }, [items]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return items.filter((r) => {
            if (categoryFilter && r.category !== categoryFilter) return false;
            if (!kw) return true;
            return (
                r.name.toLowerCase().includes(kw) ||
                r.code.toLowerCase().includes(kw) ||
                r.description.toLowerCase().includes(kw)
            );
        });
    }, [items, keyword, categoryFilter]);

    return (
        <Content>
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>รายงาน</h1>
                    <span className='text-muted fw-semibold fs-6'>เลือกประเภทรายงานเพื่อดูตาราง กราฟ และส่งออกเป็นไฟล์ Excel</span>
                </div>
            </div>

            <div className='card card-flush shadow-sm border-0 mb-5'>
                <div className='card-header align-items-center py-5 gap-2 gap-md-5'>
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-4'>
                                <span className='path1'></span><span className='path2'></span>
                            </i>
                            <input
                                type='text'
                                className='form-control form-control-lg w-300px ps-12'
                                placeholder='ค้นหารายงาน'
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='card-toolbar d-flex align-items-center gap-3'>
                        <select
                            className='form-select form-select-solid w-200px'
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value=''>ทุกหมวด</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className='row g-5 g-xl-8'>
                {filtered.length === 0 ? (
                    <div className='col-12'>
                        <div className='card card-flush shadow-sm border-0'>
                            <div className='card-body text-center py-20 text-muted'>
                                <i className='bi bi-file-earmark-bar-graph fs-3x text-gray-300 mb-4 d-block'></i>
                                ไม่พบรายงานที่ตรงเงื่อนไข
                            </div>
                        </div>
                    </div>
                ) : (
                    filtered.map((r) => (
                        <div key={r.code} className='col-md-6 col-xl-4'>
                            <div
                                role='button'
                                className='card card-flush shadow-sm border-0 h-100 hover-elevate-up'
                                style={{ transition: 'transform .2s, box-shadow .2s' }}
                                onClick={() => navigate(`/reports/view/${r.code}`)}
                            >
                                <div className='card-body p-6'>
                                    <div className='d-flex align-items-center mb-4'>
                                        <div className='symbol symbol-45px me-4'>
                                            <span className={`symbol-label ${CATEGORY_COLOR[r.category] ?? 'bg-light-secondary text-gray-700'} rounded`}>
                                                <i className='bi bi-file-earmark-spreadsheet fs-2'></i>
                                            </span>
                                        </div>
                                        <div className='d-flex flex-column'>
                                            <span className='text-gray-900 fw-bold fs-5'>{r.name}</span>
                                            <span className='text-muted fs-8'>{CATEGORY_LABEL[r.category] ?? r.category}</span>
                                        </div>
                                    </div>
                                    <p className='text-gray-700 fs-7 mb-4 lh-base'>{r.description}</p>
                                    <div className='d-flex justify-content-end'>
                                        <span className='btn btn-sm btn-light-primary fw-bold'>
                                            เปิดรายงาน <i className='bi bi-arrow-right ms-1'></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Content>
    );
};

export default ReportsList;
