import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getEmployeeList } from '../../../services/employee';
import { getWorkOrderList } from '../../../services/workorder';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';

// --- Interfaces ---
interface Staff {
    id: number;
    name: string;
    role: string;
    status: string;
}

interface Phase {
    id: number;
    title: string;
    status: 'Completed' | 'Active' | 'Pending';
    staffs: Staff[];
    isEditing?: boolean;
}

interface WorkorderData {
    work_order_id: number;
    doc_num: string;
    status: string;
    created_date: string;
    current_phase: {
        work_phase_id: number;
        phase_name: string;
        phase_status: string;
        start_date: string;
        end_date: string | null;
        employee_list: any[];
        sales_item_list: any[];
    } | null;
}

const WorkorderDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    const [empLoading, setEmpLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkorderData | null>(null);
    
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();
    const [phases, setPhases] = useState<Phase[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [activePhaseId, setActivePhaseId] = useState<number | null>(null);

    // 1. Logic สำหรับยัดข้อมูลจาก API ลงในหน้า Timeline อัตโนมัติ
    useEffect(() => {
        if (currentWorkOrder?.current_phase) {
            const cp = currentWorkOrder.current_phase;
            const initialPhase: Phase = {
                id: cp.work_phase_id,
                title: cp.phase_name,
                status: cp.phase_status as any,
                staffs: cp.employee_list.map(emp => ({
                    id: emp.employee_id,
                    name: `${emp.employee_first_name} ${emp.employee_last_name}`,
                    role: 'พนักงาน',
                    status: emp.status
                })),
                isEditing: false
            };
            setPhases([initialPhase]);
        } else {
            setPhases([]);
        }
    }, [currentWorkOrder]);

    // 2. Fetch ข้อมูลหลัก (ดึงตาม DocNum)
    const fetchWorkorderData = async () => {
        setLoading();
        try {
            const result = await getWorkOrderList(1, 1, id || ""); 
            if (result && result.success && result.data.items.length > 0) {
                setCurrentWorkOrder(result.data.items[0]);
            }
        } catch (error) {
            console.error(error);
            alertMessage("ไม่สามารถดึงข้อมูลรายละเอียดได้");
        } finally {
            setUnLoading();
        }
    };

    // 3. Fetch พนักงานสำหรับ Modal
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
            const delayDebounceFn = setTimeout(() => {
                fetchEmployees(searchTerm);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchTerm, showModal]);

    useEffect(() => {
        fetchWorkorderData();
    }, [id]);

    // --- Phase Management Logic ---
    const handleAddPhase = () => {
        const newId = phases.length > 0 ? Math.max(...phases.map(p => p.id)) + 1 : 1;
        const newPhase: Phase = {
            id: newId,
            title: `ขั้นตอนใหม่ ${newId}`,
            status: 'Pending',
            staffs: [],
            isEditing: true
        };
        setPhases([...phases, newPhase]);
    };

    const handleDeletePhase = (phaseId: number) => {
        setPhases(phases.filter(p => p.id !== phaseId));
    };

    const toggleEditPhase = (id: number) => {
        setPhases(phases.map(p => p.id === id ? { ...p, isEditing: !p.isEditing } : p));
    };

    const updatePhaseTitle = (id: number, newTitle: string) => {
        setPhases(phases.map(p => p.id === id ? { ...p, title: newTitle } : p));
    };

    const assignStaff = (emp: any) => {
        if (activePhaseId) {
            setPhases(phases.map(p => {
                if (p.id === activePhaseId) {
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
                }
                return p;
            }));
            setShowModal(false);
            setSearchTerm("");
        }
    };

    return (
        <Content>
            {/* Header Area */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>
                            {currentWorkOrder?.doc_num || id || 'LOADING...'}
                        </h1>
                        {currentWorkOrder && (
                             <span className={`badge ${currentWorkOrder.status === 'Ready' ? 'badge-light-success' : 'badge-light-primary'} fw-bold fs-8 px-3 py-1 mt-1 w-fit`}>
                                {currentWorkOrder.status}
                             </span>
                        )}
                    </div>
                </div>
                <button className='btn btn-sm btn-primary fw-bold px-6' onClick={() => Swal.fire('สำเร็จ', 'ข้อมูลถูกจำลองการบันทึก', 'success')}>
                    Save Changes
                </button>
            </div>

            {/* Timeline Content */}
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
                                <div className='symbol-label bg-primary text-white fw-bold shadow-sm'>{index + 1}</div>
                            </div>

                            <div className='card shadow-sm w-100'>
                                <div className='card-header border-0 pt-5'>
                                    <div className='card-title'>
                                        {phase.isEditing ? (
                                            <input
                                                className='form-control form-control-sm fw-bold fs-4 text-gray-900 border-primary'
                                                value={phase.title}
                                                autoFocus
                                                onBlur={() => toggleEditPhase(phase.id)}
                                                onChange={(e) => updatePhaseTitle(phase.id, e.target.value)}
                                            />
                                        ) : (
                                            <span className='card-label fw-bold text-gray-900 fs-4 cursor-pointer' onClick={() => toggleEditPhase(phase.id)}>
                                                {phase.title} <i className='bi bi-pencil fs-7 ms-2 text-gray-400'></i>
                                            </span>
                                        )}
                                    </div>
                                    <div className='card-toolbar'>
                                        <button className='btn btn-icon btn-sm btn-light-danger' onClick={() => handleDeletePhase(phase.id)}><i className='bi bi-trash'></i></button>
                                    </div>
                                </div>

                                <div className='card-body pt-0'>
                                    <div className='separator separator-dashed my-4'></div>
                                    <div className='d-flex flex-stack mb-4'>
                                        <span className='text-gray-400 fw-bold fs-8 uppercase'>พนักงานที่ได้รับมอบหมาย</span>
                                        <button onClick={() => { setActivePhaseId(phase.id); setShowModal(true); }} className='btn btn-sm btn-light-primary fw-bold'>
                                            <i className='bi bi-person-plus'></i> Assign Staff
                                        </button>
                                    </div>

                                    <div className='d-flex flex-wrap gap-2'>
                                        {phase.staffs.map(s => (
                                            <div key={s.id} className='badge badge-light-secondary d-flex align-items-center py-2 px-3 border border-gray-200'>
                                                <span className='text-gray-800 fw-bold me-2'>{s.name}</span>
                                                <i className='bi bi-x-circle text-danger cursor-pointer' onClick={() => {
                                                    setPhases(phases.map(p => p.id === phase.id ? { ...p, staffs: p.staffs.filter(st => st.id !== s.id) } : p))
                                                }}></i>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className='d-flex align-items-center position-relative z-index-1 ms-10 ps-2'>
                        <button onClick={handleAddPhase} className='btn btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary w-100 py-4 fw-bold'>
                            <i className='bi bi-plus-lg me-2 fs-3'></i> เพิ่มขั้นตอนถัดไป
                        </button>
                    </div>
                </div>
            )}

            {/* Modal เลือกพนักงาน */}
            <Modal show={showModal} onHide={() => { setShowModal(false); setSearchTerm(""); }} centered size="lg">
                <Modal.Header closeButton><Modal.Title className='fw-bold'>มอบหมายงานพนักงาน</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='d-flex align-items-center position-relative my-5'>
                        <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-5'><span className='path1'></span><span className='path2'></span></i>
                        <input
                            type='text'
                            className='form-control form-control-solid w-100 ps-13'
                            placeholder='ค้นหาด้วยชื่อพนักงาน...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className='table-responsive' style={{ maxHeight: '400px' }}>
                        <table className='table table-row-dashed align-middle gs-0 gy-4'>
                            <thead>
                                <tr className='fw-bold text-muted text-uppercase fs-7'>
                                    <th>พนักงาน</th>
                                    <th>สถานะ</th>
                                    <th className='text-end'>เลือก</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empLoading ? (
                                    <tr><td colSpan={3} className='text-center py-10'>กำลังดึงข้อมูล...</td></tr>
                                ) : allEmployees.length > 0 ? (
                                    allEmployees.map((emp) => {
                                        const isAlreadyAssigned = phases
                                            .find(p => p.id === activePhaseId)
                                            ?.staffs.some(s => s.id === emp.employee_id);

                                        return (
                                            <tr key={emp.employee_id}>
                                                <td>
                                                    <div className='d-flex align-items-center'>
                                                        <div className='symbol symbol-45px me-5'>
                                                            <span className='symbol-label bg-light-primary text-primary fw-bold'>{emp.employee_first_name?.charAt(0)}</span>
                                                        </div>
                                                        <div className='d-flex flex-column'>
                                                            <span className='text-gray-900 fw-bold fs-6'>{emp.employee_first_name} {emp.employee_last_name}</span>
                                                            <span className='text-muted fw-semibold fs-7'>ID: {emp.employee_id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${emp.status === 'ว่างงาน' ? 'badge-light-success' : 'badge-light-danger'} fw-bold`}>
                                                        {emp.status}
                                                    </span>
                                                </td>
                                                <td className='text-end'>
                                                    {isAlreadyAssigned ? (
                                                        <button className='btn btn-sm btn-light-danger fw-bold' disabled style={{ cursor: 'not-allowed' }}>เลือกไปแล้ว</button>
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
        </Content>
    );
};

export default WorkorderDetail;