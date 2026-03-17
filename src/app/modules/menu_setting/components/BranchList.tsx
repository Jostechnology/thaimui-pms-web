import React, { useState, useMemo, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getBranchList, deleteBranch } from '../../../services/branchService';

const BranchList: React.FC = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 🌟 ดึงข้อมูลจาก API
    useEffect(() => {
        const fetchBranches = async () => {
            setIsLoading(true);
            const res = await getBranchList();
            if (res.success) setBranches(res.data);
            setIsLoading(false);
        };
        fetchBranches();
    }, []);

    // ─── กรองข้อมูลตามคำค้นหา (Search) ───
    const filteredBranches = useMemo(() => {
        if (!searchTerm) return branches;
        const lower = searchTerm.toLowerCase();
        return branches.filter(b => 
            b.branch_code.toLowerCase().includes(lower) || 
            b.branch_name.toLowerCase().includes(lower)
        );
    }, [branches, searchTerm]);

    // ─── ฟังก์ชันลบสาขา ───
    const handleDelete = async (id: number, name: string) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบสาขา?',
            text: `คุณต้องการลบ "${name}" ออกจากระบบใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#F5F8FA',
            confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> ใช่, ลบเลย',
            cancelButtonText: '<span class="text-dark">ยกเลิก</span>',
            reverseButtons: true,
            customClass: {
                cancelButton: 'border border-gray-300'
            }
        });

        if (result.isConfirmed) {
            const res = await deleteBranch(id);
            if (res.success) {
                setBranches(prev => prev.filter(b => b.branch_id !== id));
                Swal.fire({
                    icon: 'success',
                    title: 'ลบข้อมูลสำเร็จ!',
                    text: `ลบสาขา "${name}" เรียบร้อยแล้ว`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: res.message || 'ไม่สามารถลบข้อมูลได้ กรุณาลองอีกครั้ง',
                    confirmButtonColor: '#d33',
                });
            }
        }
    };

    return (
        <Content>
            {/* ─── Header & Action ─── */}
            <div className="d-flex flex-wrap flex-stack mb-6">
                <h3 className="fw-bolder my-2">
                    Branch Master List
                    <span className="fs-6 text-gray-400 fw-bold ms-4">จัดการข้อมูลสาขาทั้งหมดในระบบ</span>
                </h3>
                
                {/* ปุ่มเพิ่มสาขาใหม่ */}
                <div className="d-flex align-items-center my-2">
                    <button 
                        className="btn btn-primary fw-bolder" 
                        onClick={() => navigate('/setting/branch_create')}
                    >
                        <i className="bi bi-plus-lg fs-4 me-2"></i> เพิ่มสาขาใหม่
                    </button>
                </div>
            </div>

            {/* ─── Card Table ─── */}
            <div className="card">
                {/* Card Header (Search) */}
                <div className="card-header border-0 pt-6">
                    <div className="card-title">
                        <div className="d-flex align-items-center position-relative my-1">
                            <i className="bi bi-search position-absolute ms-4 fs-4 text-gray-500"></i>
                            <input 
                                type="text" 
                                className="form-control form-control-solid w-250px ps-12" 
                                placeholder="ค้นหารหัส หรือ ชื่อสาขา..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Card Body (Table) */}
                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-5">
                            <thead>
                                <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                                    <th className="min-w-150px">รหัสสาขา</th>
                                    <th className="min-w-250px">ชื่อสาขา</th>
                                    <th className="min-w-100px text-center">สถานะ</th>
                                    <th className="text-end min-w-150px">จัดการ</th>
                                </tr>
                            </thead>
                            
                            <tbody className="text-gray-600 fw-bold">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : filteredBranches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center text-gray-500 py-10 fs-5">
                                            <i className="bi bi-inbox fs-1 d-block mb-3 text-muted"></i>
                                            ไม่พบข้อมูลสาขา
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBranches.map((branch, index) => (
                                        <tr key={branch.branch_id} className="hover-bg-light">
                                            {/* รหัสสาขา */}
                                            <td>
                                                <span className="badge badge-light-primary fs-6 px-3 py-2">
                                                    {branch.branch_code}
                                                </span>
                                            </td>

                                            {/* ชื่อสาขา */}
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-40px me-3">
                                                        <div className="symbol-label bg-light-info">
                                                            <i className="bi bi-geo-alt-fill fs-3 text-info"></i>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-dark fw-bolder fs-5 mb-1">{branch.branch_name}</span>
                                                        <span className="text-muted fs-8">วันที่สร้าง: {new Date(branch.created_date).toLocaleDateString('th-TH')}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* สถานะ */}
                                            <td className="text-center">
                                                {branch.is_active ? (
                                                    <span className="badge badge-light-success fw-bolder px-3 py-1">เปิดใช้งาน</span>
                                                ) : (
                                                    <span className="badge badge-light-danger fw-bolder px-3 py-1">ปิดใช้งาน</span>
                                                )}
                                            </td>

                                            {/* ปุ่ม Action */}
                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    {/* ปุ่มแก้ไข */}
                                                    <button 
                                                        className="btn btn-icon btn-light-warning btn-sm"
                                                        onClick={() => navigate(`/setting/branch_edit/${branch.branch_id}`)}
                                                        title="แก้ไขสาขา"
                                                    >
                                                        <i className="bi bi-pencil-square fs-5"></i>
                                                    </button>

                                                    {/* ปุ่มลบ */}
                                                    <button 
                                                        className="btn btn-icon btn-light-danger btn-sm"
                                                        onClick={() => handleDelete(branch.branch_id, branch.branch_name)}
                                                        title="ลบสาขา"
                                                    >
                                                        <i className="bi bi-trash3 fs-5"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default BranchList;