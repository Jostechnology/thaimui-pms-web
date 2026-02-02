import React, { useEffect, useState } from "react"
import { useMasterData } from "../context/MasterDataContext";
import { KTIcon } from "../../_metronic/helpers";

interface TableActionProps {
    isViewBtnShow?: boolean;
    isEditBtnShow?: boolean;
    isDeleteBtnShow?: boolean;
    handleView?: () => void;
    handleEdit?: () => void;
    handleDelete?: () => void;
}

// ใช้กับตารางหน้า List รายการหลักเท่านั้น :)
const TableActionButton: React.FC<TableActionProps> = ({
    isViewBtnShow=true,
    isEditBtnShow=true,
    isDeleteBtnShow=true,
    handleView=() => {},
    handleEdit=() => {},
    handleDelete=() => {},
}) => {

    const { masterData } = useMasterData();
    const { actionList } = masterData;
    const [isViewAllow, setIsViewAllow] = useState<boolean>(false);
    const [isEditAllow, setIsEditAllow] = useState<boolean>(false);
    const [isDeleteAllow, setIsDeleteAllow] = useState<boolean>(false);

    const managePermission = () => {
        const path = window.location.pathname;
        const module = actionList.filter(module => module.path === path)[0];
        const permission = module.permission;
        setIsViewAllow(permission.includes("view"));
        setIsEditAllow(permission.includes("edit"));
        setIsDeleteAllow(permission.includes("delete"));
    }

    useEffect(() => {
        if (actionList.length > 0) {
            managePermission();
        }
    }, [masterData.actionList])

    return (
        <>
            {
                isViewBtnShow && isViewAllow ?
                <button onClick={handleView}
                    className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'>
                    <i className='fas fa-eye text-muted hover:text-primary fs-3'></i>
                </button> : null
            }

            {
                isEditBtnShow && isEditAllow ?
                <button onClick={handleEdit}
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1">
                    <KTIcon iconName="pencil" className="fs-3" />
                </button> : null
            }

            {
                isDeleteBtnShow && isDeleteAllow ?
                <button onClick={handleDelete}
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1"
                >
                    <KTIcon iconName="trash" className="fs-3" />
                </button> : null
            }

            {
                !isViewAllow && !isEditAllow && !isDeleteAllow ?
                "-" : null
            }
        </>
    );

}

export default TableActionButton