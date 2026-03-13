import React, { useState, useEffect } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from 'react-bootstrap';
import Swal from "sweetalert2";
import { getWorkOrderById } from '../../../services/workorder';
import { getWorkRunsByWorkOrder, createWorkRun } from '../../../services/workRunService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import ItemComponentDetailModal from './ItemComponentDetailModal';
import type { WorkOrder, WorkRun } from '../../../type_interface/WorkOrderType';
import { WorkOrderStatusEnum } from '../../../type_interface/WorkOrderType';

const WorkorderDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [workRuns, setWorkRuns] = useState<WorkRun[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [editComponentId, setEditComponentId] = useState<number | null>(null);
    const [showCreateRunModal, setShowCreateRunModal] = useState(false);
    const [createRunQty, setCreateRunQty] = useState<number>(1);
    const [creating, setCreating] = useState(false);

    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const workRunStatusThaiMap: Record<string, string> = {
        PENDING: 'รอดำเนินการ',
        INPROGRESS: 'กำลังดำเนินการ',
        COMPLETED: 'เสร็จสิ้น',
        CANCELLED: 'ยกเลิก',
    };

    const workOrderStatusThaiMap: Record<string, string> = {
        READY: 'พร้อม',
        INPROGRESS: 'กำลังดำเนินงาน',
        WAIT_TEST: 'รอทดสอบ',
        TESTING: 'กำลังทดสอบ',
        COMPLETED: 'เสร็จสิ้น',
    };

    const getWorkRunStatusBadge = (status: string) => {
        const k = status?.toUpperCase();
        if (k === 'COMPLETED') return 'badge-light-success';
        if (k === 'INPROGRESS') return 'badge-light-warning';
        if (k === 'CANCELLED') return 'badge-light-danger';
        return 'badge-light-secondary';
    };

    const getWorkOrderStatusBadge = (status: string) => {
        if (status === WorkOrderStatusEnum.COMPLETED) return 'badge-light-success';
        if (status === WorkOrderStatusEnum.INPROGRESS) return 'badge-light-warning';
        if (status === WorkOrderStatusEnum.WAIT_TEST || status === WorkOrderStatusEnum.TESTING) return 'badge-light-info';
        if (status === WorkOrderStatusEnum.READY) return 'badge-light-primary';
        return 'badge-light-secondary';
    };

    const fetchWorkOrder = async () => {
        setLoading();
        setDataLoading(true);
        try {
            const result = await getWorkOrderById(Number(id));
            if (result && result.success && result.data) {
                setWorkOrder(result.data);
                setWorkRuns(result.data.work_runs || []);
            }
        } catch (error) {
            console.error(error);
            alertMessage("ไม่สามารถดึงข้อมูลใบสั่งผลิตได้");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkOrder();
    }, [id]);

    const handleCreateWorkRun = async () => {
        if (!workOrder) return;
        setCreating(true);
        try {
            const result = await createWorkRun(workOrder.work_order_id, { quantity: createRunQty });
            if (result && result.success) {
                setShowCreateRunModal(false);
                setCreateRunQty(1);
                Swal.fire({ title: 'สร้าง Work Run สำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false })
                    .then(() => fetchWorkOrder());
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result?.message || 'ไม่สามารถสร้าง Work Run ได้', 'error');
            }
        } catch {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
        } finally {
            setCreating(false);
        }
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
                        <h1 className='text-gray-900 fw-bold fs-2 mb-0'>{workOrder?.doc_num || 'LOADING...'}</h1>
                        <div className='d-flex align-items-center gap-2 mt-1'>
                            {workOrder && (
                                <span className={`badge ${getWorkOrderStatusBadge(workOrder.status)} fw-bold fs-8`}>
                                    {workOrderStatusThaiMap[workOrder.status] || workOrder.status}
                                </span>
                            )}
                            {workOrder && (
                                <span className='text-muted fw-semibold fs-8'>จำนวน: {workOrder.quantity}</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className='btn btn-sm btn-primary fw-bold px-6'
                    onClick={() => { setCreateRunQty(workOrder?.quantity || 1); setShowCreateRunModal(true); }}
                >
                    <i className='bi bi-plus-lg me-1'></i> สร้าง Work Run
                </button>
            </div>

            {/* Sales Item */}
            {workOrder?.sales_item && (
                <div className='card shadow-sm mb-8'>
                    <div className='card-header border-0 pt-5 pb-3'>
                        <div className='card-title'>
                            <h3 className='fw-bold text-gray-900 fs-4 mb-0'>
                                <i className='bi bi-box-seam me-2 text-primary'></i>
                                สินค้า
                            </h3>
                        </div>
                    </div>
                    <div className='card-body pt-0 pb-5'>
                        <div className='row g-4'>
                            <div className='col-md-4'>
                                <span className='text-muted fs-8 fw-bold d-block'>ชื่อสินค้า</span>
                                <span className='text-gray-800 fw-bold fs-6'>{workOrder.sales_item.item_name}</span>
                            </div>
                            <div className='col-md-4'>
                                <span className='text-muted fs-8 fw-bold d-block'>รหัสสินค้า</span>
                                <span className='text-gray-700 fs-7'>{workOrder.sales_item.item_code}</span>
                            </div>
                            <div className='col-md-4'>
                                <span className='text-muted fs-8 fw-bold d-block'>เลขที่เอกสาร</span>
                                <span className='text-gray-700 fs-7'>{workOrder.sales_item.doc_num}</span>
                            </div>
                            {workOrder.sales_item.item_description && (
                                <div className='col-12'>
                                    <span className='text-muted fs-8 fw-bold d-block'>รายละเอียด</span>
                                    <span className='text-gray-600 fs-7'>{workOrder.sales_item.item_description}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Work Runs */}
            <div className='card shadow-sm mb-8'>
                <div className='card-header border-0 pt-5 pb-3'>
                    <div className='card-title'>
                        <h3 className='fw-bold text-gray-900 fs-4 mb-0'>
                            <i className='bi bi-play-circle me-2 text-primary'></i>
                            Work Runs
                        </h3>
                    </div>
                    <div className='card-toolbar'>
                        <span className='badge badge-light-info fw-bold fs-7 px-4 py-2'>{workRuns.length} รายการ</span>
                    </div>
                </div>
                <div className='card-body pt-2 pb-6'>
                    {dataLoading ? (
                        <div className='text-center py-10'>
                            <span className='spinner-border spinner-border-sm align-middle me-2'></span>
                            <span className='text-muted'>กำลังโหลด...</span>
                        </div>
                    ) : workRuns.length === 0 ? (
                        <div className='d-flex flex-column flex-center py-12'>
                            <i className='bi bi-play-circle fs-3x text-gray-300 mb-4'></i>
                            <span className='text-gray-500 fw-semibold'>ยังไม่มี Work Run</span>
                            <button
                                className='btn btn-sm btn-primary mt-4 fw-bold'
                                onClick={() => { setCreateRunQty(workOrder?.quantity || 1); setShowCreateRunModal(true); }}
                            >
                                <i className='bi bi-plus-lg me-1'></i> สร้าง Work Run แรก
                            </button>
                        </div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table align-middle table-row-dashed fs-6 gy-4'>
                                <thead>
                                    <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                        <th>Work Run ID</th>
                                        <th className='text-center'>จำนวน</th>
                                        <th className='text-center'>ผลิตได้</th>
                                        <th className='text-center'>ของเสีย</th>
                                        <th className='text-center'>สถานะ</th>
                                        <th className='text-center'>วันที่สร้าง</th>
                                        <th className='text-end'>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className='text-gray-600 fw-semibold'>
                                    {workRuns.map((run) => (
                                        <tr key={run.work_run_id}>
                                            <td>
                                                <span className='text-gray-800 fw-bold'>#{run.work_run_id}</span>
                                            </td>
                                            <td className='text-center'>
                                                <span className='badge badge-light-primary fw-bold'>{run.quantity}</span>
                                            </td>
                                            <td className='text-center'>
                                                {run.usable_qty != null ? (
                                                    <span className='text-success fw-bold'>{run.usable_qty}</span>
                                                ) : (
                                                    <span className='text-muted'>-</span>
                                                )}
                                            </td>
                                            <td className='text-center'>
                                                {run.defect_qty != null ? (
                                                    <span className='text-danger fw-bold'>{run.defect_qty}</span>
                                                ) : (
                                                    <span className='text-muted'>-</span>
                                                )}
                                            </td>
                                            <td className='text-center'>
                                                <span className={`badge ${getWorkRunStatusBadge(run.status)} fw-bold`}>
                                                    {workRunStatusThaiMap[run.status] || run.status}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                <span className='text-gray-700'>
                                                    {run.created_date
                                                        ? new Date(run.created_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : '-'
                                                    }
                                                </span>
                                            </td>
                                            <td className='text-end'>
                                                <button
                                                    className='btn btn-sm btn-icon btn-bg-light btn-color-primary'
                                                    title='จัดการ Work Run'
                                                    onClick={() => navigate(`/workorder/work_run/${run.work_run_id}`)}
                                                >
                                                    <i className='bi bi-pencil-square fs-4'></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Components & Materials */}
            {workOrder?.item_components && workOrder.item_components.length > 0 && (
                <div className='card shadow-sm mb-10'>
                    <div className='card-header border-0 pt-6 pb-4'>
                        <div className='card-title'>
                            <h3 className='fw-bold text-gray-900 fs-3 mb-0'>
                                <i className='bi bi-boxes me-2 text-primary'></i>
                                ส่วนประกอบ & วัสดุที่ใช้
                            </h3>
                        </div>
                        <div className='card-toolbar'>
                            <span className='badge badge-light-info fw-bold fs-7 px-4 py-2'>{workOrder.item_components.length} ส่วนประกอบ</span>
                        </div>
                    </div>
                    <div className='card-body pt-2 pb-6'>
                        <div className='row g-6'>
                            {workOrder.item_components.map((comp, idx) => (
                                <div key={comp.item_component_id} className='col-lg-6'>
                                    <div className='border rounded-3 p-5 h-100' style={{ backgroundColor: '#fafbfc', borderColor: '#e8ecf1' }}>
                                        <div className='d-flex align-items-center gap-3 mb-5 pb-3 border-bottom border-gray-200'>
                                            <div className='symbol symbol-40px'>
                                                <span className='symbol-label bg-light-primary text-primary fw-bold fs-5 rounded-circle'>{idx + 1}</span>
                                            </div>
                                            <div>
                                                <span className='fw-bold text-gray-900 fs-4 d-block'>{comp.component_name}</span>
                                                <span className='text-muted fs-8'>{comp.material_usages?.length || 0} วัสดุ</span>
                                            </div>
                                            <button
                                                className='btn btn-sm btn-light-primary d-flex align-items-center gap-1 ms-auto'
                                                style={{ padding: '6px 12px', borderRadius: '6px' }}
                                                onClick={() => setEditComponentId(comp.item_component_id)}
                                            >
                                                <i className='bi bi-pencil-square' />
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

            {/* Create Work Run Modal */}
            <Modal show={showCreateRunModal} onHide={() => setShowCreateRunModal(false)} centered>
                <Modal.Header closeButton><Modal.Title className='fw-bold'>สร้าง Work Run</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className='mb-4'>
                        <label className='form-label fw-bold required'>จำนวนที่ต้องการผลิต</label>
                        <input
                            type='number'
                            className='form-control form-control-solid'
                            value={createRunQty}
                            onChange={(e) => setCreateRunQty(Number(e.target.value))}
                            min={1}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className='btn btn-light' onClick={() => setShowCreateRunModal(false)}>ยกเลิก</button>
                    <button className='btn btn-primary fw-bold' onClick={handleCreateWorkRun} disabled={creating || createRunQty < 1}>
                        {creating ? <span className='spinner-border spinner-border-sm me-2'></span> : <i className='bi bi-plus-lg me-1'></i>}
                        สร้าง Work Run
                    </button>
                </Modal.Footer>
            </Modal>

            {/* Item Component Detail Modal */}
            {workOrder && (
                <ItemComponentDetailModal
                    show={editComponentId !== null}
                    onClose={() => setEditComponentId(null)}
                    itemComponentId={editComponentId}
                    workOrder={workOrder as any}
                    onSaved={() => fetchWorkOrder()}
                />
            )}
        </Content>
    );
};

export default WorkorderDetail;
