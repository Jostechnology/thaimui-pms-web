import { document_generator_api } from "./apiConfig";

export const downloadComponentDocument = async (woCode: string, componentId: number) => {
    try {
        const response = await document_generator_api(
            "GET",
            `/download/latest/work_orders/${woCode}/components/${componentId}`
        );

        if (!response || !response.ok) {
            return { success: false, message: "ไม่สามารถดาวน์โหลดเอกสารได้" };
        }

        const disposition = response.headers.get("Content-Disposition");
        let fileName = `component_${componentId}.pdf`;
        if (disposition) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match) fileName = match[1];
        }

        const blob = await response.blob();
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
        return { success: false, message: "ไม่สามารถดาวน์โหลดเอกสารได้" };
    }
};
