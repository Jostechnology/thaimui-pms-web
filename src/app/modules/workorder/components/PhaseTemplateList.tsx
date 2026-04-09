import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getPhaseTemplateList, deletePhaseTemplate } from '../../../services/phaseTemplateService';
import type { PhaseTemplate } from '../../../type_interface/PhaseTemplateType';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useMasterData } from '../../../context/MasterDataContext';
import { getUserAction } from '../../../helpers/pageAccess';

const PhaseTemplateList: React.FC = () => {
    const navigate = useNavigate();
    const { setLoading, setUnLoading } = useAppLoading();
    const { masterData } = useMasterData();
    const permissions = getUserAction(masterData.actionList, 'WORKORDERS', 'PHASE_TEMPLATE');

    const [items, setItems] = useState<PhaseTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const perPage = 10;

    useEffect(() => {
        if (isLoading) setLoading();
        else setUnLoading();
    }, [isLoading]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await getPhaseTemplateList(page, perPage, search);
            if (res.success && res.data) {
                setItems(res.data.items);
                setTotalPages(res.data.total_pages);
                setTotal(res.data.total);
            }
        } catch {
            console.error('fetch error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page, search]);

    const handleDelete = async (item: PhaseTemplate) => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบ?',
            html: `ต้องการลบ Template <strong>${item.template_name}</strong> หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
            reverseButtons: true,
        });
        if (!confirm.isConfirmed) return;
        const res = await deletePhaseTemplate(item.phase_template_id);
        if (res.success) {
            Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
            fetchData();
        } else {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.message });
        }
    };

    return (
        <Content>
            <div className="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h3 className="fw-bolder mb-1">Phase Template</h3>
                    <span className="text-muted fs-7">จัดการ Template สำหรับ Phase การผลิต</span>
                </div>
                {permissions.create && (
                    <button className="btn btn-primary" onClick={() => navigate('create')}>
                        <i className="bi bi-plus-lg me-1"></i> สร้าง Template
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="card-body py-4">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-search text-muted me-3 fs-4"></i>
                        <input
                            type="text"
                            className="form-control form-control-solid"
                            placeholder="ค้นหา Template..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            </div>

            {/* Cards grid */}
            {isLoading ? (
                <div className="text-center py-20"><span className="spinner-border"></span> กำลังโหลด...</div>
            ) : items.length === 0 ? (
                <div className="card">
                    <div className="card-body text-center py-20 text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                        ยังไม่มี Phase Template
                    </div>
                </div>
            ) : (
                <div className="row g-5">
                    {items.map(item => (
                        <div className="col-md-6 col-xl-4" key={item.phase_template_id}>
                            <div className="card card-flush h-100 border-hover">
                                <div className="card-header border-0 pt-6">
                                    <div className="card-title">
                                        <div className="d-flex align-items-center">
                                            <div className="symbol symbol-40px me-3">
                                                <span className="symbol-label bg-light-primary">
                                                    <i className="bi bi-layers text-primary fs-4"></i>
                                                </span>
                                            </div>
                                            <div>
                                                <h5 className="fw-bold mb-0">{item.template_name}</h5>
                                                <span className="text-muted fs-8">{item.item_count} phases</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body pt-2">
                                    {item.items && item.items.length > 0 ? (
                                        <div className="d-flex flex-column gap-2">
                                            {item.items.map((phase, idx) => (
                                                <div key={phase.phase_template_item_id}
                                                    className="d-flex align-items-center p-3 bg-light rounded">
                                                    <span className="badge badge-circle badge-light-primary me-3 fw-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-grow-1">
                                                        <span className="fw-semibold fs-7">{phase.phase_name}</span>
                                                        {phase.machine_type && (
                                                            <span className="badge badge-light-info ms-2 fs-9">
                                                                <i className="bi bi-gear-wide-connected me-1"></i>
                                                                {phase.machine_type.type_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted fs-7">ไม่มี Phase</span>
                                    )}
                                </div>
                                <div className="card-footer d-flex justify-content-end gap-2 pt-0 border-0">
                                    {permissions.edit && (
                                        <button className="btn btn-sm btn-light-warning"
                                            onClick={() => navigate(`edit/${item.phase_template_id}`)}>
                                            <i className="bi bi-pencil-square me-1"></i> แก้ไข
                                        </button>
                                    )}
                                    {permissions.delete && (
                                        <button className="btn btn-sm btn-light-danger" onClick={() => handleDelete(item)}>
                                            <i className="bi bi-trash me-1"></i> ลบ
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-6">
                    <span className="text-muted fs-7">ทั้งหมด {total} รายการ</span>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <span className="btn btn-sm btn-primary disabled">{page}/{totalPages}</span>
                        <button className="btn btn-sm btn-light" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            )}
        </Content>
    );
};

export default PhaseTemplateList;
