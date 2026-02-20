import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployeeById } from '../../../services/employee';
import { Employee } from '../../../type_interface/EmployeeType';
import { useAlertModal } from '../../../context/ModalContext';

const EmployeeDetail: React.FC = () => {
    const { employee_id: id } = useParams();
    const navigate = useNavigate();
    const { openAlertModal } = useAlertModal();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('EmployeeDetail mounted, id:', id);
        const fetchEmployee = async () => {
            if (!id) {
                console.error('No ID provided');
                setLoading(false);
                return;
            }
            try {
                console.log('Fetching employee data for ID:', id);
                const res = await getEmployeeById(Number(id));
                console.log('Fetch response:', res);
                if (res && res.success) {
                    setEmployee(res.data);
                } else {
                    console.error('API Error or Success False:', res);
                    openAlertModal('ไม่พบข้อมูลพนักงาน', () => navigate('/employee/employee_list'), false);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                openAlertModal('เกิดข้อผิดพลาดในการโหลดข้อมูล', () => navigate('/employee/employee_list'), false);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployee();
    }, [id, navigate, openAlertModal]);

    const formatSalary = (val?: number) => (val != null ? val.toLocaleString('th-TH') : '-');

    if (loading) {
        return <div className="d-flex justify-content-center align-items-center min-h-300px">
            <span className="spinner-border text-primary" role="status"></span>
        </div>;
    }

    if (!employee) return null;

    const initials = `${(employee.employee_first_name || '').charAt(0)}${(employee.employee_last_name || '').charAt(0)}`.toUpperCase();
    const statusColor = employee.status === 'ทำงานอยู่' ? 'success' : employee.status === 'ลาออก' ? 'danger' : 'secondary';

    return (
        <div className="container-xxl">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between mb-8">
                <div>
                    <h1 className="d-flex align-items-center text-dark fw-bolder fs-2 my-1">
                        รายละเอียดพนักงาน
                        <span className="badge badge-light-primary fs-7 fw-bold ms-2">ID: {employee.employee_id}</span>
                    </h1>
                    <ul className="breadcrumb breadcrumb-separatorless fw-bold fs-7 my-1">
                        <li className="breadcrumb-item text-muted"><a onClick={() => navigate('/employee/employee_list')} className="text-muted text-hover-primary cursor-pointer">รายชื่อพนักงาน</a></li>
                        <li className="breadcrumb-item"><span className="bullet bg-gray-200 w-5px h-2px"></span></li>
                        <li className="breadcrumb-item text-dark">{employee.employee_first_name} {employee.employee_last_name}</li>
                    </ul>
                </div>
                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button className="btn btn-sm btn-light" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left me-1"></i> ย้อนกลับ
                    </button>
                    {/* <button className="btn btn-sm btn-primary">
                        <i className="bi bi-pencil-square me-1"></i> แก้ไขข้อมูล
                    </button> */}
                </div>
            </div>

            {/* Content */}
            <div className="row g-6 g-xl-9">
                {/* Profile Card */}
                <div className="col-xl-4">
                    <div className="card card-flush h-100">
                        <div className="card-body pt-9 pb-0">
                            <div className="d-flex flex-wrap flex-sm-nowrap mb-6">
                                <div className="d-flex flex-center flex-shrink-0 bg-light rounded w-100px h-100px w-lg-150px h-lg-150px me-7 mb-4">
                                    <span className="fs-3x fw-bold text-primary">{initials}</span>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-start flex-wrap mb-2">
                                        <div className="d-flex flex-column">
                                            <div className="d-flex align-items-center mb-1">
                                                <span className="text-gray-800 text-hover-primary fs-2 fw-bolder me-3">{employee.employee_first_name} {employee.employee_last_name}</span>
                                                <span className={`badge badge-light-${statusColor} fw-bolder fs-8 px-2 py-1`}>{employee.status}</span>
                                            </div>
                                            <div className="d-flex flex-wrap fw-bold fs-6 mb-4 pe-2">
                                                <span className="d-flex align-items-center text-gray-400 text-hover-primary me-5 mb-2">
                                                    <i className="bi bi-person-badge me-1"></i> {employee.citizen_id || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-wrap flex-stack">
                                        <div className="d-flex flex-column flex-grow-1 pe-8">
                                            <div className="d-flex flex-wrap">
                                                <div className="border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="fs-2 fw-bolder counted">{formatSalary(employee.salary_base)}</div>
                                                    </div>
                                                    <div className="fw-bold fs-6 text-gray-400">เงินเดือนฐาน</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Card */}
                <div className="col-xl-8">
                    <div className="card card-flush h-100">
                        <div className="card-header pt-7">
                            <h3 className="card-title align-items-start flex-column">
                                <span className="card-label fw-bolder text-dark">ข้อมูลติดต่อและที่อยู่</span>
                                <span className="text-gray-400 mt-1 fw-bold fs-6">Contact & Address Information</span>
                            </h3>
                        </div>
                        <div className="card-body pt-5">
                            <div className="row mb-7">
                                <label className="col-lg-4 fw-bold text-muted">เบอร์โทรศัพท์</label>
                                <div className="col-lg-8">
                                    <span className="fw-bolder fs-6 text-gray-800">{employee.phone_number || '-'}</span>
                                </div>
                            </div>
                            <div className="row mb-7">
                                <label className="col-lg-4 fw-bold text-muted">อีเมล</label>
                                <div className="col-lg-8">
                                    <span className="fw-bolder fs-6 text-gray-800">{employee.email || '-'}</span>
                                </div>
                            </div>
                            <div className="row mb-7">
                                <label className="col-lg-4 fw-bold text-muted">ที่อยู่</label>
                                <div className="col-lg-8">
                                    <span className="fw-bolder fs-6 text-gray-800">{employee.address || '-'}</span>
                                </div>
                            </div>
                            <div className="row mb-7">
                                <label className="col-lg-4 fw-bold text-muted">วันที่สร้าง</label>
                                <div className="col-lg-8">
                                    <span className="fw-bolder fs-6 text-gray-800">{employee.created_date ? new Date(employee.created_date).toLocaleDateString('th-TH') : '-'}</span>
                                </div>
                            </div>
                            <div className="row mb-7">
                                <label className="col-lg-4 fw-bold text-muted">แก้ไขล่าสุด</label>
                                <div className="col-lg-8">
                                    <span className="fw-bolder fs-6 text-gray-800">{employee.updated_date ? new Date(employee.updated_date).toLocaleDateString('th-TH') : '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;
