import { front_api } from "./apiConfig";

export const getEmployeeList = async (search: string = "") => {
    try {
        const token = localStorage.getItem('tk-jos');
        const params = new URLSearchParams();
        if (search) params.append("search", search);

        const response = await front_api(
            "GET",
            `/get_employee_list?${params.toString()}`,
            {},
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};


export const createEmployee = async (data: any) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const response = await front_api(
            "POST",
            "/create_employee",
            data,
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const updateEmployee = async (data: any) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const response = await front_api(
            "PUT",
            "/update_employee",
            data,
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};

export const deleteEmployee = async (employee_ids: number[]) => {
    try {
        const token = localStorage.getItem('tk-jos');
        const response = await front_api(
            "DELETE",
            "/delete_employee",
            { employee_ids },
            {
                wrapData: false,
                headers: { "Authorization": `Bearer ${token}` }
            }
        );

        if (!response) return { success: false };
        return await response.json();
    } catch (error) {
        return { success: false };
    }
};