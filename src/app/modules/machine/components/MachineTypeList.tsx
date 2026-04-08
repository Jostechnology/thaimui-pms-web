import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getMachineTypeList } from '../../../services/machineTypeService';
import type { MachineTypeItem } from '../../../type_interface/PhaseTemplateType';

const MachineTypeList: React.FC = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<MachineTypeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const perPage = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getMachineTypeList(page, perPage, search);
            if (res.success && res.data) {
                setItems(res.data.items);
                setTotalPages(res.data.total_pages);
                setTotal(res.data.total);
            }
        } catch {
            console.error('fetch error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page, search]);

    return (
        <Content>
            <div className="d-flex align-items-center justify-content-between mb-6">
                <div>
                    <h3 className="fw-bolder mb-1">ประเภทเครื่องจักร</h3>
                    <span className="text-muted fs-7">จัดการประเภทเครื่องจักร เช่น เครื่องดึง, เครื่องลาก</span>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/machine/machine_type_create')}>
                    <i className="bi bi-plus-lg me-1"></i> เพิ่มประเภท
                </button>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="card-body py-4">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-search text-muted me-3 fs-4"></i>
                        <input
                            type="text"
                            className="form-control form-control-solid"
                            placeholder="ค้นหาประเภทเครื่องจักร..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-row-dashed table-row-gray-300 align-middle gs-4 gy-4 mb-0">
                            <thead>
                                <tr className="fw-bold text-muted bg-light">
                                    <th className="ps-4 rounded-start">#</th>
                                    <th>ชื่อประเภท</th>
                                    <th>รายละเอียด</th>
                                    <th>สถานะ</th>
                                    <th className="text-end pe-4 rounded-end">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-10">
                                        <span className="spinner-border spinner-border-sm me-2"></span>กำลังโหลด...
                                    </td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-muted">ไม่พบข้อมูลประเภทเครื่องจักร</td></tr>
                                ) : items.map((item, idx) => (
                                    <tr key={item.machine_type_id}>
                                        <td className="ps-4">{(page - 1) * perPage + idx + 1}</td>
                                        <td>
                                            <span className="fw-bold text-dark">{item.type_name}</span>
                                        </td>
                                        <td>
                                            <span className="text-muted">{item.type_description || '—'}</span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-light-${item.is_active ? 'success' : 'danger'}`}>
                                                {item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                            </span>
                                        </td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-sm btn-icon btn-light-warning me-1"
                                                onClick={() => navigate(`/machine/machine_type_edit/${item.machine_type_id}`)}
                                                title="แก้ไข">
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer d-flex justify-content-between align-items-center">
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
            </div>
        </Content>
    );
};

export default MachineTypeList;
