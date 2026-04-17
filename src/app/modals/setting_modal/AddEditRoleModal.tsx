import { Form } from "react-bootstrap";
import { getModuleList } from "../../services/settingServices";
import { useEffect, useState } from "react";
import {
    Module, AddRoleModalProps, ModuleRequest, SubModule
} from "../../type_interface/SettingType";
import React from "react";

const AddEditRoleModal = (props: AddRoleModalProps) => {

    const {
        isWatch,
        isEdit,
        formData,
        selectedPermissionList,
        handleChange,
        handleSubmit,
        handleSubmitEdit,
        handleClose
    } = props;

    const [moduleList, setModuleList] = useState<Module[]>([]);
    const [permissionList, setPermissionList] = useState<string[][][]>([]);
    const [checkAllState, setCheckAllState] = useState<boolean[]>([]);

    const fetchModuleList = async () => {
        try {
            let result = await getModuleList();
            if (result) {
                if (result.success) {
                    let data = result.data as Module[];
                    setModuleList(data);
                    console.log('[DEBUG] getModuleList sub.permission sample:', data[0]?.sub_modules?.[0]?.permission);
                    console.log('[DEBUG] selectedPermissionList:', selectedPermissionList);
                    let checkAllArr: boolean[] = [];
                    let initPermissionState = data.map((dataItem: Module) => {
                        checkAllArr.push(false);
                        return [
                                ...dataItem.sub_modules.map((sub: SubModule) => {
                                    if (isEdit) {
                                        return [...(selectedPermissionList[sub.module_code] ?? [])];
                                    } else {
                                        return [];
                                    }
                                })
                            ];
                    });
                    setCheckAllState([...checkAllArr]);
                    setPermissionList(initPermissionState as any);
                }
            } else {
                throw new Error("getModuleList returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchModuleList returns error.");
        }
    }

    useEffect(() => {
        fetchModuleList();
    }, [])

    const handleAddRemoveSelectPermission = (
        main_index: number, sub_index: number, action: string 
    ) => {
        let newArr = [...permissionList];
        if (newArr[main_index][sub_index].includes(action)) {
            let rmTarget = newArr[main_index][sub_index].indexOf(action);
            newArr[main_index][sub_index].splice(rmTarget, 1);
            if (checkAllState[main_index]) {
                let checkAllArr = [...checkAllState];
                checkAllArr[main_index] = false;
                setCheckAllState([...checkAllArr]);
            }
        } else {
            newArr[main_index][sub_index].push(action);
        }
        setPermissionList([...newArr]);
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, main_index: number) => {
        let newArr = [...permissionList];
        let checkAllArr = [...checkAllState];
        if (e.target.checked) {
            newArr[main_index] = newArr[main_index].map((subItem, sub_index) => {
                return [...moduleList[main_index].sub_modules[sub_index].permission] as string[];
            });
            checkAllArr[main_index] = true;
        } else {
            newArr[main_index] = newArr[main_index].map(subItem => {
                return [];
            });
            checkAllArr[main_index] = false;
        }
        console.log(newArr);
        setPermissionList([...newArr]);
        setCheckAllState([...checkAllArr]);
    }

    const handleSubmitWithModuleList = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        let modulesToSend: ModuleRequest[] = [];
        try {
            for (let i = 0; i < moduleList.length; i++) {
                let sub_module = moduleList[i].sub_modules;
                for (let j = 0; j < sub_module.length; j++) {
                    permissionList[i][j].forEach(permission => {
                        modulesToSend.push({
                            module_id: sub_module[j].module_id,
                            method: permission
                        })
                    })
                }
            }

            if (isEdit) {
                handleSubmitEdit(modulesToSend);
            } else {
                handleSubmit(modulesToSend);
            }
        } catch (e) {
            console.error(e);
            console.log("handleSubmitWithModuleList returns error.");
        }
    }

    const modalContent = (
        <>
            <div className="fade modal-backdrop show" style={{ zIndex: "7998" }}></div>
            <div role="dialog" aria-modal="true"
                className="fade modal show" tabIndex={-1}
                style={{ display: "flex", zIndex: "7999", justifyContent: "center", alignItems: "center" }}>

                <div className="custom-modal-content custom-modal-w-900px">

                    <div className="modal-header">
                        <h5 className="modal-title">
                            {
                                isWatch ? "Role Details" :
                                isEdit ? "Edit Role" :
                                "Add Role"  
                            }
                        </h5>
                    </div>

                    <Form onSubmit={handleSubmitWithModuleList}>
                        <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                            <h2 className="modal-header-section">
                                Role Details
                            </h2>
                            <div style={{ padding: "20px" }} className="modal-display-grid-2-col">

                                <div>
                                    <label className="form-label required">
                                        Role Code
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="role_code"
                                        value={formData.role_code}
                                        onChange={handleChange}
                                        required
                                        disabled={isEdit}
                                    />
                                </div>

                                <div>
                                    <label className="form-label required">
                                        Role Name
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="role_name"
                                        value={formData.role_name}
                                        onChange={handleChange}
                                        required
                                        disabled={isEdit}
                                    />
                                </div>

                                <div>
                                    <label className="form-label required">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        required
                                        disabled={isEdit}
                                    />
                                </div>

                            </div>

                            <h2 className="modal-header-section">
                                Role Permission
                            </h2>
                            <div style={{ padding: "10px 20px",overflowX: "scroll" }}>
                                <div className="cal-details-table">
                                    <table className="table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3"
                                        style={{ tableLayout: "fixed", width: "100%", minWidth: "500px" }}>
                                        <tbody>
                                            {
                                                moduleList.map((item: Module, main_index) => {
                                                    return (
                                                        <React.Fragment key={`module-${main_index}`}>
                                                            <tr style={{backgroundColor: "grey", color: "white"}}>
                                                                <td style={{ fontSize: "18px",  paddingLeft: "10px", fontWeight: "bold", width: "250px" }}>
                                                                    {item.module_name}
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                                                                        <input
                                                                            id={`check-main-${main_index}`}
                                                                            type="checkbox"
                                                                            onChange={e => handleSelectAll(e, main_index)}
                                                                            checked={checkAllState[main_index]}
                                                                            style={{ height: "30px", width: "20px", marginRight: "10px" }}
                                                                            disabled={isWatch}
                                                                        />
                                                                        <label htmlFor={`check-main-${main_index}`} style={{ fontSize: "16px" }}>Select All</label>
                                                                    </div>
                                                                </td>
                                                                <td></td>
                                                                <td></td>
                                                                <td></td>
                                                            </tr>
                                                            {
                                                                item.sub_modules.map((sub: SubModule, sub_index) => {
                                                                    return (
                                                                        <tr key={sub_index}>
                                                                            <td style={{ fontSize: "18px", paddingLeft: "10px" }}>{sub.module_name}</td>
                                                                            {
                                                                                (sub.permission as string[]).sort().reverse().map((per, p_index) => {
                                                                                    return (
                                                                                        <td key={`${per}-${p_index}`}>
                                                                                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                                                                                                <input
                                                                                                    id={`check-${main_index}-sub-${sub_index}-${per}`}
                                                                                                    type="checkbox"
                                                                                                    onChange={() => handleAddRemoveSelectPermission(main_index, sub_index, per)}
                                                                                                    checked={permissionList[main_index][sub_index].includes(per)}
                                                                                                    style={{ height: "30px", width: "20px", marginRight: "10px" }}
                                                                                                    disabled={isWatch}
                                                                                                />
                                                                                                <label htmlFor={`check-${main_index}-sub-${sub_index}-${per}`} style={{ fontSize: "16px" }}>{per}</label>
                                                                                            </div>
                                                                                        </td>
                                                                                    );
                                                                                })
                                                                            }
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

                        <div className="modal-footer">
                            <button
                                type="button" className="btn btn-light" onClick={handleClose}
                                style={{ marginRight: "20px" }}>
                                ยกเลิก
                            </button>
                            {
                                isWatch ? null :
                                <button type="submit" className="btn btn-primary"
                                    disabled={false}>
                                    บันทึก
                                </button>
                            }
                        </div>
                    </Form>

                </div>
            </div>
        </>
    )

    return <>{modalContent}</>

}

export default AddEditRoleModal