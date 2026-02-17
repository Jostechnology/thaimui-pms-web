import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { getEmployeeList, createEmployee, updateEmployee, deleteEmployee } from '../../../services/employee';
import { Employee,EmployeeSalaryHistory } from '../../../type_interface/EmployeeType';
import { useAlertModal } from '../../../context/ModalContext';
import AddEditEmployeeModal from '../../../modals/employee_modal/AddEditEmployeeModal';


// ==========================================
// STATUS CONFIG
// ==========================================
const STATUS_CONFIG: Record<string, { badgeClass: string; icon: string; label: string }> = {
  'active': { badgeClass: 'badge-light-success', icon: 'bi-check-circle-fill', label: 'ทำงานอยู่' },
  'inactive': { badgeClass: 'badge-light-danger', icon: 'bi-x-circle-fill', label: 'หยุดงาน' },
  'resigned': { badgeClass: 'badge-light-secondary', icon: 'bi-box-arrow-right', label: 'ลาออก' },
  'on_leave': { badgeClass: 'badge-light-warning', icon: 'bi-clock-fill', label: 'ลางาน' },
};

const getStatusConfig = (status: string) => {
  const key = status?.toLowerCase?.() || '';
  return STATUS_CONFIG[key] || { badgeClass: 'badge-light-info', icon: 'bi-dash-circle', label: status || '-' };
};

// ==========================================
// AVATAR COLOR PALETTE
// ==========================================
const AVATAR_COLORS = [
  { bg: 'bg-light-primary', text: 'text-primary' },
  { bg: 'bg-light-success', text: 'text-success' },
  { bg: 'bg-light-info', text: 'text-info' },
  { bg: 'bg-light-warning', text: 'text-warning' },
  { bg: 'bg-light-danger', text: 'text-danger' },
];

const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const formatSalary = (val?: number) =>
  val != null && val > 0 ? val.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';

// ==========================================
// SKELETON LOADING COMPONENT
// ==========================================
const SkeletonRow: React.FC = () => (
  <tr>
    <td><div className='d-flex align-items-center gap-2'><div className='bg-secondary rounded skeleton-pulse' style={{ width: 20, height: 20 }}></div></div></td>
    <td>
      <div className='d-flex align-items-center gap-3'>
        <div className='bg-secondary rounded-circle skeleton-pulse' style={{ width: 44, height: 44 }}></div>
        <div>
          <div className='bg-secondary rounded skeleton-pulse mb-2' style={{ width: 140, height: 14 }}></div>
          <div className='bg-secondary rounded skeleton-pulse' style={{ width: 100, height: 10 }}></div>
        </div>
      </div>
    </td>
    <td><div className='bg-secondary rounded skeleton-pulse' style={{ width: 110, height: 14 }}></div></td>
    <td><div className='bg-secondary rounded skeleton-pulse' style={{ width: 90, height: 14 }}></div></td>
    <td><div className='bg-secondary rounded skeleton-pulse' style={{ width: 90, height: 14 }}></div></td>
    <td><div className='bg-secondary rounded skeleton-pulse' style={{ width: 80, height: 26, borderRadius: 20 }}></div></td>
    <td className='text-end'><div className='bg-secondary rounded skeleton-pulse' style={{ width: 80, height: 32 }}></div></td>
  </tr>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
const EmployeeList: React.FC = () => {
  const { openAlertModal, openTwoBtnAlertModal } = useAlertModal();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [perPage, setPerPage] = useState(10);

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  // Salary History Modal
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [salaryHistoryList, setSalaryHistoryList] = useState<EmployeeSalaryHistory[]>([]);
  const [salaryHistoryName, setSalaryHistoryName] = useState('');
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchData = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmployeeList(search);
      if (res && res.success) {
        const items = res.data?.items || res.data || [];
        setEmployees(Array.isArray(items) ? items : []);
      } else {
        setEmployees([]);
        setError('ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    } catch (e) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, perPage]);

  // ==========================================
  // COMPUTED DATA
  // ==========================================
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      const fullName = `${e.employee_first_name} ${e.employee_last_name}`.toLowerCase();
      const matchesQuery = !q || fullName.includes(q) || (e.citizen_id || '').toLowerCase().includes(q) || (e.phone_number || '').includes(q) || (e.email || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || (e.status || '').toLowerCase() === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [employees, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: employees.length };
    employees.forEach((e) => {
      const key = (e.status || '').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const handleRefresh = () => {
    setQuery('');
    setStatusFilter('all');
    setSelectedIds([]);
    fetchData();
  };

  // ==========================================
  // CRUD HANDLERS
  // ==========================================
  const handleOpenAdd = () => {
    setIsEdit(false);
    setEditingEmployee(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setIsEdit(true);
    setEditingEmployee(emp);
    setShowAddEditModal(true);
  };

  const handleCloseModal = () => {
    setShowAddEditModal(false);
    setEditingEmployee(null);
    setSaving(false);
  };

  const handleSubmitEmployee = async (formData: EmployeeFormData) => {
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await updateEmployee(formData);
      } else {
        res = await createEmployee(formData);
      }

      if (res && res.success) {
        openAlertModal(
          isEdit ? 'แก้ไขข้อมูลพนักงานสำเร็จ' : 'เพิ่มพนักงานสำเร็จ',
          () => { },
          true
        );
        handleCloseModal();
        fetchData();
      } else {
        openAlertModal(res?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่', () => { }, false);
      }
    } catch {
      openAlertModal('เกิดข้อผิดพลาดในการเชื่อมต่อ', () => { }, false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingle = (emp: Employee) => {
    openTwoBtnAlertModal(
      `ต้องการลบพนักงาน "${emp.employee_first_name} ${emp.employee_last_name}" หรือไม่?`,
      async () => {
        try {
          const res = await deleteEmployee([emp.employee_id]);
          if (res && res.success) {
            openAlertModal('ลบพนักงานสำเร็จ', () => { }, true);
            fetchData();
            setSelectedIds((prev) => prev.filter((id) => id !== emp.employee_id));
          } else {
            openAlertModal(res?.error || 'ไม่สามารถลบได้', () => { }, false);
          }
        } catch {
          openAlertModal('เกิดข้อผิดพลาด', () => { }, false);
        }
      },
      () => { }
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    openTwoBtnAlertModal(
      `ต้องการลบพนักงานที่เลือก ${selectedIds.length} คน หรือไม่?`,
      async () => {
        try {
          const res = await deleteEmployee(selectedIds);
          if (res && res.success) {
            openAlertModal(`ลบพนักงาน ${selectedIds.length} คนสำเร็จ`, () => { }, true);
            setSelectedIds([]);
            fetchData();
          } else {
            openAlertModal(res?.error || 'ไม่สามารถลบได้', () => { }, false);
          }
        } catch {
          openAlertModal('เกิดข้อผิดพลาด', () => { }, false);
        }
      },
      () => { }
    );
  };

  // Multi-select handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === visible.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visible.map((e) => e.employee_id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ==========================================
  // SALARY HISTORY
  // ==========================================
  const handleOpenSalaryHistory = (emp: Employee) => {
    setSalaryHistoryName(`${emp.employee_first_name} ${emp.employee_last_name}`);
    setSalaryHistoryLoading(true);
    setShowSalaryHistory(true);
    // TODO: เรียก API ดึงประวัติเงินเดือน เมื่อมี endpoint
    // ตอนนี้ set เป็น empty array ก่อน
    setSalaryHistoryList([]);
    setSalaryHistoryLoading(false);
  };

  // ==========================================
  // PAGE NUMBER GENERATION
  // ==========================================
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className='py-4 px-2'>
      {/* ==================== HEADER ==================== */}
      <div className='d-flex flex-stack mb-7'>
        <div className='d-flex flex-column'>
          <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
            <i className='bi bi-people-fill me-3 text-primary'></i>
            รายชื่อพนักงาน
          </h1>
          <span className='text-muted fw-semibold fs-6'>
            จัดการข้อมูลพนักงานทั้งหมดในระบบ
          </span>
        </div>
        <div className='d-flex align-items-center gap-3'>
          {selectedIds.length > 0 && (
            <button
              className='btn btn-sm btn-light-danger fw-bold px-4'
              onClick={handleDeleteSelected}
            >
              <i className='bi bi-trash3 me-2'></i>
              ลบที่เลือก ({selectedIds.length})
            </button>
          )}
          <button
            className='btn btn-sm btn-light-primary fw-bold px-4'
            onClick={handleRefresh}
            disabled={loading}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat spinner-rotate' : 'bi-arrow-clockwise'} me-2`}></i>
            รีเฟรช
          </button>
          <button
            className='btn btn-sm btn-primary fw-bold px-5'
            onClick={handleOpenAdd}
          >
            <i className='bi bi-plus-lg me-2'></i>
            เพิ่มพนักงาน
          </button>
        </div>
      </div>

      {/* ==================== KPI SUMMARY CARDS ==================== */}
      <div className='row g-4 mb-7'>
        {[
          { title: 'พนักงานทั้งหมด', value: employees.length, icon: 'bi-people-fill', bgClass: 'bg-light-primary', iconColor: 'text-primary' },
          { title: 'ทำงานอยู่', value: statusCounts['active'] || 0, icon: 'bi-person-check-fill', bgClass: 'bg-light-success', iconColor: 'text-success' },
          { title: 'หยุดงาน', value: statusCounts['inactive'] || 0, icon: 'bi-person-x-fill', bgClass: 'bg-light-danger', iconColor: 'text-danger' },
          { title: 'ลางาน', value: statusCounts['on_leave'] || 0, icon: 'bi-person-dash-fill', bgClass: 'bg-light-warning', iconColor: 'text-warning' },
        ].map((card, idx) => (
          <div key={idx} className='col-sm-6 col-xl-3'>
            <div className='card card-flush shadow-sm border-0 h-100 hover-elevate-up'
              style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
              <div className='card-body d-flex align-items-center py-5 px-5'>
                <div className='symbol symbol-50px me-4'>
                  <span className={`symbol-label ${card.bgClass} rounded-circle`}>
                    <i className={`bi ${card.icon} ${card.iconColor} fs-2x`}></i>
                  </span>
                </div>
                <div className='d-flex flex-column'>
                  <span className='fs-2hx fw-bold text-gray-900 lh-1 ls-n2'>{card.value}</span>
                  <span className='text-gray-600 fw-semibold fs-7 mt-1'>{card.title}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== MAIN TABLE CARD ==================== */}
      <div className='card card-flush shadow-sm border-0'>
        {/* ---- Card Header: Search + Filters ---- */}
        <div className='card-header border-0 pt-6 pb-4'>
          <div className='d-flex flex-column flex-md-row align-items-md-center justify-content-between w-100 gap-4'>
            {/* Search Input */}
            <div className='position-relative w-100' style={{ maxWidth: 400 }}>
              <i className='bi bi-search position-absolute text-muted fs-6' style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}></i>
              <input
                type='text'
                className='form-control form-control-solid ps-12'
                placeholder='ค้นหาชื่อ, เลขบัตร, เบอร์โทร, อีเมล...'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ backgroundColor: '#f5f8fa', border: 'none', borderRadius: 8 }}
              />
              {query && (
                <button
                  className='btn btn-sm btn-icon position-absolute'
                  style={{ right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setQuery('')}
                >
                  <i className='bi bi-x-lg text-muted fs-7'></i>
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className='d-flex align-items-center gap-2 flex-wrap'>
              {[
                { key: 'all', label: 'ทั้งหมด', color: 'btn-light-primary' },
                { key: 'active', label: 'ทำงานอยู่', color: 'btn-light-success' },
                { key: 'inactive', label: 'หยุดงาน', color: 'btn-light-danger' },
                { key: 'on_leave', label: 'ลางาน', color: 'btn-light-warning' },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`btn btn-sm fw-bold px-4 py-2 ${statusFilter === f.key ? f.color : 'btn-light'}`}
                  onClick={() => setStatusFilter(f.key)}
                  style={{ borderRadius: 20, transition: 'all 0.2s ease' }}
                >
                  {f.label}
                  {statusCounts[f.key] !== undefined && (
                    <span className='ms-2 badge badge-circle badge-sm bg-white text-dark fw-bold' style={{ fontSize: 11 }}>
                      {statusCounts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Card Body: Table ---- */}
        <div className='card-body pt-0'>
          {error ? (
            <div className='d-flex flex-column align-items-center justify-content-center py-20'>
              <i className='bi bi-exclamation-triangle-fill text-danger fs-3x mb-4'></i>
              <p className='text-gray-700 fw-semibold fs-5 mb-4'>{error}</p>
              <button className='btn btn-sm btn-light-primary fw-bold' onClick={handleRefresh}>
                <i className='bi bi-arrow-clockwise me-2'></i>ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : (
            <>
              <div className='table-responsive'>
                <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                  <thead>
                    <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                      <th style={{ width: 50 }}>
                        <div className='form-check form-check-sm form-check-custom'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={visible.length > 0 && selectedIds.length === visible.length}
                            onChange={toggleSelectAll}
                            disabled={loading || visible.length === 0}
                          />
                        </div>
                      </th>
                      <th className='min-w-200px'>พนักงาน</th>
                      <th className='min-w-130px'>เบอร์โทร</th>
                      <th className='min-w-150px'>อีเมล</th>
                      <th className='min-w-120px'>เงินเดือน</th>
                      <th className='min-w-100px text-center'>สถานะ</th>
                      <th className='text-end min-w-120px'>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className='text-gray-600 fw-semibold'>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : visible.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className='d-flex flex-column align-items-center justify-content-center py-15'>
                            <i className='bi bi-person-slash fs-3x text-gray-300 mb-4'></i>
                            <span className='text-gray-500 fw-semibold fs-6'>
                              {query || statusFilter !== 'all' ? 'ไม่พบพนักงานที่ค้นหา' : 'ยังไม่มีข้อมูลพนักงาน'}
                            </span>
                            {(query || statusFilter !== 'all') && (
                              <button className='btn btn-sm btn-light mt-3' onClick={handleRefresh}>
                                <i className='bi bi-x-lg me-2'></i>ล้างตัวกรอง
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visible.map((emp) => {
                        const avatarColor = getAvatarColor(emp.employeeId);
                        const statusCfg = getStatusConfig(emp.status);
                        const initials = `${(emp. employeeFirstName || '').charAt(0)}${(emp.employeeLastName || '').charAt(0)}`.toUpperCase();
                        const isSelected = selectedIds.includes(emp.employeeId);

                        return (
                          <tr
                            key={emp.employeeId}
                            style={{
                              transition: 'background 0.15s',
                              backgroundColor: isSelected ? '#f1faff' : undefined,
                            }}
                          >
                            {/* Checkbox */}
                            <td>
                              <div className='form-check form-check-sm form-check-custom'>
                                <input
                                  className='form-check-input'
                                  type='checkbox'
                                  checked={isSelected}
                                  onChange={() => toggleSelect(emp.employeeId)}
                                />
                              </div>
                            </td>

                            {/* Employee Name + Avatar */}
                            <td>
                              <div className='d-flex align-items-center'>
                                <div className='symbol symbol-45px me-4'>
                                  <span className={`symbol-label ${avatarColor.bg} ${avatarColor.text} fw-bold fs-6 rounded-circle`}>
                                    {initials}
                                  </span>
                                </div>
                                <div className='d-flex flex-column'>
                                  <span className='text-gray-800 fw-bold fs-6'>
                                    {emp.employeeFirstName} {emp.employeeLastName}
                                  </span>
                                  <span className='text-muted fw-semibold fs-8'>
                                    <i className='bi bi-credit-card-2-front me-1'></i>
                                    {emp.citizenId || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Phone */}
                            <td>
                              <div className='d-flex align-items-center text-gray-700'>
                                <i className='bi bi-telephone me-2 text-muted fs-7'></i>
                                {emp.phoneNumber || '-'}
                              </div>
                            </td>

                            {/* Email */}
                            <td>
                              <div className='d-flex align-items-center text-gray-700'>
                                <i className='bi bi-envelope me-2 text-muted fs-7'></i>
                                <span className='text-truncate' style={{ maxWidth: 200 }}>{emp.email || '-'}</span>
                              </div>
                            </td>

                            {/* Salary */}
                            <td>
                              <span className='fw-bold text-gray-800'>
                                {emp.salaryBase != null && emp.salaryBase > 0 ? (
                                  <>
                                    <i className='bi bi-cash-stack me-1 text-success fs-7'></i>
                                    {formatSalary(emp.salaryBase)}
                                  </>
                                ) : '-'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className='text-center'>
                              <span className={`badge ${statusCfg.badgeClass} fw-bold px-4 py-2`}>
                                <i className={`bi ${statusCfg.icon} me-1`}></i>
                                {statusCfg.label}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className='text-end'>
                              <div className='d-flex justify-content-end gap-1'>
                                <button
                                  className='btn btn-sm btn-icon btn-bg-light btn-color-primary btn-active-color-white btn-active-primary'
                                  title='แก้ไข'
                                  onClick={() => handleOpenEdit(emp)}
                                >
                                  <i className='bi bi-pencil-square fs-5'></i>
                                </button>
                                <button
                                  className='btn btn-sm btn-icon btn-bg-light btn-color-info btn-active-color-white btn-active-info'
                                  title='ประวัติเงินเดือน'
                                  onClick={() => handleOpenSalaryHistory(emp)}
                                >
                                  <i className='bi bi-clock-history fs-5'></i>
                                </button>
                                <button
                                  className='btn btn-sm btn-icon btn-bg-light btn-color-danger btn-active-color-white btn-active-danger'
                                  title='ลบ'
                                  onClick={() => handleDeleteSingle(emp)}
                                >
                                  <i className='bi bi-trash3 fs-5'></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---- Pagination ---- */}
              {!loading && filtered.length > 0 && (
                <div className='d-flex flex-column flex-md-row align-items-center justify-content-between pt-4 border-top border-gray-200'>
                  {/* Left: Info + Per Page */}
                  <div className='d-flex align-items-center gap-4 mb-3 mb-md-0'>
                    <span className='text-muted fw-semibold fs-7'>
                      แสดง {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ
                    </span>
                    <select
                      className='form-select form-select-sm form-select-solid fw-bold'
                      style={{ width: 80, borderRadius: 8 }}
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Right: Page Numbers */}
                  <nav>
                    <ul className='pagination pagination-sm mb-0'>
                      <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                        <button className='page-link' onClick={() => setPage(1)} disabled={page <= 1}>
                          <i className='bi bi-chevron-double-left'></i>
                        </button>
                      </li>
                      <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                        <button className='page-link' onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                          <i className='bi bi-chevron-left'></i>
                        </button>
                      </li>

                      {getPageNumbers().map((p, idx) =>
                        p === '...' ? (
                          <li key={`dots-${idx}`} className='page-item disabled'>
                            <span className='page-link'>...</span>
                          </li>
                        ) : (
                          <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className='page-link' onClick={() => setPage(p as number)}>
                              {p}
                            </button>
                          </li>
                        )
                      )}

                      <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                        <button className='page-link' onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                          <i className='bi bi-chevron-right'></i>
                        </button>
                      </li>
                      <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                        <button className='page-link' onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                          <i className='bi bi-chevron-double-right'></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}
      {showAddEditModal && (
        <AddEditEmployeeModal
          isEdit={isEdit}
          employee={editingEmployee}
          handleSubmit={handleSubmitEmployee}
          handleClose={handleCloseModal}
          saving={saving}
        />
      )}
    </div>
  );
};

export default EmployeeList;
