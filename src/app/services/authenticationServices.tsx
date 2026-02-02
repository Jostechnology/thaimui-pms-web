import { AuthResponseModel } from "../modules/auth";
import { front_api } from "./apiConfig";
import { getUsernameLocal } from "../helpers/appHelpers";
import { ChangePasswordForm } from "../type_interface/EmployeeType";

// ------------------------------------- path -------------------------------------
const verify_token = "/verify_token";
const change_password = "/change_password";
const extend_token_time = "/extend_token_time";

// ----------------------------------- services -----------------------------------

export const authToken = async (userToken: string) => {
    const body = {
        token: userToken
    };
    
    const response = await front_api("POST", verify_token, body, { wrapData: false });
    
    if (!response) return false;
    if (response.status != 200) {
        return false
    }
    try {
        return await response.json() as AuthResponseModel;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const changeEmpPass = async (formData: ChangePasswordForm) => {
    const body = {
        username: getUsernameLocal(),
        password: formData.newPassword
    };
    
    // logsPath("POST", change_password);
    const response = await front_api("POST", change_password, body, { wrapData: false });
    
    if (!response) return false;
    
    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const extendsTokenTime = async () => {
    const body = {
        time_request: 60
    };
    
    // logsPath("POST", extend_token_time);
    const response = await front_api("POST", extend_token_time, body, { wrapData: false });
    
    if (!response) return false;
    
    try {
        return await response.json();
    } catch (e) {
        console.error(e);
        return false;
    }
}