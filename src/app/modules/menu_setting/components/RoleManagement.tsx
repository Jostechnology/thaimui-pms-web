import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate } from "react-router-dom";
import { KTIcon } from "../../../../_metronic/helpers";
import { useState, useEffect } from "react";
import {
    RoleToList, CreateRoleForm, ModuleRequest, SubModule,
    Module, PermissionResponse
} from "../../../type_interface/SettingType";
import { createRole, getRoleList, getRolePermission, editRole } from "../../../services/settingServices";
import AddEditRoleModal from "../../../modals/setting_modal/AddEditRoleModal";
import { useAlertModal } from "../../../context/ModalContext";
import { useAppLoading } from "../../../context/AppLoadingContext";
import { useMasterData } from "../../../context/MasterDataContext";
import { getUsernameLocal } from "../../../helpers/appHelpers";

const RoleManagement = () => {

    const navigate = useNavigate();
    const { alertMessage, openAlertModal, resetModal } = useAlertModal();
    const { setLoading, setUnLoading } = useAppLoading();
    const { updatePermission } = useMasterData();

    const [isModalShow, setIsModalShow] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [isWatch, setIsWatch] = useState<boolean>(false);
    const [roleList, setRoleList] = useState<RoleToList[]>([]);
    const formState: CreateRoleForm = {
        role_id: "",
        role_name: "",
        role_code : "",
        description: "",
        module_list: []
    };
    const [formData, setFormData] = useState<CreateRoleForm>({ ...formState });
    const [permissionList, setPermissionList] = useState<string[][][]>([]);

    const fetchAllRole = async () => {
        try {
            let result = await getRoleList();
            if (result) {
                if (result.success) {
                    console.log(result)
                    let data = result.data as RoleToList[];
                    
                    setRoleList(data);
                } else {
                    console.log(result.message);
                }
            } else {
                throw new Error("getRoleList returns error.");
            }
        } catch (e) {
            console.error(e);
        }
    }

    const fetchRolePermission = async (role_id: any) => {
        try {
            let result = await getRolePermission(role_id);
            if (result) {
                if (result.success) {
                    return result.data;
                } else {
                    alertMessage(result.message);
                    return false;
                }
            } else {
                throw new Error("getRolePermission returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchRolePermission returns error.");
            return false;
        }
    }

    const handleOnEdit = async (role: RoleToList, isWatch: boolean = false) => {
        setLoading();
        try {
            setIsEdit(true);
            let result = await fetchRolePermission(role.role_id) as Module[];
            if (!result) return;

            let moduleList: any = [
                ...result.map(item => {
                    return [
                        ...item.sub_modules.map((sub: SubModule) => {
                            return sub.permission.map((permission: any) => {
                                let per = permission as PermissionResponse;
                                if (per.check) return per.method;
                            });
                        })
                    ];
                })
            ];

            let selectedData: CreateRoleForm = {
                role_id: role.role_id,
                role_name: role.role_name,
                description: role.description,
                role_code : role.role_code,
                module_list: []
            };
            setIsWatch(isWatch);
            setPermissionList(moduleList);
            setFormData({ ...selectedData });
            setIsModalShow(true);
        } catch (e) {
            alertMessage("เกิดข้อผิดพลาดระหว่างการดาวน์โหลดข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    useEffect(() => {
        fetchAllRole();
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(state => ({ ...state, [name]: value }));
    }

    const handleDeleteRole = (roleId: number | string) => {

    }

    const handleSubmit = async (module_list: ModuleRequest[]) => {
        setLoading();
        try {
            let requestForm: CreateRoleForm = {
                ...formData,
                module_list: [...module_list]
            }
            let result = await createRole(requestForm);
            if (result) {
                if (result.success) {
                    openAlertModal("บันทึกข้อมูลสำเร็จ", () => {
                        resetModal();
                        setIsModalShow(false);
                        setFormData({ ...formState });
                        updatePermission();
                        fetchAllRole();
                    }, true);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("createRole returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("handleSubmit returns error.");
            alertMessage("เกิดข้อผิดพลาดระหว่างการบันทึกข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    const handleSubmitEdit = async (module_list: ModuleRequest[]) => {
        setLoading();
        try {
            let requestForm: CreateRoleForm = {
                ...formData,
                module_list: [...module_list]
            }
            let result = await editRole(requestForm);
            if (result) {
                if (result.success) {
                    openAlertModal("บันทึกข้อมูลสำเร็จ", () => {
                        resetModal();
                        setIsModalShow(false);
                        setFormData({ ...formState });
                        setIsEdit(false);
                        updatePermission();
                        fetchAllRole();
                    }, true);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("editRole returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("handleSubmitEdit returns error.");
            alertMessage("เกิดข้อผิดพลาดระหว่างการบันทึกข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    const handleClose = () => {
        setIsModalShow(false);
        setIsWatch(false);
        setIsEdit(false);
        setFormData({ ...formState });
    }

    return (
        <Content>

            {
                !isModalShow ? null :
                    <AddEditRoleModal
                        isWatch={isWatch}
                        isEdit={isEdit}
                        formData={formData}
                        selectedPermissionList={permissionList}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        handleSubmitEdit={handleSubmitEdit}
                        handleClose={handleClose}
                    />
            }

            <div className="row g-5 g-xxl-8">
                <div className='col-xl-12'>
                    <div className={`card mb-5 mb-xl-8`}>
                        <div className="card-header border-0 pt-5 d-flex justify-content-between align-items-center">
                            <h3 className="card-title align-items-start flex-row">
                                <button onClick={() => navigate("/setting")}
                                    className="d-flex align-items-center text-gray-800 text-hover-primary fs-2 fw-bolder me-1"
                                    style={{ border: "none", background: "none" }}>
                                    <KTIcon iconName="arrow-left" className="fs-4 me-2" />
                                </button>
                                <span className="card-label fw-bold fs-3 mb-1">
                                    Role Management
                                </span>
                            </h3>

                            <div className="d-flex align-items-center">
                                <button
                                    type="button"
                                    className="btn btn-primary ms-8"
                                    onClick={() => setIsModalShow(true)}
                                    style={{ height: "40px", paddingTop: "5px" }}
                                >
                                    <span style={{ fontSize: "20px" }}>Create</span>
                                </button>
                            </div>
                        </div>

                        <div className="card-body py-3">
                            <div className="table-responsive">
                                <table className="table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3"
                                    style={{ tableLayout: "fixed", width: "100%" }}>

                                    <thead>
                                        <tr className="fw-bold text-muted">
                                            <th className="fs-3 text-center">รหัสบทบาท</th>
                                            <th className="fs-3 text-center">ชื่อบทบาท</th>
                                            <th className="fs-3 text-center">รายละเอียด</th>
                                            <th className="fs-3 text-center">สถานะ</th>
                                            <th className="fs-3 text-center" style={{ width: "auto" }}>
                                                จัดการ
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {
                                            roleList.map((role, index) => {
                                                return (
                                                    <tr key={`role-${index}`}>
                                                        <td className="text-center">{role.role_code}</td>
                                                        <td className="text-center">{role.role_name}</td>
                                                        <td className="text-center">{role.description}</td>
                                                        <td className="text-center">
                                                            <span className={
                                                                role.active_flag ? `badge badge-light-success`
                                                                    : `badge badge-light-danger`}>
                                                                {role.active_flag ? "Active" : "InActive"}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <button onClick={() => { handleOnEdit(role, true) }}
                                                                className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'>
                                                                <i className='fas fa-eye text-muted hover:text-primary fs-3'></i>
                                                            </button>

                                                            <button onClick={() => handleOnEdit(role)}
                                                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1">
                                                                <KTIcon iconName="pencil" className="fs-3" />
                                                            </button>

                                                            {/* <button
                                                                onClick={() => handleDeleteRole(role.role_id)}
                                                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1"
                                                            >
                                                                <KTIcon iconName="trash" className="fs-3" />
                                                            </button> */}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        }
                                    </tbody>

                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Content>
    );
}

export default RoleManagement