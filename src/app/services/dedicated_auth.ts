import EnvConfig from "../environments/envConfig";
import { authTokenDedicated } from "../helpers/authenticationHelpers";
import { saveIsAllBranch } from "../helpers/appHelpers";
import { front_api } from "./apiConfig";
import Swal from 'sweetalert2';

const selectBranch = async (branch_select_token: string, branch_id: number | string) => {
    try {
        console.log(branch_select_token, branch_id)
        const response = await front_api(
            "POST",
            `/select-branch`,
            { branch_select_token, branch_id },
            { wrapData: false }
        );
        console.log("response", response)
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        return await response.json();
    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการเลือกสาขา" };
    }
};

const selectAllBranch = async (branch_select_token: string) => {
    try {
        const response = await front_api(
            "POST",
            `/select-all-branch`,
            { branch_select_token },
            { wrapData: false }
        );
        if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        return await response.json();
    } catch (error) {
        return { success: false, message: "เกิดข้อผิดพลาดในการเลือกดูทุกสาขา" };
    }
};

export const login = async (username: string, password: string) => {
    try {
        const response = await front_api("POST", `/login`, { username, password }, { wrapData: false })
        if (!response) {
            return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
        }
        const data = await response.json();

        if (data.success) {
            const { branch_select_token, user_branches, has_all_branch_access } = data;

            if (!user_branches || (user_branches.length === 0 && !has_all_branch_access)) {
                return { success: false, message: "คุณยังไม่ได้รับสิทธิ์เข้าถึงสาขาใดเลย กรุณาติดต่อ Admin" };
            }

            // Store branch data in sessionStorage for the branch select page
            sessionStorage.setItem('branch_select_data', JSON.stringify({
                user_branches,
                has_all_branch_access: !!has_all_branch_access,
            }));

            return {
                success: true,
                requireBranchSelect: true,
                branch_select_token,
            };

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

export const handleBranchSelect = async (branchSelectToken: string, branchId: number | string, branchName: string) => {
    try {
        const selectResult = await selectBranch(branchSelectToken, branchId);
        if (!selectResult.success) {
            return { success: false, message: selectResult.message || "เกิดข้อผิดพลาดในการตรวจสอบสาขา" };
        }
        const { access_token, refresh_token } = selectResult;
        const authResult = authTokenDedicated(access_token, refresh_token);
        saveIsAllBranch(false);
        localStorage.setItem('activeBranchName', branchName);
        sessionStorage.removeItem('branch_select_data');
        return { authResult, success: true };
    } catch (error) {
        console.error("handleBranchSelect Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเลือกสาขา" };
    }
};

export const handleAllBranchSelect = async (branchSelectToken: string) => {
    try {
        const selectResult = await selectAllBranch(branchSelectToken);
        if (!selectResult.success) {
            return { success: false, message: selectResult.message || "เกิดข้อผิดพลาดในการเลือกดูทุกสาขา" };
        }
        const { access_token, refresh_token } = selectResult;
        const authResult = authTokenDedicated(access_token, refresh_token);
        saveIsAllBranch(true);
        localStorage.setItem('activeBranchName', 'ทุกสาขา');
        sessionStorage.removeItem('branch_select_data');
        return { authResult, success: true };
    } catch (error) {
        console.error("handleAllBranchSelect Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเลือกดูทุกสาขา" };
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
    per_page: number,
    search: string = "",
    roleId?: number | string,
) => {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: per_page.toString(),
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