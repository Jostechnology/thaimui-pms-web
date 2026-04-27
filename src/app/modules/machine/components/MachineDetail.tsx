import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getMachineById } from '../../../services/machineService.ts';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const MachineDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [machine, setMachine] = useState<{
        machine_code: string;
        machine_name: string;
        manufacturer: string;
        purchase_date: string;
        purchase_price: number | null;
        useful_life_years: number | null;
        working_hours_per_day: number | null;
        status: string;
        machine_description: string;
        machine_type_name: string;
        created_by: string;
        created_date: string;
        updated_by: string;
        updated_date: string;
    }>({
        machine_code: '',
        machine_name: '',
        manufacturer: '',
        purchase_date: '',
        purchase_price: null,
        useful_life_years: null,
        working_hours_per_day: null,
        status: 'IDLE',
        machine_description: '',
        machine_type_name: '',
        created_by: '',
        created_date: '',
        updated_by: '',
        updated_date: '',
    });

    const statusOptions = [
        { value: 'IDLE', label: 'รอการใช้งาน (Idle)', color: 'warning', icon: 'bi-pause-circle' },
        { value: 'RUNNING', label: 'กำลังทำงาน (Running)', color: 'success', icon: 'bi-play-circle' },
        { value: 'DOWN', label: 'เครื่องขัดข้อง (Down)', color: 'danger', icon: 'bi-x-circle' },
        { value: 'OFFLINE', label: 'ออฟไลน์ (Offline)', color: 'dark', icon: 'bi-power' },
    ];

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getMachineById(id);
            if (res.success && res.data) {
                const data = res.data;
                const formattedDate = data.purchase_date
                    ? data.purchase_date.split('T')[0]
                    : '';

                setMachine({
                    machine_code: data.machine_code || '',
                    machine_name: data.machine_name || '',
                    manufacturer: data.manufacturer || '',
                    purchase_date: formattedDate,
                    purchase_price: data.purchase_price ?? null,
                    useful_life_years: data.useful_life_years ?? null,
                    working_hours_per_day: data.working_hours_per_day ?? null,
                    status: data.status || 'IDLE',
                    machine_description: data.machine_description || '',
                    machine_type_name: data.machine_type?.type_name || '',
                    created_by: data.created_by || '',
                    created_date: data.created_date || '',
                    updated_by: data.updated_by || '',
                    updated_date: data.updated_date || '',
                });
            } else {
                Swal.fire({
                    icon: 'error', title: 'ไม่พบข้อมูล', text: 'ไม่สามารถโหลดข้อมูลเครื่องจักรนี้ได้',
                }).then(() => navigate(-1));
            }
            setIsLoading(false);
        };
        fetchDetail();
    }, [id, navigate]);

    const currentStatus = statusOptions.find(s => s.value === machine.status);

    if (isLoading) {
        return (
            <Content>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            </Content>
        );
    }

    return (
        <Content>
            {/* ─── Breadcrumb ─────────────── */}
            <div className="d-flex align-items-center justify-content-between mb-6">
                <div className="d-flex align-items-center">
                    <button
                        type="button"
                        className="btn btn-sm btn-icon btn-light-primary me-3"
                        onClick={() => navigate('/machine/machine_list')}
                    >
                        <i className="bi bi-arrow-left fs-4"></i>
                    </button>
                    <div>
                        <h3 className="fw-bolder mb-0">รายละเอียดเครื่องจักร</h3>
                        <span className="text-muted fs-7">ข้อมูลเครื่องจักร — แสดงอย่างเดียว (View Only)</span>
                    </div>
                </div>
            </div>

            <div className="row g-6">
                {/* ══════════════ ฝั่งซ้าย: ข้อมูลหลัก ══════════════ */}
                <div className="col-xl-8">

                    {/* ── Section 1: ข้อมูลหลัก ─────────────────── */}
                    <div className="card mb-6">
                        <div className="card-header border-0 pt-6 pb-0">
                            <div className="card-title">
                                <div className="d-flex align-items-center">
                                    <div className="symbol symbol-35px me-3">
                                        <span className="symbol-label bg-light-primary">
                                            <i className="bi bi-gear-fill text-primary fs-5"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="fw-bold mb-0">ข้อมูลหลัก</h4>
                                        <span className="text-muted fs-8">ข้อมูลจำเป็นสำหรับการลงทะเบียน</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row mb-6">
                                <div className="col-md-6 mb-6 mb-md-0">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">รหัสเครื่องจักร</label>
                                    <div className="form-control form-control-solid bg-light-primary">
                                        <span className="fw-bold text-dark">{machine.machine_code || '—'}</span>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">ชื่อเครื่องจักร</label>
                                    <div className="form-control form-control-solid bg-light-primary">
                                        <span className="fw-bold text-dark">{machine.machine_name || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-6 mb-md-0">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">ผู้ผลิต / ยี่ห้อ</label>
                                    <div className="form-control form-control-solid">
                                        {machine.manufacturer || '— (ไม่ระบุ)'}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">วันที่สั่งซื้อ</label>
                                    <div className="form-control form-control-solid">
                                        {machine.purchase_date
                                            ? new Date(machine.purchase_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '— (ไม่ระบุ)'}
                                    </div>
                                </div>
                            </div>

                            <div className="row mt-6">
                                <div className="col-md-6">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">ประเภทเครื่องจักร</label>
                                    <div className="form-control form-control-solid">
                                        {machine.machine_type_name ? (
                                            <span className="badge badge-light-info fw-semibold">{machine.machine_type_name}</span>
                                        ) : (
                                            '— (ไม่ระบุ)'
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">ราคาเครื่องจักร</label>
                                    <div className="form-control form-control-solid ">
                                        <span className="fw-bold text-dark">{machine.purchase_price || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="row mt-6">
                                <div className="col-md-6 mb-6 mb-md-0">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">อายุการใช้งาน</label>
                                    <div className="form-control form-control-solid">
                                        <span className="fw-bold text-dark">{machine.useful_life_years || '-'}</span>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="fs-6 fw-semibold mb-2 text-muted">จำนวนชั่วโมงที่เครื่องทำงานต่อวัน</label>
                                    <div className="form-control form-control-solid">
                                        <span className="fw-bold text-dark">{machine.working_hours_per_day || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: สถานะ ── */}
                    <div className="card mb-6">
                        <div className="card-header border-0 pt-6 pb-0">
                            <div className="card-title">
                                <div className="d-flex align-items-center">
                                    <div className="symbol symbol-35px me-3">
                                        <span className="symbol-label bg-light-success">
                                            <i className="bi bi-toggles text-success fs-5"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="fw-bold mb-0">สถานะเครื่องจักร</h4>
                                        <span className="text-muted fs-8">สถานะปัจจุบันของเครื่องจักร</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className={`symbol symbol-50px me-4`}>
                                    <span className={`symbol-label bg-light-${currentStatus?.color}`}>
                                        <i className={`bi ${currentStatus?.icon} fs-1 text-${currentStatus?.color}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className={`badge badge-light-${currentStatus?.color} fw-bold fs-6 px-4 py-2`}>
                                        {currentStatus?.label || machine.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 3: รายละเอียดเพิ่มเติม ────────────── */}
                    <div className="card mb-6">
                        <div className="card-header border-0 pt-6 pb-0">
                            <div className="card-title">
                                <div className="d-flex align-items-center">
                                    <div className="symbol symbol-35px me-3">
                                        <span className="symbol-label bg-light-info">
                                            <i className="bi bi-card-text text-info fs-5"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="fw-bold mb-0">รายละเอียดเพิ่มเติม</h4>
                                        <span className="text-muted fs-8">หมายเหตุหรือข้อมูลอื่นๆ</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="form-control form-control-solid" style={{ minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                                {machine.machine_description || '— (ไม่มีรายละเอียดเพิ่มเติม)'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════ ฝั่งขวา: Summary Panel ══════════════ */}
                <div className="col-xl-4">
                    <div className="card" style={{ position: 'sticky', top: '80px' }}>
                        <div className="card-header border-0 pt-6 pb-0">
                            <div className="card-title">
                                <h4 className="fw-bold mb-0">สรุปข้อมูล</h4>
                            </div>
                        </div>
                        <div className="card-body">

                            {/* ─ Machine Code ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${machine.machine_code ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-hash fs-6 ${machine.machine_code ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">รหัสเครื่องจักร</span>
                                    <span className={`fw-bold fs-6 ${machine.machine_code ? 'text-dark' : 'text-gray-400'}`}>
                                        {machine.machine_code || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Machine Name ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${machine.machine_name ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-gear fs-6 ${machine.machine_name ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ชื่อเครื่องจักร</span>
                                    <span className={`fw-bold fs-6 ${machine.machine_name ? 'text-dark' : 'text-gray-400'}`}>
                                        {machine.machine_name || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Manufacturer ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${machine.manufacturer ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-building fs-6 ${machine.manufacturer ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ผู้ผลิต</span>
                                    <span className={`fs-6 ${machine.manufacturer ? 'text-dark' : 'text-gray-400'}`}>
                                        {machine.manufacturer || '— (ไม่ระบุ)'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Purchase Date ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${machine.purchase_date ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-calendar3 fs-6 ${machine.purchase_date ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">วันที่ซื้อ</span>
                                    <span className={`fs-6 ${machine.purchase_date ? 'text-dark' : 'text-gray-400'}`}>
                                        {machine.purchase_date
                                            ? new Date(machine.purchase_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '— (ไม่ระบุ)'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Status ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label bg-light-${currentStatus?.color}`}>
                                        <i className={`bi ${currentStatus?.icon} fs-6 text-${currentStatus?.color}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">สถานะ</span>
                                    <span className={`badge badge-light-${currentStatus?.color} fw-bold`}>
                                        {currentStatus?.label || machine.status}
                                    </span>
                                </div>
                            </div>

                            <div className="separator separator-dashed mb-5"></div>

                            {/* ─ Timestamps ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className="symbol-label bg-light">
                                        <i className="bi bi-clock-history fs-6 text-gray-500"></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">สร้างโดย</span>
                                    <span className="fs-7 text-dark">{machine.created_by || '—'}</span>
                                    {machine.created_date && (
                                        <span className="text-muted fs-9 d-block">
                                            {new Date(machine.created_date).toLocaleString('th-TH')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex align-items-start">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className="symbol-label bg-light">
                                        <i className="bi bi-pencil fs-6 text-gray-500"></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">แก้ไขล่าสุดโดย</span>
                                    <span className="fs-7 text-dark">{machine.updated_by || '—'}</span>
                                    {machine.updated_date && (
                                        <span className="text-muted fs-9 d-block">
                                            {new Date(machine.updated_date).toLocaleString('th-TH')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default MachineDetail;
