import { front_api } from "./apiConfig";
import {
    getUsernameLocal, getUserIdFromLocal,
    getRoleId,
    savePermTree,
    saveSignaturePermTree
} from "../helpers/appHelpers";

// ------------------------------------- path -------------------------------------

// Get Details
const get_module_id = "/get_module_id?module_id=";
const get_module_sorted = "/get_module_sorted?module_id=";
const get_role_permission = "/get_role_permission";

// get list
const get_module_tree = "/get_module_tree";
const get_main_module_list = "/get_modules_main";
const get_all_roles = "/get_all_roles";

// Create || Add
const create_module = "/create_module";
const create_role_permission = "/create_role_permission";

// Edit || Update
const edit_module = "/edit_module";
const upsert_role_permission = "/upsert_role_permission";

// Delete
const delete_module = "/delete_module";

// ----------------------------------- services -----------------------------------

export const getModuleDetails = async (moduleId: any) => {
    const fullpath = get_module_id + moduleId;
    const body = {
        username: getUsernameLocal()
    };

    // logsPath("POST", fullpath);
    const response = await front_api("POST", fullpath, body, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const getSortOrder = async (moduleId: any) => {
    const fullpath = get_module_sorted + moduleId;
    const body = {
        username: getUsernameLocal()
    };

    // logsPath("POST", fullpath);
    const response = await front_api("POST", fullpath, body, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const getRolePermission = async (role_id: any) => {
    const currentRoleId = getRoleId();
    const body: any = {
        username: role_id ? "" : getUsernameLocal()
    };
    if (role_id) {
        body.role_id = role_id;
    } else if (currentRoleId && currentRoleId !== "undefined") {
        body.role_id = Number(currentRoleId);
    }

    // logsPath("POST", get_role_permission);
    const response = await front_api("POST", get_role_permission, body, { wrapData: false });

    if (!response) {
        console.error("Cant fetch permissions");
        return false;
    }

    try {
        const result = await response.json();
        console.log(result);

        const base64Encoded = result.data.module_tree;
        const jsonStr = atob(base64Encoded);
        const moduleTree = JSON.parse(jsonStr);

        const result_perm = {
            "success": result.data.success,
            "data": moduleTree,
            "message": result.data.message || result.message || ""
        };

        savePermTree(base64Encoded);
        saveSignaturePermTree(result.data.signature);
        console.log(result_perm)
        return result_perm;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const getModuleList = async () => {
    // logsPath("POST", get_module_tree);
    const response = await front_api("POST", get_module_tree, {}, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const getMainModuleList = async () => {
    // logsPath("POST", get_main_module_list);
    const response = await front_api("POST", get_main_module_list, {}, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const getRoleList = async () => {
    const roleId = getRoleId();
    const body: any = {
        username: getUsernameLocal()
    };
    if (roleId && roleId !== "undefined") {
        body.role_id = Number(roleId);
    }

    // logsPath("POST", get_all_roles);
    const response = await front_api("POST", get_all_roles, body, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const createModule = async (formData: any) => {
    const request = {
        ...formData,
        username: getUsernameLocal(),
        user_id: getUserIdFromLocal()
    };

    // logsPath("POST", create_module);
    const response = await front_api("POST", create_module, request, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const createRole = async (formData: any) => {
    const request = {
        ...formData,
        username: getUsernameLocal(),
        user_id: getUserIdFromLocal()
    };

    // logsPath("POST", create_role_permission);
    const response = await front_api("POST", create_role_permission, request, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const editModule = async (formData: any) => {
    const request = {
        ...formData,
        username: getUsernameLocal(),
        user_id: getUserIdFromLocal()
    };

    // logsPath("PUT", edit_module);
    const response = await front_api("PUT", edit_module, request, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const editRole = async (formData: any) => {
    const request = {
        ...formData,
        username: getUsernameLocal(),
        user_id: getUserIdFromLocal()
    };

    // logsPath("PUT", upsert_role_permission);
    const response = await front_api("PUT", upsert_role_permission, request, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const deleteModule = async (module_id: number) => {
    const body = {
        module_id: module_id,
        username: getUsernameLocal()
    };

    // logsPath("DELETE", delete_module);
    const response = await front_api("DELETE", delete_module, body, { wrapData: false });

    if (!response) return false;

    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}