import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getMachineList } from '../../../services/machineService.ts';
import type { Machine } from '../../../type_interface/MachineType';
import Swal from 'sweetalert2';

const MachineList: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    const fetchMachines = async (search: string, status: string) => {
        setIsLoading(true);
        const res = await getMachineList(search, status);
        if (res.success && res.data) {
            setMachines(res.data.items);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message,
            });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMachines(searchTerm, statusFilter);
        }, 500); // หน่วงเวลา 0.5 วิ ตอนพิมพ์ Search จะได้ไม่ยิง API รัวเกินไป
        return () => clearTimeout(timeoutId);
    }, [searchTerm, statusFilter]);

    const getStatusTheme = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING': return { color: 'success', isAlert: false };
            case 'DOWN': return { color: 'danger', isAlert: true };
            case 'IDLE': return { color: 'warning', isAlert: false };
            default: return { color: 'secondary', isAlert: false };
        }
    };

    const totalMachines = machines.length;
    const runningCount = machines.filter(m => m.status === 'RUNNING').length;
    const attentionCount = machines.filter(m => m.status === 'IDLE').length;
    const downCount = machines.filter(m => m.status === 'DOWN').length;
    const uptimePercent = totalMachines > 0 ? Math.round((runningCount / totalMachines) * 100) : 0;

    return (
        <Content>
            {/* Header: หัวข้อ */}
            <div className="d-flex flex-wrap flex-stack mb-6">
                <h3 className="fw-bolder my-2">
                    Machine Equipment
                    <span className="fs-6 text-gray-400 fw-bold ms-4">Manage your factory assets.</span>
                </h3>
            </div>

            <div className="card mb-8">
                <div className="card-body p-5 d-flex flex-wrap align-items-center justify-content-between">
                    {/* Search Input */}
                    <div className="d-flex align-items-center position-relative my-1 w-100 w-md-300px">
                        <i className="bi bi-search position-absolute ms-4 fs-4 text-gray-500"></i>
                        <input 
                            type="text" 
                            className="form-control form-control-solid ps-12" 
                            placeholder="Search machine code or name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Dropdown Filter */}
                    <div className="d-flex align-items-center mt-3 mt-md-0">
                        <label className="fs-6 fw-bold text-gray-700 me-3">Status:</label>
                        <select 
                            className="form-select form-select-solid w-150px" 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="RUNNING">Running</option>
                            <option value="IDLE">Idle</option>
                            <option value="DOWN">Down</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="d-flex justify-content-center my-10">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : machines.length === 0 ? (
                <div className="text-center text-gray-500 my-10 fw-bold fs-4">No machines found.</div>
            ) : (
                <div className="row g-6 g-xl-9 mb-6 mb-xl-9">
                    {machines.map((machine) => {
                        const theme = getStatusTheme(machine.status);
                        
                        return (
                            <div className="col-md-6 col-xl-4" key={machine.machine_id}>
                                <div className={`card h-100 ${theme.isAlert ? 'border border-danger border-2' : ''}`}>
                                    <div className="card-body p-9">
                                        
                                        <div className="d-flex flex-stack mb-5">
                                            <div className="d-flex align-items-center">
                                                <div className="symbol symbol-45px me-4">
                                                    <span className={`symbol-label bg-light-${theme.color}`}>
                                                        <i className={`bi bi-gear-fill fs-2 text-${theme.color}`}></i>
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="fs-4 fw-bolder text-dark">{machine.machine_code}</div>
                                                    <div className="fs-7 text-muted fw-bold">{machine.machine_name}</div>
                                                </div>
                                            </div>
                                            <span className={`badge badge-light-${theme.color} fw-bolder px-4 py-2`}>
                                                <span className={`bullet bullet-dot bg-${theme.color} me-2`}></span>
                                                {machine.status || 'UNKNOWN'}
                                            </span>
                                        </div>

                                        <div className="d-flex flex-wrap mb-5">
                                            <div className="border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-5 mb-3">
                                                <div className="fs-8 text-gray-400 fw-bolder mb-1">MANUFACTURER</div>
                                                <div className="fs-5 fw-bolder text-dark text-truncate max-w-150px">
                                                    {machine.manufacturer || '-'}
                                                </div>
                                            </div>
                                            <div className="border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 mb-3">
                                                <div className="fs-8 text-gray-400 fw-bolder mb-1">PURCHASE DATE</div>
                                                <div className="fs-5 fw-bolder text-dark">
                                                    {machine.purchase_date ? new Date(machine.purchase_date).toLocaleDateString() : '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-7">
                                            <div className="fs-8 text-gray-400 fw-bolder mb-1">DESCRIPTION</div>
                                            <div className="fs-7 text-gray-700">{machine.machine_description || 'No description available'}</div>
                                        </div>

                                        {/* ปุ่ม Action */}
                                        <button className={`btn w-100 py-3 ${theme.isAlert ? 'btn-danger' : 'btn-light-primary text-primary fw-bolder'}`}>
                                            VIEW DETAILS
                                        </button>

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="row g-6 g-xl-9">
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-check-circle-fill fs-1 text-success me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{runningCount}</div>
                                <div className="fs-7 text-muted fw-bold">RUNNING</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle-fill fs-1 text-warning me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{attentionCount}</div>
                                <div className="fs-7 text-muted fw-bold">IDLE / STANDBY</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100 border border-danger">
                        <div className="card-body d-flex align-items-center bg-light-danger rounded">
                            <i className="bi bi-x-octagon-fill fs-1 text-danger me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-danger">{downCount}</div>
                                <div className="fs-7 text-danger fw-bold">DOWNTIME</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-graph-up fs-1 text-primary me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">{uptimePercent}%</div>
                                <div className="fs-7 text-muted fw-bold">RUNNING UPTIME</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </Content>
    );
};

export default MachineList;