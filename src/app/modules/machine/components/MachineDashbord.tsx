import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';

import { getMachineList } from '../../../services/machineService.ts';
import type { Machine } from '../../../type_interface/MachineType';

const MachineDashboard: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(6); // จำกัดสูงสุด 6 ตามที่ขอ
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(0);

    const fetchMachines = async (page: number, limit: number) => {
        if (machines.length === 0) setIsLoading(true);

        const res = await getMachineList(page, limit);
        if (res.success && res.data) {
            setMachines(res.data.items);
            setTotalPages(res.data.total_pages);
            setTotalItems(res.data.total);
            setCurrentPage(res.data.page);
        } else {
            console.error("Fetch Error:", res.message);
        }
        setIsLoading(false);
    };

    //useEffect สำหรับการโหลดครั้งแรก และตั้งเวลา Auto-Refresh
    useEffect(() => {
        fetchMachines(currentPage, itemsPerPage);

        //ตั้งเวลาให้ดึงข้อมูลใหม่ทุกๆ 60 วินาที (60000 ms)
        const intervalId = setInterval(() => {
            fetchMachines(currentPage, itemsPerPage);
        }, 60000);

        // คืนค่า Memory เมื่อ User ย้ายไปหน้าอื่น
        return () => clearInterval(intervalId);
    }, [currentPage, itemsPerPage]);

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

    const getStatusDisplay = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING':
                return { label: 'กำลังทำงาน', color: 'success', isAlert: false };
            case 'DOWN':
                return { label: 'เครื่องขัดข้อง', color: 'danger', isAlert: true };
            case 'IDLE':
                return { label: 'รอการใช้งาน', color: 'warning', isAlert: false };
            case 'OFFLINE':
                return { label: 'ออฟไลน์', color: 'secondary', isAlert: false };
            default:
                return { label: status || 'ไม่ทราบสถานะ', color: 'secondary', isAlert: false };
        }
    };

    const totalMachines = machines.length;
    const runningCount = machines.filter(m => m.status === 'RUNNING').length;
    const attentionCount = machines.filter(m => m.status === 'IDLE').length;
    const downCount = machines.filter(m => m.status === 'DOWN').length;
    const offlineCount = machines.filter(m => m.status === 'OFFLINE').length;
    const uptimePercent = totalMachines > 0 ? Math.round((runningCount / totalMachines) * 100) : 0;

    return (
        <Content>
            {/* 1. Header: หัวข้อ และ ป้าย Auto-Refresh */}
            <div className="mb-6">
                <h1 className="text-gray-900 fw-bold fs-2qx mb-1">
                    ภาพรวมสถานะเครื่องจักร
                </h1>
                <div className="d-flex align-items-center my-2">
                    <span className="badge badge-light-success fs-base px-4 py-2" title="ระบบรีเฟรชอัตโนมัติทุก 1 นาที">
                        <span className="bullet bullet-dot bg-success me-2 spinner-grow spinner-grow-sm" style={{ width: '0.5rem', height: '0.5rem' }}></span>
                        รีเฟรชอัตโนมัติ
                    </span>
                </div>
            </div>

            {/* 2. Summary Stats */}
            <div className="row g-6 g-xl-9 mb-6 mb-xl-9">
                {/* 🟢 Card 1: RUNNING */}
                <div className="col-sm-6 col-xl">
                    <div className="card h-100 bg-light-success border border-success border-dashed">
                        <div className="card-body d-flex align-items-center p-5">
                            <i className="bi bi-check-circle-fill fs-2x text-success me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{runningCount}</div>
                                <div className="fs-8 text-success fw-bold">RUNNING (กำลังทำงาน)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟡 Card 2: IDLE */}
                <div className="col-sm-6 col-xl">
                    <div className="card h-100 bg-light-warning border border-warning border-dashed">
                        <div className="card-body d-flex align-items-center p-5">
                            <i className="bi bi-exclamation-triangle-fill fs-2x text-warning me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{attentionCount}</div>
                                <div className="fs-8 text-warning fw-bold">IDLE (รอการใช้งาน)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🔴 Card 3: DOWNTIME */}
                <div className="col-sm-6 col-xl">
                    <div className="card h-100 border border-danger shadow-sm">
                        <div className="card-body d-flex align-items-center bg-danger rounded p-5">
                            <i className="bi bi-x-octagon-fill fs-2x text-white me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{downCount}</div>
                                <div className="fs-8 text-dark fw-bold">DOWNTIME (ขัดข้อง)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ⚪ Card 4: OFFLINE (ปรับเป็นสีเทา) */}
                <div className="col-sm-6 col-xl">
                    <div className="card h-100 bg-light-secondary border border-secondary border-dashed">
                        <div className="card-body d-flex align-items-center p-5">
                            <i className="bi bi-power fs-2x text-dark me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{offlineCount}</div>
                                <div className="fs-8 text-dark fw-bold">OFFLINE (ปิดเครื่อง)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🔵 Card 5: UPTIME */}
                <div className="col-sm-6 col-xl">
                    <div className="card h-100 bg-light-primary border border-primary border-dashed">
                        <div className="card-body d-flex align-items-center p-5">
                            <i className="bi bi-graph-up fs-2x text-primary me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{uptimePercent}%</div>
                                <div className="fs-8 text-primary fw-bold">FLEET UPTIME</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Grid: การ์ดเครื่องจักร (แสดงผลแบบรายตัว) */}
            {isLoading ? (
                <div className="d-flex justify-content-center my-10">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : machines.length === 0 ? (
                <div className="text-center text-gray-500 my-10 fw-bold fs-4">ไม่มีข้อมูลเครื่องจักรในระบบ</div>
            ) : (
                <div>
                    <div className="row g-6 g-xl-9">
                        {machines.map((machine) => {
                            const statusInfo = getStatusDisplay(machine.status);

                            return (
                                <div className="col-md-6 col-xl-4" key={machine.machine_id}>
                                    <div className={`card h-100 ${statusInfo.isAlert ? 'border border-danger border-2 shadow-sm' : 'border border-gray-200'}`}>
                                        <div className="card-body p-9">

                                            {/* โซนหัวการ์ด (ชื่อ + Status) */}
                                            <div className="d-flex flex-stack mb-5">
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-45px me-4">
                                                        <span className={`symbol-label bg-light-${statusInfo.color}`}>
                                                            <i className={`bi bi-gear-wide-connected fs-2 text-${statusInfo.color}`}></i>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="fs-4 fw-bolder text-dark">{machine.machine_code}</div>
                                                        <div className="fs-7 text-muted fw-bold">{machine.machine_name}</div>
                                                    </div>
                                                </div>
                                                <span className={`badge badge-light-${statusInfo.color} fw-bolder px-4 py-2`}>
                                                    <span className={`bullet bullet-dot bg-${statusInfo.color} me-2 ${statusInfo.isAlert ? 'spinner-grow spinner-grow-sm' : ''}`}></span>
                                                    {statusInfo.label}
                                                </span>
                                            </div>

                                            {/* โซนรายละเอียด Data */}
                                            <div className="d-flex flex-wrap mb-7">
                                                <div className={`border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-5 mb-3 ${statusInfo.isAlert ? 'bg-light-danger border-danger' : ''}`}>
                                                    <div className="fs-8 text-gray-400 fw-bolder mb-1">ผู้ผลิต (Brand)</div>
                                                    <div className={`fs-5 fw-bolder text-truncate max-w-150px ${statusInfo.isAlert ? 'text-danger' : 'text-dark'}`}>
                                                        {machine.manufacturer || '-'}
                                                    </div>
                                                </div>
                                                <div className={`border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 mb-3 ${statusInfo.isAlert ? 'bg-light-danger border-danger' : ''}`}>
                                                    <div className="fs-8 text-gray-400 fw-bolder mb-1">วันที่สั่งซื้อ</div>
                                                    <div className={`fs-5 fw-bolder ${statusInfo.isAlert ? 'text-danger' : 'text-dark'}`}>
                                                        {machine.purchase_date ? new Date(machine.purchase_date).toLocaleDateString('th-TH') : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* โซนสถานะพิเศษ (กิมมิค UI) */}
                                            <div className="d-flex flex-stack mb-2">
                                                <span className="text-muted fs-8 fw-bolder">สถานะปัจจุบัน</span>
                                                <span className={`fw-bolder fs-8 ${statusInfo.isAlert ? 'text-danger' : 'text-dark'}`}>
                                                    {statusInfo.isAlert ? 'ต้องการซ่อมบำรุงด่วน!' : 'ปกติ'}
                                                </span>
                                            </div>
                                            <div className="progress h-6px w-100 bg-light-secondary mb-7">
                                                <div className={`progress-bar bg-${statusInfo.color}`} role="progressbar" style={{ width: statusInfo.isAlert ? '100%' : '100%' }}></div>
                                            </div>

                                            {/* ปุ่ม Action (เน้นไปที่การแจ้งซ่อม หรือ ดูรายละเอียด) */}
                                            <button className={`btn w-100 py-3 ${statusInfo.isAlert ? 'btn-danger' : 'btn-outline btn-outline-dashed btn-outline-default text-dark fw-bolder'}`}>
                                                {statusInfo.isAlert ? '🛠️ อนุมัติซ่อมบำรุง' : 'ดูรายละเอียด'}
                                            </button>

                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ==================== PAGINATION ==================== */}
                    <div className='row mt-10'>
                        <div className='col-sm-12 col-md-5 d-flex align-items-center justify-content-center justify-content-md-start'>
                            <div className='dataTables_length' id='kt_machine_dash_length'>
                                <label>
                                    <select
                                        name='kt_machine_dash_length'
                                        aria-controls='kt_machine_dash'
                                        className='form-select form-select-sm form-select-solid shadow-sm'
                                        value={itemsPerPage}
                                        onChange={handleLimitChange}
                                        disabled={isLoading}
                                    >
                                        <option value='6'>6</option>
                                        <option value='12'>12</option>
                                        <option value='18'>18</option>
                                        <option value='24'>24</option>
                                    </select>
                                </label>
                            </div>
                            <div className='dataTables_info mx-4 text-muted' id='kt_machine_dash_info' role='status' aria-live='polite'>
                                แสดง {machines.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
                            </div>
                        </div>
                        <div className='col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end'>
                            <div className='dataTables_paginate paging_simple_numbers' id='kt_machine_dash_paginate'>
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
                </div>
            )}
        </Content>
    );
};

export default MachineDashboard;