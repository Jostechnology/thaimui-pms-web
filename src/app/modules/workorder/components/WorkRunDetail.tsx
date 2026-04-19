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
    createWorkRunRequiredItems,
    updateWorkRunRequiredItem,
    deleteWorkRunRequiredItem,
    getWorkRunMaterialOfWorkOrder,
    getWorkRunPickRequests,
} from '../../../services/workRunService';
import type { MaterialSourceEntry } from '../../../services/workRunService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import type { WorkRunDetail as WorkRunDetailType, WorkRunRequiredItem } from '../../../type_interface/WorkOrderType';
import type { Machine } from '../../../type_interface/MachineType';
import { formatIntegerInput } from '../../../utils/input_format_utils';
import { validateRequired, validatePositiveNumber } from '../../../utils/validate_utils';
import { PickingRequest, PickingRequestListItem } from '../../../type_interface/PickingRequestType';
import { Material } from '../../../type_interface/MaterialType';

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
    const [materialActuals, setMaterialActuals] = useState<Record<number, string>>({});

    // Required item modal
    const [showRequiredItemModal, setShowRequiredItemModal] = useState(false);
    const [editingRequiredItem, setEditingRequiredItem] = useState<WorkRunRequiredItem | null>(null);
    // Add mode — staged list
    const [stagedItems, setStagedItems] = useState<{ material: Material; quantity: string }[]>([]);
    const [currentPicker, setCurrentPicker] = useState({ material_list_id: 0, quantity: '' });
    const [pickerErrors, setPickerErrors] = useState<Record<string, string>>({});
    // Edit mode
    const [editQty, setEditQty] = useState('');
    const [editQtyError, setEditQtyError] = useState('');
    const [materialList, setMaterialList] = useState<Material[]>([]);
    const [materialLoading, setMaterialLoading] = useState(false);

    // Start modal
    const [showStartModal, setShowStartModal] = useState(false);
    const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
    const [pickRequests, setPickRequests] = useState<PickingRequest[]>([]);
    const [pickRequestsLoading, setPickRequestsLoading] = useState(false);
    // manual allocations: { [required_item_id]: { [picking_request_item_id]: qty_string } }
    const [manualAllocations, setManualAllocations] = useState<Record<number, Record<number, string>>>({});

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
            getEmployeeList(1,10,'').then(res => {
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

    // Fetch material list when required item modal opens in add mode
    useEffect(() => {
        if (showRequiredItemModal && !editingRequiredItem && materialList.length === 0) {
            setMaterialLoading(true);
            getWorkRunMaterialOfWorkOrder(Number(workRunId)).then(res => {
                setMaterialList(res?.success && Array.isArray(res.data) ? res.data : []);
            }).catch(() => setMaterialList([])).finally(() => setMaterialLoading(false));
        }
    }, [showRequiredItemModal]);

    // Fetch pick requests when start modal opens
    useEffect(() => {
        if (showStartModal) {
            setPickRequestsLoading(true);
            getWorkRunPickRequests(Number(workRunId)).then(res => {
                setPickRequests(res?.success && Array.isArray(res.data) ? res.data : []);
            }).catch(() => setPickRequests([])).finally(() => setPickRequestsLoading(false));
        }
    }, [showStartModal]);

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
    const pastAssignments = workRun?.assignments?.filter(a => a.to_time !== null) ?? [];
    const activeMachines = workRun?.machines?.filter(m => m.to_time === null) ?? [];
    const pastMachines = workRun?.machines?.filter(m => m.to_time !== null) ?? [];

    const status = normalizeKey(workRun?.status);
    const isCompleted = status === 'COMPLETED';
    const isActive = status === 'INPROGRESS' || status === 'PAUSED';

    // --- Lifecycle ---
    const openStartModal = () => {
        setAllocationMode('auto');
        setManualAllocations({});
        setPickRequests([]);
        setShowStartModal(true);
    };

    const closeStartModal = () => {
        setShowStartModal(false);
        setAllocationMode('auto');
        setManualAllocations({});
    };

    const handleManualQtyChange = (requiredItemId: number, pickItemId: number, value: string) => {
        const formatted = formatIntegerInput(value);
        setManualAllocations(prev => ({
            ...prev,
            [requiredItemId]: { ...(prev[requiredItemId] ?? {}), [pickItemId]: formatted },
        }));
    };

    // Flatten all pick request items matching a required item by item_code
    const getPickItemsForRequired = (requiredItem: { item_code: string }) => {
        const result: (PickingRequestListItem & { picking_request_code: string })[] = [];
        pickRequests.forEach(pr => {
            pr.items.forEach(item => {
                if (item.item_code === requiredItem.item_code && item.qty_available > 0) {
                    result.push({ ...item, picking_request_code: pr.picking_request_code ?? "" });
                }
            });
        });
        return result;
    };

    const handleStart = async () => {
        const payload: { allocation_mode: 'auto' | 'manual'; material_sources?: MaterialSourceEntry[] } = {
            allocation_mode: allocationMode,
        };

        if (allocationMode === 'manual') {
            const materialSources: MaterialSourceEntry[] = [];
            for (const reqItem of (workRun?.required_items ?? [])) {
                const allocMap = manualAllocations[reqItem.id] ?? {};
                const sources = Object.entries(allocMap)
                    .filter(([, v]) => v !== '' && Number(v) > 0)
                    .map(([pickItemId, qty]) => ({ picking_request_item_id: Number(pickItemId), qty: Number(qty) }));
                if (sources.length > 0) {
                    materialSources.push({ required_item_id: reqItem.id, sources });
                }
            }
            if (materialSources.length > 0) {
                payload.material_sources = materialSources;
            }
        }

        setLoading();
        try {
            const result = await startWorkRun(Number(workRunId), payload);
            if (result?.success) {
                closeStartModal();
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

    // --- Required Items ---
    const openAddRequiredItem = () => {
        setEditingRequiredItem(null);
        setStagedItems([]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
        setShowRequiredItemModal(true);
    };

    const openEditRequiredItem = (item: WorkRunRequiredItem) => {
        setEditingRequiredItem(item);
        setEditQty(String(item.quantity));
        setEditQtyError('');
        setShowRequiredItemModal(true);
    };

    const closeRequiredItemModal = () => {
        setShowRequiredItemModal(false);
        setEditingRequiredItem(null);
        setStagedItems([]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
        setEditQtyError('');
    };

    // Add current picker row to staged list
    const handleAddToStaged = () => {
        const newErrors: Record<string, string> = {};
        if (currentPicker.material_list_id === 0) newErrors.material_list_id = 'กรุณาเลือกวัตถุดิบ';
        const qtyErr = validateRequired(currentPicker.quantity, 'จำนวน') ?? validatePositiveNumber(currentPicker.quantity, 'จำนวน');
        if (qtyErr) newErrors.quantity = qtyErr;
        if (Object.keys(newErrors).length > 0) { setPickerErrors(newErrors); return; }

        const selected = materialList.find(m => m.material_list_id === currentPicker.material_list_id)!;
        const alreadyStaged = stagedItems.some(s => s.material.material_list_id === selected.material_list_id);
        if (alreadyStaged) { setPickerErrors({ material_list_id: 'วัตถุดิบนี้อยู่ในรายการแล้ว' }); return; }

        setStagedItems(prev => [...prev, { material: selected, quantity: currentPicker.quantity }]);
        setCurrentPicker({ material_list_id: 0, quantity: '' });
        setPickerErrors({});
    };

    const handleSaveRequiredItem = async () => {
        if (editingRequiredItem) {
            const qtyErr = validateRequired(editQty, 'จำนวน') ?? validatePositiveNumber(editQty, 'จำนวน');
            if (qtyErr) { setEditQtyError(qtyErr); return; }
            setLoading();
            try {
                const res = await updateWorkRunRequiredItem(editingRequiredItem.id, { quantity: Number(editQty) });
                if (res?.success) { closeRequiredItemModal(); fetchWorkRun(); }
                else Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
            finally { setUnLoading(); }
        } else {
            if (stagedItems.length === 0) return;
            setLoading();
            try {
                const payload = stagedItems.map(s => ({
                    item_code: s.material.item_code,
                    item_name: s.material.item_name,
                    quantity: Number(s.quantity),
                    unit: s.material.unit_name,
                    material_list_id: s.material.material_list_id,
                }));
                const res = await createWorkRunRequiredItems(Number(workRunId), payload);
                if (res?.success) { closeRequiredItemModal(); fetchWorkRun(); }
                else Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
            finally { setUnLoading(); }
        }
    };

    const handleDeleteRequiredItem = async (item: WorkRunRequiredItem) => {
        const confirm = await Swal.fire({
            title: `ลบ "${item.item_name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#d33',
        });
        if (!confirm.isConfirmed) return;
        setLoading();
        try {
            const res = await deleteWorkRunRequiredItem(item.id);
            if (res?.success) {
                fetchWorkRun();
            } else {
                Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        } catch { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error'); }
        finally { setUnLoading(); }
    };

    // --- Complete Work Run ---
    const handleCompleteWorkRun = async () => {
        setLoading();
        try {
            const material_actuals = Object.entries(materialActuals)
                .filter(([, v]) => v !== '')
                .map(([id, qty]) => ({ work_run_required_item_id: Number(id), qty_used: Number(qty) }));
            const result = await completeWorkRun(Number(workRunId), {
                completion_remark: completeForm.completion_remark || undefined,
                defect_qty: completeForm.defect_qty,
                usable_qty: completeForm.usable_qty,
                ...(material_actuals.length > 0 ? { material_actuals } : {}),
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
                    {status === 'PENDING' && (
                        <button className='btn btn-sm btn-primary fw-bold px-6' onClick={openStartModal}>
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
                                const actuals: Record<number, string> = {};
                                (workRun?.required_items ?? []).forEach(item => { actuals[item.id] = ''; });
                                setMaterialActuals(actuals);
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
                    {pastAssignments.length > 0 && (
                        <div className='mt-6'>
                            <span className='text-muted fs-8 fw-bold d-block mb-3'>ประวัติการมอบหมาย</span>
                            <div className='table-responsive'>
                                <table className='table table-row-dashed align-middle gs-0 gy-2'>
                                    <thead>
                                        <tr className='fw-bold text-muted text-uppercase fs-8'>
                                            <th>พนักงาน</th>
                                            <th>เวลาเริ่ม</th>
                                            <th>เวลาสิ้นสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastAssignments.map(a => (
                                            <tr key={a.work_run_assignment_id}>
                                                <td>
                                                    <span className='fw-semibold text-gray-700 fs-7'>
                                                        {a.employee?.employee_first_name} {a.employee?.employee_last_name}
                                                    </span>
                                                    <span className='text-muted fs-8 ms-2'>ID: {a.employee_id}</span>
                                                </td>
                                                <td><span className='text-gray-600 fs-8'>{a.from_time ? new Date(a.from_time).toLocaleString('th-TH') : '-'}</span></td>
                                                <td><span className='text-gray-600 fs-8'>{a.to_time ? new Date(a.to_time).toLocaleString('th-TH') : '-'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                    {pastMachines.length > 0 && (
                        <div className='mt-6'>
                            <span className='text-muted fs-8 fw-bold d-block mb-3'>ประวัติการใช้งานเครื่องจักร</span>
                            <div className='table-responsive'>
                                <table className='table table-row-dashed align-middle gs-0 gy-2'>
                                    <thead>
                                        <tr className='fw-bold text-muted text-uppercase fs-8'>
                                            <th>เครื่องจักร</th>
                                            <th>เวลาเริ่ม</th>
                                            <th>เวลาสิ้นสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastMachines.map(m => (
                                            <tr key={m.work_run_machine_id}>
                                                <td>
                                                    <span className='fw-semibold text-gray-700 fs-7'>
                                                        {m.machine?.machine_name ?? `Machine #${m.machine_id}`}
                                                    </span>
                                                    <span className='text-muted fs-8 ms-2'>{m.machine?.machine_code}</span>
                                                </td>
                                                <td><span className='text-gray-600 fs-8'>{m.from_time ? new Date(m.from_time).toLocaleString('th-TH') : '-'}</span></td>
                                                <td><span className='text-gray-600 fs-8'>{m.to_time ? new Date(m.to_time).toLocaleString('th-TH') : '-'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Required Items */}
            <div className='card shadow-sm mb-8'>
                <div className='card-header border-0 pt-5'>
                    <div className='card-title'>
                        <span className='card-label fw-bold text-gray-900 fs-5'>
                            <i className='bi bi-box-seam me-2 text-primary'></i>รายการวัตถุดิบที่ต้องใช้
                        </span>
                    </div>
                    {!isCompleted && (
                        <div className='card-toolbar'>
                            <button className='btn btn-sm btn-light-primary fw-bold' onClick={openAddRequiredItem}>
                                <i className='bi bi-plus-lg me-1'></i> เพิ่มรายการ
                            </button>
                        </div>
                    )}
                </div>
                <div className='card-body pt-3'>
                    {(!workRun?.required_items || workRun.required_items.length === 0) ? (
                        <span className='text-muted fs-7'>ยังไม่มีรายการวัตถุดิบ</span>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table table-row-dashed align-middle gs-0 gy-3'>
                                <thead>
                                    <tr className='fw-bold text-muted text-uppercase fs-8'>
                                        <th>รหัสสินค้า</th>
                                        <th>ชื่อวัตถุดิบ</th>
                                        <th>จำนวนที่ต้องใช้</th>
                                        <th>จำนวนที่ใช้จริง</th>
                                        <th>หน่วย</th>
                                        {!isCompleted && <th className='text-end'>จัดการ</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {workRun.required_items.map(item => (
                                        <tr key={item.id}>
                                            <td><span className='text-muted fw-semibold fs-7'>{item.item_code}</span></td>
                                            <td><span className='fw-bold text-gray-800 fs-7'>{item.item_name} (SO-Line : {item.material_list.order_line_num})</span></td>

                                            <td><span className='fw-semibold text-gray-700 fs-7'>{item.quantity}</span></td>
                                            <td>
                                                {item.qty_consumed_actual != null
                                                    ? <span className='fw-semibold text-gray-700 fs-7'>{item.qty_consumed_actual}</span>
                                                    : <span className='text-muted fs-7'>-</span>
                                                }
                                            </td>
                                            <td><span className='text-muted fs-7'>{item.unit}</span></td>
                                            {!isCompleted && (
                                                <td className='text-end'>
                                                    <button className='btn btn-sm btn-icon btn-light-primary me-1' onClick={() => openEditRequiredItem(item)}>
                                                        <i className='bi bi-pencil fs-6'></i>
                                                    </button>
                                                    <button className='btn btn-sm btn-icon btn-light-danger' onClick={() => handleDeleteRequiredItem(item)}>
                                                        <i className='bi bi-trash fs-6'></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Required Item Add/Edit Modal */}
            <Modal show={showRequiredItemModal} onHide={closeRequiredItemModal} centered size={editingRequiredItem ? undefined : 'lg'}>
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>{editingRequiredItem ? 'แก้ไขรายการวัตถุดิบ' : 'เพิ่มรายการวัตถุดิบ'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editingRequiredItem ? (
                        <>
                            <div className='mb-4'>
                                <label className='form-label fw-bold'>วัตถุดิบ</label>
                                <div className='form-control form-control-solid bg-light text-gray-700'>
                                    {editingRequiredItem.item_code} — {editingRequiredItem.item_name}
                                    <span className='text-muted ms-2 fs-8'>({editingRequiredItem.unit})</span>
                                </div>
                            </div>
                            <div className='mb-4'>
                                <label className='form-label fw-bold required'>จำนวน</label>
                                <input
                                    type='text'
                                    className={`form-control form-control-solid ${editQtyError ? 'is-invalid' : ''}`}
                                    value={editQty}
                                    onChange={e => {
                                        setEditQty(formatIntegerInput(e.target.value));
                                        if (editQtyError) setEditQtyError('');
                                    }}
                                />
                                {editQtyError && <div className='invalid-feedback'>{editQtyError}</div>}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Picker row */}
                            <div className='row g-3 align-items-end mb-4'>
                                <div className='col'>
                                    <label className='form-label fw-bold required'>วัตถุดิบ</label>
                                    {materialLoading ? (
                                        <div className='form-control form-control-solid text-muted'>กำลังโหลด...</div>
                                    ) : (
                                        <select
                                            className={`form-select form-select-solid ${pickerErrors.material_list_id ? 'is-invalid' : ''}`}
                                            value={currentPicker.material_list_id}
                                            onChange={e => {
                                                setCurrentPicker(prev => ({ ...prev, material_list_id: Number(e.target.value) }));
                                                if (pickerErrors.material_list_id) setPickerErrors(prev => { const n = { ...prev }; delete n.material_list_id; return n; });
                                            }}
                                        >
                                            <option value={0}>-- เลือกวัตถุดิบ --</option>
                                            {materialList.map(m => (
                                                <option key={m.material_list_id} value={m.material_list_id}>
                                                    {m.item_name} ({m.unit_name})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {pickerErrors.material_list_id && <div className='invalid-feedback'>{pickerErrors.material_list_id}</div>}
                                </div>
                                <div className='col-auto' style={{ minWidth: 120 }}>
                                    <label className='form-label fw-bold required'>จำนวน</label>
                                    <input
                                        type='text'
                                        className={`form-control form-control-solid ${pickerErrors.quantity ? 'is-invalid' : ''}`}
                                        placeholder='0'
                                        value={currentPicker.quantity}
                                        onChange={e => {
                                            setCurrentPicker(prev => ({ ...prev, quantity: formatIntegerInput(e.target.value) }));
                                            if (pickerErrors.quantity) setPickerErrors(prev => { const n = { ...prev }; delete n.quantity; return n; });
                                        }}
                                    />
                                    {pickerErrors.quantity && <div className='invalid-feedback'>{pickerErrors.quantity}</div>}
                                </div>
                                <div className='col-auto'>
                                    <button className='btn btn-light-primary fw-bold' onClick={handleAddToStaged}>
                                        <i className='bi bi-plus-lg me-1'></i> เพิ่ม
                                    </button>
                                </div>
                            </div>

                            {/* Staged list */}
                            {stagedItems.length > 0 ? (
                                <div className='table-responsive'>
                                    <table className='table table-row-dashed align-middle gs-0 gy-2'>
                                        <thead>
                                            <tr className='fw-bold text-muted text-uppercase fs-8'>
                                                <th>รหัสสินค้า</th>
                                                <th>ชื่อวัตถุดิบ</th>
                                                <th>จำนวน</th>
                                                <th>หน่วย</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stagedItems.map((s, idx) => (
                                                <tr key={s.material.material_list_id}>
                                                    <td><span className='text-muted fw-semibold fs-7'>{s.material.item_code}</span></td>
                                                    <td><span className='fw-bold text-gray-800 fs-7'>{s.material.item_name}</span></td>
                                                    <td><span className='fw-semibold text-gray-700 fs-7'>{s.quantity}</span></td>
                                                    <td><span className='text-muted fs-7'>{s.material.unit_name}</span></td>
                                                    <td className='text-end'>
                                                        <i
                                                            className='bi bi-x-circle text-danger cursor-pointer fs-5'
                                                            onClick={() => setStagedItems(prev => prev.filter((_, i) => i !== idx))}
                                                        ></i>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className='text-center text-muted fs-7 py-6 border border-dashed border-gray-300 rounded'>
                                    ยังไม่มีรายการ — เลือกวัตถุดิบและกด "เพิ่ม"
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={closeRequiredItemModal}>ยกเลิก</button>
                    <button
                        className='btn btn-primary fw-bold'
                        onClick={handleSaveRequiredItem}
                        disabled={!editingRequiredItem && stagedItems.length === 0}
                    >
                        <i className='bi bi-check2 me-1'></i>
                        {editingRequiredItem ? 'บันทึก' : `บันทึก (${stagedItems.length} รายการ)`}
                    </button>
                </Modal.Footer>
            </Modal>

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

            {/* Start Work Run Modal */}
            <Modal show={showStartModal} onHide={closeStartModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className='fw-bold'>เริ่ม Work Run</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Allocation mode toggle */}
                    <div className='mb-6'>
                        <label className='form-label fw-bold fs-6'>รูปแบบการจัดสรรวัตถุดิบ</label>
                        <div className='d-flex gap-3'>
                            <label className={`d-flex align-items-center border rounded px-4 py-3 cursor-pointer flex-grow-1 ${allocationMode === 'auto' ? 'border-primary bg-light-primary' : 'border-gray-300'}`}>
                                <input
                                    type='radio'
                                    className='form-check-input me-3'
                                    name='allocation_mode'
                                    checked={allocationMode === 'auto'}
                                    onChange={() => setAllocationMode('auto')}
                                />
                                <div>
                                    <span className='fw-bold text-gray-800 d-block'>อัตโนมัติ</span>
                                    <span className='text-muted fs-8'>ระบบจัดสรรวัตถุดิบให้อัตโนมัติ</span>
                                </div>
                            </label>
                            <label className={`d-flex align-items-center border rounded px-4 py-3 cursor-pointer flex-grow-1 ${allocationMode === 'manual' ? 'border-primary bg-light-primary' : 'border-gray-300'}`}>
                                <input
                                    type='radio'
                                    className='form-check-input me-3'
                                    name='allocation_mode'
                                    checked={allocationMode === 'manual'}
                                    onChange={() => setAllocationMode('manual')}
                                />
                                <div>
                                    <span className='fw-bold text-gray-800 d-block'>เลือกเอง</span>
                                    <span className='text-muted fs-8'>เลือกรายการวัตถุดิบจาก Picking Request</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Manual allocation UI */}
                    {allocationMode === 'manual' && (
                        <div>
                            {pickRequestsLoading ? (
                                <div className='text-center text-muted py-10'>กำลังโหลดรายการ Picking...</div>
                            ) : (workRun?.required_items ?? []).length === 0 ? (
                                <div className='text-center text-muted py-6 border border-dashed border-gray-300 rounded'>
                                    ยังไม่มีรายการวัตถุดิบที่ต้องใช้
                                </div>
                            ) : (
                                (workRun?.required_items ?? []).map(reqItem => {
                                    const availableItems = getPickItemsForRequired(reqItem);
                                    const allocMap = manualAllocations[reqItem.id] ?? {};
                                    const totalAllocated = Object.values(allocMap).reduce((sum, v) => sum + (Number(v) || 0), 0);

                                    return (
                                        <div key={reqItem.id} className='mb-6 border border-gray-200 rounded p-4'>
                                            <div className='d-flex justify-content-between align-items-center mb-3'>
                                                <div>
                                                    <span className='fw-bold text-gray-800 fs-6'>{reqItem.item_name}</span>
                                                    <span className='text-muted fs-8 ms-2'>({reqItem.item_code})</span>
                                                </div>
                                                <div className='text-end'>
                                                    <span className='text-muted fs-8'>ต้องใช้: </span>
                                                    <span className='fw-bold text-gray-700'>{reqItem.quantity}</span>
                                                    <span className='text-muted fs-8'> {reqItem.unit}</span>
                                                    <span className='mx-2 text-muted'>|</span>
                                                    <span className='text-muted fs-8'>จัดสรรแล้ว: </span>
                                                    <span className={`fw-bold ${totalAllocated >= reqItem.quantity ? 'text-success' : 'text-warning'}`}>
                                                        {totalAllocated}
                                                    </span>
                                                </div>
                                            </div>

                                            {availableItems.length === 0 ? (
                                                <div className='text-muted fs-7 py-3 text-center bg-light rounded'>
                                                    ไม่พบรายการ Picking ที่มีวัตถุดิบนี้
                                                </div>
                                            ) : (
                                                <div className='table-responsive'>
                                                    <table className='table table-row-dashed align-middle gs-0 gy-2 mb-0'>
                                                        <thead>
                                                            <tr className='fw-bold text-muted text-uppercase fs-8'>
                                                                <th>Picking Request</th>
                                                                <th>รหัสสินค้า</th>
                                                                <th className='text-center'>คงเหลือ</th>
                                                                <th className='text-center' style={{ width: 140 }}>จำนวนที่จัดสรร</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {availableItems.map(pi => (
                                                                <tr key={pi.picking_request_item_id}>
                                                                    <td>
                                                                        <span className='fw-semibold text-gray-700 fs-7'>{pi.picking_request_code}</span>
                                                                    </td>
                                                                    <td>
                                                                        <span className='text-muted fs-7'>{pi.item_code}</span>
                                                                    </td>
                                                                    <td className='text-center'>
                                                                        <span className='fw-semibold text-gray-700 fs-7'>{pi.qty_available} {pi.unit}</span>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type='text'
                                                                            className='form-control form-control-sm text-center'
                                                                            placeholder='0'
                                                                            value={allocMap[pi.picking_request_item_id] ?? ''}
                                                                            onChange={e => handleManualQtyChange(reqItem.id, pi.picking_request_item_id, e.target.value)}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={closeStartModal}>ยกเลิก</button>
                    <button className='btn btn-primary fw-bold' onClick={handleStart}>
                        <i className='bi bi-play-fill me-1'></i> เริ่มงาน
                    </button>
                </Modal.Footer>
            </Modal>

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
                    {(workRun?.required_items ?? []).length > 0 && (
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>
                                <i className='bi bi-box-seam me-2 text-primary'></i>จำนวนวัตถุดิบที่ใช้จริง
                            </label>
                            <div className='table-responsive'>
                                <table className='table table-bordered align-middle fs-7 mb-0'>
                                    <thead className='table-light'>
                                        <tr className='fw-bold text-gray-700'>
                                            <th>รหัสสินค้า</th>
                                            <th>ชื่อวัตถุดิบ</th>
                                            <th className='w-80px text-center'>หน่วย</th>
                                            <th className='w-110px text-center'>ต้องใช้</th>
                                            <th className='w-130px'>ใช้จริง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(workRun?.required_items ?? []).map(item => (
                                            <tr key={item.id}>
                                                <td className='text-muted fw-semibold'>{item.item_code}</td>
                                                <td className='fw-bold text-gray-800'>{item.item_name}</td>
                                                <td className='text-center text-muted'>{item.unit}</td>
                                                <td className='text-center fw-semibold text-gray-700'>{item.quantity}</td>
                                                <td>
                                                    <input
                                                        type='text'
                                                        className='form-control form-control-sm text-center'
                                                        placeholder='0'
                                                        value={materialActuals[item.id] ?? ''}
                                                        onChange={e => {
                                                            const s = formatIntegerInput(e.target.value);
                                                            setMaterialActuals(prev => ({ ...prev, [item.id]: s }));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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
