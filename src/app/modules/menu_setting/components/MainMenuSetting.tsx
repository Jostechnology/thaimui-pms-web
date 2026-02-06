import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const MainMenuSetting = () => {

    const navigate = useNavigate();
  

    return (
        <Content>
            <div className="row g-5 g-xxl-8">
                <div className='col-xl-12'>
                    <div className={`card mb-5 mb-xl-8`}>

                        <div className="card-header border-0 pt-5 d-flex justify-content-between align-items-center">
                            <h2 className="card-title align-items-start flex-column">
                                <span className="card-label fw-bold fs-1 mb-1">
                                <i className="ki-outline ki-setting fs-2"></i> Settings
                                </span>
                            </h2>
                        </div>

                        <div className="card-body py-3">
                            <div className="setting-menu">
                                {/* <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("module_management")}>
                                    Module Management
                                </button> */}
                                <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("role_management")}>
                                    Role Management
                                </button>
                                {/* <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("company_detail")}>
                                    ตั้งค่าข้อมูลบริษัท
                            </button> */}
                                 <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("notification_setting_management")}>
                                    ตั้งค่าการแจ้งเตือน
                                </button>

                                {/* <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("document_code_management")}>
                                    ตั้งค่าเลขเอกสาร
                                </button> */}
                                <button
                                    className="btn btn-secondary setting-menu-selection"
                                    onClick={() => navigate("work_setting")}>
                                    ตั้งค่าการทำงาน
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Content>
    );

}

export default MainMenuSetting