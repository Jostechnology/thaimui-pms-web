import { Content } from "../../../../_metronic/layout/components/content"
import React, { useEffect, useState } from "react";
import {
    getModuleList, createModule, editModule, getModuleDetails,
    deleteModule
} from "../../../services/settingServices";
import { useAlertModal } from "../../../context/ModalContext";
import { useAppLoading } from "../../../context/AppLoadingContext";
import { Module, ModuleForm } from "../../../type_interface/SettingType";
import AddEditModuleModal from "../../../modals/setting_modal/AddEditModuleModal";
import { useNavigate } from "react-router-dom";
import { KTIcon } from "../../../../_metronic/helpers";

const ModuleManagement = () => {

    const navigate = useNavigate();
    const {
        alertMessage, openAlertModal, resetModal,
        openTwoBtnAlertModal
    } = useAlertModal();
    const { setLoading, setUnLoading } = useAppLoading();

    const [moduleList, setModuleList] = useState<Module[]>([]);
    const [isModalShow, setIsModalShow] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const formState: ModuleForm = {
        module_name: "",
        module_code: "",
        sort_order: "",
        parent_id: "",
        level: 0,
        permission_list: [],
        permission: []
    };
    const [formData, setFormData] = useState<ModuleForm>(formState);
    const [selectedId, setSelectedId] = useState<number | string>("");

    const fetchModuleList = async () => {
        setLoading();
        try {
            let result = await getModuleList();
            if (result) {
                if (result.success) {
                    let data = result.data as Module[];
                    setModuleList(data);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("getModuleList returns error.");
            }
        } catch (e) {
            console.error(e);
            alertMessage("เกิดข้อผิดพลาดระหว่างการโหลดข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    useEffect(() => {
        fetchModuleList();
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "level") {
            setFormData(state => ({
                ...state,
                [name]: parseInt(value),
                parent_id: "",
                sort_order: ""
            }));
            return;
        }
        setFormData(state => ({ ...state, [name]: value }));
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading();
        try {
            if (formData.level === 2) {
                if (!formData.parent_id || !formData.sort_order) {
                    alertMessage("กรุณาเลือกเมนูหลัก");
                    return;
                }
            }

            let result = await createModule(formData);
            if (result) {
                if (result.success) {
                    openAlertModal("บันทึกข้อมูลสำเร็จ", () => {
                        resetModal();
                        setIsModalShow(false);
                        setFormData({ ...formState });
                        setIsEdit(false);
                        setSelectedId("");
                        fetchModuleList();
                    }, true);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("createModule returns error.");
            }
        } catch (e) {
            console.error(e);
            alertMessage("เกิดข้อผิดพลาดระหว่างการบันทึกข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    const handleSubmitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading();
        try {
            if (formData.level === 2) {
                if (!formData.parent_id) {
                    alertMessage("กรุณาเลือกเมนูหลัก");
                    return;
                }
            }
            let result = await editModule(formData, selectedId);
            if (result) {
                if (result.success) {
                    openAlertModal("บันทึกข้อมูลสำเร็จ", () => {
                        resetModal();
                        setIsModalShow(false);
                        setFormData({ ...formState });
                        setIsEdit(false);
                        setSelectedId("");
                        fetchModuleList();
                    }, true);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("editModule returns error.");
            }
        } catch (e) {
            console.error(e);
            alertMessage("เกิดข้อผิดพลาดระหว่างการบันทึกข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    const handleClose = () => {
        setIsModalShow(false);
        setIsEdit(false);
        setSelectedId("");
        setFormData({ ...formState });
    }

    const handleOpenEdit = async (module_id: string | number) => {
        setLoading();
        try {
            let result = await getModuleDetails(module_id);
            if (result) {
                if (result.success) {
                    let data = result.data as ModuleForm;
                    setFormData(state => ({
                        ...state,
                        ...data,
                        permission_list: data.permission_list
                    }));
                    setIsEdit(true);
                    setSelectedId(module_id);
                    setIsModalShow(true);
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("getModuleDetails returns error.");
            }
        } catch (e) {
            console.error(e);
            alertMessage("เกิดข้อผิดพลาดระหว่างการประมวลผล");
            setIsEdit(false);
            setSelectedId("");
        } finally {
            setUnLoading();
        }
    }

    const onSelectDeleteModule = (module: ModuleForm) => {
        openTwoBtnAlertModal(`ต้องการลบ item: ${module.module_name} ใช่หรือไม่`, () => {
            resetModal();
            setLoading();
            setTimeout(() => handleDeleteModule(parseInt(selectedId.toString())), 2000);
        }, resetModal);
    }

    const handleDeleteModule = async (module_id: number) => {
        try {
            let result = await deleteModule(module_id);
            if (result) {
                if (result.success) {
                    openAlertModal(`ลบ module_id: ${module_id} เสร็จสิ้น`, () => {
                        resetModal();
                        setIsModalShow(false);
                        setFormData({ ...formState });
                        setIsEdit(false);
                        setSelectedId("");
                        fetchModuleList();
                    }, true)
                } else {
                    alertMessage(result.message);
                }
            } else {
                throw new Error("deleteModule returns error.");
            }
        } catch (e) {
            console.error(e);
            alertMessage("เกิดข้อผิดพลาดระหว่างการบันทึกข้อมูล");
        } finally {
            setUnLoading();
        }
    }

    return (
        <Content>

            {
                !isModalShow ? null :
                    <AddEditModuleModal
                        isEdit={isEdit}
                        isModalShow={isModalShow}
                        formData={formData}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        handleSubmitEdit={handleSubmitEdit}
                        handleClose={handleClose}
                        handleDelete={onSelectDeleteModule}
                    />
            }

            <div className="row g-5 g-xxl-8">
                <div className='col-xl-12'>
                    <div className={`card mb-5 mb-xl-8`}>

                        <div className="card-header border-0 pt-5 d-flex justify-content-between align-items-center">
                            <h3 className="card-title align-items-start flex-row">
                                <span className="card-label fw-bold fs-3 mb-1">
                                    Module Management
                                </span>
                            </h3>

                            <div className="d-flex align-items-center">
                                <button
                                    type="button"
                                    className="btn btn-primary ms-8"
                                    onClick={() => setIsModalShow(true)}
                                    style={{ height: "40px", paddingTop: "5px" }}
                                >
                                    <span style={{ fontSize: "20px" }}>+</span>
                                </button>
                            </div>
                        </div>

                        <div className="card-body py-3">
                            <div className="table-responsive">
                                <table className="table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3"
                                    style={{ tableLayout: "fixed", width: "100%" }}>
                                    <thead>
                                        <tr className="fw-bold text-muted">
                                            <th className="fs-3" style={{ paddingLeft: "10px" }}>Module Code</th>
                                            <th className="fs-3">Module Name</th>
                                            <th className="fs-3 text-center" style={{ width: "120px" }}>
                                                จัดการ
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {
                                            moduleList.map((module, module_index) => {
                                                return (
                                                    <React.Fragment key={module_index}>
                                                        <tr style={{ backgroundColor: "rgb(179, 209, 255)" }}>
                                                            <td className="fs-5" style={{ paddingLeft: "10px" }}>
                                                                <strong>{module.module_code}</strong>
                                                            </td>
                                                            <td className="fs-5"><strong>{module.module_name}</strong></td>
                                                            <td className="min-w-50px text-center">
                                                                <button
                                                                    className="btn btn-icon btn-active-light-primary"
                                                                    onClick={() => handleOpenEdit(module.module_id)}>
                                                                    <i className="ki-outline ki-setting fs-2"></i>
                                                                </button>
                                                                <></>
                                                            </td>
                                                        </tr>
                                                        {
                                                            module.sub_modules.map((sub_module, sub_index) => {
                                                                return (
                                                                    <tr key={sub_index}>
                                                                        <td className="fs-5" style={{ paddingLeft: "10px" }}>- {sub_module.module_code}</td>
                                                                        <td className="fs-5">{sub_module.module_name}</td>
                                                                        <td className="min-w-50px text-center">
                                                                            <button
                                                                                className="btn btn-icon btn-active-light-primary"
                                                                                onClick={() => handleOpenEdit(sub_module.module_id)}>
                                                                                <i className="ki-outline ki-setting fs-2"></i>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        }
                                                    </React.Fragment>
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

export default ModuleManagement