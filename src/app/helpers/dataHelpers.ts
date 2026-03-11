export const formatThaiDate = (date?: string | Date | null): string => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};