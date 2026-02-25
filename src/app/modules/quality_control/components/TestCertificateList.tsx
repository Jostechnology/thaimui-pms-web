import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Mock Data ---
const mockCertificates = [
    { id: 1, certNo: 'CERT-2024-001', soNo: 'SO-10293', customer: 'ABC Construction', location: 'Bangkok, TH', date: '15 Feb 2026', status: 'Acceptable' },
    { id: 2, certNo: 'CERT-2024-002', soNo: 'SO-10294', customer: 'XYZ Developers', location: 'Chonburi, TH', date: '14 Feb 2026', status: 'Not Acceptable' },
    { id: 3, certNo: 'CERT-2024-003', soNo: 'SO-10295', customer: 'BuildTech Co.', location: 'Rayong, TH', date: '12 Feb 2026', status: 'Acceptable' },
    { id: 4, certNo: 'CERT-2024-004', soNo: 'SO-10298', customer: 'Grand Structures', location: 'Phuket, TH', date: '10 Feb 2026', status: 'Acceptable' },
    { id: 5, certNo: 'CERT-2024-005', soNo: 'SO-10300', customer: 'City Projects', location: 'Chiang Mai, TH', date: '08 Feb 2026', status: 'Acceptable' },
];

const TestCertificateList: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

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
                                {mockCertificates.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-light-primary transition-all">
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-file-earmark-text text-gray-400 fs-4 me-3"></i>
                                                <span className="text-gray-800 fw-bold">{cert.certNo}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-gray-600">{cert.soNo}</span>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column">
                                                <span className="text-gray-800 fw-bold">{cert.customer}</span>
                                                <span className="text-muted fs-8">{cert.location}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-gray-600">{cert.date}</span>
                                        </td>
                                        <td>
                                            {cert.status === 'Acceptable' ? (
                                                <span className="badge badge-light-success px-3 py-2 fs-8 fw-bold">
                                                    <span className="bullet bullet-dot bg-success me-2"></span> Acceptable
                                                </span>
                                            ) : (
                                                <span className="badge badge-light-danger px-3 py-2 fs-8 fw-bold">
                                                    <span className="bullet bullet-dot bg-danger me-2"></span> Not Acceptable
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button className="btn btn-icon btn-sm btn-light-primary btn-active-primary" title="ดูรายละเอียด">
                                                    <i className="bi bi-eye fs-5"></i>
                                                </button>
                                                <button className="btn btn-icon btn-sm btn-light-warning btn-active-warning" title="แก้ไข">
                                                    <i className="bi bi-pencil fs-5"></i>
                                                </button>
                                                <button className="btn btn-icon btn-sm btn-light-info btn-active-info" title="พิมพ์ PDF">
                                                    <i className="bi bi-printer fs-5"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Footer Section (Pagination) --- */}
                    <div className="d-flex flex-stack flex-wrap pt-8 pb-3">
                        <div className="fs-6 fw-semibold text-gray-600">
                            Showing 1 to 5 of 42 results
                        </div>
                        <ul className="pagination">
                            <li className="page-item previous disabled">
                                <button className="page-link"><i className="previous"></i></button>
                            </li>
                            <li className="page-item active">
                                <button className="page-link">1</button>
                            </li>
                            <li className="page-item">
                                <button className="page-link">2</button>
                            </li>
                            <li className="page-item">
                                <button className="page-link">3</button>
                            </li>
                            <li className="page-item disabled">
                                <button className="page-link">...</button>
                            </li>
                            <li className="page-item">
                                <button className="page-link">8</button>
                            </li>
                            <li className="page-item next">
                                <button className="page-link"><i className="next"></i></button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestCertificateList;