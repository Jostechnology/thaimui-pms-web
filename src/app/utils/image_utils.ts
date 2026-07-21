/**
 * Read an image file and return a downscaled base64 data URL
 * (max dimension capped to keep upload payloads small).
 */
export const fileToResizedDataUrl = (file: File, maxDim: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('ไฟล์ไม่ใช่รูปภาพ'));
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                if (scale === 1) {
                    resolve(reader.result as string);
                    return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(reader.result as string);
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
};
