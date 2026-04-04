import { front_api } from "./apiConfig";

export const getAllRoles = async () => {
    try {
        const response = await front_api(
            "GET",
            "/get_all_roles",
            {},
            { wrapData: false }
        );

        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch (error) {
        return { success: false, data: [] };
    }
};

export const createUser = async (data: any) => {
    try {
        const response = await front_api(
            "POST",
            "/create_user",
            data,
            { wrapData: false }
        );

        if (!response) return { success: false };
        return await response.json(); // Expected: { success: true, data: { username: "...", user_id: 123 } }
    } catch (error) {
        return { success: false };
    }
};
