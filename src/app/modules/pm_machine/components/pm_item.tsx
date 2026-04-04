import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { handleCommaNumberInput, parseCommaNumber } from '../../../utils/input_format_utils';
import Select from 'react-select';
import { Content } from '../../../../_metronic/layout/components/content';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { getpmMachineList, createpmMachine, getMachineList } from '../../../services/pm_machineService';
// ─── Types ────────────────────────────────────────────────────────────────────

interface PmRepairItem {
    maintenance_id: number;
    machine_id: number;
    maintenance_date: string;
    maintenance_type: string;
    description: string | null;
    performed_by: string | null;
    fix_cost: number | null;
    machine?: { machine_id: number; machine_name: string; machine_code: string };
    created_date?: string;
}

interface AddRepairForm {
    machine_id: string;
    maintenance_date: Date | null;
    maintenance_type: string;
    description: string;
    performed_by: string;
    fix_cost: string;
}

const INITIAL_FORM: AddRepairForm = {
    machine_id: '',
    maintenance_date: new Date(),
    maintenance_type: 'Corrective',
    description: '',
    performed_by: '',
    fix_cost: '',
};

// ─── Add Repair Modal ────────────────────────────────────────────────────────

interface AddRepairModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
}

const AddRepairModal: React.FC<AddRepairModalProps> = ({ show, onHide, onSuccess }) => {
    const { openAlertModal } = useAlertModal();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<AddRepairForm>(INITIAL_FORM);
    const [machines, setMachines] = useState<any[]>([]);
    const [searchMachine, setSearchMachine] = useState('');

    // Load machines on modal open
    useEffect(() => {
        if (show) {
            setForm(INITIAL_FORM);
            setSearchMachine('');
            const loadMachines = async () => {
                const res = await getMachineList('');
                if (res.success) setMachines(res.items);
            };
            loadMachines();
        }
    }, [show]);

    // Debounce search machines
    useEffect(() => {
        if (!show) return;
        const timeout = setTimeout(async () => {
            const res = await getMachineList(searchMachine);
            if (res.success) setMachines(res.items);
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchMachine]);

    const handleChange = (field: keyof AddRepairForm, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const validate = (): boolean => {
        if (!form.machine_id.trim()) {
            openAlertModal('กรุณาระบุรหัสเครื่องจักร', () => { }, false);
            return false;
        }
        if (!form.maintenance_date) {
            openAlertModal('กรุณาเลือกวันที่ซ่อม', () => { }, false);
            return false;
        }
        if (!form.maintenance_type.trim()) {
            openAlertModal('กรุณาระบุประเภทการซ่อม', () => { }, false);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                machine_id: Number(form.machine_id),
                maintenance_date: form.maintenance_date!.toISOString().split('T')[0],
                maintenance_type: form.maintenance_type.trim(),
                description: form.description.trim() || null,
                fix_cost: form.fix_cost ? parseCommaNumber(form.fix_cost) : 0,
            };
            const res = await createpmMachine(payload);
            if (res && res.success) {
                openAlertModal('บันทึกรายการซ่อมสำเร็จ', () => {
                    onSuccess();
                    onHide();
                }, true);
            } else {
                openAlertModal(res?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', () => { }, false);
            }
        } catch {
            openAlertModal('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', () => { }, false);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered mw-650px">
                <div className="modal-content">
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="fw-bold">
                            <i className="bi bi-wrench-adjustable me-2 text-primary"></i>
                            เพิ่มรายการซ่อม
                        </h2>
                        <div
                            className="btn btn-icon btn-sm btn-active-icon-primary"
                            onClick={onHide}
                        >
                            <i className="bi bi-x fs-1"></i>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="modal-body mx-5 mx-xl-8 my-6">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmit();
                            }}
                        >
                            {/* เครื่องจักร (Machine ID) */}
                            <div className="fv-row mb-7">
                                <label className="required fs-6 fw-semibold mb-2">
                                    <i className="bi bi-gear-wide-connected me-1 text-primary"></i>
                                    เครื่องจักร
                                </label>
                                <Select
                                    options={machines}
                                    formatOptionLabel={(option: any) => (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fw-bold">{option.machine_code}</span>
                                            <span className="text-muted">— {option.machine_name}</span>
                                        </div>
                                    )}
                                    getOptionValue={(option: any) => String(option.machine_id)}
                                    value={machines.find((m: any) => String(m.machine_id) === form.machine_id) || null}
                                    onInputChange={(inputValue, actionMeta) => {
                                        if (actionMeta.action === 'input-change') {
                                            setSearchMachine(inputValue);
                                        }
                                    }}
                                    onChange={(option: any) => {
                                        handleChange('machine_id', option ? String(option.machine_id) : '');
                                    }}
                                    placeholder="พิมพ์เพื่อค้นหาเครื่องจักร..."
                                    isClearable
                                    isSearchable
                                    noOptionsMessage={() => 'ไม่พบเครื่องจักร'}
                                    menuPortalTarget={document.body}
                                    styles={{
                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                        control: (base) => ({ ...base, backgroundColor: '#f5f8fa', border: 'none' }),
                                    }}
                                />
                            </div>

                            {/* วันที่ซ่อม + ราคา */}
                            <div className="row g-6 mb-7">
                                <div className="col-md-4 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">
                                        <i className="bi bi-calendar3 me-1 text-primary"></i>
                                        วันที่ซ่อม
                                    </label>
                                    <DatePicker
                                        selected={form.maintenance_date}
                                        onChange={(date) => handleChange('maintenance_date', date)}
                                        dateFormat="dd/MM/yyyy"
                                        className="form-control form-control-solid w-100"
                                        placeholderText="เลือกวันที่"
                                    />
                                </div>
                                <div className="col-md-4 fv-row">
                                    <label className="fs-6 fw-semibold mb-2">
                                        <i className="bi bi-cash-stack me-1 text-success"></i>
                                        ราคา (บาท)
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-solid"
                                        placeholder="0"
                                        value={form.fix_cost}
                                        onChange={(e) => {
                                            const { displayValue } = handleCommaNumberInput(e.target.value);
                                            handleChange('fix_cost', displayValue);
                                        }}
                                    />
                                </div>
                                <div className="col-md-4 fv-row">
                                    <label className="required fs-6 fw-semibold mb-2">
                                        <i className="bi bi-tools me-1 text-primary"></i>
                                        ประเภท
                                    </label>
                                    <select
                                        className="form-select form-select-solid"
                                        value={form.maintenance_type}
                                        onChange={(e) => handleChange('maintenance_type', e.target.value)}
                                    >
                                        <option value="Corrective">Corrective</option>
                                        <option value="Preventive">Preventive</option>
                                    </select>
                                </div>
                            </div>

                            {/* รายละเอียด */}
                            <div className="fv-row mb-2">
                                <label className="fs-6 fw-semibold mb-2">
                                    <i className="bi bi-sticky me-1 text-muted"></i>
                                    รายละเอียด
                                </label>
                                <textarea
                                    className="form-control form-control-solid"
                                    rows={3}
                                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                                    value={form.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer flex-center">
                        <button
                            type="button"
                            className="btn btn-light me-3"
                            onClick={onHide}
                            disabled={loading}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-floppy me-2"></i>
                                    บันทึก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PmRepairList: React.FC = () => {
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();
    const [repairs, setRepairs] = useState<PmRepairItem[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchRepairs = async (page: number, per_page: number, search: string, status: string) => {
        setDataLoading(true);
        setLoading();
        try {
            const res = await getpmMachineList(page, per_page, search, status);
            if (res && res.success) {
                setRepairs(res.items || []);
                setTotalPages(res.total_pages || 0);
                setTotalItems(res.total || 0);
                setCurrentPage(res.page || page);
            } else {
                setRepairs([]);
                setTotalPages(0);
                setTotalItems(0);
            }
        } catch {
            alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    // Debounce search & pagination
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchRepairs(currentPage, itemsPerPage, searchTerm, statusFilter);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, statusFilter, currentPage, itemsPerPage]);

    // Reset page to 1 when search changes
    // Reset page to 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    // Handle Page Change
    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Handle Per-Page Change
    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatDate2 = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <Content>
            {/* ─── Page Header ─────────────────────────────────────────── */}
            <div className="d-flex flex-stack mb-10">
                <div className="d-flex flex-column">
                    <h1 className="text-gray-900 fw-bold fs-2qx mb-1">
                        <i className="bi bi-wrench-adjustable-circle me-3 text-primary"></i>
                        รายการซ่อมเครื่องจักร
                    </h1>
                    <span className="text-muted fw-semibold fs-6">
                        จัดการและติดตามรายการซ่อมบำรุงเครื่องจักรทั้งหมด
                    </span>
                </div>
                <button
                    className="btn btn-primary fw-bold px-6 shadow-sm"
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="bi bi-plus-lg me-2 fs-4"></i>
                    เพิ่มรายการซ่อม
                </button>
            </div>

            {/* ─── KPI Card ─────────────────────────────────────────────── */}
            <div className="row g-5 g-xl-10 mb-10">
                <div className="col-md-4">
                    <div className="card card-flush shadow-sm h-100 py-5 px-6 border-0">
                        <div className="d-flex align-items-center">
                            <div className="symbol symbol-50px me-5">
                                <span className="symbol-label bg-light-primary">
                                    <i className="bi bi-card-list text-primary fs-2x"></i>
                                </span>
                            </div>
                            <div className="d-flex flex-column">
                                <span className="fs-2hx fw-bold text-gray-900 lh-1 ls-n2">
                                    {repairs.length}
                                </span>
                                <span className="text-gray-500 fw-semibold fs-6 mt-1">รายการซ่อมทั้งหมด</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Table Card ───────────────────────────────────────────── */}
            <div className="card card-flush shadow-sm border-0">
                {/* Card Header with search */}
                <div className="card-header align-items-center py-5 gap-2 gap-md-5">
                    <div className="card-title">
                        <div className="d-flex align-items-center position-relative my-1">
                            <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>
                            <input
                                type="text"
                                className="form-control form-control-solid w-250px ps-12"
                                placeholder="ค้นหาชื่อเครื่องจักร"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="card-toolbar d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center">
                            <label className="fs-7 fw-bold text-gray-700 me-3">ประเภท:</label>
                            <select
                                className="form-select form-select-solid form-select-sm w-150px"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="Preventive">ซ่อมบำรุงเชิงป้องกัน</option>
                                <option value="Corrective">ซ่อมบำรุงเชิงแก้ไข</option>
                            </select>
                        </div>
                        <button
                            className="btn btn-sm btn-light-primary fw-bold"
                            onClick={() => fetchRepairs(currentPage, itemsPerPage, searchTerm, statusFilter)}
                            title="รีเฟรช"
                        >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            รีเฟรช
                        </button>
                    </div>
                </div>

                {/* Table Body */}
                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-5">
                            <thead>
                                <tr className="text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200">
                                    <th className="ps-4">#</th>
                                    <th>เครื่องจักร</th>
                                    <th>วันที่ซ่อม</th>
                                    <th>ประเภท</th>
                                    <th>ราคา (บาท)</th>
                                    <th>รายละเอียด</th>
                                    <th>วันที่บันทึก</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 fw-semibold">
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10">
                                            <span className="spinner-border text-primary me-2" role="status" />
                                            กำลังโหลดข้อมูล...
                                        </td>
                                    </tr>
                                ) : repairs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-15">
                                            <div className="d-flex flex-column align-items-center">
                                                <i className="bi bi-inbox fs-3x text-muted mb-3"></i>
                                                <span className="text-muted fs-6">ยังไม่มีรายการซ่อม</span>
                                                <button
                                                    className="btn btn-sm btn-light-primary mt-4"
                                                    onClick={() => setShowAddModal(true)}
                                                >
                                                    <i className="bi bi-plus me-1"></i>
                                                    เพิ่มรายการซ่อมแรก
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    repairs.map((item, index) => (
                                        <tr key={item.maintenance_id}>
                                            <td className="ps-4 text-muted">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-35px me-3">
                                                        <span className="symbol-label bg-light-primary">
                                                            <i className="bi bi-gear-wide-connected text-primary fs-5"></i>
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-900 fw-bold">
                                                        {item.machine?.machine_name || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-light-info">
                                                    <i className="bi bi-calendar3 me-1"></i>
                                                    {formatDate(item.maintenance_date)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-light-${item.maintenance_type === 'Preventive' ? 'primary' : 'warning'}`}>
                                                    {item.maintenance_type}
                                                </span>
                                            </td>
                                            <td className="fw-bold text-success">
                                                {item.fix_cost != null ? item.fix_cost.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="text-muted">
                                                {item.description || '-'}
                                            </td>
                                            <td className="text-muted fs-7">
                                                {item.created_date ? formatDate(item.created_date) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ==================== PAGINATION ==================== */}
                    {!dataLoading && repairs.length > 0 && (
                        <div className='row mt-5'>
                            <div className='col-sm-12 col-md-5 d-flex align-items-center justify-content-center justify-content-md-start'>
                                <div className='dataTables_length'>
                                    <label>
                                        <select
                                            className='form-select form-select-sm form-select-solid shadow-sm'
                                            value={itemsPerPage}
                                            onChange={handleLimitChange}
                                            disabled={dataLoading}
                                        >
                                            <option value='10'>10</option>
                                            <option value='25'>25</option>
                                            <option value='50'>50</option>
                                            <option value='100'>100</option>
                                        </select>
                                    </label>
                                </div>
                                <div className='dataTables_info mx-4 text-muted' role='status' aria-live='polite'>
                                    แสดง {repairs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
                                </div>
                            </div>
                            <div className='col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end'>
                                <div className='dataTables_paginate paging_simple_numbers'>
                                    <ul className='pagination'>
                                        <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button onClick={() => handlePageChange(currentPage - 1)} className='page-link' disabled={currentPage === 1 || dataLoading}>
                                                <i className='previous'></i>
                                            </button>
                                        </li>
                                        {[...Array(totalPages)].map((_, index) => {
                                            const pageNumber = index + 1;
                                            if (
                                                pageNumber === 1 ||
                                                pageNumber === totalPages ||
                                                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                            ) {
                                                return (
                                                    <li key={pageNumber} className={`paginate_button page-item ${currentPage === pageNumber ? 'active' : ''}`}>
                                                        <button onClick={() => handlePageChange(pageNumber)} className='page-link' disabled={dataLoading}>
                                                            {pageNumber}
                                                        </button>
                                                    </li>
                                                );
                                            } else if (
                                                pageNumber === currentPage - 2 ||
                                                pageNumber === currentPage + 2
                                            ) {
                                                return (
                                                    <li key={pageNumber} className="paginate_button page-item disabled">
                                                        <span className="page-link">...</span>
                                                    </li>
                                                );
                                            }
                                            return null;
                                        })}
                                        <li className={`paginate_button page-item next ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                                            <button onClick={() => handlePageChange(currentPage + 1)} className='page-link' disabled={currentPage === totalPages || totalPages === 0 || dataLoading}>
                                                <i className='next'></i>
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Add Repair Modal ──────────────────────────────────────── */}
            <AddRepairModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                onSuccess={() => fetchRepairs(currentPage, itemsPerPage, searchTerm, statusFilter)}
            />
        </Content>
    );
};

export default PmRepairList;
