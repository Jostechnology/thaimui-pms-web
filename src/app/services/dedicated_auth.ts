import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { front_api } from "./apiConfig";


export const login = async (username: string, password: string) => {
    try {
        const response = await front_api("POST", `/login`, { username, password }, { wrapData: false })
        if (!response) {
            console.log("What ?")
            return false
        }
        const data = await response.json();

        if (data.success) {
            return authTokenDedicated(data.access_token, data.refresh_token)
        } else {
            return false
        }
    } catch (error) {
        return false;
    }
};

export const refresh = async (refresh_token: string) => {
    try {
        const env = new EnvConfig()
        const response = await fetch(`${env.front_api}/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token }),
        });
        return response;
    } catch (error) {
        console.error("Refresh Error:", error);
        return false;
    }
};

export const register = async (username: string , password: string) => {
    const body = {
        username:username,
        password:password
    }
    try {
        const response = await front_api("POST", `/register`, body, { wrapData: false })
        if (!response) return false

        const result = await response.json()

        if (!response.ok) {
            return { ...result, success: false }
        }

        return result
    } catch (error) {
        return false
    }
}
export const getUserList = async (
    page: number,
    limit: number,
    search: string = "",
    roleId?: number | string,
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        const group_id = getGroupId()

        if (search) params.append("username", search);
        if (roleId && roleId !== "") params.append("role_id", roleId.toString());
        if (group_id) params.append("group_id", group_id.toString());

        const response = await front_api("GET", `/get_user_list?${params.toString()}`, {}, { wrapData: false })
        if (!response) return false
        return await response.json()
    } catch (error) {
        return false
    }
}

// Edit User
export const editUser = async (data: any) => {
    const body = {
        username: data.username,
        role_id: data.role_id,
        update_by: "system"
    }
    try {
        const response = await front_api("POST", `/edit_user`, body, { wrapData: false })
        if (!response) return false

        const result = await response.json()

        // เพิ่ม: ถ้า HTTP Status ไม่โอเค ให้บังคับ success = false
        if (!response.ok) {
            return { ...result, success: false }
        }

        return result
    } catch (error) {
        return false
    }
}

// Change Password
export const changePassword = async (data: any) => {
    const body = {
        username: data.username,
        old_password: data.old_password,
        new_password: data.new_password
    }
    try {
        const response = await front_api("POST", `/change_password_islolate`, body, { wrapData: false })
        if (!response) return false

        const result = await response.json()

        if (!response.ok) {
            return { ...result, success: false }
        }

        return result
    } catch (error) {
        return false
    }
}