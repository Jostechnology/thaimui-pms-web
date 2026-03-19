import EnvConfig from "../environments/envConfig";
import { getGroupId, getTokenFromLocal } from "../helpers/appHelpers";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { front_api } from "./apiConfig";
import Swal from 'sweetalert2';

export const login = async (username: string, password: string) => {
    try {
        const response = await front_api("POST", `/login`, { username, password }, { wrapData: false })
        if (!response) {
            return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        }
        const data = await response.json();
        
        console.log("Login Response:", data);

        if (data.success) {
            const { access_token, refresh_token, user_branches } = data;

            if (!user_branches || user_branches.length === 0) {
                return { success: false, message: "คุณยังไม่ได้รับสิทธิ์เข้าถึงสาขาใดเลย กรุณาติดต่อ Admin" };
            }

            if (user_branches.length === 1) {
                const authResult = authTokenDedicated(access_token, refresh_token, user_branches[0].branch_id);
                return { authResult, success: true };
            }

            const branchOptions: Record<string, string> = {};
            user_branches.forEach((b: any) => {
                branchOptions[b.branch_id] = b.branch_name; 
            });

            const { value: selectedBranchId } = await Swal.fire({
                title: 'เลือกสาขาที่ต้องการเข้าทำงาน',
                input: 'select',
                inputOptions: branchOptions,
                inputPlaceholder: '-- กรุณาเลือกสาขา --',
                showCancelButton: true,
                confirmButtonText: 'เข้าสู่ระบบ',
                cancelButtonText: 'ยกเลิก',
                inputValidator: (value) => {
                    if (!value) return 'กรุณาเลือกสาขาก่อนเข้าสู่ระบบ!';
                }
            });

            if (selectedBranchId) {
                const authResult = authTokenDedicated(access_token, refresh_token, selectedBranchId);
                return { authResult, success: true };
            } else {
                return { success: false, message: "ยกเลิกการเข้าสู่ระบบ" };
            }

        } else {
            return { 
                success: false, 
                message: data.error || "Username หรือ Password ไม่ถูกต้อง" 
            };
        }
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
    }
};

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    
    // เรียก API ลบ token ใน database
    await front_api("POST", `/logout`, { refresh_token: refreshToken }, { wrapData: false });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // ลบ tokens ใน browser ไม่ว่า API จะสำเร็จหรือไม่
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // redirect ไปหน้า login
    window.location.href = '/login';
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

export const createUser = async (username: string , password: string , role_id: number) => {
    const body = {
        username:username,
        password:password,
        role_id:role_id,
    }
    try {
        const response = await front_api("POST", `/create_user`, body, { wrapData: false })
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
            pageConfig: limit.toString(),
        });
        
        if (search) params.append("search", search); 
        
        if (roleId && roleId !== "") params.append("filter", roleId.toString()); 

        const response = await front_api("GET", `/get_user_list?${params.toString()}`, {}, { wrapData: false });
        
        if (!response) return false;
        return await response.json();
    } catch (error) {
        return false;
    }
}

// Edit User role
export const editUser = async (data: any) => {
    const body = {
        username: data.username,
        role_id: data.role_id,
        updated_by: "system"
    }
    try {
        const response = await front_api("PUT", `/change_user_role`, body, { wrapData: false })
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

// Change Password
export const changePassword = async (data: any) => {
    const body = {
        username: data.username,
        old_password: data.old_password,
        new_password: data.new_password
    }
    try {
        const response = await front_api("PUT", `/change_user_password`, body, { wrapData: false })
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

export const banUser = async (data: any) => {
    const body = {
        username: data.username,
        is_active: data.is_active,
        updated_by: data.updated_by
    };

    try {
        const response = await front_api("PUT", `/ban_user`, body, { wrapData: false });
        if (!response) {
            return { success: false, message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
        }

        const result = await response.json();
        if (!response.ok) {
            return { 
                ...result, 
                success: false, 
                message: result.message || "เกิดข้อผิดพลาดจากทางเซิร์ฟเวอร์" 
            };
        }
        return { ...result, success: true };

    } catch (error: any) {
        console.error("API banUser Error:", error);
        return { 
            success: false, 
            message: error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" 
        };
    }
};