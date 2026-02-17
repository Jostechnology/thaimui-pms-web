import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getEmployeeList } from '../../../services/employee';
import { getWorkOrderById, createWorkPhase, updateWorkPhase, deleteWorkPhase } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';

// --- Interfaces ---
interface Employee {
    citizen_id: string;
    employee_first_name: string;
    employee_id: number;
    employee_last_name: string;
    status: string;
    user_id: number;
}

interface SalesItem {
    cost_price: number;
    doc_num: string;
    item_code: string;
    item_description: string;
    item_name: string;
    item_num: number;
    sales_item_id: number;
    unit_price: number;
}

// ข้อมูล Phase จาก Backend
interface WorkPhaseData {
    work_phase_id: number;
    work_order_id: number;
    phase_name: string;
    phase_status: string;
    start_date: string;
    end_date: string | null;
    created_date: string;
    employee_list: Employee[];
    sales_item_list?: SalesItem[];
}

interface WorkorderData {
    work_order_id: number;
    doc_num: string;
    status: string;
    created_date: string;
    work_phases: WorkPhaseData[]; // ใช้ Array นี้เป็นหลัก
}

// UI State สำหรับ Phase
interface Phase {
    id: number;
    title: string;
    status: string;
    staffs: { id: number; name: string; status: string; role: string }[];
    items: SalesItem[];
    isEditing?: boolean;
    isNew?: boolean; // Flag บอกว่าเป็นของใหม่
}

const WorkorderDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // Data States
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [empLoading, setEmpLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkorderData | null>(null);

    // UI States
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();
    const [phases, setPhases] = useState<Phase[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [activePhaseId, setActivePhaseId] = useState<number | null>(null);

    // Change Tracking States (พระเอกของเรา)
    const [deleteIDList, setDeleteIDList] = useState<number[]>([]);
    const [editIDList, setEditIDList] = useState<number[]>([]);

    // --- 1. Sync Data from Backend to UI ---
    useEffect(() => {
        if (currentWorkOrder?.work_phases && Array.isArray(currentWorkOrder.work_phases)) {
            const loadedPhases: Phase[] = currentWorkOrder.work_phases.map((wp) => ({
                id: wp.work_phase_id,
                title: wp.phase_name,
                status: wp.phase_status,
                staffs: wp.employee_list.map((emp) => ({
                    id: emp.employee_id,
                    name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                    role: 'พนักงาน',
                    status: emp.status
                })),
                items: wp.sales_item_list || [],
                isEditing: false,
                isNew: false // ข้อมูลจาก DB = ไม่ใช่ของใหม่
            }));
            setPhases(loadedPhases);

            // Reset tracking lists เมื่อโหลดข้อมูลใหม่
            setDeleteIDList([]);
            setEditIDList([]);
        } else {
            setPhases([]);
        }
    }, [currentWorkOrder]);

    // --- 2. API Fetching ---
    const fetchWorkorderData = async () => {
        setLoading();
        try {
            const result = await getWorkOrderById(Number(id));
            if (result && result.success && result.data) {
                setCurrentWorkOrder(result.data);
            }
        } catch (error) {
            console.error(error);
            alertMessage("ไม่สามารถดึงข้อมูลรายละเอียดได้");
        } finally {
            setUnLoading();
        }
    };

    const fetchEmployees = async (search: string) => {
        setEmpLoading(true);
        try {
            const res = await getEmployeeList(search);
            if (res && res.success && res.data && Array.isArray(res.data.items)) {
                setAllEmployees(res.data.items);
            } else {
                setAllEmployees([]);
            }
        } catch (error) {
            setAllEmployees([]);
        } finally {
            setEmpLoading(false);
        }
    };

    useEffect(() => {
        if (showModal) {
            const delay = setTimeout(() => fetchEmployees(searchTerm), 300);
            return () => clearTimeout(delay);
        }
    }, [searchTerm, showModal]);

    useEffect(() => {
        fetchWorkorderData();
    }, [id]);

    // --- 3. Change Tracking Helpers ---
    const markAsEdited = (phaseId: number) => {
        const phase = phases.find(p => p.id === phaseId);
        // ถ้าเป็นของเก่า (!isNew) และยังไม่ได้อยู่ในรายการแก้ไข -> เพิ่มเข้าไป
        if (phase && !phase.isNew && !editIDList.includes(phaseId)) {
            setEditIDList(prev => [...prev, phaseId]);
        }
    };

    // --- 4. Phase Actions ---
    const handleAddPhase = () => {
        const newId = phases.length > 0 ? Math.max(...phases.map(p => p.id)) + 1 : 1;
        const newPhase: Phase = {
            id: newId,
            title: `ขั้นตอนใหม่`,
            status: 'Pending',
            staffs: [],
            items: [],
            isEditing: true,
            isNew: true // ระบุว่าเป็นของใหม่
        };
        setPhases([...phases, newPhase]);
    };

    const handleDeletePhase = (phaseId: number) => {
        const phaseToDelete = phases.find(p => p.id === phaseId);

        // ลบออกจาก UI
        setPhases(phases.filter(p => p.id !== phaseId));

        // ถ้าเป็นของเก่า -> ใส่ Delete List
        if (phaseToDelete && !phaseToDelete.isNew) {
            setDeleteIDList(prev => [...prev, phaseId]);
        }
        // ถ้าอยู่ใน Edit List -> เอาออก (เพราะจะลบแล้ว)
        if (editIDList.includes(phaseId)) {
            setEditIDList(prev => prev.filter(id => id !== phaseId));
        }
    };

    const toggleEditPhase = (id: number) => {
        setPhases(phases.map(p => p.id === id ? { ...p, isEditing: !p.isEditing } : p));
    };

    const updatePhaseTitle = (id: number, newTitle: string) => {
        setPhases(phases.map(p => p.id === id ? { ...p, title: newTitle } : p));
        markAsEdited(id); // Mark Change
    };

    const assignStaff = (emp: Employee) => {
        if (activePhaseId) {
            setPhases(phases.map(p => {
                if (p.id === activePhaseId) {
                    const currentStaffs = p.staffs || [];
                    if (currentStaffs.find(s => s.id === emp.employee_id)) return p;
                    return {
                        ...p,
                        staffs: [...currentStaffs, {
                            id: emp.employee_id,
                            name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                            role: 'พนักงาน',
                            status: emp.status
                        }]
                    };
                }
                return p;
            }));
            markAsEdited(activePhaseId); // Mark Change
            setShowModal(false);
            setSearchTerm("");
        }
    };

    // --- 5. Phase Status Actions ---
    const hasActivePhase = phases.some(p => !p.isNew && (p.status === 'InProgress' || p.status === 'Paused'));
    const firstPendingPhaseId = !hasActivePhase
        ? (phases.find(p => !p.isNew && p.status === 'Pending')?.id ?? null)
        : null;

    const handlePhaseStatusUpdate = async (phaseId: number, newStatus: string, breakType?: string) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;

        setLoading();
        try {
            const payload: any = { work_phase_id: phaseId, phase_status: newStatus };
            if (breakType) payload.break_type = breakType;

            const result = await updateWorkPhase([payload]);
            if (result && result.success) {
                Swal.fire({
                    title: 'อัปเดตสถานะสำเร็จ',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                }).then(() => fetchWorkorderData());
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
            }
        } catch (error) {
            console.error(error);
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
        handlePhaseStatusUpdate(phaseId, 'InProgress');
    };

    const handlePausePhase = async (phaseId: number) => {
        const result = await Swal.fire({
            title: 'พักงาน',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { 'Lunch': 'พักเที่ยง', 'Short Break': 'พักเบรก', 'Other': 'อื่นๆ' },
            inputValue: 'Short Break',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักงาน',
            cancelButtonText: 'ยกเลิก',
        });
        if (result.isConfirmed) handlePhaseStatusUpdate(phaseId, 'Paused', result.value);
    };

    const handleResumePhase = (phaseId: number) => {
        handlePhaseStatusUpdate(phaseId, 'InProgress');
    };

    const handleCompletePhase = async (phaseId: number) => {
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
        handlePhaseStatusUpdate(phaseId, 'Completed');
    };

    // --- 6. The MASTER SAVE Logic ---
    const handleSaveAllChanges = async () => {
        // แยกกองข้อมูล
        const createList = phases.filter(p => p.isNew);
        const updateList = phases.filter(p => editIDList.includes(p.id));
        const deleteIds = deleteIDList;

        // Validation (เฉพาะ Create/Update)
        const validateList = [...createList, ...updateList];
        if (validateList.some(p => !p.title.trim())) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อขั้นตอนให้ครบถ้วน', 'warning');
            return;
        }

        // New: Ensure every creating/updating phase has at least one assigned staff
        const phasesMissingStaff = validateList.filter(p => !p.staffs || p.staffs.length === 0).map(p => p.title || `ID:${p.id}`);
        if (phasesMissingStaff.length > 0) {
            Swal.fire('กรุณากำหนดพนักงาน', `กรุณากำหนดพนักงานสำหรับขั้นตอน: ${phasesMissingStaff.join(', ')}`, 'warning');
            return;
        }

        setLoading();
        try {
            const promises = [];

            // A. Create Logic
            if (createList.length > 0) {
                const createPayload = createList.map(phase => ({
                    work_order_id: currentWorkOrder?.work_order_id,
                    phase_name: phase.title,
                    start_date: new Date().toISOString(),
                    employee_id_list: phase.staffs ? phase.staffs.map(s => s.id) : []
                }));
                promises.push(createWorkPhase(createPayload));
            }

            // B. Update Logic (พี่ต้องทำ API รองรับ Array หรือ Loop ยิง)
            if (updateList.length > 0) {
                const updatePayload = updateList.map(phase => ({
                    work_phase_id: phase.id,
                    phase_name: phase.title,
                    employee_id_list: phase.staffs ? phase.staffs.map(s => s.id) : []
                }));
                // สมมติว่าส่งเป็น list ไป update ทีเดียว
                promises.push(updateWorkPhase(updatePayload));
            }

            // C. Delete Logic
            if (deleteIds.length > 0) {
                const deletePayload = { work_phase_ids: deleteIds };
                promises.push(deleteWorkPhase(deletePayload));
            }

            // ยิงพร้อมกัน
            const results = await Promise.all(promises);
            const allSuccess = results.every(res => res && res.success);

            if (allSuccess) {
                Swal.fire({
                    title: 'บันทึกสำเร็จ',
                    text: 'ดำเนินการครบถ้วนเรียบร้อย',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    fetchWorkorderData(); // Reload ข้อมูลจริง
                });
            } else {
                Swal.fire('บันทึกไม่สมบูรณ์', 'บางรายการอาจเกิดข้อผิดพลาด', 'warning').then(() => fetchWorkorderData());
            }

        } catch (error) {
            console.error(error);
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setUnLoading();
        }
    };

    // คำนวณจำนวนการเปลี่ยนแปลงเพื่อแสดงบนปุ่ม
    const totalChanges = phases.filter(p => p.isNew).length + editIDList.length + deleteIDList.length;

    return (
        <Content>
            {/* Header */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>{currentWorkOrder?.doc_num || 'LOADING...'}</h1>
                        {currentWorkOrder && (
                            <span className={`badge ${currentWorkOrder.status === 'Ready' ? 'badge-light-success' : 'badge-light-primary'} fw-bold fs-8 px-3 py-1 mt-1 w-fit`}>
                                {currentWorkOrder.status}
                            </span>
                        )}
                    </div>
                </div>
                {/* Global Save Button */}
                <button
                    className='btn btn-sm btn-success fw-bold px-6'
                    onClick={handleSaveAllChanges}
                    disabled={totalChanges === 0}
                >
                    Save Changes
                    {totalChanges > 0 && <span className="badge badge-circle badge-white text-white ms-2">{totalChanges}</span>}
                </button>
            </div>

            {/* Timeline */}
            {phases.length === 0 ? (
                <div className='card shadow-sm mb-10'>
                    <div className='card-body d-flex flex-column flex-center p-20'>
                        <div className='fs-2tx fw-bold text-gray-800 mb-3'>ยังไม่มีขั้นตอนการผลิต</div>
                        <button onClick={handleAddPhase} className='btn btn-primary fw-bold px-8 py-4 shadow-sm'>
                            <i className='bi bi-plus-lg fs-3 me-2'></i> เพิ่มขั้นตอนแรก
                        </button>
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
                                        {phase.isEditing ? (
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
                                            <span className='text-muted fw-bold fs-8'>สถานะ: {phase.status || 'Pending'}</span>
                                            {phase.isNew && <span className='badge badge-light-primary fs-9'>New</span>}
                                            {/* โชว์ Badge เมื่อมีการแก้ไข */}
                                            {!phase.isNew && editIDList.includes(phase.id) && <span className='badge badge-light-warning fs-9'>Edited</span>}
                                        </div>
                                    </div>
                                    <div className='card-toolbar d-flex gap-2'>
                                        {/* เริ่มทำ — เฉพาะ phase แรกที่ Pending และไม่มี phase ที่กำลังทำอยู่ */}
                                        {firstPendingPhaseId === phase.id && (
                                            <button
                                                className='btn btn-sm btn-primary fw-bold'
                                                onClick={() => handleStartPhase(phase.id)}
                                            >
                                                <i className='bi bi-play-fill me-1'></i> เริ่มทำ
                                            </button>
                                        )}
                                        {/* พักงาน — เฉพาะ phase ที่กำลัง InProgress */}
                                        {!phase.isNew && phase.status === 'InProgress' && (
                                            <button
                                                className='btn btn-sm btn-warning fw-bold'
                                                onClick={() => handlePausePhase(phase.id)}
                                            >
                                                <i className='bi bi-pause-fill me-1'></i> พักงาน
                                            </button>
                                        )}
                                        {/* ทำงานต่อ — เฉพาะ phase ที่ Paused */}
                                        {!phase.isNew && phase.status === 'Paused' && (
                                            <button
                                                className='btn btn-sm btn-primary fw-bold'
                                                onClick={() => handleResumePhase(phase.id)}
                                            >
                                                <i className='bi bi-play-fill me-1'></i> ทำงานต่อ
                                            </button>
                                        )}
                                        {/* เสร็จสิ้น — เฉพาะ phase ที่ InProgress หรือ Paused */}
                                        {!phase.isNew && (phase.status === 'InProgress' || phase.status === 'Paused') && (
                                            <button
                                                className='btn btn-sm btn-success fw-bold'
                                                onClick={() => handleCompletePhase(phase.id)}
                                            >
                                                <i className='bi bi-check-lg me-1'></i> เสร็จสิ้น
                                            </button>
                                        )}
                                        {phase.status !== 'Completed' && (
                                            <button className='btn btn-icon btn-sm btn-light-danger' onClick={() => handleDeletePhase(phase.id)}><i className='bi bi-trash'></i></button>
                                        )}
                                    </div>
                                </div>
                                <div className='card-body pt-0'>
                                    {/* Items */}
                                    {phase.items && phase.items.length > 0 && (
                                        <div className='mb-4 p-3 bg-light-warning rounded border border-dashed border-warning'>
                                            <span className='text-warning fw-bold fs-8 d-block mb-2 text-uppercase'>รายการสินค้า:</span>
                                            {phase.items.map((item, idx) => (
                                                <div key={item.sales_item_id || idx} className='fs-7 text-gray-700 fw-semibold'>• {item.item_name} ({item.item_num})</div>
                                            ))}
                                        </div>
                                    )}
                                    <div className='separator separator-dashed my-4'></div>
                                    <div className='d-flex flex-stack mb-4'>
                                        <span className='text-gray-400 fw-bold fs-8 uppercase'>พนักงานที่ได้รับมอบหมาย</span>
                                        {phase.status !== 'Completed' && (
                                            <button onClick={() => { setActivePhaseId(phase.id); setShowModal(true); }} className='btn btn-sm btn-light-primary fw-bold'><i className='bi bi-person-plus'></i> Assign Staff</button>
                                        )}
                                    </div>
                                    {/* Staffs */}
                                    <div className='d-flex flex-wrap gap-2'>
                                        {phase.staffs && phase.staffs.length > 0 ? (
                                            phase.staffs.map(s => (
                                                <div key={s.id} className='badge badge-light-secondary d-flex align-items-center py-2 px-3 border border-gray-200'>
                                                    <span className='text-gray-800 fw-bold me-2'>{s.name}</span>
                                                    <i className='bi bi-x-circle text-danger cursor-pointer' onClick={() => {
                                                        setPhases(phases.map(p => p.id === phase.id ? { ...p, staffs: p.staffs.filter(st => st.id !== s.id) } : p));
                                                        markAsEdited(phase.id); // Mark Change when remove staff
                                                    }}></i>
                                                </div>
                                            ))
                                        ) : (<span className='text-muted fs-8 italic'>ยังไม่ได้ระบุพนักงาน</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className='d-flex align-items-center position-relative z-index-1 ms-10 ps-2'>
                        <button onClick={handleAddPhase} className='btn btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary w-100 py-4 fw-bold'><i className='bi bi-plus-lg me-2 fs-3'></i> เพิ่มขั้นตอนถัดไป</button>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setSearchTerm(""); }} centered size="lg">
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
                                {empLoading ? (<tr><td colSpan={3} className='text-center py-10'>กำลังโหลด...</td></tr>) :
                                    allEmployees && allEmployees.length > 0 ? (allEmployees.map((emp) => {
                                        const isAlreadyAssigned = phases.find(p => p.id === activePhaseId)?.staffs?.some(s => s.id === emp.employee_id);
                                        return (
                                            <tr key={emp.employee_id}>
                                                <td>
                                                    <div className='d-flex align-items-center'>
                                                        <div className='symbol symbol-45px me-5'><span className='symbol-label bg-light-primary text-primary fw-bold'>{emp.employee_first_name?.charAt(0)}</span></div>
                                                        <div className='d-flex flex-column'><span className='text-gray-900 fw-bold fs-6'>{emp.employee_first_name} {emp.employee_last_name}</span><span className='text-muted fw-semibold fs-7'>ID: {emp.employee_id}</span></div>
                                                    </div>
                                                </td>
                                                <td><span className={`badge ${emp.status === 'ว่างงาน' ? 'badge-light-success' : 'badge-light-danger'} fw-bold`}>{emp.status}</span></td>
                                                <td className='text-end'>{isAlreadyAssigned ? (<button className='btn btn-sm btn-light-danger fw-bold' disabled style={{ cursor: 'not-allowed' }}>เลือกแล้ว</button>) : (<button className='btn btn-sm btn-primary fw-bold' onClick={() => assignStaff(emp)}>เลือก</button>)}</td>
                                            </tr>
                                        );
                                    })) : (<tr><td colSpan={3} className='text-center py-10'>ไม่พบข้อมูล</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>
        </Content>
    );
};

export default WorkorderDetail;