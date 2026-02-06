import { authToken } from "../services/authenticationServices";
import {
    giveAccessDenied, saveUserIdToLocal,
    saveTokenToLocal, saveUsernameToLocal,
    saveRoleIdToLocal, saveEmpIdToLocal, saveRoleCodeToLocal,
    getTokenExpiredDateLocal,
    saveTokenExpiredDateToLocal,
    saveRefreshToken,
    saveGroupId,
    saveRoleNameToLocal
}
    from "./appHelpers";
import { decode } from "jsonwebtoken"

// export const authenticateToken = async () => {
//     try {
//         const params = new URLSearchParams(window.location.search);
//         const userToken = params.get("tk");

//         if (userToken) {
//             const auth = await authToken(userToken) as any;
//             if (!auth || !auth["data"]) {
//                 giveAccessDenied();
//             } else {
//                 saveTokenToLocal(auth["t"]);
//                 saveUserIdToLocal(auth["user_id"]);
//                 saveUsernameToLocal(auth["username"]);
//                 saveRoleIdToLocal(auth["role_id"]);
//                 saveRoleCodeToLocal(auth["role_code"])
//                 saveEmpIdToLocal(!auth["employee_id"] ? "" : auth["employee_id"]);
//                 saveTokenExpiredDateToLocal(auth["expired_date"]);
//                 window.location.href = "/main";
//             }
//         } else {
//             console.error("No token found in query string");
//             giveAccessDenied();
//         }
//     } catch (error) {
//         console.error("Authentication failed:", error);
//         giveAccessDenied();
//     }
// };


export const isTokenExpired = () => {
    const lcExpiredDate = getTokenExpiredDateLocal() as string;
    if (!lcExpiredDate) return true;

    const tokenExpiredDate = new Date(lcExpiredDate.replace(" ", "T"));
    const currentDate = new Date();
    return currentDate > tokenExpiredDate;
}


export const isTokenAlmostExpired = () => {
    const lcExpiredDate = getTokenExpiredDateLocal() as string;
    if (!lcExpiredDate) return true;

    const tokenExpiredDate = new Date(lcExpiredDate.replace(" ", "T"));
    const currentDate = new Date();

    const FIVE_MINUTES = 20 * 60 * 1000;
    return tokenExpiredDate.getTime() - currentDate.getTime() <= FIVE_MINUTES;
}


export const checkIfTokenExpired = () => {
    if (isTokenExpired()) {
        giveAccessDenied()
    };
    return;
}


// export const getTokenParam = () => {
//     let token = getTokenFromLocal();
//     return token ? token : null;
// }


// export const getUserDetails = () => {
//     try {
//         const lcTokenDetails = getTokenParam();
//         const user = lcTokenDetails ? JSON.parse(lcTokenDetails) : null;
//         if (user) {
//             if (!isTokenExpired(user["expired_date"])) return user;
//             else false;
//         } else return false;
//     } catch (error) {
//         console.error("getUserDetails failed:", error);
//         return false;
//     }
// }


export function decodeJWTUnsafe(token: string): any {
    const decoded = decode(token, { complete: true });
    return decoded;
}

export const authTokenDedicated = (token: any, refresh_token: any) => {
    try {
        const data = decodeJWTUnsafe(token)
        const auth = data.payload
        const timestamp = auth["exp"];
        const date = new Date(timestamp * 1000);
        const bangkokDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const formatted = bangkokDate.toISOString().replace('T', ' ').substring(0, 19);

        saveTokenToLocal(token);
        saveRefreshToken(refresh_token)
        saveUserIdToLocal(auth["user_id"]);
        saveUsernameToLocal(auth["username"]);
        saveRoleIdToLocal(auth["role_id"]);
        saveRoleCodeToLocal(auth["role_code"])
        saveRoleNameToLocal(auth["role_name"] || "")
        saveEmpIdToLocal(!auth["employee_id"] ? "" : auth["employee_id"]);
        saveTokenExpiredDateToLocal(formatted);
        return true
    } catch (error) {
        console.error("Authentication failed:", error);
        // giveAccessDenied();
        return false
    }
}