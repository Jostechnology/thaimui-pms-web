import { front_api } from "./apiConfig";

const getHeaders = () => {
    const activeBranchId = localStorage.getItem('activeBranchId');
    return {
        "X-Branch-ID": activeBranchId || ''
    };
};

export const getEmployeeList = async (page: number = 1, per_page: number = 10, search: string = "", status: string = "") => {
    try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", per_page.toString());
        if (search) params.append("search", search);
        if (status && status !== "all") params.append("status", status);

        const response = await front_api(
            "GET",
            `/get_employee_list?${params.toString()}`,
            {},
            { wrapData: false, headers: getHeaders() }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};
export const getEmployeeById = async (employee_id: number) => {
    try {
        const response = await front_api(
            "GET",
            `/get_employee_id/${employee_id}`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};



export const setEmployeePhoto = async (employee_id: number, image_base64: string) => {
    try {
        const response = await front_api(
            "POST",
            `/employee/${employee_id}/photo`,
            { image_base64 },
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const deleteEmployeePhoto = async (employee_id: number) => {
    try {
        const response = await front_api(
            "DELETE",
            `/employee/${employee_id}/photo`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const createEmployee = async (data: any) => {
    try {
        const response = await front_api(
            "POST",
            "/create_employee",
            data,
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const updateEmployee = async (data: any) => {
    try {
        const employee_id = data.employee_id;
        const response = await front_api(
            "PUT",
            `/update_employee/${employee_id}`,
            data,
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const deleteEmployee = async (employee_id: number) => {
    try {
        const response = await front_api(
            "DELETE",
            `/delete_employee/${employee_id}`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const getEmployeeSalaryList = async (page: number = 1, per_page: number = 10, search: string = '') => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('per_page', per_page.toString());
        if (search) params.append('search', search);

        const response = await front_api(
            'GET',
            `/get_employee_salary_list?${params.toString()}`,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};

export const getEmployeeSalaryHistory = async (employee_id: number, month?: string) => {
    try {
        const url = month
        ? `/get_employee_salary_history/${employee_id}?month=${month}`
        : `/get_employee_salary_history/${employee_id}`;
        const response = await front_api(
            'GET',
            url,
            {},
            { wrapData: false }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};

export interface UpdateSalaryPayload {
    new_base_salary?: number;
    new_day_rate?: number;
    new_ot_hourly_rate?: number;
    effective_date: string;
    remark?: string;
}

export const updateEmployeeSalary = async (employee_id: number, payload: UpdateSalaryPayload) => {
    try {
        const response = await front_api(
            'PUT',
            `/update_employee_salary/${employee_id}`,
            payload,
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

// to count employee
export const getEmployeeTotalCount = async (): Promise<number> => {
    try {
        const response = await getEmployeeList(1, 1);

        if (response && response.success) {
            return response.pagination?.total || 0;
        }
        return 0;
    } catch (error) {
        console.error("getEmployeeTotalCount Error:", error);
        return 0;
    }
};
