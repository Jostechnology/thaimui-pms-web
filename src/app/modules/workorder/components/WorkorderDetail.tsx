import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";



const WorkorderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // รับ DocNum จาก URL

    const handleSave = () => {
        Swal.fire({
            title: 'บันทึกการเปลี่ยนแปลง?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'บันทึกข้อมูล',
            confirmButtonColor: '#137fec'
        });
    };

    return (
        <Content>
            <div className='d-flex flex-stack mb-6'>
                <div className='d-flex align-items-center'>
                    <button onClick={() => navigate(-1)} className='btn btn-sm btn-icon btn-light-primary me-3'>
                        <i className='bi bi-arrow-left fs-3'></i>
                    </button>
                    <div className='d-flex flex-column'>
                        <h1 className='text-gray-900 fw-bold fs-2 mb-1'>
                            {id || 'ORDR-2024-001'} 
                            <span className='badge badge-light-warning fw-bold fs-8 px-3 py-2 ms-3'>IN PROGRESS</span>
                        </h1>
                        <span className='text-muted fw-semibold fs-7'>จัดการขั้นตอนการผลิตและมอบหมายพนักงาน</span>
                    </div>
                </div>
                <div className='d-flex gap-3'>
                    <button className='btn btn-sm btn-light fw-bold px-6'>Cancel</button>
                    <button onClick={handleSave} className='btn btn-sm btn-primary fw-bold px-6'>Save Changes</button>
                </div>
            </div>

            <div className='row g-5 mb-8'>
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 p-6 flex-row align-items-center'>
                        <div className='symbol symbol-50px me-5'>
                            <div className='symbol-label bg-light-primary'>
                                <i className='bi bi-clock-history text-primary fs-2x'></i>
                            </div>
                        </div>
                        <div>
                            <span className='text-muted fw-bold d-block fs-8 uppercase'>EST. DURATION</span>
                            <span className='text-gray-900 fw-bold fs-4'>14 Days</span>
                        </div>
                    </div>
                </div>
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 p-6 flex-row align-items-center'>
                        <div className='symbol symbol-50px me-5'>
                            <div className='symbol-label bg-light-success'>
                                <i className='bi bi-people text-success fs-2x'></i>
                            </div>
                        </div>
                        <div>
                            <span className='text-muted fw-bold d-block fs-8 uppercase'>TEAM SIZE</span>
                            <span className='text-gray-900 fw-bold fs-4'>5 Assignees</span>
                        </div>
                    </div>
                </div>
                <div className='col-md-4'>
                    <div className='card card-flush shadow-sm h-100 p-6 flex-row align-items-center'>
                        <div className='symbol symbol-50px me-5'>
                            <div className='symbol-label bg-light-info'>
                                <i className='bi bi-diagram-3 text-info fs-2x'></i>
                            </div>
                        </div>
                        <div>
                            <span className='text-muted fw-bold d-block fs-8 uppercase'>TOTAL PHASES</span>
                            <span className='text-gray-900 fw-bold fs-4'>3 Steps</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Production Timeline & Work Assignment */}
            <div className='position-relative'>
                {/* Vertical Line Line */}
                <div className='position-absolute start-0 top-0 h-100 border-start border-gray-300 border-2 ms-5 z-index-0'></div>

                {/* Phase 1: Design Review (COMPLETED) */}
                <div className='d-flex align-items-start mb-10 z-index-1 position-relative'>
                    <div className='symbol symbol-40px me-5 mt-1'>
                        <div className='symbol-label bg-primary text-white fw-bold fs-5 shadow-sm'>1</div>
                    </div>
                    <div className='card shadow-sm w-100'>
                        <div className='card-header border-0 pt-5'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold text-gray-900 fs-4'>Design Review</span>
                            </h3>
                            <div className='card-toolbar'>
                                <span className='badge badge-light-success fw-bold px-4 py-2 me-3'>Completed</span>
                                <button className='btn btn-icon btn-sm btn-light-danger'><i className='bi bi-trash fs-5'></i></button>
                            </div>
                        </div>
                        <div className='card-body pt-0'>
                            <div className='separator separator-dashed my-4'></div>
                            <div className='d-flex flex-stack mb-4'>
                                <span className='text-gray-400 fw-bold fs-7 uppercase'>ASSIGNED TEAM</span>
                                <button className='btn btn-sm btn-link text-primary fw-bold'><i className='bi bi-plus me-1'></i>Assign Staff</button>
                            </div>
                            {/* Employee List in Phase */}
                            <div className='d-flex flex-column gap-3'>
                                <div className='d-flex flex-stack p-3 border border-gray-100 rounded-lg bg-light-secondary'>
                                    <div className='d-flex align-items-center'>
                                        <div className='symbol symbol-35px me-3'>
                                            <img src='https://via.placeholder.com/150' alt='emp' />
                                        </div>
                                        <div className='d-flex flex-column'>
                                            <span className='text-gray-900 fw-bold fs-7'>Somchai</span>
                                            <span className='text-muted fs-8'>Lead Designer</span>
                                        </div>
                                    </div>
                                    <span className='badge badge-light-dark fs-8'>24h logged</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phase 2: Component Picking (ACTIVE) */}
                <div className='d-flex align-items-start mb-10 z-index-1 position-relative'>
                    <div className='symbol symbol-40px me-5 mt-1'>
                        <div className='symbol-label bg-primary text-white fw-bold fs-5 shadow-sm'>2</div>
                    </div>
                    <div className='card border-primary border-dashed shadow-sm w-100' style={{borderWidth: '2px'}}>
                        <div className='card-header border-0 pt-5'>
                            <h3 className='card-title'><span className='card-label fw-bold text-gray-900 fs-4'>Component Picking</span></h3>
                            <div className='card-toolbar'>
                                <span className='badge badge-light-primary fw-bold px-4 py-2 me-3'>Active</span>
                                <button className='btn btn-icon btn-sm btn-light-danger'><i className='bi bi-trash fs-5'></i></button>
                            </div>
                        </div>
                        <div className='card-body pt-0'>
                            <div className='separator separator-dashed my-4'></div>
                            <div className='d-flex flex-stack mb-4'>
                                <span className='text-gray-400 fw-bold fs-7 uppercase'>ASSIGNED TEAM</span>
                                <button className='btn btn-sm btn-link text-primary fw-bold'><i className='bi bi-plus me-1'></i>Assign Staff</button>
                            </div>
                            <div className='text-center p-5 bg-light-primary rounded-lg border border-dashed border-primary'>
                                <i className='bi bi-person-plus text-primary fs-2x mb-3 d-block'></i>
                                <span className='text-gray-600 fs-7 d-block'>No staff assigned yet.</span>
                                <button className='btn btn-sm btn-primary mt-2'>Add First Member</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add New Phase Button */}
                <div className='d-flex align-items-center justify-content-center mt-5 mb-10 ms-10'>
                     <button className='btn btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary w-100 py-4 fw-bold'>
                        <i className='bi bi-plus-lg me-2'></i> Add New Phase
                     </button>
                </div>
            </div>
        </Content>
    );
}

export default WorkorderDetail;