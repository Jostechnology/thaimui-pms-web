import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getMachineList, deleteMachine } from '../../../services/machineService.ts';
import type { Machine } from '../../../type_interface/MachineType';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

const statusOptions = [
    { value: '', label: 'สถานะทั้งหมด' },
    { value: 'RUNNING', label: 'กำลังทำงาน' },
    { value: 'IDLE', label: 'รอการใช้งาน' },
    { value: 'DOWN', label: 'เครื่องขัดข้อง' },
    { value: 'OFFLINE', label: 'ออฟไลน์' },
];

const MachineList: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(0);

    const navigate = useNavigate();
    const fetchMachines = async (page: number, limit: number, search: string, status: string) => {
        setIsLoading(true);
        const res = await getMachineList(page, limit, search, status);
        if (res.success && res.data) {
            setMachines(res.data.items);
            setTotalPages(res.data.total_pages);
            setTotalItems(res.data.total);
            setCurrentPage(res.data.page);
        } else {
            Swal.fire({
                title: 'Error!',
                text: res.message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
        setIsLoading(false);
    };

    const getStatusDisplay = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING':
                return { label: 'กำลังทำงาน', color: 'success' };
            case 'DOWN':
                return { label: 'เครื่องขัดข้อง', color: 'danger' };
            case 'IDLE':
                return { label: 'รอการใช้งาน', color: 'warning' };
            case 'OFFLINE':
                return { label: 'ออฟไลน์ (ปิดเครื่อง)', color: 'dark' };
            default:
                return { label: status || 'ไม่ทราบสถานะ', color: 'secondary' };
        }
    };

    //useEffect (Debounce Search & Pagination)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMachines(currentPage, itemsPerPage, searchTerm, statusFilter);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, statusFilter, currentPage, itemsPerPage]);

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

    // Handle Limit Change
    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleDelete = async (machineId: number, machineCode: string) => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: `คุณแน่ใจหรือไม่ที่จะลบเครื่องจักร "${machineCode}" ออกจากระบบ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            reverseButtons: true,
        });

        if (confirm.isConfirmed) {
            const res = await deleteMachine(String(machineId));
            if (res.success) {
                await Swal.fire('ลบสำเร็จ!', 'ข้อมูลเครื่องจักรถูกลบแล้ว', 'success');
                fetchMachines(currentPage, itemsPerPage, searchTerm, statusFilter);
            } else {
                Swal.fire('ล้มเหลว', res.message || 'ไม่สามารถลบได้', 'error');
            }
        }
    };

    return (
        <Content>
            {/* Header: หัวข้อ */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className="text-gray-900 fw-bold fs-2qx mb-1">
                        รายการเครื่องจักร
                    </h1>
                    <span className="text-muted fw-semibold fs-6">
                        จัดการเครื่องจักรในระบบ
                    </span>
                </div>
                <button
                    className="btn btn-primary fw-bold px-6 shadow-sm"
                    title="เพิ่มเครื่องจักรใหม่"
                    onClick={() => navigate('/machine/machine_create')}
                >
                    <i className="bi bi-plus-lg fs-4 me-1"></i> เพิ่มเครื่องจักร
                </button>
            </div>

            <div className="card">
                {/* 1. Card Header: โซน Search & Filter */}
                <div className="card-header border-0 pt-6">
                    <div className="card-title">
                        {/* Search Input */}
                        <div className="d-flex align-items-center position-relative my-1">
                            <i className="bi bi-search position-absolute ms-4 fs-4 text-gray-500"></i>
                            <input
                                type="text"
                                className="form-control form-control-lg w-250px ps-12"
                                placeholder="Search machine..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="card-toolbar">
                        {/* Dropdown Filter */}
                        <div className="d-flex align-items-center">
                            <Select
                                options={statusOptions}
                                value={statusOptions.find(o => o.value === statusFilter) ?? statusOptions[0]}
                                onChange={(selected) => setStatusFilter(selected?.value ?? '')}
                                isSearchable
                                className="w-200px"
                                classNamePrefix="react-select"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Card Body: โซนตาราง */}
                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-5">
                            {/* หัวตาราง */}
                            <thead>
                                <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                                    <th className="min-w-200px">Machine Info</th>
                                    <th className="min-w-100px">ประเภท</th>
                                    <th className="min-w-150px">Manufacturer</th>
                                    <th className="min-w-125px">Purchase Date</th>
                                    <th className="min-w-125px">Status</th>
                                    <th className="text-end min-w-50px">Actions</th>
                                </tr>
                            </thead>

                            {/* ไส้ในตาราง */}
                            <tbody className="text-gray-600 fw-bold">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : machines.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-500 py-10 fs-5">
                                            No machines found.
                                        </td>
                                    </tr>
                                ) : (
                                    machines.map((machine) => {
                                        const statusInfo = getStatusDisplay(machine.status);
                                        return (
                                            <tr key={machine.machine_id}>
                                                {/* คอลัมน์ที่ 1: รหัสและชื่อ */}
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="symbol symbol-40px me-3">
                                                            <div className={`symbol-label bg-light-${statusInfo.color}`}>
                                                                <i className={`bi bi-gear-fill fs-3 text-${statusInfo.color}`}></i>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex flex-column">
                                                            <span className="text-dark fw-bolder fs-6">{machine.machine_code}</span>
                                                            <span className="text-muted fs-7">{machine.machine_name}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* คอลัมน์ที่ 2: ประเภท */}
                                                <td>
                                                    {machine.machine_type ? (
                                                        <span className="badge badge-light-info fw-semibold">
                                                            {machine.machine_type.type_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">—</span>
                                                    )}
                                                </td>

                                                {/* คอลัมน์ที่ 3: ผู้ผลิต */}
                                                <td>{machine.manufacturer || '-'}</td>

                                                {/* คอลัมน์ที่ 3: วันที่ซื้อ */}
                                                <td>
                                                    {machine.purchase_date
                                                        ? new Date(machine.purchase_date).toLocaleDateString()
                                                        : '-'}
                                                </td>

                                                {/* คอลัมน์ที่ 4: สถานะ */}
                                                <td>
                                                    <span className={`badge badge-light-${statusInfo.color} fw-bolder px-3 py-1`}>
                                                        {statusInfo.label || 'UNKNOWN'}
                                                    </span>
                                                </td>

                                                {/* คอลัมน์ที่ 5: ปุ่มจัดการ */}
                                                <td className="text-end">
                                                    <button
                                                        className="btn btn-light-primary btn-sm me-2"
                                                        onClick={() => navigate(`/machine/machine_detail/${machine.machine_id}`)}
                                                    >
                                                        <i className="bi bi-eye me-1"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-light-warning btn-sm me-2"
                                                        onClick={() => navigate(`/machine/machine_update/${machine.machine_id}`)}
                                                    >
                                                        <i className="bi bi-pencil-square me-1"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-light-danger btn-sm"
                                                        onClick={() => handleDelete(machine.machine_id, machine.machine_code)}
                                                    >
                                                        <i className="bi bi-trash3-fill me-1"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ==================== PAGINATION ==================== */}
                    {!isLoading && machines.length > 0 && (
                        <div className='row mt-5'>
                            <div className='col-sm-12 col-md-5 d-flex align-items-center justify-content-center justify-content-md-start'>
                                <div className='dataTables_length' id='kt_machine_table_length'>
                                    <label>
                                        <select
                                            name='kt_machine_table_length'
                                            aria-controls='kt_machine_table'
                                            className='form-select form-select-sm form-select-solid shadow-sm'
                                            value={itemsPerPage}
                                            onChange={handleLimitChange}
                                            disabled={isLoading}
                                        >
                                            <option value='10'>10</option>
                                            <option value='25'>25</option>
                                            <option value='50'>50</option>
                                            <option value='100'>100</option>
                                        </select>
                                    </label>
                                </div>
                                <div className='dataTables_info mx-4 text-muted' id='kt_machine_table_info' role='status' aria-live='polite'>
                                    แสดง {machines.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
                                </div>
                            </div>
                            <div className='col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end'>
                                <div className='dataTables_paginate paging_simple_numbers' id='kt_machine_table_paginate'>
                                    <ul className='pagination'>
                                        <li className={`paginate_button page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button onClick={() => handlePageChange(currentPage - 1)} className='page-link' disabled={currentPage === 1 || isLoading}>
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
                                                        <button onClick={() => handlePageChange(pageNumber)} className='page-link' disabled={isLoading}>
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
                                            <button onClick={() => handlePageChange(currentPage + 1)} className='page-link' disabled={currentPage === totalPages || totalPages === 0 || isLoading}>
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
        </Content>
    );
};

export default MachineList;