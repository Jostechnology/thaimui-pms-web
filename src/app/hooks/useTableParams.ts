import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";


interface UseTableParamsProps {
    currentPage: number;
    setCurrentPage: (page: number) => void;

    pageConfig?: number;
    setPageConfig?: (config: number) => void;

    keyword?: string;
    setKeyword?: (keyword: string) => void;

    setSearchTerm?: (term: string) => void;

    filter?: string;
    setFilter?: (filter: string) => void;

    startDate?: Date | null;
    endDate?: Date | null;
    setDateRange?: (range: [Date | null, Date | null]) => void;

    selectedMonth?: Date | null;
    setSelectedMonth?: (date: Date | null) => void;
}

export const useTableParams = (props: UseTableParamsProps) => {
    const {
        currentPage, setCurrentPage,
        keyword, setKeyword, setSearchTerm,
        filter, setFilter,
        pageConfig, setPageConfig,
        startDate, endDate, setDateRange,
        selectedMonth, setSelectedMonth
    } = props;

    const [searchParams, setSearchParams] = useSearchParams();
    const isFirstRun = useRef(true);

    const isFirstSync = useRef(true);

    useEffect(() => {
        const handler = setTimeout(() => {

            // ป้องกัน URL พังกรณี Range เลือกไม่ครบ
            if (startDate && !endDate) {
                return;
            }

            const params: Record<string, string> = {};

            if (keyword) params.search = keyword;
            if (currentPage > 1) params.page = currentPage.toString();
            if (filter && filter !== "ทั้งหมด") params.filter = filter;
            if (pageConfig) params.pageConfig = pageConfig.toString();

            // จัดการแบบ Range (StartDate/EndDate) 
            if (startDate && endDate) {
                const sDate = startDate;
                const eDate = endDate;
                const isSameMonth = sDate.getMonth() === eDate.getMonth() && sDate.getFullYear() === eDate.getFullYear();
                const isFullMonth = sDate.getDate() === 1 &&
                    new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0).getDate() === eDate.getDate();

                if (isSameMonth && isFullMonth) {
                    params.month = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
                } else {
                    params.startDate = sDate.toISOString().split('T')[0];
                    params.endDate = eDate.toISOString().split('T')[0];
                }
            }

            // จัดการแบบ Single Month 
            if (selectedMonth) {
                // ถ้ามี selectedMonth ให้เขียนทับ month ไปเลย
                params.month = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
            }

            // เช็คว่า URL เปลี่ยนจริงไหมก่อนเขียน (ป้องกัน Loop)
            const newQuery = new URLSearchParams(params).toString();
            const currentQuery = new URLSearchParams(window.location.search).toString().replace(/^\?/, '');

            if (newQuery !== currentQuery) {
                // ถ้าเป็นครั้งแรก ให้ใช้ replace: true (ทับประวัติเดิม เพื่อไม่ให้เกิด Trap)
                // ถ้าไม่ใช่ครั้งแรก (User กดเอง) ให้ใช้ replace: false (เก็บประวัติ เพื่อให้กด Undo ได้)
                setSearchParams(params, { replace: isFirstSync.current });
            }

            // หลังจากพยายาม Sync ครั้งแรกจบแล้ว (ไม่ว่าจะมีการเปลี่ยน URL หรือไม่)
            // ให้ถือว่าจบกระบวนการเริ่มต้น ครั้งต่อไปคือ User ทำเอง
            isFirstSync.current = false;

        }, 500);

        return () => clearTimeout(handler);
    }, [keyword, currentPage, filter, pageConfig, startDate, endDate, selectedMonth, setSearchParams, searchParams]); // เพิ่ม selectedMonth ใน dependency


    // Reset หน้าเมื่อเปลี่ยน pageConfig
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        setCurrentPage(1);
    }, [pageConfig]);

    // อ่านค่าจาก URL มาใส่ State
    useEffect(() => {
        const rawPage = searchParams.get("page");
        const rawSearch = searchParams.get("search");
        const rawFilter = searchParams.get("filter");
        const rawPageConfig = searchParams.get("pageConfig");

        const rawMonth = searchParams.get("month");
        const rawStartDate = searchParams.get("startDate");
        const rawEndDate = searchParams.get("endDate");

        // ... (Logic การอ่าน Page, Search, Filter, PageConfig เหมือนเดิม) ...
        let urlPage = 1;
        if (rawPage) { const parsed = parseInt(rawPage); if (!isNaN(parsed) && parsed > 0) urlPage = parsed; }

        let urlPageConfig = 10;
        if (rawPageConfig) { const parsed = parseInt(rawPageConfig); if (!isNaN(parsed) && parsed > 0) urlPageConfig = parsed; }

        const urlSearch = rawSearch || "";
        const urlFilter = rawFilter || "ทั้งหมด";

        if (urlPage !== currentPage) setCurrentPage(urlPage);
        if (setPageConfig && pageConfig !== undefined && urlPageConfig !== pageConfig) setPageConfig(urlPageConfig);
        if (setKeyword && urlSearch !== (keyword || "")) { setKeyword(urlSearch); if (setSearchTerm) setSearchTerm(urlSearch); }
        if (setFilter && filter !== undefined && urlFilter !== filter) setFilter(urlFilter);


        // คืนค่า Date Range 
        if (setDateRange && (rawStartDate || rawEndDate || rawMonth)) {

            let newStart: Date | null = null;
            let newEnd: Date | null = null;
            if (rawMonth) {
                const [year, month] = rawMonth.split('-').map(Number);
                if (year && month) { newStart = new Date(year, month - 1, 1); newEnd = new Date(year, month, 0); }
            } else if (rawStartDate && rawEndDate) {
                newStart = new Date(rawStartDate); newEnd = new Date(rawEndDate);
            }
            if (newStart && newEnd) {
                const currentStartStr = startDate?.toISOString().split('T')[0];
                const currentEndStr = endDate?.toISOString().split('T')[0];
                if (newStart.toISOString().split('T')[0] !== currentStartStr || newEnd.toISOString().split('T')[0] !== currentEndStr) {
                    setDateRange([newStart, newEnd]);
                }
            }
        }

        // คืนค่า Single Month
        if (setSelectedMonth && rawMonth) {
            const [year, month] = rawMonth.split('-').map(Number);
            if (year && month) {
                const newDate = new Date(year, month - 1, 1);

                // เช็คว่าต้องอัปเดตไหม (เทียบปีกับเดือน)
                if (
                    !selectedMonth ||
                    selectedMonth.getFullYear() !== newDate.getFullYear() ||
                    selectedMonth.getMonth() !== newDate.getMonth()
                ) {
                    setSelectedMonth(newDate);
                }
            }
        }


    }, [searchParams]);
};