import Swal from "sweetalert2";
import EnvConfig from "../environments/envConfig";
import axios from 'axios';

const env = new EnvConfig();
const lcRefresh = "refresh-token"
const lcToken = "tk-jos";
const lcUser = "userId";
const lcUsername = "username";
const lcExpiredDate = "token_expired_date";
const lcRoleId = "role_id";
const lcEmpId = "employee_id";
const lcRoleCode = "role_code";
const lcRoleName = "role_name";
const prem_tree_en = "permission_tree_encoded"
const perm_sig = "permission_signature"

export const logsRequest = (body: any) => {
    console.log("request: ");
    console.log(body);
}

export const logsPath = (method: string, path: string) => {
    console.log(`${method}: ${path}`);
}

export const logsResult = (result: any) => {
    console.log("Result: ");
    console.log(result);
}

export const giveAccessDenied = (extraStep: boolean = false) => {
    localStorage.clear();

    if (extraStep) {
        Swal.fire({
            title: "Token Invalid",
            text: "Token ผิดหรือหมดอายุ กรุณา Login ใหม่อีกครั้ง",
            icon: "error",
            confirmButtonText: "ตกลง"
        }).then(() => {
            window.location.href = "/login";
        });
    } else {
        window.location.href = "/login";
    }
};


export const logout = () => {
    localStorage.clear();
    window.location.href = env.login_page;
}

export const saveRefreshToken = (token : string) => {
    localStorage.setItem(lcRefresh, token)
}

export const saveTokenToLocal = (token: string) => {
    localStorage.setItem(lcToken, token);
}

export const saveUserIdToLocal = (user_id: string) => {
    localStorage.setItem(lcUser, user_id);
}

export const saveUsernameToLocal = (username: string) => {
    localStorage.setItem(lcUsername, username);
}

export const saveTokenExpiredDateToLocal = (expiredDate: string) => {
    localStorage.setItem(lcExpiredDate, expiredDate);
}

export const saveRoleIdToLocal = (role_id: string) => {
    localStorage.setItem(lcRoleId, role_id);
}

export const saveRoleCodeToLocal = (role_code: string) => {
    localStorage.setItem(lcRoleCode, role_code);
}

export const saveRoleNameToLocal = (role_name: string) => {
    localStorage.setItem(lcRoleName, role_name);
}

export const saveEmpIdToLocal = (employee_id: string) => {
    localStorage.setItem(lcEmpId, employee_id);
}

export const savePermTree = (perm_tree : string) => {
    localStorage.setItem(prem_tree_en, perm_tree)
}

export const saveSignaturePermTree = (signature : string) => {
    localStorage.setItem(perm_sig, signature)
}

export const saveGroupId = (group_id : string) => {
    localStorage.setItem("group_id", group_id)
}

export const getTokenRefresh = () => {
    return localStorage.getItem(lcRefresh)
}

export const getTokenFromLocal = () => {
    return localStorage.getItem(lcToken);
}

export const getUserIdFromLocal = () => {
    return localStorage.getItem(lcUser);
}

export const getUsernameLocal = () => {
    return localStorage.getItem(lcUsername);
}

export const getTokenExpiredDateLocal = () => {
    return localStorage.getItem(lcExpiredDate);
}

export const getRoleId = () => {
    return localStorage.getItem(lcRoleId);
}

export const getRoleCode = () => {
    return localStorage.getItem(lcRoleCode);
}

export const getRoleName = () => {
    return localStorage.getItem(lcRoleName);
}

export const getEmpId = () => {
    return localStorage.getItem(lcEmpId);
}

export const getGroupId = () => {
    return localStorage.getItem("group_id")
}

export const deleteTokenFromLocal = () => {
    localStorage.clear();
}



// export const logout_token_api = axios.post({ //------------
//     baseURL: env.logout_token_api,
//     headers: {
//         "Content-Type": "application/json",
//     },
// });

export const destroyToken = () => {
    try {
    const refreshToken = getTokenRefresh();
    const token = getTokenFromLocal();

    if (refreshToken && token) {
    axios.post('http://localhost:5000/api/logout', { //------------
        refresh_token: refreshToken
      });
    }
  } catch (error) {
    console.error("Logout Error:", error);
  }
}

export const getPermTree = () => {
    const perm_tree = localStorage.getItem(prem_tree_en);
    if(!perm_tree) {
        return
    }
    const jsonStr = atob(perm_tree);
    const moduleTree = JSON.parse(jsonStr);
    return moduleTree
}

export const getLastChar = (value: string) => {
    return value[value.length - 1];
}

export const isNumber = (value: any) => {
    return /^\d+$/.test(value);
}

export const validateNumberFormatInput = (value: string) => {
    let lastChar = getLastChar(value);
    if (lastChar === ".") {
        if (value.substring(0, value.length - 1).includes(".")) return false;
        return true;
    } else if (!isNumber(lastChar)) {
        return false;
    } else {
        return true;
    }
}

export const convertImageToBase64 = async (image: File) => {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

export const getStartAndEndOfMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [start, end] as [Date, Date];
};

export const getCitizenIdFormat = (input: string) => {
    if (!isNumber(input) || input.length !== 13) return input;
    return `${input.slice(0, 1)}-${input.slice(1, 5)}-${input.slice(5, 10)}-${input.slice(10, 12)}-${input.slice(12)}`;
}

export const getPhoneFormat = (input: string) => {
    let inputLen = input.length;
    if (!isNumber(input) || (inputLen !== 10 && inputLen !== 9)) return input;
    let result = "";
    if (inputLen === 10) result = `${input.slice(0, 3)}-${input.slice(3, 6)}-${input.slice(6, 10)}`;
    else result = `${input.slice(0, 2)}-${input.slice(2, 3)}-${input.slice(5, 4)}`;
    return result;
}

export const isPhoneNumber = (input: string) => {
    const phoneRegex = /^0\d{8,9}$/;
    return phoneRegex.test(input);
}

export const isEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
}

export const convertNumStrToNum = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0; //ผมเพิ่มไว้ดัก ตอนที่ เวลา กดเข้าหน้าแก้ไข แล้วดัน กด ต้นทุนแต่ละจุดส่ง แล้วมันส่งเป็นค่าว่างไป
    return Number(val.toString().replaceAll(",", ""));
};