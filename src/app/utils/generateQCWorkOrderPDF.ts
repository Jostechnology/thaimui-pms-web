import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QCWorkOrderData } from "../type_interface/QCWorkOrderType";

function checkbox(checked: boolean, label: string) {
    return `<span style="margin-right:12px;white-space:nowrap;">
        <span style="display:inline-block;width:11px;height:11px;border:1px solid #000;vertical-align:middle;text-align:center;font-size:9px;line-height:11px;">${checked ? "✓" : ""}</span>
        <span style="vertical-align:middle;margin-left:2px;">${label}</span>
    </span>`;
}

function sigLine(label: string) {
    return `<div style="flex:1;text-align:center;padding:0 8px;">
        <div style="border-top:1px solid #000;padding-top:2px;font-size:9px;">${label}</div>
        <div style="font-size:8px;color:#555;">วันที่.............................</div>
    </div>`;
}

export async function generateQCWorkOrderPDF(formData: QCWorkOrderData, qcWorkOrderId?: string) {
    // ---- Build HTML ----
    const items = Array.isArray(formData.items) ? formData.items : [];
    // Fill at least 15 rows
    const minRows = Math.max(15, items.length);
    const emptyRows = minRows - items.length;

    const itemRows = items.map((item) => `
        <tr>
            <td style="padding:2px 4px;">${item.code ?? ""}</td>
            <td style="padding:2px 4px;">${item.description ?? ""}</td>
            <td style="padding:2px 4px;text-align:center;">${item.wll ?? ""}</td>
            <td style="padding:2px 4px;text-align:center;">${item.quantity ?? ""}</td>
            <td style="padding:2px 4px;">${item.serialNo ?? ""}</td>
            <td style="padding:2px 4px;">${item.remark ?? ""}</td>
        </tr>`).join("");

    const emptyRowsHtml = Array.from({ length: emptyRows }).map(() => `
        <tr>
            <td style="height:18px;">&nbsp;</td>
            <td></td><td></td><td></td><td></td><td></td>
        </tr>`).join("");

    const docNum = formData.docNum ?? formData.donEntry ?? "";
    const customerDisplay = [formData.customerCode, formData.customerName].filter(Boolean).join(" / ");

    const html = `
    <div id="qc-print-root" style="
        width:794px;
        min-height:1123px;
        background:#fff;
        font-family:'Sarabun',Arial,sans-serif;
        font-size:11px;
        color:#000;
        padding:28px 36px;
        box-sizing:border-box;
        position:relative;
    ">
        <!-- Form number top right -->
        <div style="position:absolute;top:24px;right:36px;font-size:9px;border:1px solid #000;padding:2px 6px;">FR-WH-QC-001</div>

        <!-- Title -->
        <div style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:10px;">ใบสั่งงาน QC</div>

        <!-- Header table -->
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:0;">
            <colgroup>
                <col style="width:15%"><col style="width:35%"><col style="width:15%"><col style="width:35%">
            </colgroup>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">ลูกค้า</td>
                <td style="border:1px solid #000;padding:3px 6px;" colspan="3">${customerDisplay}</td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">พนักงานขาย</td>
                <td style="border:1px solid #000;padding:3px 6px;">${formData.salesName ?? ""}</td>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">ทีม</td>
                <td style="border:1px solid #000;padding:3px 6px;">${formData.teamName ?? ""}</td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">ใบสั่งขายเลขที่</td>
                <td style="border:1px solid #000;padding:3px 6px;">${docNum}</td>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">วันที่</td>
                <td style="border:1px solid #000;padding:3px 6px;">${formData.date ?? ""}</td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">วันที่ย้าย / ส่ง</td>
                <td style="border:1px solid #000;padding:3px 6px;" colspan="3">${formData.customerReceiptNumber ?? ""}</td>
            </tr>
        </table>

        <!-- มาตรฐาน -->
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none;margin-bottom:0;">
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;white-space:nowrap;width:80px;">มาตรฐาน</td>
                <td style="border:1px solid #000;padding:4px 8px;">
                    ${checkbox(!!formData.ptt, "PTT")}
                    ${checkbox(!!formData.chevron, "Chevron")}
                    ${checkbox(!!formData.valeur, "Valeur")}
                    ${checkbox(!!formData.ophir, "Ophir")}
                    ${checkbox(!!(formData as any).threeSpec, "3Spec")}
                    ${checkbox(!!formData.standardOthers, "Others")}
                    ${formData.standardOthers && formData.standardOthersText
            ? `<span style="border-bottom:1px solid #000;padding:0 20px;">${formData.standardOthersText}</span>`
            : `<span style="border-bottom:1px solid #000;padding:0 40px;">&nbsp;</span>`}
                </td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">ใบรับรอง</td>
                <td style="border:1px solid #000;padding:4px 8px;">
                    ${checkbox(!!formData.inHouse, "In-house")}
                    ${checkbox(!!formData.thirdParty, "Third Party")}
                    ${checkbox(!!formData.ndt, "NDT")}
                    ${checkbox(!!formData.testingOthers, "Others")}
                    ${formData.testingOthers && formData.testingOthersText
            ? `<span style="border-bottom:1px solid #000;padding:0 20px;">${formData.testingOthersText}</span>`
            : `<span style="border-bottom:1px solid #000;padding:0 40px;">&nbsp;</span>`}
                </td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">Serial Number</td>
                <td style="border:1px solid #000;padding:4px 8px;">
                    ${checkbox(!!formData.continueSerial, "คล้องวางแห")}
                    ${checkbox(!!formData.serialImprint, "ตอกที่ตัวสินค้า")}
                    ${checkbox(!!formData.serialTag, "คล้องแท็ก")}
                    ${checkbox(!!formData.serialOthers, "Others")}
                    ${formData.serialOthers && formData.serialOthersText
            ? `<span style="border-bottom:1px solid #000;padding:0 20px;">${formData.serialOthersText}</span>`
            : `<span style="border-bottom:1px solid #000;padding:0 40px;">&nbsp;</span>`}
                </td>
            </tr>
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;">Remark</td>
                <td style="border:1px solid #000;padding:4px 8px;min-height:22px;">${formData.generalRemark ?? "&nbsp;"}</td>
            </tr>
        </table>

        <!-- รายการสินค้า -->
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none;margin-bottom:0;">
            <thead>
                <tr style="background:#f0f0f0;">
                    <th style="border:1px solid #000;padding:4px;width:15%;text-align:center;">รหัสสินค้า</th>
                    <th style="border:1px solid #000;padding:4px;text-align:center;">รายละเอียด</th>
                    <th style="border:1px solid #000;padding:4px;width:9%;text-align:center;">WLL</th>
                    <th style="border:1px solid #000;padding:4px;width:9%;text-align:center;">จำนวน</th>
                    <th style="border:1px solid #000;padding:4px;width:14%;text-align:center;">Serial No</th>
                    <th style="border:1px solid #000;padding:4px;width:12%;text-align:center;">หมายเหตุ</th>
                </tr>
            </thead>
            <tbody style="font-size:10px;">
                ${itemRows}
                ${emptyRowsHtml}
            </tbody>
        </table>

        <!-- รายละเอียดการเทส -->
        ${formData.details ? `
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;border-top:none;margin-bottom:0;">
            <tr>
                <td style="border:1px solid #000;padding:3px 6px;font-weight:bold;width:80px;">รายละเอียด</td>
                <td style="border:1px solid #000;padding:4px 8px;">${formData.details}</td>
            </tr>
        </table>` : ""}

        <!-- Signature row -->
        <div style="display:flex;margin-top:24px;gap:8px;">
            ${sigLine("ผู้ตรวจสอบ")}
            ${sigLine("ผู้อนุมัติ")}
            ${sigLine("ผู้รับงาน")}
        </div>
    </div>`;

    // ---- Render & Capture ----
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
        const element = container.querySelector("#qc-print-root") as HTMLElement;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: 794,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const ratio = pdfW / canvas.width;
        const imgH = canvas.height * ratio;

        let posY = 0;
        let remaining = imgH;

        pdf.addImage(imgData, "PNG", 0, posY, pdfW, imgH);
        remaining -= pdfH;

        // เพิ่มหน้าใหม่เฉพาะเมื่อ content เหลือมากกว่า 2mm (ป้องกันหน้าเปล่า)
        while (remaining > 2) {
            posY -= pdfH;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, posY, pdfW, imgH);
            remaining -= pdfH;
        }

        const fileName = `QC-WorkOrder-${docNum || qcWorkOrderId || "QC"}.pdf`;
        pdf.save(fileName);
    } finally {
        document.body.removeChild(container);
    }
}
