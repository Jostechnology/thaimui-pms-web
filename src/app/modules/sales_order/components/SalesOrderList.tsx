import React, { useState } from 'react';
import { Content } from "../../../../_metronic/layout/components/content";
import { useNavigate } from 'react-router-dom';
import { useQuery } from "react-query";
import { getSalesOrderList, SalesOrderSummary } from '../../../services/salesOrder';
import { KTIcon } from '../../../../_metronic/helpers';

const SalesOrderList: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);
    const [search, setSearch] = useState<string>('');
    const [searchValue, setSearchValue] = useState<string>('');

    const {
        data,
        isLoading,
        isError,
        refetch,
        isFetching
    } = useQuery(
        ['salesOrderList', page, limit, search],
        () => getSalesOrderList(page, limit, search),
        {
            keepPreviousData: true,
            refetchOnWindowFocus: false,
        }
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // รีเซ็ตหน้าเมื่อค้นหาใหม่
        setSearch(searchValue);
    };

    const handleClearSearch = () => {
        setSearchValue('');
        if (search !== '') {
            setPage(1);
            setSearch('');
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && (!data?.total_pages || newPage <= data.total_pages)) {
            setPage(newPage);
        }
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLimit(Number(e.target.value));
        setPage(1);
    };

    const items = data?.items || [];
    const totalPages = data?.total_pages || 1;
    const totalItems = data?.total_items || 0;

    return (
        <Content>
            {/* ==================== PAGE TITLE ==================== */}
            <div className='d-flex flex-stack mb-6'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
                        <i className='bi bi-cart me-3 text-primary'></i>
                        รายการใบสั่งขาย
                    </h1>
                    <span className='text-muted fw-semibold fs-6'>รายการใบสั่งขายทั้งหมดในระบบ</span>
                </div>
            </div>

            {/* ==================== HEADER & SEARCH ==================== */}
            <div className='card card-flush shadow-sm mb-5 mb-xl-8'>
                <div className='card-header border-0 pt-6'>
                    <div className='card-title'>
                        <div className='d-flex align-items-center position-relative my-1'>
                            <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
                            <form onSubmit={handleSearch} className="d-flex w-100">
                                <input
                                    type='text'
                                    data-kt-user-table-filter='search'
                                    className='form-control form-control-solid w-250px ps-14 shadow-sm'
                                    placeholder='ค้นหา Doc Num, ชื่อลูกค้า'
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                {searchValue && (
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-sm btn-active-color-primary position-absolute end-0 me-3 mt-1"
                                        onClick={handleClearSearch}
                                        style={{ right: '50px' }}
                                    >
                                        <i className="bi bi-x fs-2"></i>
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary btn-sm ms-2 shadow-sm d-none">
                                    ค้นหา
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className='card-toolbar'>
                        <div className='d-flex justify-content-end' data-kt-user-table-toolbar='base'>
                            <button
                                type='button'
                                className='btn btn-light-primary btn-sm me-3 fw-bold'
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <KTIcon iconName='arrows-circle' className='fs-2' />
                                อัปเดตข้อมูล
                            </button>
                        </div>
                    </div>
                </div>

                {/* ==================== TABLE BODY ==================== */}
                <div className='card-body py-4'>
                    {isError ? (
                        <div className="alert alert-danger d-flex align-items-center p-5 mb-10">
                            <i className="bi bi-exclamation-triangle-fill fs-2hx text-danger me-4 mb-5 mb-sm-0"></i>
                            <div className="d-flex flex-column">
                                <h4 className="mb-1 text-danger">เกิดข้อผิดพลาดในการดึงข้อมูล</h4>
                                <span>ไม่สามารถโหลดรายการใบสั่งขายได้ โปรดลองอีกครั้ง</span>
                            </div>
                        </div>
                    ) : (
                        <div className='table-responsive'>
                            <table className='table align-middle table-row-dashed fs-6 gy-5 dataTable no-footer'>
                                <thead>
                                    <tr className='text-start text-muted fw-bolder fs-7 text-uppercase gs-0 bg-light'>
                                        <th className='min-w-100px ps-4 rounded-start'>Doc Num</th>
                                        <th className='min-w-200px'>ข้อมูลลูกค้า</th>
                                        <th className='min-w-150px'>ตัวแทนขาย</th>
                                        <th className='min-w-150px'>สาขา</th>
                                        <th className='min-w-120px text-center'>สินค้า / ใบสั่งงาน</th>
                                        <th className='min-w-100px text-end'>วันที่แจ้ง</th>
                                        <th className='min-w-80px text-center rounded-end pe-4'>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className='text-gray-600 fw-bold'>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className='text-center py-10'>
                                                <span className="spinner-border spinner-border-sm text-primary align-middle ms-2"></span>
                                                <span className="text-muted ms-2">กำลังโหลดข้อมูล...</span>
                                            </td>
                                        </tr>
                                    ) : items.length > 0 ? (
                                        items.map((so: SalesOrderSummary, i: number) => {
                                            return (
                                                <tr key={so.doc_entry} className="hover-elevate-up transition-all" style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                                                    <td className="ps-4">
                                                        <span className='text-gray-800 fw-bolder text-hover-primary mb-1 fs-6'>
                                                            {so.doc_num}
                                                        </span>
                                                        <span className='text-muted fw-bold text-muted d-block fs-8'>
                                                            ID: {so.doc_entry}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className='d-flex flex-column'>
                                                            <span className='text-gray-800 fw-bolder mb-1 fs-6'>{so.card_name}</span>
                                                            <span className='text-muted fw-bold text-muted d-block fs-8'>{so.card_code}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="symbol symbol-30px me-3">
                                                                <span className="symbol-label bg-light-info text-info fw-bold">{so.slp_name ? so.slp_name.charAt(0).toUpperCase() : '?'}</span>
                                                            </div>
                                                            <div className="d-flex flex-column">
                                                                <span className="text-gray-800 fw-bolder mb-1 fs-6">{so.slp_name || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className="bi bi-shop text-primary fs-4"></i>
                                                            <span className="text-gray-800 fw-bolder mb-1 fs-6">{so.bpl_name || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex flex-column gap-1 align-items-center">
                                                            <span className="badge badge-light-primary fs-7 w-100px">{so.sales_items_count} สินค้า</span>
                                                            {so.work_orders_count > 0 && (
                                                                <span className="badge badge-light-success fs-7 w-100px">{so.work_orders_count} ใบสั่งงาน</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <span className="text-gray-700 fw-bolder">
                                                            {so.created_date ? new Date(so.created_date).toLocaleDateString('th-TH', {
                                                                year: 'numeric', month: 'short', day: 'numeric'
                                                            }) : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center pe-4">
                                                        <button
                                                            onClick={() => navigate(`/sales_order/view/${so.doc_entry}`)}
                                                            className="btn btn-icon btn-light-primary btn-sm me-1"
                                                            title="ดูรายละเอียด"
                                                        >
                                                            <i className="bi bi-eye fs-4"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className='text-center py-10'>
                                                <div className="d-flex flex-column align-items-center justify-content-center">
                                                    <i className="bi bi-search fs-3x text-muted mb-3"></i>
                                                    <span className="text-muted fs-5 fw-bold">ไม่พบข้อมูลใบสั่งขายในระบบ</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ==================== PAGINATION ==================== */}
                    <div className='row mt-5'>
                        <div className='col-sm-12 col-md-5 d-flex align-items-center justify-content-center justify-content-md-start'>
                            <div className='dataTables_length' id='kt_ecommerce_sales_table_length'>
                                <label>
                                    <select
                                        name='kt_ecommerce_sales_table_length'
                                        aria-controls='kt_ecommerce_sales_table'
                                        className='form-select form-select-sm form-select-solid shadow-sm'
                                        value={limit}
                                        onChange={handleLimitChange}
                                        disabled={isLoading || isFetching}
                                    >
                                        <option value='10'>10</option>
                                        <option value='25'>25</option>
                                        <option value='50'>50</option>
                                        <option value='100'>100</option>
                                    </select>
                                </label>
                            </div>
                            <div className='dataTables_info mx-4 text-muted' id='kt_ecommerce_sales_table_info' role='status' aria-live='polite'>
                                แสดง {items.length > 0 ? ((page - 1) * limit) + 1 : 0} ถึง {Math.min(page * limit, totalItems)} จาก {totalItems} รายการ
                            </div>
                        </div>
                        <div className='col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end'>
                            <div className='dataTables_paginate paging_simple_numbers' id='kt_ecommerce_sales_table_paginate'>
                                <ul className='pagination'>
                                    <li className={`paginate_button page-item previous ${page === 1 ? 'disabled' : ''}`}>
                                        <button onClick={() => handlePageChange(page - 1)} className='page-link' disabled={page === 1 || isLoading || isFetching}>
                                            <i className='previous'></i>
                                        </button>
                                    </li>
                                    {[...Array(totalPages)].map((_, index) => {
                                        const pageNumber = index + 1;
                                        if (
                                            pageNumber === 1 ||
                                            pageNumber === totalPages ||
                                            (pageNumber >= page - 1 && pageNumber <= page + 1)
                                        ) {
                                            return (
                                                <li key={pageNumber} className={`paginate_button page-item ${page === pageNumber ? 'active' : ''}`}>
                                                    <button onClick={() => handlePageChange(pageNumber)} className='page-link' disabled={isLoading || isFetching}>
                                                        {pageNumber}
                                                    </button>
                                                </li>
                                            );
                                        } else if (
                                            pageNumber === page - 2 ||
                                            pageNumber === page + 2
                                        ) {
                                            return (
                                                <li key={pageNumber} className="paginate_button page-item disabled">
                                                    <span className="page-link">...</span>
                                                </li>
                                            );
                                        }
                                        return null;
                                    })}
                                    <li className={`paginate_button page-item next ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                                        <button onClick={() => handlePageChange(page + 1)} className='page-link' disabled={page === totalPages || totalPages === 0 || isLoading || isFetching}>
                                            <i className='next'></i>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default SalesOrderList;
