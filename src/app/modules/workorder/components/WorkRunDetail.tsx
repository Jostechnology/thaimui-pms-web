import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getEmployeeList } from '../../../services/employee';
import { getMachineList } from '../../../services/machineService';
import {
    getWorkRunById,
    completeWorkRun,
    startWorkRun,
    pauseWorkRun,
    resumeWorkRun,
    assignEmployee,
    unassignEmployee,
    assignMachine,
    unassignMachine,
} from '../../../services/workRunService';
import { getWorkOrderById } from '../../../services/workorder';
import { createWorkRunPickingRequest } from '../../../services/pickingRequestService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { WorkRunDetail as WorkRunDetailType } from '../../../type_interface/WorkOrderType';
import type { Machine } from '../../../type_interface/MachineType';
import type { PickingAvailableItem } from '../../../type_interface/PickingRequestType';
import PickingRequestModal from '../../../modals/picking_request_modal/PickingRequestModal';
import { formatIntegerInput } from '../../../utils/input_format_utils';

interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
}

const WorkRunDetail: React.FC = () => {
    const navigate = useNavigate();
    const { workRunId } = useParams<{ workRunId: string }>();

    const [workRun, setWorkRun] = useState<WorkRunDetailType | null>(null);

    // Employee assign modal
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [empSearch, setEmpSearch] = useState('');
    const [showAssignEmpModal, setShowAssignEmpModal] = useState(false);

    // Machine assign modal
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [machineLoading, setMachineLoading] = useState(false);
    const [machineSearch, setMachineSearch] = useState('');
    const [showAssignMachineModal, setShowAssignMachineModal] = useState(false);

    // Complete modal
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeForm, setCompleteForm] = useState({ completion_remark: '', defect_qty: 0, usable_qty: 0 });

    // Picking modal
    const [showPickingModal, setShowPickingModal] = useState(false);
    const [pickingItems, setPickingItems] = useState<PickingAvailableItem[]>([]);
    const [pickingItemsLoading, setPickingItemsLoading] = useState(false);

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const normalizeKey = (s?: string | null) => (s ? s.toString().toUpperCase().replace(/\s+/g, '_') : '');

    const workRunStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        PAUSED: 'หยุดชั่วคราว',
        COMPLETED: 'เสร็จสิ้น',
        CANCELLED: 'ยกเลิก',
    };

    const getWorkRunStatusBadge = (status: string) => {
        const k = normalizeKey(status);
        if (k === 'COMPLETED') return 'badge-light-success';
        if (k === 'INPROGRESS') return 'badge-light-warning';
        if (k === 'PAUSED') return 'badge-light-info';
        if (k === 'CANCELLED') return 'badge-light-danger';
        return 'badge-light-secondary';
    };

    // --- Fetch ---
    const fetchWorkRun = async () => {
        setLoading();
        try {
            const result = await getWorkRunById(Number(workRunId));
            if (result?.success && result.data) {
                setWorkRun(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
            }
        } catch {
            alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
        } finally {
            setUnLoading();
        }
    };

    useEffect(() => { fetchWorkRun(); }, [workRunId]);

    // Fetch employees when modal opens
    useEffect(() => {
        if (showAssignEmpModal && allEmployees.length === 0) {
            setEmpLoading(true);
            getEmployeeList('').then(res => {
                setAllEmployees(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
            }).catch(() => setAllEmployees([])).finally(() => setEmpLoading(false));
        }
    }, [showAssignEmpModal]);

    // Fetch machines when modal opens
    useEffect(() => {
        if (showAssignMachineModal && allMachines.length === 0) {
            setMachineLoading(true);
            getMachineList(1, 200, '', '').then(res => {
                setAllMachines(res?.success && Array.isArray(res.data?.items) ? res.data.items : []);
            }).catch(() => setAllMachines([])).finally(() => setMachineLoading(false));
        }
    }, [showAssignMachineModal]);

    const filteredEmployees = React.useMemo(() => {
        if (!empSearch) return allEmployees;
        const q = empSearch.toLowerCase();
        return allEmployees.filter(emp => {
            const fullName = `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase();
            return fullName.includes(q) || String(emp.employee_id).includes(q);
        });
    }, [allEmployees, empSearch]);

    const filteredMachines = React.useMemo(() => {
        if (!machineSearch) return allMachines;
        const q = machineSearch.toLowerCase();
        return allMachines.filter(m => m.machine_name.toLowerCase().includes(q) || m.machine_code.toLowerCase().includes(q));
    }, [allMachines, machineSearch]);

    // Active assignments (to_time === null means currently assigned)
    const activeAssignments = workRun?.assignments?.filter(a => a.to_time === null) ?? [];
    const activeMachines = workRun?.machines?.filter(m => m.to_time === null) ?? [];

    const status = normalizeKey(workRun?.status);
    const isCompleted = status === 'COMPLETED';
    const isActive = status === 'INPROGRESS' || status === 'PAUSED';

    // --- Lifecycle ---
    const handleStart = async () => {
        const confirm = await Swal.fire({
            title: 'เริ่ม Work Run?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'เริ่มเลย',
            cancelButtonText: 'ยกเลิก',
        });
        if (!confirm.isConfirmed) return;
        setLoading();
        try {
            const result = await startWorkRun(Number(workRunId));
            if (result?.success) {
                Swal.fire({ title: 'เริ่มงานสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถเริ่มงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handlePause = async () => {
        const result = await Swal.fire({
            title: 'พักงาน',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { LUNCHBREAK: 'พักเที่ยง', RESTBREAK: 'พักเบรค', OTHER: 'อื่นๆ' },
            inputValue: 'LUNCHBREAK',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักงาน',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;
        setLoading();
        try {
            const res = await pauseWorkRun(Number(workRunId), { break_type: result.value });
            if (res?.success) {
                Swal.fire({ title: 'พักงานสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถพักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleResume = async () => {
        setLoading();
        try {
            const res = await resumeWorkRun(Number(workRunId));
            if (res?.success) {
                Swal.fire({ title: 'ทำงานต่อสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถดำเนินการได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Employee assign/unassign ---
    const handleAssignEmployee = async (emp: Employee) => {
        setLoading();
        try {
            const res = await assignEmployee(Number(workRunId), emp.employee_id);
            if (res?.success) {
                setShowAssignEmpModal(false);
                setEmpSearch('');
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถกำหนดพนักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleUnassignEmployee = async (employeeId: number) => {
        setLoading();
        try {
            const res = await unassignEmployee(Number(workRunId), employeeId);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถยกเลิกพนักงานได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Machine assign/unassign ---
    const handleAssignMachine = async (machine: Machine) => {
        setLoading();
        try {
            const res = await assignMachine(Number(workRunId), machine.machine_id);
            if (res?.success) {
                setShowAssignMachineModal(false);
                setMachineSearch('');
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถกำหนดเครื่องจักรได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleUnassignMachine = async (machineId: number) => {
        setLoading();
        try {
            const res = await unassignMachine(Number(workRunId), machineId);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถยกเลิกเครื่องจักรได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Complete Work Run ---
    const handleCompleteWorkRun = async () => {
        setLoading();
        try {
            const result = await completeWorkRun(Number(workRunId), {
                completion_remark: completeForm.completion_remark || undefined,
                defect_qty: completeForm.defect_qty,
                usable_qty: completeForm.usable_qty,
            });
            if (result?.success) {
                setShowCompleteModal(false);
                Swal.fire({ title: 'Work Run เสร็จสิ้น', icon: 'success', timer: 1500, showConfirmButton: false }).then(fetchWorkRun);
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถปิด Work Run ได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    const handleOpenPickingModal = async () => {
        if (!workRun?.work_order_id) return;
        setPickingItemsLoading(true);
        try {
            const res = await getWorkOrderById(workRun.work_order_id);
            if (res?.success && res.data) {
                const wo = res.data;
                const seen = new Set<string>();
                const items: PickingAvailableItem[] = [];
                (wo.item_components ?? []).forEach((comp: any) => {
                    (comp.material_usages ?? []).forEach((usage: any) => {
                        const ml = usage.material_list;
                        if (ml && ml.item_code && !seen.has(ml.item_code)) {
                            seen.add(ml.item_code);
                            items.push({ item_code: ml.item_code, item_name: ml.item_name, unit_name: ml.unit_name });
                        }
                    });
                });
                setPickingItems(items);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลวัสดุจากใบสั่งผลิตได้");
                return;
            }
        } catch {
            alertMessage("ไม่สามารถเชื่อมต่อ API ได้");
            return;
        } finally {
            setPickingItemsLoading(false);
        }
        setShowPickingModal(true);
    };

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            {workRun?.lot_number || `Work Run #${workRun?.work_run_id || workRunId}`}
                        </h1>
                        <div className='d-flex align-items-center gap-2 mt-1'>
                            {workRun && (
                                <span className={`badge ${getWorkRunStatusBadge(workRun.status)} fw-bold fs-8`}>
                                    {workRunStatusThaiMap[normalizeKey(workRun.status)] || workRun.status}
                                </span>
                            )}
                            {workRun && (
                                <span className='text-muted fw-semibold fs-8'>จำนวน: {workRun.quantity}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className='d-flex gap-2'>
                    {!isCompleted && (
                        <button
                            className='btn btn-sm btn-warning fw-bold px-6'
                            onClick={handleOpenPickingModal}
                            disabled={pickingItemsLoading}
                        >
                            {pickingItemsLoading
                                ? <><span className='spinner-border spinner-border-sm me-1' />กำลังโหลด...</>
                                : <><i className='bi bi-box-seam me-1'></i>สร้างคำขอเบิก</>
                            }
                        </button>
                    )}
                    {status === 'PENDING' && (
                        <button className='btn btn-sm btn-primary fw-bold px-6' onClick={handleStart}>
                            <i className='bi bi-play-fill me-1'></i> เริ่มงาน
                        </button>
                    )}
                    {status === 'INPROGRESS' && (
                        <button className='btn btn-sm btn-warning fw-bold px-6' onClick={handlePause}>
                            <i className='bi bi-pause-fill me-1'></i> พักงาน
                        </button>
                    )}
                    {status === 'PAUSED' && (
                        <button className='btn btn-sm btn-primary fw-bold px-6' onClick={handleResume}>
                            <i className='bi bi-play-fill me-1'></i> ทำงานต่อ
                        </button>
                    )}
                    {isActive && (
                        <button
                            className='btn btn-sm btn-success fw-bold px-6'
                            onClick={() => {
                                setCompleteForm({ completion_remark: '', defect_qty: 0, usable_qty: workRun?.quantity || 0 });
                                setShowCompleteModal(true);
                            }}
                        >
                            <i className='bi bi-check-circle me-1'></i> ปิด Work Run
                        </button>
                    )}
                </div>
            </div>

            {/* Completion Info */}
            {workRun && (workRun.defect_qty != null || workRun.usable_qty != null || workRun.completion_remark) && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-body py-5'>
                        <div className='row g-4'>
                            {workRun.usable_qty != null && (
                                <div className='col-md-4'>
                                    <span className='text-muted fs-8 fw-bold d-block'>จำนวนที่ใช้งานได้</span>
                                    <span className='text-success fw-bold fs-5'>{workRun.usable_qty}</span>
                                </div>
                            )}
                            {workRun.defect_qty != null && (
                                <div className='col-md-4'>
                                    <span className='text-muted fs-8 fw-bold d-block'>จำนวนของเสีย</span>
                                    <span className='text-danger fw-bold fs-5'>{workRun.defect_qty}</span>
                                </div>
                            )}
                            {workRun.completion_remark && (
                                <div className='col-md-12'>
                                    <span className='text-muted fs-8 fw-bold d-block'>หมายเหตุการปิดงาน</span>
                                    <span className='text-gray-700 fs-7'>{workRun.completion_remark}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Picking Requests */}
            {workRun?.picking_requests && workRun.picking_requests.length > 0 && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-header border-0 pt-5'>
                        <div className='card-title'>
                            <span className='card-label fw-bold text-gray-900 fs-5'>
                                <i className='bi bi-box-seam me-2 text-primary'></i>คำขอเบิก
                            </span>
                        </div>
                    </div>
                    <div className='card-body pt-0'>
                        <div className='d-flex flex-column gap-3'>
                            {workRun.picking_requests.map((pr: any) => {
                                const prBadge = pr.status === 'SUCCESS' ? 'badge-light-success' : pr.status === 'SENT' ? 'badge-light-primary' : pr.status === 'FAILED' ? 'badge-light-danger' : 'badge-light-warning';
                                const prLabel = pr.status === 'SUCCESS' ? 'สำเร็จ' : pr.status === 'SENT' ? 'ส่งแล้ว' : pr.status === 'FAILED' ? 'ล้มเหลว' : 'รอดำเนินการ';
                                return (
                                    <div key={pr.picking_request_id} className='d-flex align-items-center justify-content-between border rounded px-4 py-3'>
                                        <div className='d-flex align-items-center gap-3'>
                                            <span className='fw-bold text-gray-800 fs-7'>#{pr.picking_request_code ?? pr.picking_request_id}</span>
                                            <span className={`badge ${prBadge} fw-bold`}>{prLabel}</span>
                                            {pr.remark && <span className='text-muted fs-8'><i className='bi bi-chat-left-text me-1'></i>{pr.remark}</span>}
                                        </div>
                                        <div className='d-flex align-items-center gap-4 text-muted fs-8'>
                                            {pr.wms_reference && <span className='fw-semibold text-gray-700'><i className='bi bi-tag me-1'></i>{pr.wms_reference}</span>}
                                            <span>{new Date(pr.created_date).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Assigned Employees */}
            <div className='card shadow-sm mb-8'>
                <div className='card-header border-0 pt-5'>
                    <div className='card-title'>
                        <span className='card-label fw-bold text-gray-900 fs-5'>
                            <i className='bi bi-people me-2 text-primary'></i>พนักงานที่ได้รับมอบหมาย
                        </span>
                    </div>
                    {isActive && (
                        <div className='card-toolbar'>
                            <button className='btn btn-sm btn-light-primary fw-bold' onClick={() => setShowAssignEmpModal(true)}>
                                <i className='bi bi-person-plus me-1'></i> เพิ่มพนักงาน
                            </button>
                        </div>
                    )}
                </div>
                <div className='card-body pt-3'>
                    {activeAssignments.length === 0 ? (
                        <span className='text-muted fs-7'>ยังไม่มีพนักงานที่ได้รับมอบหมาย</span>
                    ) : (
                        <div className='d-flex flex-wrap gap-3'>
                            {activeAssignments.map(a => (
                                <div key={a.work_run_assignment_id} className='d-flex align-items-center border border-gray-200 rounded px-4 py-3 bg-light-primary'>
                                    <div className='symbol symbol-35px me-3'>
                                        <span className='symbol-label bg-primary text-white fw-bold fs-7'>
                                            {a.employee?.employee_first_name?.charAt(0) ?? '?'}
                                        </span>
                                    </div>
                                    <div className='d-flex flex-column me-3'>
                                        <span className='fw-bold text-gray-800 fs-7'>
                                            {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                        </span>
                                        <span className='text-muted fs-8'>ID: {a.employee_id}</span>
                                    </div>
                                    {isActive && (
                                        <i
                                            className='bi bi-x-circle text-danger cursor-pointer fs-5'
                                            onClick={() => handleUnassignEmployee(a.employee_id)}
                                        ></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Assigned Machines */}
            <div className='card shadow-sm mb-8'>
                <div className='card-header border-0 pt-5'>
                    <div className='card-title'>
                        <span className='card-label fw-bold text-gray-900 fs-5'>
                            <i className='bi bi-gear me-2 text-primary'></i>เครื่องจักรที่ใช้งาน
                        </span>
                    </div>
                    {isActive && (
                        <div className='card-toolbar'>
                            <button className='btn btn-sm btn-light-primary fw-bold' onClick={() => setShowAssignMachineModal(true)}>
                                <i className='bi bi-plus-lg me-1'></i> เพิ่มเครื่องจักร
                            </button>
                        </div>
                    )}
                </div>
                <div className='card-body pt-3'>
                    {activeMachines.length === 0 ? (
                        <span className='text-muted fs-7'>ยังไม่มีเครื่องจักรที่กำหนด</span>
                    ) : (
                        <div className='d-flex flex-wrap gap-3'>
                            {activeMachines.map(m => (
                                <div key={m.work_run_machine_id} className='d-flex align-items-center border border-gray-200 rounded px-4 py-3 bg-light-info'>
                                    <div className='symbol symbol-35px me-3'>
                                        <span className='symbol-label bg-info text-white fw-bold fs-7'>
                                            <i className='bi bi-gear-fill text-white'></i>
                                        </span>
                                    </div>
                                    <div className='d-flex flex-column me-3'>
                                        <span className='fw-bold text-gray-800 fs-7'>{m.machine?.machine_name ?? `Machine #${m.machine_id}`}</span>
                                        <span className='text-muted fs-8'>{m.machine?.machine_code}</span>
                                    </div>
                                    {isActive && (
                                        <i
                                            className='bi bi-x-circle text-danger cursor-pointer fs-5'
                                            onClick={() => handleUnassignMachine(m.machine_id)}
                                        ></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Assign Employee Modal */}
            <Modal show={showAssignEmpModal} onHide={() => { setShowAssignEmpModal(false); setEmpSearch(''); }} centered size="lg">
                <Modal.Header closeButton><Modal.Title className='fw-bold'>มอบหมายพนักงาน</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative my-4'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input type='text' className='form-control form-control-solid w-100 ps-13' placeholder='ค้นหาชื่อพนักงาน...' value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
                    </div>
                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead><tr className='fw-bold text-muted text-uppercase fs-7'><th>พนักงาน</th><th>สถานะ</th><th className='text-end'>เลือก</th></tr></thead>
                            <tbody>
                                {empLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>
                                ) : filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                                    const isAssigned = activeAssignments.some(a => a.employee_id === emp.employee_id);
                                    return (
                                        <tr key={emp.employee_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-45px me-5'><span className='symbol-label bg-light-primary text-primary fw-bold'>{emp.employee_first_name?.charAt(0)}</span></div>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-gray-900 fw-bold fs-6'>{emp.employee_first_name} {emp.employee_last_name}</span>
                                                        <span className='text-muted fw-semibold fs-7'>ID: {emp.employee_id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${emp.status === 'ACTIVE' ? 'badge-light-success' : 'badge-light-danger'} fw-bold`}>{emp.status}</span></td>
                                            <td className='text-end'>
                                                {isAssigned ? (
                                                    <button className='btn btn-sm btn-light-secondary fw-bold' disabled>กำลังทำงาน</button>
                                                ) : (
                                                    <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleAssignEmployee(emp)}>เลือก</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className='text-center py-10'>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Assign Machine Modal */}
            <Modal show={showAssignMachineModal} onHide={() => { setShowAssignMachineModal(false); setMachineSearch(''); }} centered size="lg">
                <Modal.Header closeButton><Modal.Title className='fw-bold'>เพิ่มเครื่องจักร</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative my-4'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input type='text' className='form-control form-control-solid w-100 ps-13' placeholder='ค้นหาชื่อเครื่องจักร...' value={machineSearch} onChange={e => setMachineSearch(e.target.value)} />
                    </div>
                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead><tr className='fw-bold text-muted text-uppercase fs-7'><th>เครื่องจักร</th><th>สถานะ</th><th className='text-end'>เลือก</th></tr></thead>
                            <tbody>
                                {machineLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>
                                ) : filteredMachines.length > 0 ? filteredMachines.map(m => {
                                    const isAssigned = activeMachines.some(am => am.machine_id === m.machine_id);
                                    return (
                                        <tr key={m.machine_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <div className='symbol symbol-45px me-5'><span className='symbol-label bg-light-info text-info fw-bold'><i className='bi bi-gear-fill'></i></span></div>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-gray-900 fw-bold fs-6'>{m.machine_name}</span>
                                                        <span className='text-muted fw-semibold fs-7'>{m.machine_code}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${m.status === 'IDLE' ? 'badge-light-success' : m.status === 'RUNNING' ? 'badge-light-warning' : 'badge-light-danger'} fw-bold`}>{m.status}</span></td>
                                            <td className='text-end'>
                                                {isAssigned ? (
                                                    <button className='btn btn-sm btn-light-secondary fw-bold' disabled>กำลังใช้งาน</button>
                                                ) : (
                                                    <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleAssignMachine(m)}>เลือก</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className='text-center py-10'>ไม่พบข้อมูล</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Picking Request Modal */}
            <PickingRequestModal
                show={showPickingModal}
                onHide={() => setShowPickingModal(false)}
                onSuccess={() => {}}
                availableItems={pickingItems}
                onSubmit={(payload) => createWorkRunPickingRequest(Number(workRunId), payload)}
                title={`คำขอเบิก — Work Run #${workRun?.lot_number}`}
            />

            {/* Complete Work Run Modal */}
            <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} centered>
                <Modal.Header closeButton><Modal.Title className='fw-bold'>ปิด Work Run</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>จำนวนที่ใช้งานได้</label>
                        <input
                            type='text'
                            className='form-control form-control-solid'
                            value={completeForm.usable_qty === 0 ? '' : String(completeForm.usable_qty)}
                            onChange={e => {
                                const s = formatIntegerInput(e.target.value);
                                setCompleteForm(prev => ({ ...prev, usable_qty: s === '' ? 0 : Number(s) }));
                            }}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>จำนวนของเสีย</label>
                        <input
                            type='text'
                            className='form-control form-control-solid'
                            value={completeForm.defect_qty === 0 ? '' : String(completeForm.defect_qty)}
                            onChange={e => {
                                const s = formatIntegerInput(e.target.value);
                                setCompleteForm(prev => ({ ...prev, defect_qty: s === '' ? 0 : Number(s) }));
                            }}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>หมายเหตุ (ไม่บังคับ)</label>
                        <textarea
                            className='form-control form-control-solid'
                            rows={3}
                            value={completeForm.completion_remark}
                            onChange={e => setCompleteForm(prev => ({ ...prev, completion_remark: e.target.value }))}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowCompleteModal(false)}>ยกเลิก</button>
                    <button className='btn btn-success fw-bold' onClick={handleCompleteWorkRun}>
                        <i className='bi bi-check-circle me-1'></i> ยืนยันปิด Work Run
                    </button>
                </Modal.Footer>
            </Modal>
        </Content>
    );
};

export default WorkRunDetail;
