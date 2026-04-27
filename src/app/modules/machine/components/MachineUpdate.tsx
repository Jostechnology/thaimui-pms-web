import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { getMachineById, updateMachine, deleteMachine } from '../../../services/machineService.ts';
import { getAllMachineTypes } from '../../../services/machineTypeService';
import type { MachineTypeItem } from '../../../type_interface/MachineType';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { validateRequired, validatePositiveNumber } from '../../../utils/validate_utils';

type FormErrors = {
    machine_code?: string;
    machine_name?: string;
    manufacturer?: string;
    purchase_date?: string;
    purchase_price?: string;
    useful_life_years?: string;
    working_hours_per_day?: string;
    status?: string;
    machine_description?: string;
};

const MachineUpdate: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [formData, setFormData] = useState({
        machine_code: '',
        machine_name: '',
        manufacturer: '',
        purchase_date: '',
        purchase_price: '',
        useful_life_years: '',
        working_hours_per_day: '',
        status: 'IDLE',
        machine_description: '',
        machine_type_id: '' as string | number,
        is_second_hand: false,
        accumulated_hours: '',
    });
    const [machineTypes, setMachineTypes] = useState<MachineTypeItem[]>([]);

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const statusOptions = [
        { value: 'IDLE', label: 'รอการใช้งาน (Idle)', color: 'warning', icon: 'bi-pause-circle' },
        { value: 'RUNNING', label: 'กำลังทำงาน (Running)', color: 'success', icon: 'bi-play-circle' },
        { value: 'DOWN', label: 'เครื่องขัดข้อง (Down)', color: 'danger', icon: 'bi-x-circle' },
        { value: 'OFFLINE', label: 'ออฟไลน์ (Offline)', color: 'dark', icon: 'bi-power' },
    ];

    useEffect(() => {
        getAllMachineTypes().then(res => {
            if (res.success && res.data) setMachineTypes(res.data);
        });

        const fetchDetail = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getMachineById(id);
            if (res.success && res.data) {
                const machine = res.data;
                const formattedDate = machine.purchase_date
                    ? machine.purchase_date.split('T')[0]
                    : '';

                setFormData({
                    machine_code: machine.machine_code || '',
                    machine_name: machine.machine_name || '',
                    manufacturer: machine.manufacturer || '',
                    purchase_date: formattedDate,
                    purchase_price: machine.purchase_price != null ? String(machine.purchase_price) : '',
                    useful_life_years: machine.useful_life_years != null ? String(machine.useful_life_years) : '',
                    working_hours_per_day: machine.working_hours_per_day != null ? String(machine.working_hours_per_day) : '',
                    status: machine.status || 'IDLE',
                    machine_description: machine.machine_description || '',
                    machine_type_id: machine.machine_type_id || '',
                    is_second_hand: machine.is_second_hand ?? false,
                    accumulated_hours: machine.accumulated_hours != null ? String(machine.accumulated_hours) : '',
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

    const validate = (data: typeof formData): FormErrors => {
        const errs: FormErrors = {};

        const codeErr = validateRequired(data.machine_code, 'รหัสเครื่องจักร');
        if (codeErr) errs.machine_code = codeErr;
        else if (data.machine_code.length > 50) errs.machine_code = 'รหัสเครื่องจักรต้องไม่เกิน 50 ตัวอักษร';

        const nameErr = validateRequired(data.machine_name, 'ชื่อเครื่องจักร');
        if (nameErr) errs.machine_name = nameErr;

        if (data.machine_description.length > 500) errs.machine_description = 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร';

        const priceErr = validateRequired(data.purchase_price, 'ราคาเครื่องจักร') ?? validatePositiveNumber(data.purchase_price, 'ราคาเครื่องจักร');
        if (priceErr) errs.purchase_price = priceErr;

        const lifeErr = validateRequired(data.useful_life_years, 'อายุการใช้งาน') ?? validatePositiveNumber(data.useful_life_years, 'อายุการใช้งาน');
        if (lifeErr) errs.useful_life_years = lifeErr;

        const hoursErr = validateRequired(data.working_hours_per_day, 'จำนวนชั่วโมงที่เครื่องทำงานต่อวัน') ?? validatePositiveNumber(data.working_hours_per_day, 'จำนวนชั่วโมงที่เครื่องทำงานต่อวัน');
        if (hoursErr) errs.working_hours_per_day = hoursErr;

        return errs;
    };

    const handleSecondHandToggle = () => {
        const newVal = !formData.is_second_hand;
        setFormData(prev => ({
            ...prev,
            is_second_hand: newVal,
            accumulated_hours: newVal ? prev.accumulated_hours : '',
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newData = { ...formData, [name]: value };
        setFormData(newData);
        if (touched[name]) {
            const newErrors = validate(newData);
            setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        setErrors(prev => ({ ...prev, [name]: validate(formData)[name as keyof FormErrors] }));
    };

    // //Delete (ลบ)
    // const handleDelete = async () => {
    //     if (!id) return;

    //     const confirm = await Swal.fire({
    //         title: 'อันตราย! ยืนยันการลบ?',
    //         text: `คุณแน่ใจหรือไม่ที่จะลบเครื่องจักร "${formData.machine_code}" ออกจากระบบ? (การกระทำนี้อาจไม่สามารถกู้คืนได้)`,
    //         icon: 'warning',
    //         showCancelButton: true,
    //         confirmButtonText: 'ใช่, ลบเลย!',
    //         cancelButtonText: 'ยกเลิก',
    //         confirmButtonColor: '#d33',
    //         cancelButtonColor: '#3085d6',
    //         reverseButtons: true,
    //     });

    //     if (confirm.isConfirmed) {
    //         setIsSubmitting(true);
    //         const res = await deleteMachine(id);
    //         if (res.success) {
    //             await Swal.fire('ลบสำเร็จ!', 'ข้อมูลเครื่องจักรถูกลบแล้ว', 'success');
    //             navigate('/machine/machine_list');
    //         } else {
    //             Swal.fire('ล้มเหลว', res.message || 'ไม่สามารถลบได้', 'error');
    //         }
    //         setIsSubmitting(false);
    //     }
    // };

    //Update (อัปเดต)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(k => allTouched[k] = true);
        setTouched(allTouched);

        const validationErrors = validate(formData);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลไม่ครบ', text: 'ตรวจสอบช่องสีแดงอีกครั้ง' });
            return;
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันการแก้ไขข้อมูล?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'อัปเดต',
            cancelButtonText: 'ย้อนกลับ',
            confirmButtonColor: '#3085d6',
            reverseButtons: true,
        });

        if (!confirm.isConfirmed || !id) return;

        setIsSubmitting(true);
        try {
            const res = await updateMachine(id, {
                ...formData,
                purchase_price: formData.purchase_price !== '' ? Number(formData.purchase_price) : null,
                useful_life_years: formData.useful_life_years !== '' ? Number(formData.useful_life_years) : null,
                working_hours_per_day: formData.working_hours_per_day !== '' ? Number(formData.working_hours_per_day) : null,
                accumulated_hours: formData.is_second_hand && formData.accumulated_hours !== ''
                    ? Number(formData.accumulated_hours)
                    : 0,
            });
            if (res.success) {
                await Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ!', timer: 2000, showConfirmButton: false });
                navigate('/machine/machine_list');
            } else {
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: res.message });
            }
        } catch {
            Swal.fire({ icon: 'error', title: 'เชื่อมต่อล้มเหลว' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fieldClass = (fieldName: string) => {
        if (!touched[fieldName]) return 'form-control form-control-lg';
        if (errors[fieldName as keyof FormErrors]) return 'form-control form-control-lg is-invalid';
        return 'form-control form-control-lg is-valid';
    };

    const filledCount = Object.values(formData).filter(v => typeof v === 'string' && v.trim() !== '').length;
    const progressPercent = Math.round((filledCount / 5) * 100);

    // ระหว่างโหลด API ซ่อนฟอร์มไว้ก่อนโชว์ Loading
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
            <div className="d-flex align-items-center mb-6">
                <button
                    type="button"
                    className="btn btn-sm btn-icon btn-light-primary me-3"
                    onClick={() => navigate('/machine/machine_list')}
                >
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h3 className="fw-bolder mb-0">แก้ไขข้อมูลเครื่องจักร</h3>
                    <span className="text-muted fs-7">อัปเดตรายละเอียด หรือ จัดการสถานะเครื่องจักร</span>
                </div>
            </div>

            <div className="row g-6">
                {/* ══════════════ ฝั่งซ้าย: ฟอร์มหลัก ══════════════ */}
                <div className="col-xl-8">
                    <form onSubmit={handleSubmit} id="machine-update-form">

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
                                    <div className="col-md-6 fv-row mb-6 mb-md-0">
                                        <label className="required fs-6 fw-semibold mb-2">รหัสเครื่องจักร</label>
                                        <input
                                            type="text"
                                            className={fieldClass('machine_code')}
                                            placeholder="เช่น MC-003, CNC-01"
                                            name="machine_code"
                                            value={formData.machine_code}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            autoFocus
                                        />
                                        {touched.machine_code && errors.machine_code && (
                                            <div className="invalid-feedback">{errors.machine_code}</div>
                                        )}
                                        <div className="form-text text-muted mt-1">รหัสสำหรับระบุตัวตนเครื่องจักร ต้องไม่ซ้ำกัน</div>
                                    </div>
                                    <div className="col-md-6 fv-row">
                                        <label className="required fs-6 fw-semibold mb-2">ชื่อเครื่องจักร</label>
                                        <input
                                            type="text"
                                            className={fieldClass('machine_name')}
                                            placeholder="เช่น Lathe 03, Milling Station"
                                            name="machine_name"
                                            value={formData.machine_name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        {touched.machine_name && errors.machine_name && (
                                            <div className="invalid-feedback">{errors.machine_name}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="row mb-6">
                                    <div className="col-md-6 fv-row mb-6 mb-md-0">
                                        <label className="fs-6 fw-semibold mb-2">ผู้ผลิต / ยี่ห้อ</label>
                                        <input
                                            type="text"
                                            className={fieldClass('manufacturer')}
                                            placeholder="เช่น Mazak, FANUC, Haas"
                                            name="manufacturer"
                                            value={formData.manufacturer}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                    <div className="col-md-6 fv-row">
                                        <label className="fs-6 fw-semibold mb-2">วันที่สั่งซื้อ</label>
                                        <input
                                            type="date"
                                            className={fieldClass('purchase_date')}
                                            name="purchase_date"
                                            value={formData.purchase_date}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>

                                <div className="row mb-6">
                                    <div className="col-md-6 fv-row">
                                        <label className="fs-6 fw-semibold mb-2">ประเภทเครื่องจักร</label>
                                        <select
                                            className="form-select form-select-solid"
                                            name="machine_type_id"
                                            value={formData.machine_type_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">— ไม่ระบุ —</option>
                                            {machineTypes.map(mt => (
                                                <option key={mt.machine_type_id} value={mt.machine_type_id}>
                                                    {mt.type_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6 fv-row">
                                        <label className="required fs-6 fw-semibold mb-2">ราคาเครื่องจักร</label>
                                        <input
                                            type="number"
                                            className={fieldClass('purchase_price')}
                                            placeholder="เช่น 500, 6000"
                                            name="purchase_price"
                                            value={formData.purchase_price}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        {touched.purchase_price && errors.purchase_price && (
                                            <div className="invalid-feedback">{errors.purchase_price}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="row mb-6">
                                    <div className="col-md-6 fv-row">
                                        <label className="required fs-6 fw-semibold mb-2">อายุการใช้งาน</label>
                                        <input
                                            type="number"
                                            className={fieldClass('useful_life_years')}
                                            placeholder="เช่น 1 2 3"
                                            name="useful_life_years"
                                            value={formData.useful_life_years}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        {touched.useful_life_years && errors.useful_life_years && (
                                            <div className="invalid-feedback">{errors.useful_life_years}</div>
                                        )}
                                    </div>

                                    <div className="col-md-6 fv-row">
                                        <label className="required fs-6 fw-semibold mb-2">จำนวนชั่วโมงที่เครื่องทำงานต่อวัน</label>
                                        <input
                                            type="number"
                                            className={fieldClass('working_hours_per_day')}
                                            placeholder="เช่น 1 2 3"
                                            name="working_hours_per_day"
                                            value={formData.working_hours_per_day}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        {touched.working_hours_per_day && errors.working_hours_per_day && (
                                            <div className="invalid-feedback">{errors.working_hours_per_day}</div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* ── Section 2: สถานะเริ่มต้น (Visual Selection) ── */}
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
                                            <h4 className="fw-bold mb-0">สถานะเริ่มต้น</h4>
                                            <span className="text-muted fs-8">เลือกสถานะของเครื่องจักรเมื่อนำเข้าระบบ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="row g-4">
                                    {statusOptions.map((opt) => (
                                        <div className="col-6 col-md-3" key={opt.value}>
                                            <label
                                                className={`
                                                    d-flex flex-column align-items-center justify-content-center 
                                                    border rounded p-5 cursor-pointer text-center
                                                    ${formData.status === opt.value
                                                        ? `border-${opt.color} border-2 bg-light-${opt.color}`
                                                        : 'border-gray-300 border-dashed bg-hover-light'
                                                    }
                                                `}
                                                style={{ minHeight: '100px', transition: 'all 0.2s ease' }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={opt.value}
                                                    checked={formData.status === opt.value}
                                                    onChange={handleChange}
                                                    className="d-none"
                                                />
                                                <i className={`bi ${opt.icon} fs-1 text-${opt.color} mb-2`}></i>
                                                <span className={`fw-bold fs-7 ${formData.status === opt.value ? `text-${opt.color}` : 'text-gray-700'}`}>
                                                    {opt.label}
                                                </span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Section 3: ประวัติเครื่องจักร (มือสอง) ──── */}
                        <div className="card mb-6">
                            <div className="card-header border-0 pt-6 pb-0">
                                <div className="card-title">
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-35px me-3">
                                            <span className="symbol-label bg-light-warning">
                                                <i className="bi bi-recycle text-warning fs-5"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="fw-bold mb-0">ประวัติเครื่องจักร</h4>
                                            <span className="text-muted fs-8">ระบุหากเป็นเครื่องมือสองหรือผ่านการซ่อมมาก่อน</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                {/* Toggle มือสอง */}
                                <div
                                    className={`d-flex align-items-center justify-content-between p-5 rounded border cursor-pointer mb-5 ${formData.is_second_hand ? 'border-warning border-2 bg-light-warning' : 'border-gray-300 border-dashed bg-hover-light'}`}
                                    onClick={handleSecondHandToggle}
                                    style={{ transition: 'all 0.2s ease' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-40px me-4">
                                            <span className={`symbol-label ${formData.is_second_hand ? 'bg-warning' : 'bg-light'}`}>
                                                <i className={`bi bi-recycle fs-4 ${formData.is_second_hand ? 'text-white' : 'text-gray-400'}`}></i>
                                            </span>
                                        </div>
                                        <div>
                                            <div className="fw-bold fs-6">เครื่องมือสอง / ผ่านการใช้งานมาก่อน</div>
                                            <div className="text-muted fs-8">เปิดใช้หากเครื่องนี้ไม่ใช่เครื่องใหม่ หรือซื้อมาจากที่อื่น</div>
                                        </div>
                                    </div>
                                    <div className="form-check form-switch form-check-custom form-check-solid ms-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={formData.is_second_hand}
                                            onChange={handleSecondHandToggle}
                                            onClick={e => e.stopPropagation()}
                                            style={{ width: '3rem', height: '1.5rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Conditional: ชั่วโมงสะสม */}
                                {formData.is_second_hand && (
                                    <div className="fv-row">
                                        <label className="fs-6 fw-semibold mb-2">
                                            ชั่วโมงสะสมก่อนซื้อ (ชม.)
                                            <span className="ms-2 badge badge-light-warning fs-9">สำหรับคำนวณค่าซ่อม</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control form-control-solid"
                                            placeholder="เช่น 200, 500"
                                            name="accumulated_hours"
                                            value={formData.accumulated_hours}
                                            onChange={handleChange}
                                            min={0}
                                        />
                                        <div className="form-text text-muted mt-1">
                                            จำนวนชั่วโมงที่เครื่องนี้ถูกใช้งานมาก่อนที่จะซื้อเข้าระบบ — ใช้ในการคำนวณอัตราค่าซ่อมบำรุง
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Section 4: รายละเอียดเพิ่มเติม ────────────── */}
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
                                            <span className="text-muted fs-8">ไม่บังคับ — เพิ่มหมายเหตุหรือข้อมูลอื่นๆ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="fv-row">
                                    <textarea
                                        className={fieldClass('machine_description')}
                                        rows={4}
                                        placeholder="ใส่รายละเอียดเพิ่มเติมเกี่ยวกับเครื่องจักรนี้... (ไม่บังคับ)"
                                        name="machine_description"
                                        value={formData.machine_description}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        maxLength={500}
                                    ></textarea>
                                    {touched.machine_description && errors.machine_description && (
                                        <div className="invalid-feedback">{errors.machine_description}</div>
                                    )}
                                    <div className="d-flex justify-content-end mt-1">
                                        <span className={`fs-8 ${formData.machine_description.length > 450 ? 'text-warning' : 'text-muted'}`}>
                                            {formData.machine_description.length}/500
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Action Buttons (รวมปุ่ม Delete ไว้ฝั่งซ้าย) ── */}
                        <div className="card">
                            <div className="card-body d-flex justify-content-between align-items-center py-5">

                                {/* กลุ่มปุ่ม Save/Cancel (ขวาสุด) */}
                                <div className="d-flex gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-light btn-active-light-secondary"
                                        onClick={() => navigate('/machine/machine_list')}
                                        disabled={isSubmitting}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSubmitting || Object.keys(validate(formData)).length > 0}
                                    >
                                        {isSubmitting ? (
                                            <span className="spinner-border spinner-border-sm"></span>
                                        ) : (
                                            <span><i className="bi bi-save me-1"></i> อัปเดตข้อมูล</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </form>
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
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted fs-7">ความสมบูรณ์ของฟอร์ม</span>
                                    <span className="fw-bold fs-7">{progressPercent}%</span>
                                </div>
                                <div className="progress h-8px">
                                    <div
                                        className={`progress-bar bg-${progressPercent === 100 ? 'success' : progressPercent >= 40 ? 'primary' : 'warning'}`}
                                        role="progressbar"
                                        style={{ width: `${progressPercent}%`, transition: 'width 0.4s ease' }}
                                    ></div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="separator separator-dashed mb-5"></div>

                            {/* ─ Machine Code ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.machine_code ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-hash fs-6 ${formData.machine_code ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">รหัสเครื่องจักร</span>
                                    <span className={`fw-bold fs-6 ${formData.machine_code ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.machine_code || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Machine Name ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.machine_name ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-gear fs-6 ${formData.machine_name ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ชื่อเครื่องจักร</span>
                                    <span className={`fw-bold fs-6 ${formData.machine_name ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.machine_name || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Manufacturer ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.manufacturer ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-building fs-6 ${formData.manufacturer ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ผู้ผลิต</span>
                                    <span className={`fs-6 ${formData.manufacturer ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.manufacturer || '— (ไม่ระบุ)'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Purchase Date ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.purchase_date ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-calendar3 fs-6 ${formData.purchase_date ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">วันที่ซื้อ</span>
                                    <span className={`fs-6 ${formData.purchase_date ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.purchase_date
                                            ? new Date(formData.purchase_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '— (ไม่ระบุ)'
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* ─ Purchase Price ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.purchase_price ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-currency-exchange fs-6 ${formData.purchase_price ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ราคาเครื่องจักร</span>
                                    <span className={`fw-bold fs-6 ${formData.purchase_price ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.purchase_price ? `฿${Number(formData.purchase_price).toLocaleString()}` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Useful Life ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.useful_life_years ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-hourglass-split fs-6 ${formData.useful_life_years ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">อายุการใช้งาน</span>
                                    <span className={`fs-6 ${formData.useful_life_years ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.useful_life_years ? `${formData.useful_life_years} ปี` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Working Hours ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.working_hours_per_day ? 'bg-light-success' : 'bg-light'}`}>
                                        <i className={`bi bi-clock fs-6 ${formData.working_hours_per_day ? 'text-success' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ชั่วโมง/วัน</span>
                                    <span className={`fs-6 ${formData.working_hours_per_day ? 'text-dark' : 'text-gray-400'}`}>
                                        {formData.working_hours_per_day ? `${formData.working_hours_per_day} ชม.` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Status ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label bg-light-${statusOptions.find(s => s.value === formData.status)?.color}`}>
                                        <i className={`bi ${statusOptions.find(s => s.value === formData.status)?.icon} fs-6 text-${statusOptions.find(s => s.value === formData.status)?.color}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">สถานะเริ่มต้น</span>
                                    <span className={`badge badge-light-${statusOptions.find(s => s.value === formData.status)?.color} fw-bold`}>
                                        {statusOptions.find(s => s.value === formData.status)?.label}
                                    </span>
                                </div>
                            </div>

                            {/* ─ Second Hand ─ */}
                            <div className="d-flex align-items-start mb-4">
                                <div className="symbol symbol-30px me-3 mt-1">
                                    <span className={`symbol-label ${formData.is_second_hand ? 'bg-light-warning' : 'bg-light'}`}>
                                        <i className={`bi bi-recycle fs-6 ${formData.is_second_hand ? 'text-warning' : 'text-gray-400'}`}></i>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted fs-8 d-block">ประเภทเครื่อง</span>
                                    {formData.is_second_hand ? (
                                        <span className="badge badge-light-warning fw-bold">มือสอง</span>
                                    ) : (
                                        <span className="text-gray-500 fs-6">เครื่องใหม่</span>
                                    )}
                                    {formData.is_second_hand && formData.accumulated_hours !== '' && (
                                        <div className="text-muted fs-8 mt-1">ชั่วโมงสะสม: {formData.accumulated_hours} ชม.</div>
                                    )}
                                </div>
                            </div>

                            <div className="separator separator-dashed mb-5"></div>

                            {/* ─ Checklist ─ */}
                            <div className="fs-7">
                                <div className={`d-flex align-items-center mb-2 ${formData.machine_code ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.machine_code ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    รหัสเครื่องจักร
                                    {!formData.machine_code && <span className="badge badge-light-danger ms-auto fs-9">จำเป็น</span>}
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.machine_name ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.machine_name ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    ชื่อเครื่องจักร
                                    {!formData.machine_name && <span className="badge badge-light-danger ms-auto fs-9">จำเป็น</span>}
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.manufacturer ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.manufacturer ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    ผู้ผลิต
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.purchase_date ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.purchase_date ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    วันที่ซื้อ
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.purchase_price ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.purchase_price ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    ราคาเครื่องจักร
                                    {!formData.purchase_price && <span className="badge badge-light-danger ms-auto fs-9">จำเป็น</span>}
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.useful_life_years ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.useful_life_years ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    อายุการใช้งาน
                                    {!formData.useful_life_years && <span className="badge badge-light-danger ms-auto fs-9">จำเป็น</span>}
                                </div>
                                <div className={`d-flex align-items-center mb-2 ${formData.working_hours_per_day ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.working_hours_per_day ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    ชั่วโมง/วัน
                                    {!formData.working_hours_per_day && <span className="badge badge-light-danger ms-auto fs-9">จำเป็น</span>}
                                </div>
                                <div className={`d-flex align-items-center ${formData.machine_description ? 'text-success' : 'text-gray-400'}`}>
                                    <i className={`bi ${formData.machine_description ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                                    รายละเอียดเพิ่มเติม
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </Content>
    );
};

export default MachineUpdate;