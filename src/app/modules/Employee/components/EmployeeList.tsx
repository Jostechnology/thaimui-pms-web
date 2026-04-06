import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEmployeeList, deleteEmployee } from '../../../services/employee';
import { Employee, EmployeeStatus, EmployeeStatusLabel } from '../../../type_interface/EmployeeType';
import { useAlertModal } from '../../../context/ModalContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import AddEditEmployeeModal from '../../../modals/employee_modal/AddEditEmployeeModal';

const AVATAR_COLORS = [
  { bg: 'bg-light-primary', text: 'text-primary' },
  { bg: 'bg-light-success', text: 'text-success' },
  { bg: 'bg-light-info', text: 'text-info' },
  { bg: 'bg-light-warning', text: 'text-warning' },
  { bg: 'bg-light-danger', text: 'text-danger' },
];
const getAvatarColor = (id?: number) => AVATAR_COLORS[(Math.abs(id || 0)) % AVATAR_COLORS.length];

const formatSalary = (val?: number) => (val != null && val > 0 ? val.toLocaleString('th-TH') : '-');

const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { openAlertModal, openTwoBtnAlertModal } = useAlertModal();
  const { setLoading, setUnLoading } = useAppLoading();
  const [searchParams] = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [keyword, setKeyword] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('filter') || 'all');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get('pageConfig') || '10'));

  const [selected, setSelected] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useTableParams({
    currentPage,
    setCurrentPage,
    pageConfig,
    setPageConfig,
    keyword,
    setKeyword,
    setSearchTerm,
    filter: statusFilter,
    setFilter: setStatusFilter,
  });

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    setLoading();
    try {
      const res = await getEmployeeList(currentPage, pageConfig, keyword, statusFilter);
      if (res && res.success) {
        const items = res.data?.items || res.data || [];
        const normalized = Array.isArray(items)
          ? items.map((it: any) => ({
            employee_id: it.employee_id ?? it.employeeId ?? 0,
            employee_first_name: it.employee_first_name ?? it.employeeFirstName ?? '',
            employee_last_name: it.employee_last_name ?? it.employeeLastName ?? '',
            citizen_id: it.citizen_id ?? it.citizenId ?? '',
            phone_number: it.phone_number ?? it.phoneNumber ?? null,
            email: it.email ?? null,
            address: it.address ?? null,
            status: it.status ?? it.employee_status ?? '',
            user_id: it.user_id ?? it.userId ?? 0,
            salary_base: it.salary_base ?? it.salaryBase ?? 0,
          } as Employee))
          : [];
        setEmployees(normalized);
        setTotalPages(res.pagination?.pages ?? 0);
      } else {
        setEmployees([]);
        setTotalPages(0);
      }
    } catch {
      setEmployees([]);
      setTotalPages(0);
    } finally {
      setUnLoading();
      setDataLoading(false);
    }
  }, [currentPage, pageConfig, keyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getThaiStatus = (s?: string) => {
    if (!s && s !== '') return '';
    const raw = String(s || '').trim();
    if ((EmployeeStatusLabel as any)[raw]) return (EmployeeStatusLabel as any)[raw];
    if ((EmployeeStatus as any)[raw]) {
      const enumValue = (EmployeeStatus as any)[raw];
      return (EmployeeStatusLabel as any)[enumValue] || enumValue;
    }
    const found = Object.values(EmployeeStatus).find((v: string) => v.toLowerCase() === raw.toLowerCase());
    if (found) return (EmployeeStatusLabel as any)[found] || found;
    return raw;
  };

  const getStatusBadgeClass = (s?: string) => {
    const thai = getThaiStatus(s);
    switch (thai) {
      case 'ทำงานอยู่': return 'badge-light-primary';
      case 'ลางาน': return 'badge-light-warning';
      case 'หยุดงาน': return 'badge-light-danger';
      case 'ว่างงาน':
      default: return 'badge-light-secondary';
    }
  };

  const toggleSelect = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleSelectAll = () => setSelected((_) => (selected.length === employees.length ? [] : employees.map((v) => v.employee_id)));

  const handleDelete = (emp: Employee) => {
    openTwoBtnAlertModal(`ต้องการลบพนักงาน "${emp.employee_first_name} ${emp.employee_last_name}" หรือไม่?`, async () => {
      try {
        const res = await deleteEmployee([emp.employee_id]);
        if (res && res.success) {
          openAlertModal('ลบสำเร็จ', () => { }, true);
          fetchData();
          setSelected((s) => s.filter((id) => id !== emp.employee_id));
        } else {
          openAlertModal(res?.error || 'ไม่สามารถลบได้', () => { }, false);
        }
      } catch {
        openAlertModal('เกิดข้อผิดพลาด', () => { }, false);
      }
    }, () => { });
  };

  const handleDeleteSelected = () => {
    if (selected.length === 0) return;
    openTwoBtnAlertModal(`ต้องการลบพนักงานที่เลือก ${selected.length} คน หรือไม่?`, async () => {
      try {
        const res = await deleteEmployee(selected);
        if (res && res.success) {
          openAlertModal('ลบสำเร็จ', () => { }, true);
          setSelected([]);
          fetchData();
        } else {
          openAlertModal(res?.error || 'ไม่สามารถลบได้', () => { }, false);
        }
      } catch {
        openAlertModal('เกิดข้อผิดพลาด', () => { }, false);
      }
    }, () => { });
  };

  return (
    <div className="py-4 px-2">
      <div className="d-flex flex-stack mb-7">
        <div>
          <h1 className="text-gray-900 fw-bold fs-2qx mb-1"><i className="bi bi-people-fill me-3 text-primary"></i>รายชื่อพนักงาน</h1>
          <div className="text-muted">จัดการข้อมูลพนักงานทั้งหมดในระบบ</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          {selected.length > 0 && (
            <button className="btn btn-sm btn-light-danger fw-bold px-4" onClick={handleDeleteSelected}>ลบที่เลือก ({selected.length})</button>
          )}
          <button className="btn btn-sm btn-light-primary fw-bold px-4" onClick={() => fetchData()} disabled={dataLoading}>รีเฟรช</button>
          <button className="btn btn-sm btn-primary fw-bold px-5" onClick={() => { setSelectedEmployee(null); setShowModal(true); }}><i className="bi bi-plus-lg me-2"></i>เพิ่มพนักงาน</button>
        </div>
      </div>

      <div className="card card-flush shadow-sm border-0">
        <div className="card-header border-0 pt-6 pb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between w-100 gap-4">
            <div className="position-relative w-100" style={{ maxWidth: 420 }}>
              <i className="bi bi-search position-absolute text-muted fs-6" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}></i>
              <input
                className="form-control form-control-solid ps-12"
                placeholder="ค้นหาชื่อ, เลขบัตร, เบอร์โทร, อีเมล..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                style={{ backgroundColor: '#f5f8fa', border: 'none', borderRadius: 8 }}
              />
              {searchTerm && (
                <button className="btn btn-sm btn-icon position-absolute" style={{ right: 6, top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setSearchTerm(''); setKeyword(''); }}>
                  <i className="bi bi-x-lg text-muted fs-7"></i>
                </button>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {[
                { key: 'all', label: 'ทั้งหมด' },
                ...Object.values(EmployeeStatus).map((s) => ({ key: s, label: (EmployeeStatusLabel as any)[s] || s })),
              ].map((f) => (
                <button
                  key={f.key}
                  className={`btn btn-sm fw-bold px-4 py-2 ${statusFilter === f.key ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                  style={{ borderRadius: 20 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle table-row-dashed fs-6 gy-5">
              <thead>
                <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200">
                  <th style={{ width: 50 }}>
                    <div className="form-check form-check-sm form-check-custom">
                      <input className="form-check-input" type="checkbox" checked={employees.length > 0 && selected.length === employees.length} onChange={toggleSelectAll} disabled={dataLoading || employees.length === 0} />
                    </div>
                  </th>
                  <th>พนักงาน</th>
                  <th>เบอร์โทร</th>
                  <th>อีเมล</th>
                  <th>เงินเดือน</th>
                  <th className="text-center">สถานะ</th>
                  <th className="text-end">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 fw-semibold">
                {dataLoading ? (
                  <tr><td colSpan={7} className="text-center py-10"><span className="spinner-border spinner-border-sm text-primary me-2"></span>กำลังโหลด...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10">{keyword ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีข้อมูลพนักงาน'}</td></tr>
                ) : (
                  employees.map((emp) => {
                    const avatar = getAvatarColor(emp.employee_id);
                    const initials = `${(emp.employee_first_name || '').charAt(0)}${(emp.employee_last_name || '').charAt(0)}`.toUpperCase();
                    return (
                      <tr key={emp.employee_id}>
                        <td>
                          <div className="form-check form-check-sm form-check-custom">
                            <input className="form-check-input" type="checkbox" checked={selected.includes(emp.employee_id)} onChange={() => toggleSelect(emp.employee_id)} />
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="symbol symbol-45px me-4">
                              <span className={`symbol-label ${avatar.bg} ${avatar.text} fw-bold fs-6 rounded-circle`}>{initials}</span>
                            </div>
                            <div className="d-flex flex-column">
                              <div className="fw-bold text-gray-800">{emp.employee_first_name} {emp.employee_last_name}</div>
                              <div className="text-muted fs-8"><i className="bi bi-credit-card-2-front me-1"></i>{emp.citizen_id || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{emp.phone_number || '-'}</td>
                        <td>{emp.email || '-'}</td>
                        <td>{emp.salary_base ? formatSalary(emp.salary_base) : '-'}</td>
                        <td className="text-center"><span className={`badge ${getStatusBadgeClass(emp.status)}`}>{getThaiStatus(emp.status) || '-'}</span></td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button className="btn btn-sm btn-icon btn-bg-light btn-color-info" title="ดูรายละเอียด" onClick={() => navigate(`/employee/employee_detail/${emp.employee_id}`)}><i className="bi bi-eye fs-5"></i></button>
                            <button className="btn btn-sm btn-icon btn-bg-light btn-color-primary" title="แก้ไข" onClick={() => { setSelectedEmployee(emp); setShowModal(true); }}><i className="bi bi-pencil-square fs-5"></i></button>
                            <button className="btn btn-sm btn-icon btn-bg-light btn-color-danger" title="ลบ" onClick={() => handleDelete(emp)}><i className="bi bi-trash3 fs-5"></i></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex flex-stack flex-wrap pt-10">
            <div className="d-flex align-items-center me-5">
              <span className="text-muted fw-bold me-2">จำนวนรายการ</span>
              <select
                className="form-select form-select-sm form-select-solid w-75px"
                value={pageConfig}
                onChange={(e) => { setPageConfig(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <TablePaginator
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
        </div>
      </div>

      <AddEditEmployeeModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSuccess={() => fetchData()}
        employee={selectedEmployee}
      />
    </div>
  );
};

export default EmployeeList;
