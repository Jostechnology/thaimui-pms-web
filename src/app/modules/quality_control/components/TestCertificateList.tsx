import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCertificateList } from '../../../services/certificateService';

const TestCertificateList: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [certificates, setCertificates] = useState<any[]>([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCertificates = async () => {
            const res = await getCertificateList();
            if (res.success && res.data) {
                setCertificates(res.data);
            }
        };
        fetchCertificates();
    }, []);

    // Filter logic
    const filteredCertificates = certificates.filter(cert => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (cert.certification_number || '').toLowerCase().includes(searchLower) ||
            (cert.qc_work_order_id ? `WO-${cert.qc_work_order_id}` : '').toLowerCase().includes(searchLower) ||
            (cert.customer || cert.customer_name || '').toLowerCase().includes(searchLower)
        );
    });

    // Pagination logic
    const totalItems = filteredCertificates.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentCertificates = filteredCertificates.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const renderPaginationItems = () => {
        const items = [];
        const maxVisible = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            items.push(
                <li key="first" className="page-item">
                    <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
                </li>
            );
            if (startPage > 2) {
                items.push(
                    <li key="ellipsis1" className="page-item disabled">
                        <button className="page-link">...</button>
                    </li>
                );
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(i)}>{i}</button>
                </li>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                items.push(
                    <li key="ellipsis2" className="page-item disabled">
                        <button className="page-link">...</button>
                    </li>
                );
            }
            items.push(
                <li key="last" className="page-item">
                    <button className="page-link" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
                </li>
            );
        }

        return items;
    };

    return (
        <div className="container-fluid px-10 py-8">

            {/* --- Page Header (Title & Create Button) --- */}
            <div className="d-flex flex-stack flex-wrap mb-8">
                <div className="page-title d-flex flex-column py-1">
                    <h1 className="d-flex align-items-center my-1 fw-bold text-gray-900 fs-2">
                        จัดการใบรับรองการทดสอบ (Test Certificate)
                    </h1>
                    <span className="text-gray-500 fs-6 mt-1">
                        Manage and track quality control certificates for production orders.
                    </span>
                </div>
                <div className="d-flex align-items-center py-1">
                    <button
                        className="btn btn-primary fw-bold shadow-sm"
                        onClick={() => navigate('/quality_control/qc_test_cert_list/create')}
                    >
                        <i className="bi bi-plus-lg me-2"></i> สร้าง Certificate
                    </button>
                </div>
            </div>

            {/* --- Main Card --- */}
            <div className="card shadow-sm border-0">
                {/* Card Header: Search */}
                <div className="card-header border-0 pt-6 pb-2">
                    <div className="card-title">
                        <div className="d-flex align-items-center position-relative my-1 w-100 w-md-400px">
                            <i className="bi bi-search fs-3 text-gray-500 position-absolute ms-4"></i>
                            <input
                                type="text"
                                className="form-control form-control-solid ps-12 bg-light"
                                placeholder="ค้นหาเลขที่ Cert หรือ SO..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Card Body: Data Table */}
                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-5">
                            <thead>
                                <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0 border-bottom border-gray-200">
                                    <th className="min-w-150px ps-4">Certificate No.</th>
                                    <th className="min-w-150px">Ref. Sales Order</th>
                                    <th className="min-w-200px">Customer</th>
                                    <th className="min-w-150px">Date of Test</th>
                                    <th className="min-w-125px">Status</th>
                                    <th className="text-end min-w-100px pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="fw-semibold text-gray-700">
                                {currentCertificates.length > 0 ? (
                                    currentCertificates.map((cert: any, index: number) => (
                                        <tr key={cert.qc_certification_id || index} className="hover:bg-light-primary transition-all">
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center">
                                                    <i className="bi bi-file-earmark-text text-gray-400 fs-4 me-3"></i>
                                                    <span className="text-gray-800 fw-bold">{cert.certification_number || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-gray-600">{cert.qc_work_order_id ? `WO-${cert.qc_work_order_id}` : '-'}</span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="text-gray-800 fw-bold">{cert.customer || cert.customer_name || '-'}</span>
                                                    <span className="text-muted fs-8">{cert.location || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-gray-600">
                                                    {cert.certification_date ? new Date(cert.certification_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                {cert.certification_status === 'CertificationStatus.PASSED' ? (
                                                    <span className="badge badge-light-success px-3 py-2 fs-8 fw-bold">
                                                        <span className="bullet bullet-dot bg-success me-2"></span> Acceptable
                                                    </span>
                                                ) : cert.certification_status === 'CertificationStatus.FAILED' ? (
                                                    <span className="badge badge-light-danger px-3 py-2 fs-8 fw-bold">
                                                        <span className="bullet bullet-dot bg-danger me-2"></span> Not Acceptable
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-light-secondary px-3 py-2 fs-8 fw-bold">
                                                        {cert.certification_status || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        className="btn btn-icon btn-sm btn-light-primary btn-active-primary"
                                                        title="ดูรายละเอียด"
                                                        onClick={() => navigate(`/quality_control/qc_test_cert_list/view/${cert.qc_certification_id}`)}
                                                    >
                                                        <i className="bi bi-eye fs-5"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-sm btn-light-warning btn-active-warning"
                                                        title="แก้ไข"
                                                        onClick={() => navigate(`/quality_control/qc_test_cert_list/edit/${cert.qc_certification_id}`)}
                                                    >
                                                        <i className="bi bi-pencil fs-5"></i>
                                                    </button>
                                                    <button className="btn btn-icon btn-sm btn-light-info btn-active-info disabled" title="พิมพ์ PDF" disabled>
                                                        <i className="bi bi-printer fs-5"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted py-10">
                                            ไม่พบข้อมูล
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Footer Section (Pagination) --- */}
                    {totalItems > 0 && (
                        <div className="d-flex flex-stack flex-wrap pt-8 pb-3">
                            <div className="fs-6 fw-semibold text-gray-600">
                                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} results
                            </div>
                            <ul className="pagination">
                                <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>
                                        <i className="previous"></i>
                                    </button>
                                </li>

                                {renderPaginationItems()}

                                <li className={`page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>
                                        <i className="next"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestCertificateList;