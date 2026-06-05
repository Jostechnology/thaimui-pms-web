import { front_api } from "./apiConfig";
import type { ReportDefinition, ReportPreviewResult } from "../type_interface/ReportType";

interface APIResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

const handleResponse = async <T,>(response: Response | false | undefined): Promise<APIResponse<T>> => {
    if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    const result = await response.json().catch(() => ({}));
    if (response.ok) return { ...result, success: true };
    return { success: false, message: result.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" };
};

export const getReportDefinitions = async (): Promise<APIResponse<{ items: ReportDefinition[] }>> => {
    const response = await front_api("GET", "/reports/definitions", {}, { wrapData: false });
    return handleResponse(response);
};

export const previewReport = async <TRow = Record<string, unknown>, TSummary = Record<string, unknown>>(
    code: string,
    params: Record<string, unknown>,
    page: number = 1,
    per_page: number = 25,
): Promise<APIResponse<ReportPreviewResult<TRow, TSummary>>> => {
    const response = await front_api(
        "POST",
        "/reports/preview",
        { code, params, page, per_page },
        { wrapData: false },
    );
    return handleResponse(response);
};

export const exportReportXlsx = async (
    code: string,
    params: Record<string, unknown>,
    filename?: string,
): Promise<{ success: boolean; message?: string }> => {
    const response = await front_api(
        "POST",
        "/reports/export",
        { code, params, format: "xlsx" },
        { wrapData: false },
    );
    if (!response) return { success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, message: err.error || "ส่งออกไฟล์ล้มเหลว" };
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${code}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
};
