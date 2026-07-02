import { front_api } from "./apiConfig";
import type { ReportDefinition, ReportPreviewResult, ReportRunDetail } from "../type_interface/ReportType";

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
    const response = await front_api("GET", "/get_report_definitions", {}, { wrapData: false });
    const res = await handleResponse<ReportDefinition[]>(response);
    // BE returns data as a flat list; normalise to {items} for the gallery.
    if (res.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        return { success: true, data: { items: list } };
    }
    return { success: false, message: res.message };
};

export const previewReport = async <TRow = Record<string, unknown>, TSummary = Record<string, unknown>>(
    code: string,
    params: Record<string, unknown>,
    page: number = 1,
    per_page: number = 25,
): Promise<APIResponse<ReportPreviewResult<TRow, TSummary>>> => {
    const response = await front_api(
        "POST",
        "/preview_report",
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
    // New BE persists a run and returns a presigned MinIO URL per format.
    const response = await front_api(
        "POST",
        "/create_report_run",
        { code, params, formats: ["xlsx"] },
        { wrapData: false },
    );
    const res = await handleResponse<ReportRunDetail>(response);
    if (!res.success || !res.data) {
        return { success: false, message: res.message || "ส่งออกไฟล์ล้มเหลว" };
    }
    const url = res.data.file_urls?.xlsx;
    if (!url) {
        return { success: false, message: "ไม่พบไฟล์ที่ส่งออก" };
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${code}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
};
