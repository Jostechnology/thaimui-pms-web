import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getEmployeeList } from '../../../services/employee';
import { getWorkOrderById, createWorkPhase, updateWorkPhase, deleteWorkPhase } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import ItemComponentDetailModal from './ItemComponentDetailModal';

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
    producing_qty: number;
    produced_qty: number;
    queued_for_test_qty: number;
    tested_qty: number;
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

interface ComponentMaterialUsageData {
    usage_id: number;
    item_component_id: number;
    material_list_id: number;
    quantity_used: number;
    material_list: {
        material_list_id: number;
        item_code: string;
        item_name: string;
        item_description: string;
        original_num: number;
        remaining_num: number;
        cost_price: number;
        unit_price: number;
    };
}

interface ItemComponentData {
    item_component_id: number;
    work_order_id: number;
    component_name: string;
    material_usages: ComponentMaterialUsageData[];
}

interface WorkorderData {
    work_order_id: number;
    doc_num: string;
    status: string;
    created_date: string;
    work_phases: WorkPhaseData[]; // ใช้ Array นี้เป็นหลัก
    item_components?: ItemComponentData[];
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
    const [deleteIDList, setDeleteIDList] = useState<number[]>([]);
    const [editIDList, setEditIDList] = useState<number[]>([]);
    const [editComponentId, setEditComponentId] = useState<number | null>(null);

    const phaseStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดําเนินการ',
        INPROGRESS: 'กําลังดําเนินการ',
        PAUSED: 'หยุดชั่วคราว',
        COMPLETED: 'เสร็จสิ้น'
    };

    const normalizePhaseKey = (s?: string | null) => {
        if (!s) return '';
        // If contains Thai keywords, map directly
        if (/[ก-๙]/.test(s)) {
            if (s.includes('รอ')) return 'PENDING';
            if (s.includes('กําลัง') || s.includes('ดําเนิน')) return 'INPROGRESS';
            if (s.includes('หยุด')) return 'PAUSED';
            if (s.includes('เสร็จ')) return 'COMPLETED';
            return s.toString().toUpperCase().replace(/\s+/g, '_');
        }
        return s.toString().toUpperCase().replace(/\s+/g, '_');
    };

    const getPhaseDisplay = (status?: string | null) => {
        const key = normalizePhaseKey(status);
        return phaseStatusThaiMap[key] || (status || 'รอดําเนินการ');
    };

    const toBackendPhaseKey = (s?: string | null) => {
        const key = normalizePhaseKey(s);
        if (['PENDING', 'INPROGRESS', 'PAUSED', 'COMPLETED'].includes(key)) return key;
        return key || '';
    };

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
                isNew: false
            }));
            setPhases(loadedPhases);
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

    const fetchEmployees = async () => {
        setEmpLoading(true);
        try {
            const res = await getEmployeeList('');
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

    // Filter employees locally instead of re-fetching on every search
    const filteredEmployees = React.useMemo(() => {
        if (!searchTerm) return allEmployees;
        const q = searchTerm.toLowerCase();
        return allEmployees.filter(emp => {
            const fullName = `${emp.employee_first_name} ${emp.employee_last_name}`.toLowerCase();
            return fullName.includes(q) || String(emp.employee_id).includes(q) || (emp.citizen_id && emp.citizen_id.includes(q));
        });
    }, [allEmployees, searchTerm]);

    useEffect(() => {
        if (showModal) {
            if (allEmployees.length === 0) {
                fetchEmployees();
            }
        }
    }, [showModal]);

    useEffect(() => {
        fetchWorkorderData();
    }, [id]);

    // --- 3. Change Tracking Helpers ---
    const markAsEdited = (phaseId: number) => {
        const phase = phases.find(p => p.id === phaseId);
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
            status: 'รอดําเนินการ',
            staffs: [],
            items: [],
            isEditing: true,
            isNew: true
        };
        setPhases([...phases, newPhase]);
    };

    const handleDeletePhase = (phaseId: number) => {
        const phaseToDelete = phases.find(p => p.id === phaseId);

        // ลบออกจาก UI
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

    const hasActivePhase = phases.some(p => {
        if (p.isNew) return false;
        const k = normalizePhaseKey(p.status);
        return k === 'INPROGRESS' || k === 'PAUSED';
    });

    const firstPENDINGPhaseId = !hasActivePhase
        ? (phases.find(p => !p.isNew && normalizePhaseKey(p.status) === 'PENDING')?.id ?? null)
        : null;

    const handlePhaseStatusUpdate = async (phaseId: number, newStatus: string, breakType?: string) => {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;

        setLoading();
        try {
            const payload: any = { work_phase_id: phaseId, phase_status: toBackendPhaseKey(newStatus) };
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
        handlePhaseStatusUpdate(phaseId, 'กําลังดําเนินการ');
    };

    const handlePausePhase = async (phaseId: number) => {
        const result = await Swal.fire({
            title: 'พักงาน',
            text: 'เลือกประเภทการพัก',
            icon: 'info',
            input: 'select',
            inputOptions: { 'LUNCHBREAK': 'พักเที่ยง', 'RESTBREAK': 'พักเบรค', 'OTHER': 'อื่นๆ' },
            inputValue: 'Short Break',
            showCancelButton: true,
            confirmButtonColor: '#fd7e14',
            confirmButtonText: 'พักงาน',
            cancelButtonText: 'ยกเลิก',
        });
        if (result.isConfirmed) handlePhaseStatusUpdate(phaseId, 'หยุดชั่วคราว', result.value);
    };

    const handleResumePhase = (phaseId: number) => {
        handlePhaseStatusUpdate(phaseId, 'กําลังดําเนินการ');
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
        handlePhaseStatusUpdate(phaseId, 'เสร็จสิ้น');
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
            if (createList.length > 0) {
                const createPayload = createList.map(phase => ({
                    work_order_id: currentWorkOrder?.work_order_id,
                    phase_name: phase.title,
                    start_date: new Date().toISOString(),
                    employee_id_list: phase.staffs ? phase.staffs.map(s => s.id) : []
                }));
                promises.push(createWorkPhase(createPayload));
            }
            if (updateList.length > 0) {
                const updatePayload = updateList.map(phase => ({
                    work_phase_id: phase.id,
                    phase_name: phase.title,
                    employee_id_list: phase.staffs ? phase.staffs.map(s => s.id) : []
                }));
                promises.push(updateWorkPhase(updatePayload));
            }
            if (deleteIds.length > 0) {
                const deletePayload = { work_phase_ids: deleteIds };
                promises.push(deleteWorkPhase(deletePayload));
            }
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
                    fetchWorkorderData();
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
                            <span className={`badge ${currentWorkOrder.status === 'พร้อม' ? 'badge-light-success' : 'badge-light-primary'} fw-bold fs-8 px-3 py-1 mt-1 w-fit`}>
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
                    บันทึกการเปลี่ยนแปลง
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
                                        {phase.status == "เสร็จสิ้น" ?
                                            <span className='card-label fw-bold text-gray-900 fs-4 cursor-pointer mb-1' onClick={() => toggleEditPhase(phase.id)}>
                                                {phase.title}
                                            </span> : phase.isEditing ? (
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
                                            <button
                                                className='btn btn-sm btn-primary fw-bold'
                                                onClick={() => handleStartPhase(phase.id)}
                                            >
                                                <i className='bi bi-play-fill me-1'></i> เริ่มทำ
                                            </button>
                                        )}
                                        {/* พักงาน — เฉพาะ phase ที่กำลัง InProgress */}
                                        {!phase.isNew && normalizePhaseKey(phase.status) === 'INPROGRESS' && (
                                            <button
                                                className='btn btn-sm btn-warning fw-bold'
                                                onClick={() => handlePausePhase(phase.id)}
                                            >
                                                <i className='bi bi-pause-fill me-1'></i> พักงาน
                                            </button>
                                        )}
                                        {/* ทำงานต่อ — เฉพาะ phase ที่ PAUSED */}
                                        {!phase.isNew && normalizePhaseKey(phase.status) === 'PAUSED' && (
                                            <button
                                                className='btn btn-sm btn-primary fw-bold'
                                                onClick={() => handleResumePhase(phase.id)}
                                            >
                                                <i className='bi bi-play-fill me-1'></i> ทำงานต่อ
                                            </button>
                                        )}
                                        {/* เสร็จสิ้น — เฉพาะ phase ที่ InProgress หรือ PAUSED */}
                                        {!phase.isNew && (['INPROGRESS', 'PAUSED'].includes(normalizePhaseKey(phase.status))) && (
                                            <button
                                                className='btn btn-sm btn-success fw-bold'
                                                onClick={() => handleCompletePhase(phase.id)}
                                            >
                                                <i className='bi bi-check-lg me-1'></i> เสร็จสิ้น
                                            </button>
                                        )}
                                        {normalizePhaseKey(phase.status) !== 'COMPLETED' && (
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
                                                <div key={item.sales_item_id || idx} className='mb-2'>
                                                    <div className='fs-7 text-gray-700 fw-semibold'>• {item.item_name} ({item.item_num})</div>
                                                    <div className='d-flex flex-wrap gap-1 ms-3 mt-1'>
                                                        <span className='badge badge-light-warning fs-9' title='กำลังผลิต'>ผลิต: {item.producing_qty ?? 0}</span>
                                                        <span className='badge badge-light-primary fs-9' title='ผลิตแล้ว'>เสร็จ: {item.produced_qty ?? 0}</span>
                                                        <span className='badge badge-light-info fs-9' title='รอทดสอบ'>รอเทส: {item.queued_for_test_qty ?? 0}</span>
                                                        <span className='badge badge-light-success fs-9' title='ทดสอบแล้ว'>เทสแล้ว: {item.tested_qty ?? 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className='separator separator-dashed my-4'></div>
                                    <div className='d-flex flex-stack mb-4'>
                                        <span className='text-gray-400 fw-bold fs-8 uppercase'>พนักงานที่ได้รับมอบหมาย</span>
                                        {normalizePhaseKey(phase.status) !== 'COMPLETED' && (
                                            <button onClick={() => { setActivePhaseId(phase.id); setShowModal(true); }} className='btn btn-sm btn-light-primary fw-bold'><i className='bi bi-person-plus'></i> Assign Staff</button>
                                        )}
                                    </div>
                                    {/* Staffs */}
                                    <div className='d-flex flex-wrap gap-2'>
                                        {phase.staffs && phase.staffs.length > 0 ? (
                                            phase.staffs.map(s => (
                                                <div key={s.id} className='badge badge-light-secondary d-flex align-items-center py-2 px-3 border border-gray-200'>
                                                    <span className='text-gray-800 fw-bold me-2'>{s.name}</span>
                                                    {phase.status !== 'เสร็จสิ้น' && <i className='bi bi-x-circle text-danger cursor-pointer' onClick={() => {
                                                        setPhases(phases.map(p => p.id === phase.id ? { ...p, staffs: p.staffs.filter(st => st.id !== s.id) } : p));
                                                        markAsEdited(phase.id); // Mark Change when remove staff
                                                    }}></i>}
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

            {/* Components & Materials */}
            {currentWorkOrder?.item_components && currentWorkOrder.item_components.length > 0 && (
                <div className='card shadow-sm mb-10 mt-10'>
                    <div className='card-header border-0 pt-6 pb-4'>
                        <div className='card-title'>
                            <h3 className='fw-bold text-gray-900 fs-3 mb-0'>
                                <i className='bi bi-boxes me-2 text-primary'></i>
                                ส่วนประกอบ & วัสดุที่ใช้
                            </h3>
                        </div>
                        <div className='card-toolbar'>
                            <span className='badge badge-light-info fw-bold fs-7 px-4 py-2'>{currentWorkOrder.item_components.length} ส่วนประกอบ</span>
                        </div>
                    </div>
                    <div className='card-body pt-2 pb-6'>
                        <div className='row g-6'>
                            {currentWorkOrder.item_components.map((comp, idx) => (
                                <div key={comp.item_component_id} className='col-lg-6'>
                                    <div className='border rounded-3 p-5 h-100' style={{ backgroundColor: '#fafbfc', borderColor: '#e8ecf1' }}>
                                        <div className='d-flex align-items-center gap-3 mb-5 pb-3 border-bottom border-gray-200'>
                                            <div className='symbol symbol-40px'>
                                                <span className='symbol-label bg-light-primary text-primary fw-bold fs-5 rounded-circle'>{idx + 1}</span>
                                            </div>
                                            <div>
                                                <span className='fw-bold text-gray-900 fs-4 d-block'>{comp.component_name}</span>
                                                <span className='text-muted fs-8'>
                                                    {comp.material_usages?.length || 0} วัสดุ
                                                </span>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-light-primary d-flex align-items-center gap-1 ms-auto"
                                                style={{ padding: '6px 12px', borderRadius: '6px' }}
                                                onClick={() => setEditComponentId(comp.item_component_id)}
                                            >
                                                <i className="bi bi-pencil-square" />
                                                แก้ไขรายละเอียด
                                            </button>
                                        </div>
                                        {comp.material_usages && comp.material_usages.length > 0 ? (
                                            <div className='d-flex flex-column gap-3'>
                                                {comp.material_usages.map(usage => (
                                                    <div key={usage.usage_id} className='d-flex align-items-center justify-content-between bg-white rounded-2 px-4 py-3 border border-gray-200' style={{ minHeight: 52 }}>
                                                        <div className='d-flex align-items-center gap-3'>
                                                            <div className='d-flex align-items-center justify-content-center rounded' style={{ width: 36, height: 36, backgroundColor: '#eef2ff' }}>
                                                                <i className='bi bi-box-seam text-primary fs-6'></i>
                                                            </div>
                                                            <div className='d-flex flex-column'>
                                                                <span className='fw-semibold text-gray-800 fs-7'>{usage.material_list?.item_name || '-'}</span>
                                                                <span className='text-muted fs-9'>{usage.material_list?.item_code || '-'}</span>
                                                            </div>
                                                        </div>
                                                        <div className='d-flex align-items-center gap-3'>
                                                            <span className='badge badge-light-primary fs-8 px-3 py-2'>x{usage.quantity_used}</span>
                                                            {usage.material_list?.unit_price != null && (
                                                                <span className='text-gray-600 fs-8 fw-semibold'>฿{usage.material_list.unit_price.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='text-muted fs-8 text-center py-5'>
                                                <i className='bi bi-inbox fs-2x text-gray-300 d-block mb-2'></i>
                                                ไม่มีวัสดุที่ใช้
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                    filteredEmployees && filteredEmployees.length > 0 ? (filteredEmployees.map((emp) => {
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

            {/* Item Component Detail Modal */}
            {currentWorkOrder && (
                <ItemComponentDetailModal
                    show={editComponentId !== null}
                    onClose={() => setEditComponentId(null)}
                    itemComponentId={editComponentId}
                    workOrder={currentWorkOrder as any}
                    onSaved={() => fetchWorkorderData()}
                />
            )}
        </Content>
    );
};

export default WorkorderDetail;