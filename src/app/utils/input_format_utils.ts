/**
 * Input formatting utilities for onChange handlers.
 *
 * Rules:
 * - These functions transform the raw input string into a sanitised display value.
 * - The sanitised value is what you store in form state and render back into the input.
 * - For comma-formatted number fields the *display* value (string with commas) lives in form
 *   state; strip commas before sending to the API: parseCommaNumber(formData.price).
 *
 * Typical usage:
 *   onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
 */

// ---------------------------------------------------------------------------
// Digit / numeric sanitisers
// ---------------------------------------------------------------------------

/**
 * Strip every non-digit character. Optionally limit to maxLength digits.
 * Use for phone numbers, tax IDs, citizen IDs, zip codes, etc.
 *
 * Example: toDigitsOnly("(02) 123-4567", 10) → "0212345678" (truncated to 10)
 */
export const toDigitsOnly = (value: string, maxLength?: number): string => {
    const digits = value.replace(/\D/g, "");
    return maxLength !== undefined ? digits.slice(0, maxLength) : digits;
};

/**
 * Allow only digits and a single decimal point (for price / quantity inputs).
 * Prevents double-dot and non-numeric characters.
 *
 * Example: toDecimalInput("12.3.4abc") → "12.34"
 */
export const toDecimalInput = (value: string): string => {
    return value
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, "$1"); // keep only the first dot
};

/**
 * Remove leading zeros from an integer string.
 * A bare "0" is kept as-is. Empty string returns empty string.
 *
 * Example: stripLeadingZeros("012") → "12"
 *          stripLeadingZeros("0")   → "0"
 *          stripLeadingZeros("")    → ""
 */
export const stripLeadingZeros = (value: string): string => {
    if (value === "") return "";
    return value.replace(/^0+(\d)/, "$1");
};

// ---------------------------------------------------------------------------
// Comma-formatted number fields
// ---------------------------------------------------------------------------

/**
 * Format a number (or numeric string) for display with thousands separators.
 * Returns an empty string for invalid input.
 *
 * Example: formatWithCommas(1232)    → "1,232"
 *          formatWithCommas("1232")  → "1,232"
 *          formatWithCommas("")      → ""
 */
export const formatWithCommas = (value: number | string): string => {
    if (value === "" || value === null || value === undefined) return "";
    const num = typeof value === "string"
        ? parseFloat(value.replace(/,/g, ""))
        : value;
    if (isNaN(num)) return "";
    return num.toLocaleString("en-US");
};

/**
 * Parse a comma-formatted display string back to a number.
 * Use this before sending data to the API.
 *
 * Example: parseCommaNumber("1,232") → 1232
 *          parseCommaNumber("")      → 0
 */
export const parseCommaNumber = (value: string): number => {
    const cleaned = value.replace(/,/g, "");
    return parseFloat(cleaned) || 0;
};

/**
 * Handle onChange for a number field displayed with commas.
 * Call this in the onChange handler and store displayValue in state.
 * Strip commas with parseCommaNumber() before sending to the API.
 *
 * Example:
 *   onChange={(e) => {
 *     const { displayValue } = handleCommaNumberInput(e.target.value);
 *     setFormData(prev => ({ ...prev, price: displayValue }));
 *   }}
 *   // Before submit: payload.price = parseCommaNumber(formData.price)
 */
export const handleCommaNumberInput = (
    rawInput: string
): { displayValue: string; numericValue: number } => {
    // Keep only digits and one decimal point
    const sanitised = rawInput
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, "$1");

    if (sanitised === "" || sanitised === ".") {
        return { displayValue: sanitised, numericValue: 0 };
    }

    const num = parseFloat(sanitised);
    if (isNaN(num)) return { displayValue: "", numericValue: 0 };

    // Preserve trailing dot so the user can keep typing decimals
    const hasTrailingDot = sanitised.endsWith(".");
    const displayValue = formatWithCommas(num) + (hasTrailingDot ? "." : "");
    return { displayValue, numericValue: num };
};

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

/** Phone number input: digits only, max 10 chars. */
export const formatPhoneInput = (value: string): string =>
    toDigitsOnly(value, 10);

/** Tax number / citizen ID input: digits only, max 13 chars. */
export const formatTaxInput = (value: string): string =>
    toDigitsOnly(value, 13);

/** Positive-integer input (e.g. quantity, credit days): digits only, strip leading zeros. */
export const formatIntegerInput = (value: string): string => {
    const digits = toDigitsOnly(value);
    return stripLeadingZeros(digits);
};

/**
 * Signed decimal input (e.g. percentage that can be negative).
 * Allows an optional leading `-`, digits, and a single decimal point.
 * Blocks all other characters on each keystroke.
 *
 * Example: formatSignedDecimalInput("-10.5abc") → "-10.5"
 *          formatSignedDecimalInput("--5")       → "-5"
 */
export const formatSignedDecimalInput = (value: string): string => {
    // Allow at most one leading minus, then digits and one decimal point
    const match = value.match(/^-?\d*\.?\d*/);
    return match ? match[0] : '';
};
