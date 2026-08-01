import { document_generator_api } from "./apiConfig";

export type DownloadResult = {
    success: boolean;
    /** true when the failure was already handled elsewhere (token refresh -> redirect to login) */
    silent?: boolean;
    status?: number;
    title?: string;
    message?: string;
    icon?: "error" | "warning" | "info";
};

const MAX_SERVER_MESSAGE_LENGTH = 300;

/**
 * Pull a human-readable message out of an error response body.
 * Handles JSON envelopes ({error} / {message} / {detail}) and plain text.
 * Returns null for empty bodies or HTML error pages (nginx/proxy), which are not
 * safe to show to the user.
 */
const extractServerMessage = async (response: Response): Promise<string | null> => {
    let raw = "";
    try {
        raw = (await response.text()).trim();
    } catch {
        return null;
    }
    if (!raw || raw.startsWith("<")) return null;

    let message = raw;
    try {
        const parsed = JSON.parse(raw);
        const candidate =
            parsed?.error ?? parsed?.message ?? parsed?.detail ?? parsed?.msg;
        if (typeof candidate === "string" && candidate.trim()) {
            message = candidate.trim();
        } else if (typeof candidate === "object" && candidate !== null) {
            return null;
        } else {
            return null;
        }
    } catch {
        // not JSON -> keep the plain text as-is
    }

    if (!message || message.length > MAX_SERVER_MESSAGE_LENGTH) return null;
    return message;
};

/** Map an HTTP status to a readable Thai explanation of what actually went wrong. */
const describeStatus = (status: number): Pick<DownloadResult, "title" | "message" | "icon"> => {
    if (status === 404) {
        return {
            title: "ยังไม่มีเอกสารสำหรับรายการนี้",
            message:
                "ระบบยังไม่ได้สร้างไฟล์เอกสารของชิ้นส่วนนี้ กรุณากดบันทึกรายละเอียดชิ้นส่วนอีกครั้งเพื่อสั่งสร้างเอกสาร แล้วรอสักครู่ก่อนดาวน์โหลดใหม่",
            icon: "info",
        };
    }
    if (status === 401 || status === 403) {
        return {
            title: "ไม่มีสิทธิ์ดาวน์โหลดเอกสาร",
            message: "บัญชีของคุณไม่มีสิทธิ์เข้าถึงเอกสารนี้ หรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
            icon: "warning",
        };
    }
    if (status === 408 || status === 429) {
        return {
            title: "ระบบเอกสารกำลังทำงานหนัก",
            message: "ระบบสร้างเอกสารตอบสนองช้ากว่าปกติ กรุณาลองใหม่อีกครั้งในอีกสักครู่",
            icon: "warning",
        };
    }
    if (status >= 500) {
        return {
            title: "ระบบสร้างเอกสารขัดข้อง",
            message: `ระบบสร้างเอกสารตอบกลับข้อผิดพลาด (HTTP ${status}) กรุณาลองใหม่อีกครั้ง หากยังไม่ได้กรุณาแจ้งผู้ดูแลระบบ`,
            icon: "error",
        };
    }
    return {
        title: "ดาวน์โหลดเอกสารไม่สำเร็จ",
        message: `ระบบสร้างเอกสารตอบกลับสถานะ HTTP ${status}`,
        icon: "error",
    };
};

/** Append .pdf when the caller-supplied name has no extension, so the saved file opens. */
const ensureFileExtension = (fileName: string): string =>
    /\.[a-z0-9]{2,5}$/i.test(fileName) ? fileName : `${fileName}.pdf`;

/**
 * Shared download machinery: fetch the file, reject JSON/HTML error envelopes that
 * arrive with a 200, then hand the blob to a synthetic <a download>.
 *
 * File name priority: preferredFileName > Content-Disposition > fallbackFileName.
 */
const downloadFromGenerator = async (
    path: string,
    fallbackFileName: string,
    preferredFileName?: string
): Promise<DownloadResult> => {
    try {
        const response = await document_generator_api("GET", path);

        // undefined -> token refresh failed, giveAccessDenied() already alerted + redirected
        if (response === undefined) {
            return { success: false, silent: true };
        }

        // false -> fetch threw (network down / CORS / bad base URL)
        if (!response) {
            return {
                success: false,
                title: "เชื่อมต่อระบบเอกสารไม่ได้",
                message: "ไม่สามารถติดต่อระบบสร้างเอกสารได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่ายแล้วลองใหม่อีกครั้ง",
                icon: "error",
            };
        }

        if (!response.ok) {
            const fallback = describeStatus(response.status);
            const serverMessage = await extractServerMessage(response);
            return {
                success: false,
                status: response.status,
                title: fallback.title,
                message: serverMessage || fallback.message,
                icon: fallback.icon,
            };
        }

        // Some backends answer 200 with a JSON error envelope. Without this check the
        // user silently downloads a .pdf that actually contains JSON.
        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json") || contentType.includes("text/html")) {
            const serverMessage = await extractServerMessage(response);
            return {
                success: false,
                status: response.status,
                title: "ยังไม่มีไฟล์เอกสารให้ดาวน์โหลด",
                message:
                    serverMessage ||
                    "ระบบสร้างเอกสารไม่ได้ส่งไฟล์กลับมา กรุณาสั่งสร้างเอกสารใหม่แล้วลองอีกครั้ง",
                icon: "info",
            };
        }

        let fileName = fallbackFileName;
        const disposition = response.headers.get("Content-Disposition");
        if (disposition) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match) fileName = match[1];
        }
        if (preferredFileName) fileName = ensureFileExtension(preferredFileName);

        const blob = await response.blob();
        if (blob.size === 0) {
            return {
                success: false,
                status: response.status,
                title: "ไฟล์เอกสารว่างเปล่า",
                message: "ระบบสร้างเอกสารส่งไฟล์ว่างกลับมา กรุณาสั่งสร้างเอกสารใหม่อีกครั้ง",
                icon: "warning",
            };
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error("Download error:", error);
        return {
            success: false,
            title: "ดาวน์โหลดเอกสารไม่สำเร็จ",
            message: "เกิดข้อผิดพลาดระหว่างดาวน์โหลดเอกสาร กรุณาลองใหม่อีกครั้ง",
            icon: "error",
        };
    }
};

/**
 * Download the newest document of a component by rebuilding its legacy path.
 * Kept for callers that only hold a work order code + component id; when you have
 * a version row or a work run pin, prefer downloadComponentDocumentByPath() —
 * this one can never reach an older version.
 */
export const downloadComponentDocument = async (
    woCode: string,
    componentId: number
): Promise<DownloadResult> => {
    if (!woCode) {
        return {
            success: false,
            title: "ไม่พบเลขที่ใบสั่งผลิต",
            message: "ใบสั่งผลิตนี้ยังไม่มีรหัสใบสั่งผลิต (work order code) จึงหาไฟล์เอกสารไม่ได้",
            icon: "warning",
        };
    }

    return downloadFromGenerator(
        `/download/latest/work_orders/${encodeURIComponent(woCode)}/components/${componentId}`,
        `component_${componentId}.pdf`
    );
};

/**
 * Download a component document from the exact `doc_path` the backend recorded on
 * an ItemComponentVersion / WorkRunComponentPin.
 *
 * Versioned components live under .../components/{id}/v{n}; components backfilled
 * before versioning existed keep the legacy path with no /v{n} suffix and carry it
 * in doc_path too — so routing every download through doc_path reaches both.
 */
export const downloadComponentDocumentByPath = async (
    docPath: string,
    filename?: string
): Promise<DownloadResult> => {
    // encode per segment: the slashes are part of the storage path, not data
    const segments = (docPath || "").split("/").filter(Boolean);
    if (segments.length === 0) {
        return {
            success: false,
            title: "ไม่พบที่อยู่ไฟล์เอกสาร",
            message: "เอกสารเวอร์ชันนี้ยังไม่มีที่อยู่ไฟล์ (doc_path) จึงดาวน์โหลดไม่ได้ กรุณาสั่งสร้างเอกสารใหม่อีกครั้ง",
            icon: "warning",
        };
    }

    return downloadFromGenerator(
        `/download/latest/${segments.map(encodeURIComponent).join("/")}`,
        `${segments.slice(-3).join("_")}.pdf`,
        filename
    );
};
