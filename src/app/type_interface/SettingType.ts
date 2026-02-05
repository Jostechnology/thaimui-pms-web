export interface PermissionResponse {
    check: boolean;
    method: string;
}

export interface SubModule {
    module_code: string;
    module_id: number | string;
    module_name: string;
    sort_order: number;
    permission: string[] | PermissionResponse[];
}

export interface Module extends SubModule {
    sub_modules: SubModule[];
}

export interface MainModule {
    level: number | string;
    module_code: string;
    module_id: number | string;
    module_name: string;
    parent_id: number | string;
    sort_order: number | string;
}

export interface ModuleForm {
    module_name: string;
    module_code: string;
    sort_order: number | string;
    parent_id: number | string;
    level: number;
    permission_list: string[];
    permission: string[];
}

export interface TransformedPermission {
  edit: boolean;
  view: boolean;
  delete: boolean;
  create: boolean;
}

export interface AddModuleModalProps {
    isEdit: boolean;
    isModalShow: boolean;
    formData: ModuleForm;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    handleSubmitEdit: (e: React.FormEvent<HTMLFormElement>) => void;
    handleClose: () => void;
    handleDelete: (module: ModuleForm) => void;
}

export interface Role {
    role_id: number | string;
    role_code : string;
    role_name: string;
    description: string;
}

export interface RoleToList extends Role {
    active_flag: boolean;
}

export interface ModuleRequest {
    module_id: number | string;
    method: string;
}

export interface CreateRoleForm extends Role {
    module_list: ModuleRequest[];
}

export interface AddRoleModalProps {
    isWatch: boolean;
    isEdit: boolean;
    formData: CreateRoleForm;
    selectedPermissionList: string[][][];
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleSubmit: (module_list: ModuleRequest[]) => void;
    handleSubmitEdit: (module_list: ModuleRequest[]) => void;
    handleClose: () => void;
}