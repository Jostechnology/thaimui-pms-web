import { front_api } from "./apiConfig";

// ── Shifts ───────────────────────────────────────────────────────────────
export const getShiftList = async (page = 1, per_page = 10, search = "") => {
    try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("per_page", String(per_page));
        if (search) params.append("search", search);
        const response = await front_api("GET", `/get_shift_list?${params.toString()}`, {}, { wrapData: false });
        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch {
        return { success: false, data: [] };
    }
};

export const getShiftById = async (shift_id: number) => {
    try {
        const response = await front_api("GET", `/get_shift/${shift_id}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const getDefaultShift = async () => {
    try {
        const response = await front_api("GET", `/get_default_shift`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const createShift = async (data: any) => {
    try {
        const response = await front_api("POST", `/create_shift`, data, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const updateShift = async (shift_id: number, data: any) => {
    try {
        const response = await front_api("PUT", `/update_shift/${shift_id}`, data, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const deleteShift = async (shift_id: number) => {
    try {
        const response = await front_api("DELETE", `/delete_shift/${shift_id}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

// ── Employee Shift Overrides ─────────────────────────────────────────────
export const getEmployeeShift = async (employee_id: number) => {
    try {
        const response = await front_api("GET", `/get_employee_shift/${employee_id}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const upsertEmployeeShift = async (
    employee_id: number,
    data: { start_time: string; end_time: string; work_days: string }
) => {
    try {
        const response = await front_api("PUT", `/upsert_employee_shift/${employee_id}`, data, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const deleteEmployeeShift = async (employee_id: number) => {
    try {
        const response = await front_api("DELETE", `/delete_employee_shift/${employee_id}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

// ── Holidays ─────────────────────────────────────────────────────────────
export const getHolidayList = async (page = 1, per_page = 31, search = "", year?: number) => {
    try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("per_page", String(per_page));
        if (search) params.append("search", search);
        if (year) params.append("year", String(year));
        const response = await front_api("GET", `/get_holiday_list?${params.toString()}`, {}, { wrapData: false });
        if (!response) return { success: false, data: [] };
        return await response.json();
    } catch {
        return { success: false, data: [] };
    }
};

export const createHoliday = async (data: { holiday_date: string; name: string; is_active?: boolean; source?: string }) => {
    try {
        const response = await front_api("POST", `/create_holiday`, data, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const updateHoliday = async (holiday_id: number, data: any) => {
    try {
        const response = await front_api("PUT", `/update_holiday/${holiday_id}`, data, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const deleteHoliday = async (holiday_id: number) => {
    try {
        const response = await front_api("DELETE", `/delete_holiday/${holiday_id}`, {}, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};

export const syncHolidaysFromApi = async (year: number) => {
    try {
        const response = await front_api("POST", `/sync_holidays`, { year }, { wrapData: false });
        if (!response) return { success: false };
        return await response.json();
    } catch {
        return { success: false };
    }
};
