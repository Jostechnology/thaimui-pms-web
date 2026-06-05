import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';

interface ReportShellProps {
    title: string;
    description?: string;
    /** Filter controls rendered inside the filter card body. */
    filters?: React.ReactNode;
    onExport: () => void;
    exporting?: boolean;
    exportDisabled?: boolean;
    children: React.ReactNode;
}

/**
 * Standard report chrome: header (title/desc/back/export) + filter card + body.
 * Every report renders KPIs → charts → table as `children`.
 */
const ReportShell: React.FC<ReportShellProps> = ({
    title, description, filters, onExport, exporting, exportDisabled, children,
}) => {
    const navigate = useNavigate();
    return (
        <Content>
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>{title}</h1>
                    {description && <span className='text-muted fw-semibold fs-6'>{description}</span>}
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button className='btn btn-light fw-bold' onClick={() => navigate('/reports/list')}>
                        <i className='bi bi-arrow-left me-2'></i>กลับ
                    </button>
                    <button className='btn btn-success fw-bold' onClick={onExport} disabled={exporting || exportDisabled}>
                        {exporting
                            ? <><span className='spinner-border spinner-border-sm me-2' />กำลังส่งออก...</>
                            : <><i className='bi bi-file-earmark-spreadsheet me-2'></i>ส่งออก Excel</>}
                    </button>
                </div>
            </div>

            {filters && (
                <div className='card card-flush shadow-sm border-0 mb-5'>
                    <div className='card-body py-5 d-flex flex-wrap gap-3 align-items-center'>
                        {filters}
                    </div>
                </div>
            )}

            {children}
        </Content>
    );
};

export default ReportShell;
