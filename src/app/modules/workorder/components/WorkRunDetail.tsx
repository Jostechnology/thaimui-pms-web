import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getEmployeeList } from '../../../services/employee';
import { createWorkPhase, updateWorkPhase, deleteWorkPhase, getWorkOrderById } from '../../../services/workorder';
import { getWorkRunById, completeWorkRun } from '../../../services/workRunService';
import { createWorkRunPickingRequest } from '../../../services/pickingRequestService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { WorkRunDetail as WorkRunDetailType, WorkPhase, ReworkSource } from '../../../type_interface/WorkOrderType';
import type { PickingAvailableItem } from '../../../type_interface/PickingRequestType';
import PickingRequestModal from '../../../modals/picking_request_modal/PickingRequestModal';

interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
}

// UI State สำหรับ Phase
interface PhaseUI {
    id: number;
    title: string;
    status: string;
    staffs: { id: number; name: string; status: string; role: string }[];
    isEditing?: boolean;
    isNew?: boolean;
}

const WorkRunDetail: React.FC = () => {
    const navigate = useNavigate();
    const { workRunId } = useParams<{ workRunId: string }>();

    const [workRun, setWorkRun] = useState<WorkRunDetailType | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [empLoading, setEmpLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [phases, setPhases] = useState<PhaseUI[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
    const [deleteIDList, setDeleteIDList] = useState<number[]>([]);
    const [editIDList, setEditIDList] = useState<number[]>([]);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeForm, setCompleteForm] = useState({ completion_remark: '', defect_qty: 0, usable_qty: 0 });
    const [showPickingModal, setShowPickingModal] = useState(false);
    const [pickingItems, setPickingItems] = useState<PickingAvailableItem[]>([]);
    const [pickingItemsLoading, setPickingItemsLoading] = useState(false);

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const phaseStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        PAUSED: 'หยุดชั่วคราว',
        COMPLETED: 'เสร็จสิ้น'
    };

    const workRunStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        COMPLETED: 'เสร็จสิ้น',
        CANCELLED: 'ยกเลิก',
    };

    const normalizeKey = (s?: string | null) => {
        if (!s) return '';
        return s.toString().toUpperCase().replace(/\s+/g, '_');
    };

    const getPhaseDisplay = (status?: string | null) => {
        const key = normalizeKey(status);
        return phaseStatusThaiMap[key] || status || 'รอดำเนินการ';
    };

    // --- Fetch ---
    const fetchWorkRun = async () => {
        setLoading();
        try {
            const result = await getWorkRunById(Number(workRunId));
            if (result && result.success && result.data) {
                setWorkRun(result.data);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
            }
        } catch (error) {
            console.error(error);
            alertMessage("ไม่สามารถดึงข้อมูล Work Run ได้");
        } finally {
            setUnLoading();
        }
    };

    const fetchEmployees = async () => {
        setEmpLoading(true);
        try {
            const res = await getEmployeeList('');
            if (res && res.success && res.data && Array.isArray(res.data.items)) {
                setAllEmployees(res.data.items);
            } else {
                setAllEmployees([]);
            }
        } catch {
            setAllEmployees([]);
        } finally {
            setEmpLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkRun();
    }, [workRunId]);

    useEffect(() => {
        if (workRun?.work_phases && Array.isArray(workRun.work_phases)) {
            const loaded: PhaseUI[] = workRun.work_phases.map((wp) => ({
                id: wp.work_phase_id,
                title: wp.phase_name,
                status: wp.phase_status,
                staffs: wp.employee_list.map((emp) => ({
                    id: emp.employee_id,
                    name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                    role: 'พนักงาน',
                    status: emp.status
                })),
                isEditing: false,
                isNew: false
            }));
            setPhases(loaded);
            setDeleteIDList([]);
            setEditIDList([]);
        } else {
            setPhases([]);
        }
    }, [workRun]);

    useEffect(() => {
        if (showAssignModal && allEmployees.length === 0) {
            fetchEmployees();
        }
    }, [showAssignModal]);

    const filteredEmployees = React.useMemo(() => {
        if (!searchTerm) return allEmployees;
        const q = searchTerm.toLowerCase();
        return allEmployees.filter(emp => {
            const fullName = `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase();
            return fullName.includes(q) || String(emp.employee_id).includes(q) || emp.citizen_id?.includes(q);
        });
    }, [allEmployees, searchTerm]);

    // --- Change tracking ---
    const markAsEdited = (phaseId: number) => {
        const phase = phases.find(p => p.id === phaseId);
        if (phase && !phase.isNew && !editIDList.includes(phaseId)) {
            setEditIDList(prev => [...prev, phaseId]);
        }
    };

    // --- Phase actions ---
    const handleAddPhase = () => {
        const newId = phases.length > 0 ? Math.max(...phases.map(p => p.id)) + 1 : 1;
        setPhases([...phases, {
            id: newId,
            title: 'ขั้นตอนใหม่',
            status: 'PENDING',
            staffs: [],
            isEditing: true,
            isNew: true
        }]);
    };

    const handleDeletePhase = (phaseId: number) => {
        const phaseToDelete = phases.find(p => p.id === phaseId);
        setPhases(phases.filter(p => p.id !== phaseId));
        if (phaseToDelete && !phaseToDelete.isNew) {
            setDeleteIDList(prev => [...prev, phaseId]);
        }
        if (editIDList.includes(phaseId)) {
            setEditIDList(prev => prev.filter(id => id !== phaseId));
        }
    };

    const toggleEditPhase = (id: number) => {
        setPhases(phases.map(p => p.id === id ? { ...p, isEditing: !p.isEditing } : p));
    };

    const updatePhaseTitle = (id: number, newTitle: string) => {
        setPhases(phases.map(p => p.id === id ? { ...p, title: newTitle } : p));
        markAsEdited(id);
    };

    const assignStaff = (emp: Employee) => {
        if (!activePhaseId) return;
        setPhases(phases.map(p => {
            if (p.id !== activePhaseId) return p;
            if (p.staffs.find(s => s.id === emp.employee_id)) return p;
            return {
                ...p,
                staffs: [...p.staffs, {
                    id: emp.employee_id,
                    name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                    role: 'พนักงาน',
                    status: emp.status
                }]
            };
        }));
        markAsEdited(activePhaseId);
        setShowAssignModal(false);
        setSearchTerm("");
    };

    const hasActivePhase = phases.some(p => {
        if (p.isNew) return false;
        const k = normalizeKey(p.status);
        return k === 'INPROGRESS' || k === 'PAUSED';
    });

    const firstPENDINGPhaseId = !hasActivePhase
        ? (phases.find(p => !p.isNew && normalizeKey(p.status) === 'PENDING')?.id ?? null)
        : null;

    // --- Phase status updates ---
    const handlePhaseStatusUpdate = async (phaseId: number, newStatus: string, breakType?: string) => {
        setLoading();
        try {
            const payload: any = { work_phase_id: phaseId, phase_status: newStatus };
            if (breakType) payload.break_type = breakType;
            const result = await updateWorkPhase([payload]);
            if (result && result.success) {
                Swal.fire({ title: 'อัปเดตสถานะสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => fetchWorkRun());
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setUnLoading();
        }
    };

    const handleStartPhase = async (phaseId: number) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const confirm = await Swal.fire({
            title: 'เริ่มทำขั้นตอนนี้?',
            text: `ยืนยันเริ่มทำ "${phase.title}"`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'เริ่มเลย',
            cancelButtonText: 'ยกเลิก',
        });
        if (!confirm.isConfirmed) return;
        handlePhaseStatusUpdate(phaseId, 'INPROGRESS');
    };

    const handlePausePhase = async (phaseId: number) => {
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
        if (result.isConfirmed) handlePhaseStatusUpdate(phaseId, 'PAUSED', result.value);
    };

    const handleResumePhase = (phaseId: number) => handlePhaseStatusUpdate(phaseId, 'INPROGRESS');

    const handleCompletePhase = async (phaseId: number) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const confirm = await Swal.fire({
            title: 'เสร็จสิ้น?',
            text: 'ยืนยันว่าขั้นตอนนี้เสร็จสิ้นแล้ว ไม่สามารถย้อนกลับได้',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'ยืนยันเสร็จสิ้น',
            cancelButtonText: 'ยกเลิก',
        });
        if (!confirm.isConfirmed) return;
        handlePhaseStatusUpdate(phaseId, 'COMPLETED');
    };

    // --- Save all phase changes ---
    const handleSaveAllChanges = async () => {
        const createList = phases.filter(p => p.isNew);
        const updateList = phases.filter(p => editIDList.includes(p.id));
        const deleteIds = deleteIDList;

        const validateList = [...createList, ...updateList];
        if (validateList.some(p => !p.title.trim())) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อขั้นตอนให้ครบถ้วน', 'warning');
            return;
        }
        const phasesMissingStaff = validateList.filter(p => !p.staffs || p.staffs.length === 0).map(p => p.title || `ID:${p.id}`);
        if (phasesMissingStaff.length > 0) {
            Swal.fire('กรุณากำหนดพนักงาน', `กรุณากำหนดพนักงานสำหรับขั้นตอน: ${phasesMissingStaff.join(', ')}`, 'warning');
            return;
        }

        setLoading();
        try {
            const promises = [];
            if (createList.length > 0) {
                const createPayload = createList.map(phase => ({
                    work_run_id: workRun?.work_run_id,
                    phase_name: phase.title,
                    employee_id_list: phase.staffs.map(s => s.id)
                }));
                promises.push(createWorkPhase(createPayload));
            }
            if (updateList.length > 0) {
                const updatePayload = updateList.map(phase => ({
                    work_phase_id: phase.id,
                    phase_name: phase.title,
                    employee_id_list: phase.staffs.map(s => s.id)
                }));
                promises.push(updateWorkPhase(updatePayload));
            }
            if (deleteIds.length > 0) {
                promises.push(deleteWorkPhase({ work_phase_ids: deleteIds }));
            }
            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res && res.success);
            if (allSuccess) {
                Swal.fire({ title: 'บันทึกสำเร็จ', text: 'ดำเนินการครบถ้วนเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => fetchWorkRun());
            } else {
                Swal.fire('บันทึกไม่สมบูรณ์', 'บางรายการอาจเกิดข้อผิดพลาด', 'warning').then(() => fetchWorkRun());
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setUnLoading();
        }
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
            if (result && result.success) {
                setShowCompleteModal(false);
                Swal.fire({ title: 'Work Run เสร็จสิ้น', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => fetchWorkRun());
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถปิด Work Run ได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setUnLoading();
        }
    };

    const handleOpenPickingModal = async () => {
        if (!workRun?.work_order_id) return;
        setPickingItemsLoading(true);
        try {
            const res = await getWorkOrderById(workRun.work_order_id);
            if (res && res.success && res.data) {
                const wo = res.data;
                const seen = new Set<string>();
                const items: PickingAvailableItem[] = [];
                (wo.item_components ?? []).forEach((comp: any) => {
                    (comp.material_usages ?? []).forEach((usage: any) => {
                        const ml = usage.material_list;
                        if (ml && ml.item_code && !seen.has(ml.item_code)) {
                            seen.add(ml.item_code);
                            items.push({ item_code: ml.item_code, item_name: ml.item_name });
                        }
                    });
                });
                setPickingItems(items);
            } else {
                alertMessage("ไม่สามารถดึงข้อมูลวัสดุจาก Work Order ได้");
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

    const totalChanges = phases.filter(p => p.isNew).length + editIDList.length + deleteIDList.length;
    const isCompleted = normalizeKey(workRun?.status) === 'COMPLETED';

    const getWorkRunStatusBadge = (status: string) => {
        const k = normalizeKey(status);
        if (k === 'COMPLETED') return 'badge-light-success';
        if (k === 'INPROGRESS') return 'badge-light-warning';
        if (k === 'CANCELLED') return 'badge-light-danger';
        return 'badge-light-secondary';
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
                                : <><i className='bi bi-box-seam me-1'></i>สร้างคำขอเบิก </>
                            }
                        </button>
                    )}
                    {!isCompleted && (
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
                    {!isCompleted && (
                        <button
                            className='btn btn-sm btn-primary fw-bold px-6'
                            onClick={handleSaveAllChanges}
                            disabled={totalChanges === 0}
                        >
                            บันทึกการเปลี่ยนแปลง
                            {totalChanges > 0 && <span className="badge badge-circle badge-white ms-2">{totalChanges}</span>}
                        </button>
                    )}
                </div>
            </div>

            {/* Work Run Info */}
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
            {workRun && (workRun as any).picking_requests?.length > 0 && (
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
                            {((workRun as any).picking_requests as any[]).map((pr: any) => {
                                const prBadge = pr.status === 'SUCCESS' ? 'badge-light-success' : pr.status === 'SENT' ? 'badge-light-primary' : pr.status === 'FAILED' ? 'badge-light-danger' : 'badge-light-warning';
                                const prLabel = pr.status === 'SUCCESS' ? 'สำเร็จ' : pr.status === 'SENT' ? 'ส่งแล้ว' : pr.status === 'FAILED' ? 'ล้มเหลว' : 'รอดำเนินการ';
                                return (
                                    <div key={pr.picking_request_id} className='d-flex align-items-center justify-content-between border rounded px-4 py-3'>
                                        <div className='d-flex align-items-center gap-3'>
                                            <span className='fw-bold text-gray-800 fs-7'>#{pr.picking_request_code ?? pr.picking_request_id}</span>
                                            <span className={`badge ${prBadge} fw-bold`}>{prLabel}</span>
                                            {pr.remark && (
                                                <span className='text-muted fs-8'>
                                                    <i className='bi bi-chat-left-text me-1'></i>{pr.remark}
                                                </span>
                                            )}
                                        </div>
                                        <div className='d-flex align-items-center gap-4 text-muted fs-8'>
                                            {pr.wms_reference && (
                                                <span className='fw-semibold text-gray-700'>
                                                    <i className='bi bi-tag me-1'></i>{pr.wms_reference}
                                                </span>
                                            )}
                                            <span>{new Date(pr.created_date).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>โดย {pr.created_by ?? '-'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Rework Sources */}
            {workRun && workRun.rework_sources && workRun.rework_sources.length > 0 && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-header border-0 pt-5'>
                        <div className='card-title'>
                            <span className='card-label fw-bold text-gray-900 fs-5'>แหล่งที่มา (Rework Sources)</span>
                        </div>
                    </div>
                    <div className='card-body pt-0'>
                        <div className='table-responsive'>
                            <table className='table table-row-dashed align-middle gs-0 gy-3'>
                                <thead>
                                    <tr className='fw-bold text-muted text-uppercase fs-7'>
                                        <th>Work Run ต้นทาง</th>
                                        <th>จำนวน</th>
                                        <th>วันที่สร้าง</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workRun.rework_sources.map((src: ReworkSource) => (
                                        <tr key={src.id}>
                                            <td>
                                                <span
                                                    className='text-primary fw-bold fs-6 cursor-pointer'
                                                    onClick={() => navigate(`/workorder/work_run/${src.source_work_run_id}`)}
                                                >
                                                    {(src as any).source_lot_number || `Work Run #${src.source_work_run_id}`}
                                                </span>
                                            </td>
                                            <td><span className='fw-bold fs-6'>{src.qty}</span></td>
                                            <td><span className='text-muted fs-7'>{new Date(src.created_date).toLocaleString('th-TH')}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Phases Timeline */}
            {phases.length === 0 ? (
                <div className='card shadow-sm mb-10'>
                    <div className='card-body d-flex flex-column flex-center p-20'>
                        <div className='fs-2tx fw-bold text-gray-800 mb-3'>ยังไม่มีขั้นตอนการผลิต</div>
                        {!isCompleted && (
                            <button onClick={handleAddPhase} className='btn btn-primary fw-bold px-8 py-4 shadow-sm'>
                                <i className='bi bi-plus-lg fs-3 me-2'></i> เพิ่มขั้นตอนแรก
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className='position-relative'>
                    <div className='position-absolute start-0 top-0 h-100 border-start border-gray-300 border-2 ms-5 z-index-0'></div>
                    {phases.map((phase, index) => (
                        <div key={phase.id} className='d-flex align-items-start mb-10 position-relative z-index-1'>
                            <div className='symbol symbol-40px me-5 mt-1'>
                                <div className={`symbol-label fw-bold shadow-sm ${phase.isNew ? 'bg-primary text-white' : 'bg-light-success text-success'}`}>{index + 1}</div>
                            </div>
                            <div className={`card shadow-sm w-100 ${phase.isNew ? 'border border-dashed border-primary' : ''}`}>
                                <div className='card-header border-0 pt-5'>
                                    <div className='card-title flex-column'>
                                        {normalizeKey(phase.status) === 'COMPLETED' ? (
                                            <span className='card-label fw-bold text-gray-900 fs-4 mb-1'>{phase.title}</span>
                                        ) : phase.isEditing ? (
                                            <input
                                                className='form-control form-control-sm fw-bold fs-4 text-gray-900 border-primary mb-1'
                                                value={phase.title}
                                                autoFocus
                                                onBlur={() => toggleEditPhase(phase.id)}
                                                onChange={(e) => updatePhaseTitle(phase.id, e.target.value)}
                                            />
                                        ) : (
                                            <span className='card-label fw-bold text-gray-900 fs-4 cursor-pointer mb-1' onClick={() => toggleEditPhase(phase.id)}>
                                                {phase.title} <i className='bi bi-pencil fs-7 ms-2 text-gray-400'></i>
                                            </span>
                                        )}
                                        <div className='d-flex gap-2 align-items-center'>
                                            <span className='text-muted fw-bold fs-8'>สถานะ: {getPhaseDisplay(phase.status)}</span>
                                            {phase.isNew && <span className='badge badge-light-primary fs-9'>New</span>}
                                            {!phase.isNew && editIDList.includes(phase.id) && <span className='badge badge-light-warning fs-9'>Edited</span>}
                                        </div>
                                    </div>
                                    <div className='card-toolbar d-flex gap-2'>
                                        {firstPENDINGPhaseId === phase.id && (
                                            <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleStartPhase(phase.id)}>
                                                <i className='bi bi-play-fill me-1'></i> เริ่มทำ
                                            </button>
                                        )}
                                        {!phase.isNew && normalizeKey(phase.status) === 'INPROGRESS' && (
                                            <button className='btn btn-sm btn-warning fw-bold' onClick={() => handlePausePhase(phase.id)}>
                                                <i className='bi bi-pause-fill me-1'></i> พักงาน
                                            </button>
                                        )}
                                        {!phase.isNew && normalizeKey(phase.status) === 'PAUSED' && (
                                            <button className='btn btn-sm btn-primary fw-bold' onClick={() => handleResumePhase(phase.id)}>
                                                <i className='bi bi-play-fill me-1'></i> ทำงานต่อ
                                            </button>
                                        )}
                                        {!phase.isNew && ['INPROGRESS', 'PAUSED'].includes(normalizeKey(phase.status)) && (
                                            <button className='btn btn-sm btn-success fw-bold' onClick={() => handleCompletePhase(phase.id)}>
                                                <i className='bi bi-check-lg me-1'></i> เสร็จสิ้น
                                            </button>
                                        )}
                                        {!phase.isNew && normalizeKey(phase.status) === 'COMPLETED' && (
                                            <button
                                                className='btn btn-sm btn-icon btn-light-info'
                                                title='ดูรายละเอียด'
                                                onClick={() => navigate(`/workorder/workorders_phase_detail/${phase.id}`)}
                                            >
                                                <i className='bi bi-eye'></i>
                                            </button>
                                        )}
                                        {normalizeKey(phase.status) !== 'COMPLETED' && !isCompleted && (
                                            <button className='btn btn-icon btn-sm btn-light-danger' onClick={() => handleDeletePhase(phase.id)}>
                                                <i className='bi bi-trash'></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className='card-body pt-0'>
                                    <div className='separator separator-dashed my-4'></div>
                                    <div className='d-flex flex-stack mb-4'>
                                        <span className='text-gray-400 fw-bold fs-8 text-uppercase'>พนักงานที่ได้รับมอบหมาย</span>
                                        {normalizeKey(phase.status) !== 'COMPLETED' && !isCompleted && (
                                            <button onClick={() => { setActivePhaseId(phase.id); setShowAssignModal(true); }} className='btn btn-sm btn-light-primary fw-bold'>
                                                <i className='bi bi-person-plus'></i> Assign Staff
                                            </button>
                                        )}
                                    </div>
                                    <div className='d-flex flex-wrap gap-2'>
                                        {phase.staffs && phase.staffs.length > 0 ? (
                                            phase.staffs.map(s => (
                                                <div key={s.id} className='badge badge-light-secondary d-flex align-items-center py-2 px-3 border border-gray-200'>
                                                    <span className='text-gray-800 fw-bold me-2'>{s.name}</span>
                                                    {normalizeKey(phase.status) !== 'COMPLETED' && !isCompleted && (
                                                        <i className='bi bi-x-circle text-danger cursor-pointer' onClick={() => {
                                                            setPhases(phases.map(p => p.id === phase.id ? { ...p, staffs: p.staffs.filter(st => st.id !== s.id) } : p));
                                                            markAsEdited(phase.id);
                                                        }}></i>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <span className='text-muted fs-8'>ยังไม่ได้ระบุพนักงาน</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!isCompleted && (
                        <div className='d-flex align-items-center position-relative z-index-1 ms-10 ps-2'>
                            <button onClick={handleAddPhase} className='btn btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary w-100 py-4 fw-bold'>
                                <i className='bi bi-plus-lg me-2 fs-3'></i> เพิ่มขั้นตอนถัดไป
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Assign Staff Modal */}
            <Modal show={showAssignModal} onHide={() => { setShowAssignModal(false); setSearchTerm(""); }} centered size="lg">
                <Modal.Header closeButton><Modal.Title className='fw-bold'>มอบหมายงานพนักงาน</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative my-5'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input type='text' className='form-control form-control-solid w-100 ps-13' placeholder='ค้นหาชื่อพนักงาน...' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead><tr className='fw-bold text-muted text-uppercase fs-7'><th>พนักงาน</th><th>สถานะ</th><th className='text-end'>เลือก</th></tr></thead>
                            <tbody>
                                {empLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>
                                ) : filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp) => {
                                        const isAssigned = phases.find(p => p.id === activePhaseId)?.staffs?.some(s => s.id === emp.employee_id);
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
                                                        <button className='btn btn-sm btn-light-danger fw-bold' disabled>เลือกแล้ว</button>
                                                    ) : (
                                                        <button className='btn btn-sm btn-primary fw-bold' onClick={() => assignStaff(emp)}>เลือก</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
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
                            type='number'
                            className='form-control form-control-solid'
                            value={completeForm.usable_qty}
                            onChange={(e) => setCompleteForm(prev => ({ ...prev, usable_qty: Number(e.target.value) }))}
                            min={0}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>จำนวนของเสีย</label>
                        <input
                            type='number'
                            className='form-control form-control-solid'
                            value={completeForm.defect_qty}
                            onChange={(e) => setCompleteForm(prev => ({ ...prev, defect_qty: Number(e.target.value) }))}
                            min={0}
                        />
                    </div>
                    <div className='mb-4'>
                        <label className='form-label fw-bold'>หมายเหตุ (ไม่บังคับ)</label>
                        <textarea
                            className='form-control form-control-solid'
                            rows={3}
                            value={completeForm.completion_remark}
                            onChange={(e) => setCompleteForm(prev => ({ ...prev, completion_remark: e.target.value }))}
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
