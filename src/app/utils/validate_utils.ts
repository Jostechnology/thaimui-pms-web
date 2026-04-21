/**
 * Central validation utilities.
 * Each function returns an error message string if invalid, or null if valid.
 * Use these inside a validateForm() function that builds a Record<string, string> errors object.
 *
 * Pattern:
 *   const newErrors: Record<string, string> = {};
 *   const emailErr = validateEmail(formData.email);
 *   if (emailErr) newErrors.email = emailErr;
 *   setErrors(newErrors);
 *   return Object.keys(newErrors).length === 0;
 */

/** Check that a value is not empty/null/undefined. */
export const validateRequired = (
    value: string | number | null | undefined,
    label: string
): string | null => {
    if (value === null || value === undefined || String(value).trim() === "") {
        return `กรุณากรอก${label}`;
    }
    return null;
};

/** Validate email format. Pass only when the field has a value (pair with validateRequired for required fields). */
export const validateEmail = (email: string): string | null => {
    if (!email) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "กรุณากรอกอีเมลให้ถูกต้อง";
    }
    return null;
};

/** Validate Thai phone number: digits only, 9–10 characters. */
export const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 10) {
        return "เบอร์โทรศัพท์ต้องมี 9-10 หลัก";
    }
    return null;
};

/** Validate tax ID (เลขประจำตัวผู้เสียภาษี): exactly 13 digits. */
export const validateTaxNumber = (taxNum: string): string | null => {
    if (!taxNum) return null;
    const digits = taxNum.replace(/\D/g, "");
    if (digits.length !== 13) {
        return "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก";
    }
    return null;
};

/** Validate citizen ID (เลขบัตรประชาชน): exactly 13 digits. */
export const validateCitizenId = (id: string): string | null => {
    if (!id) return null;
    const digits = id.replace(/\D/g, "");
    if (digits.length !== 13) {
        return "เลขบัตรประชาชนต้องมี 13 หลัก";
    }
    return null;
};

/** Validate that a value is a number greater than 0. */
export const validatePositiveNumber = (
    value: string | number,
    label?: string
): string | null => {
    const num = Number(String(value).replace(/,/g, ""));
    if (!label) {
        label = "จำนวน"
    }
    if (isNaN(num) || num <= 0) {
        return `${label}ต้องเป็นตัวเลขที่มากกว่า 0`;
    }
    return null;
};

/** Validate that a value is a number >= 0. */
export const validateNonNegativeNumber = (
    value: string | number,
    label: string
): string | null => {
    const num = Number(String(value).replace(/,/g, ""));
    if (isNaN(num) || num < 0) {
        return `${label}ต้องเป็นตัวเลขที่ไม่ติดลบ`;
    }
    return null;
};

/** Validate that a string contains only numeric digits. */
export const validateNumericOnly = (value: string, label: string): string | null => {
    if (!value) return null;
    if (!/^\d+$/.test(value)) {
        return `${label}ต้องเป็นตัวเลขเท่านั้น`;
    }
    return null;
};

/** Validate minimum string length. */
export const validateMinLength = (
    value: string,
    min: number,
    label: string
): string | null => {
    if (value.length < min) {
        return `${label}ต้องมีอย่างน้อย ${min} ตัวอักษร`;
    }
    return null;
};

/** Validate exact string length. */
export const validateExactLength = (
    value: string,
    length: number,
    label: string
): string | null => {
    if (value.length !== length) {
        return `${label}ต้องมี ${length} ตัวอักษร`;
    }
    return null;
};

/** Validate that a value is a signed integer (may be negative) and not zero. */
export const validateIntegerNonZero = (
    value: string | number,
    label?: string
): string | null => {
    const lbl = label ?? "จำนวน";
    const s = String(value).trim();
    if (!s || s === "-") return `กรุณากรอก${lbl}`;
    if (!/^-?\d+$/.test(s)) return `${lbl}ต้องเป็นตัวเลขจำนวนเต็ม`;
    if (Number(s) === 0) return `${lbl}ต้องไม่เป็น 0`;
    return null;
};

/** Validate that a value is a positive integer (> 0, digits only). */
export const validatePositiveInteger = (
    value: string | number,
    label?: string
): string | null => {
    const lbl = label ?? "จำนวน";
    const s = String(value).trim();
    if (!s) return `กรุณากรอก${lbl}`;
    if (!/^\d+$/.test(s)) return `${lbl}ต้องเป็นจำนวนเต็มบวก`;
    if (Number(s) <= 0) return `${lbl}ต้องมากกว่า 0`;
    return null;
};

/** Validate that a numeric value does not exceed a maximum. */
export const validateMaxValue = (
    value: string | number,
    max: number,
    label?: string
): string | null => {
    const lbl = label ?? "จำนวน";
    const num = Number(String(value).replace(/,/g, ""));
    if (isNaN(num)) return null;
    if (num > max) return `${lbl}ต้องไม่เกิน ${max}`;
    return null;
};

export const toDateOnly = (date?: Date | null) => {
  if (!date) return undefined;
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
};
