import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import { getCertificateList } from '../../../services/certificateService';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { useTableParams } from '../../../hooks/useTableParams';
import TablePaginator from '../../../custom_components/TablePaginator';
import TableActionButton from '../../../custom_components/TableActionButton';

const TestCertificateList: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    const [certificates, setCertificates] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(0);

    const [keyword, setKeyword] = useState<string>(searchParams.get("search") || "");
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get("pageConfig") || "10"));

    useTableParams({
        currentPage,
        setCurrentPage,
        pageConfig,
        keyword,
        setKeyword,
        setPageConfig,
        setSearchTerm,
    });

    const fetchCertificates = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getCertificateList(currentPage, pageConfig, keyword);
            if (result && result.success) {
                setCertificates(result.data.items || []);
                setTotalPages(result.pagination?.pages ?? 0);
            } else {
                setCertificates([]);
                setTotalPages(0);
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, [currentPage, keyword, pageConfig]);

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>ใบรับรองการทดสอบ</h1>
                    <span className='text-muted fw-semibold fs-6'>จัดการและติดตามใบรับรองการทดสอบคุณภาพ</span>
                </div>
                <div className='d-flex align-items-center gap-2'>
                    <button
                        className='btn btn-primary fw-bold px-6 shadow-sm'
                        onClick={() => navigate('/quality_control/qc_test_cert_list/create')}
                    >
                        <i className='bi bi-plus-lg me-2 fs-4'></i> สร้าง Certificate
                    </button>
                </div>
            </div>

            <div className='card card-flush shadow-sm border-0'>
                <div className='card-header align-items-center py-5 gap-2 gap-md-5'>
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <i className='ki-duotone ki-magnifier fs-3 position-absolute ms-4'>
                                <span className='path1'></span><span className='path2'></span>
                            </i>
                            <input
                                type='text'
                                className='form-control form-control-lg w-250px ps-12'
                                placeholder='ค้นหาเลขที่ Cert หรือ SO...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setKeyword(searchTerm)}
                            />
                        </div>
                    </div>
                </div>

                <div className='card-body pt-0'>
                    <div className='table-responsive'>
                        <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                            <thead>
                                <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200'>
                                    <th className='min-w-150px'>Certificate No.</th>
                                    <th className='min-w-150px'>Ref. Sales Order</th>
                                    <th className='min-w-200px'>Customer</th>
                                    <th className='min-w-150px text-center'>Date of Test</th>
                                    <th className='min-w-125px text-center'>Status</th>
                                    <th className='text-end min-w-50px'>Actions</th>
                                </tr>
                            </thead>
                            <tbody className='text-gray-600 fw-semibold'>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={6} className='text-center p-20'>
                                            <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                            <span className='ms-3 text-gray-500'>กำลังดึงข้อมูล...</span>
                                        </td>
                                    </tr>
                                ) : certificates.length > 0 ? (
                                    certificates.map((cert: any) => (
                                        <tr key={cert.qc_certification_id}>
                                            <td>
                                                <div className='d-flex align-items-center'>
                                                    <i className='bi bi-file-earmark-text text-gray-400 fs-4 me-3'></i>
                                                    <span className='text-gray-800 fw-bold'>{cert.certification_number || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className='text-gray-700 fw-bold'>
                                                    {cert.qc_work_order_code ?? '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className='text-gray-800 fw-bold text-hover-primary'>
                                                    {cert.customer || cert.customer_name || '-'}
                                                </span>
                                                <span className='text-muted fw-semibold d-block fs-8'>{cert.location || '-'}</span>
                                            </td>
                                            <td className='text-center'>
                                                <span className='text-gray-700 fw-bold'>
                                                    {cert.certification_date
                                                        ? new Date(cert.certification_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : '-'}
                                                </span>
                                            </td>
                                            <td className='text-center'>
                                                {cert.certification_status === 'CertificationStatus.PASSED' ? (
                                                    <span className='badge badge-light-success fw-bold px-4 py-3'>
                                                        Acceptable
                                                    </span>
                                                ) : cert.certification_status === 'CertificationStatus.FAILED' ? (
                                                    <span className='badge badge-light-danger fw-bold px-4 py-3'>
                                                        Not Acceptable
                                                    </span>
                                                ) : (
                                                    <span className='badge badge-light-secondary fw-bold px-4 py-3'>
                                                        {cert.certification_status || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className='text-end'>
                                                <TableActionButton
                                                    isDeleteBtnShow={false}
                                                    handleView={() => navigate(`/quality_control/qc_test_cert_list/view/${cert.qc_certification_id}`)}
                                                    handleEdit={() => navigate(`/quality_control/qc_test_cert_list/edit/${cert.qc_certification_id}`)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className='text-center p-20'>
                                            <div className='d-flex flex-column flex-center'>
                                                <i className='bi bi-search fs-3x text-gray-300 mb-4'></i>
                                                <span className='text-gray-500'>ไม่พบข้อมูลใบรับรองในระบบ</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className='d-flex flex-stack flex-wrap pt-10'>
                        <div className='fs-6 fw-semibold text-gray-700'></div>
                        <TablePaginator
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            totalPages={totalPages}
                        />
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default TestCertificateList;
