import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import TableListConfig from '../../../custom_components/TableListConfig';
import TablePaginator from '../../../custom_components/TablePaginator';
import SearchComponent from '../../../custom_components/SearchComponent';
import { useTableParams } from '../../../hooks/useTableParams';
import { getBranchList } from '../../../services/branchService';
import { getUserList } from '../../../services/dedicated_auth';

interface UserData {
    username: string;
    role_name: string;
    branch_ids?: number[];
    branch_names?: string[];
}

interface BranchData {
    branch_id: number;
    branch_code: string;
    branch_name: string;
    is_active?: boolean;
}

const BranchManagement: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [users, setUsers] = useState<UserData[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get("pageConfig") || "10"));
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
    const [keyword, setKeyword] = useState<string>(searchParams.get("search") || "");
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filter, setFilter] = useState(searchParams.get("filter") || "ทั้งหมด");

    const [branches, setBranches] = useState<BranchData[]>([]);

    useTableParams({
        currentPage,
        setCurrentPage,
        keyword,
        setKeyword,
        setSearchTerm,
        pageConfig,
        setPageConfig,
        filter,
        setFilter,
    });

    useEffect(() => {
        const fetchBranches = async () => {
            const res = await getBranchList();
            if (res && res.success) {
                setBranches(res.data);
            }
        };
        fetchBranches();
    }, []);

    const fetchUsers = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getUserList(currentPage, pageConfig, keyword, "");
            if (result && result.success) {
                setUsers(result.data.items);
                setTotalPages(result.data.total_pages);
            } else {
                setUsers([]);
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
        fetchUsers();
    }, [currentPage, keyword, pageConfig]);

    // ─── Multiple Branch Selection Modal ───
    const handleSelectBranch = async (username: string) => {
        // หาสาขาปัจจุบันของ user
        const currentUser = users.find(u => u.username === username);
        const currentBranchIds = currentUser?.branch_ids || [];

        // สร้าง HTML checkbox cards พร้อม search
        const buildOptionsHtml = (searchValue: string, selectedIds: number[]) => {
            const filtered = searchValue
                ? branches.filter(b =>
                    b.branch_name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    (b.branch_code || '').toLowerCase().includes(searchValue.toLowerCase())
                )
                : branches;

            if (filtered.length === 0) {
                return '<div class="text-center text-muted py-8 fs-5"><i class="bi bi-search fs-1 d-block mb-3"></i>ไม่พบสาขาที่ค้นหา</div>';
            }

            return filtered.map(b => {
                const isChecked = selectedIds.includes(b.branch_id);
                return `
                    <label class="d-flex align-items-center p-3 mb-2 border rounded cursor-pointer swal-branch-card ${isChecked ? 'border-primary bg-light-primary' : ''}" 
                           data-branch-id="${b.branch_id}" 
                           style="transition: all 0.15s ease; border-width: 2px !important;">
                        <div class="form-check form-check-custom form-check-solid form-check-sm me-3">
                            <input type="checkbox" name="swal-branch-check" value="${b.branch_id}" 
                                   class="form-check-input" style="cursor: pointer;" 
                                   ${isChecked ? 'checked' : ''} />
                        </div>
                        <div class="d-flex flex-column text-start flex-grow-1">
                            <span class="fw-bold fs-6 text-dark">${b.branch_name}</span>
                            <span class="text-muted fs-8">รหัส: ${b.branch_code || b.branch_id}</span>
                        </div>
                        ${isChecked ? '<i class="bi bi-check-circle-fill text-primary fs-4"></i>' : ''}
                    </label>
                `;
            }).join('');
        };

        const { value: selectedBranchIds } = await Swal.fire({
            title: '<h3 class="fw-bolder text-dark mb-0">กำหนดสาขา</h3>',
            html: `
                <p class="fs-6 text-muted mb-4">เลือกสาขาที่ต้องการมอบหมายให้ <strong class="text-primary">${username}</strong></p>
                
                <div class="mb-4">
                    <div class="d-flex align-items-center position-relative">
                        <i class="bi bi-search position-absolute ms-4 fs-5 text-gray-500"></i>
                        <input type="text" id="swal-branch-search" class="form-control form-control-solid ps-12" 
                               placeholder="ค้นหาสาขา..." style="height: 40px;" />
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-muted fs-7">เลือกแล้ว: <strong id="swal-selected-count" class="text-primary">${currentBranchIds.length}</strong> สาขา</span>
                    <div class="d-flex gap-2">
                        <button type="button" id="swal-select-all" class="btn btn-sm btn-light-primary py-1 px-3 fs-8">เลือกทั้งหมด</button>
                        <button type="button" id="swal-clear-all" class="btn btn-sm btn-light-danger py-1 px-3 fs-8">ล้างทั้งหมด</button>
                    </div>
                </div>

                <div id="swal-branch-list" class="text-start" style="max-height: 300px; overflow-y: auto; overflow-x: hidden; padding-right: 4px;">
                    ${buildOptionsHtml('', currentBranchIds)}
                </div>

                <style>
                    .swal-branch-card:hover {
                        border-color: #009EF7 !important;
                        background-color: #F1FAFF;
                    }
                    .bg-light-primary {
                        background-color: #F1FAFF !important;
                    }
                    .border-primary {
                        border-color: #009EF7 !important;
                    }
                    #swal-branch-list::-webkit-scrollbar { width: 5px; }
                    #swal-branch-list::-webkit-scrollbar-track { background: transparent; }
                    #swal-branch-list::-webkit-scrollbar-thumb { background: #E4E6EF; border-radius: 10px; }
                    #swal-branch-list::-webkit-scrollbar-thumb:hover { background: #B5B5C3; }
                </style>
            `,
            width: '520px',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-lg me-1"></i> บันทึก',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                confirmButton: 'btn btn-primary fw-bold',
                cancelButton: 'btn btn-light fw-bold'
            },
            buttonsStyling: false,
            didOpen: () => {
                const searchInput = document.getElementById('swal-branch-search') as HTMLInputElement;
                const branchList = document.getElementById('swal-branch-list')!;
                const countEl = document.getElementById('swal-selected-count')!;
                const selectAllBtn = document.getElementById('swal-select-all')!;
                const clearAllBtn = document.getElementById('swal-clear-all')!;

                let selectedIds = [...currentBranchIds];

                const updateCount = () => {
                    countEl.textContent = String(selectedIds.length);
                };

                const updateCardStyles = () => {
                    branchList.querySelectorAll('.swal-branch-card').forEach((card) => {
                        const el = card as HTMLElement;
                        const id = Number(el.dataset.branchId);
                        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                        const isSelected = selectedIds.includes(id);
                        checkbox.checked = isSelected;
                        if (isSelected) {
                            el.classList.add('border-primary', 'bg-light-primary');
                        } else {
                            el.classList.remove('border-primary', 'bg-light-primary');
                        }
                        // Update check icon
                        const existingIcon = el.querySelector('.bi-check-circle-fill');
                        if (isSelected && !existingIcon) {
                            const icon = document.createElement('i');
                            icon.className = 'bi bi-check-circle-fill text-primary fs-4';
                            el.appendChild(icon);
                        } else if (!isSelected && existingIcon) {
                            existingIcon.remove();
                        }
                    });
                };

                // Checkbox toggle
                branchList.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.name === 'swal-branch-check') {
                        const id = Number(target.value);
                        if (target.checked) {
                            if (!selectedIds.includes(id)) selectedIds.push(id);
                        } else {
                            selectedIds = selectedIds.filter(sid => sid !== id);
                        }
                        updateCount();
                        updateCardStyles();
                    }
                });

                // Search filter
                searchInput?.addEventListener('input', () => {
                    const val = searchInput.value.toLowerCase();
                    branchList.querySelectorAll('.swal-branch-card').forEach((card) => {
                        const el = card as HTMLElement;
                        const name = el.querySelector('.fw-bold.fs-6')?.textContent?.toLowerCase() || '';
                        const code = el.querySelector('.text-muted.fs-8')?.textContent?.toLowerCase() || '';
                        el.style.display = (name.includes(val) || code.includes(val)) ? '' : 'none';
                    });
                });

                // Select All (visible only)
                selectAllBtn.addEventListener('click', () => {
                    branchList.querySelectorAll('.swal-branch-card').forEach((card) => {
                        const el = card as HTMLElement;
                        if (el.style.display === 'none') return;
                        const id = Number(el.dataset.branchId);
                        if (!selectedIds.includes(id)) selectedIds.push(id);
                    });
                    updateCount();
                    updateCardStyles();
                });

                // Clear All
                clearAllBtn.addEventListener('click', () => {
                    selectedIds = [];
                    updateCount();
                    updateCardStyles();
                });
            },
            preConfirm: () => {
                const checked = document.querySelectorAll('input[name="swal-branch-check"]:checked');
                const ids = Array.from(checked).map(el => Number((el as HTMLInputElement).value));
                return ids;
            },
        });

        if (selectedBranchIds) {
            const selectedBranches = branches.filter(b => selectedBranchIds.includes(b.branch_id));
            const selectedNames = selectedBranches.map(b => b.branch_name);

            // TODO: เรียก API จริง เช่น updateUserBranches(username, selectedBranchIds)
            console.log(`[Mock] จะส่ง branch_ids: [${selectedBranchIds}] ไป update user: ${username}`);

            setUsers((prev) =>
                prev.map((u) =>
                    u.username === username
                        ? { ...u, branch_ids: selectedBranchIds, branch_names: selectedNames }
                        : u
                )
            );

            Swal.fire({
                icon: 'success',
                title: 'อัปเดตสำเร็จ',
                text: selectedBranchIds.length > 0
                    ? `กำหนด ${selectedBranchIds.length} สาขาให้ ${username} เรียบร้อยแล้ว`
                    : `ล้างสาขาของ ${username} เรียบร้อยแล้ว`,
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    // ─── ลบ / Clear branch ทั้งหมด ───
    const handleClearBranch = async (username: string) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบสาขา?',
            text: `คุณต้องการลบสาขาทั้งหมดของผู้ใช้ "${username}" ออกหรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> ใช่, ลบเลย',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                confirmButton: 'btn btn-danger fw-bold',
                cancelButton: 'btn btn-light fw-bold'
            },
            buttonsStyling: false,
            reverseButtons: true
        });

        if (result.isConfirmed) {
            // TODO: เรียก API จริง เช่น clearUserBranches(username)
            console.log(`[Mock] จะส่ง branch_ids: [] ไป update user: ${username}`);

            setUsers((prev) =>
                prev.map((u) =>
                    u.username === username ? { ...u, branch_ids: [], branch_names: [] } : u
                )
            );

            Swal.fire({
                icon: 'success',
                title: 'ลบสำเร็จ',
                text: `ยกเลิกการผูกสาขาของ ${username} เรียบร้อย`,
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    const hasBranches = (user: UserData) => {
        return user.branch_ids && user.branch_ids.length > 0;
    };

    return (
        <div className={`card custom-responsive-font`} style={{ paddingBottom: '20px' }}>
            {/* ─── Header ─── */}
            <div className='card-header border-0 pt-5 d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-4'>
                <h3 className='card-title align-items-start flex-column'>
                    <span className='card-label fw-bold fs-3 mb-1'>Branch Assignment</span>
                    <span className='text-muted mt-1 fw-semibold fs-7'>กำหนดและจัดการสาขาให้กับผู้ใช้งานในระบบ</span>
                </h3>
                <div className='d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 w-100 w-md-auto'>
                    <div className='w-100 w-sm-auto'>
                        <SearchComponent
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            setKeyword={(val) => {
                                setKeyword(val);
                                setCurrentPage(1);
                            }}
                            placeholer="ค้นหา Username..."
                        />
                    </div>
                </div>
            </div>

            {/* ─── Table ─── */}
            <div className="card-body py-3">
                <div className='table-responsive'>
                    <table className='table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3'>
                        <thead>
                            <tr className='fw-bold text-muted'>
                                <th className='min-w-150px text-start'>Username</th>
                                <th className='min-w-120px text-center'>Role</th>
                                <th className='min-w-250px text-start'>สาขาที่รับผิดชอบ</th>
                                <th className='min-w-100px text-center'>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataLoading ? (
                                <tr><td colSpan={4} className='text-center'>Loading...</td></tr>
                            ) : users.length > 0 ? (
                                users.map((user, index) => (
                                    <tr key={user.username}>
                                        <td className='text-start fw-bold text-dark'>{user.username}</td>
                                        <td className='text-center'>
                                            <span className='badge badge-light-primary fs-7'>{user.role_name}</span>
                                        </td>
                                        <td className='text-start'>
                                            {hasBranches(user) ? (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {user.branch_names!.map((name, i) => (
                                                        <span key={i} className="badge badge-light-success fw-bold px-3 py-2 fs-8">
                                                            <i className="bi bi-geo-alt-fill text-success me-1 fs-9"></i>
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className='badge badge-light-danger fw-bold px-3 py-2'>
                                                    <i className="bi bi-exclamation-circle text-danger me-1"></i>
                                                    ยังไม่กำหนดสาขา
                                                </span>
                                            )}
                                        </td>
                                        <td className='text-center'>
                                            <div className="d-flex justify-content-center gap-2">
                                                <button
                                                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                                    onClick={() => handleSelectBranch(user.username)}
                                                    title="กำหนดสาขา"
                                                >
                                                    <i className="bi bi-buildings fs-5"></i>
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm"
                                                    onClick={() => handleClearBranch(user.username)}
                                                    title="ลบสาขา"
                                                    disabled={!hasBranches(user)}
                                                >
                                                    <i className="bi bi-trash3 fs-5"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="text-center">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                    <TableListConfig
                        pageConfig={pageConfig}
                        setPageConfig={setPageConfig}
                    />

                    <TablePaginator
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                    />
                </div>
            </div>
        </div>
    );
};

export default BranchManagement;