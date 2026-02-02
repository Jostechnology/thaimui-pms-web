import clsx from "clsx"
import React, { SetStateAction } from "react";

interface TablePaginatorProps {
    currentPage: number;
    setCurrentPage: (prev: SetStateAction<number>) => void;
    totalPages: number;
}

function TablePaginator(props: TablePaginatorProps) {

    const {
        currentPage,
        setCurrentPage,
        totalPages
    } = props;

    // Validate totalPages to prevent RangeError
    const validTotalPages = Math.max(0, Math.floor(totalPages || 0));
    
    // Don't render paginator if there are 0 or 1 pages
    if (validTotalPages <= 1) {
        return null;
    }

    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, validTotalPages));

    return (
        <div className="d-flex align-items-center justify-content-center">
            <div id='kt_table_users_paginate'>
                <ul className='pagination'>
                    <li
                        className={clsx('page-item', {
                            disabled: currentPage === 1,
                        })}
                    >
                        <a
                            onClick={prevPage}
                            style={{ cursor: 'pointer' }}
                            className='page-link'
                        >
                            Previous
                        </a>
                    </li>
                    <li className='page-item d-flex'>
                        {
                            [...Array(validTotalPages).keys()].map((item, index) => {

                                let pageIndex = item + 1;
                                if (
                                    pageIndex === 1 || 
                                    pageIndex === currentPage || 
                                    pageIndex === validTotalPages ||
                                    pageIndex === currentPage + 1 ||
                                    pageIndex === currentPage + 2 ||
                                    pageIndex === currentPage - 1 ||
                                    pageIndex === currentPage - 2
                                ) {
                                    return (
                                        <button 
                                            className={
                                                currentPage === pageIndex ? 'btn btn-secondary' : 'page-link'
                                            }
                                            style={currentPage === pageIndex ? {height: "30px", padding: "5px 10px"} : {}}
                                            key={index}
                                            onClick={() => {
                                                setCurrentPage(pageIndex);
                                            }}>
                                            {pageIndex}
                                        </button>
                                    );    
                                } else if (
                                    pageIndex === currentPage + 3 ||
                                    pageIndex === currentPage - 3
                                ) {
                                    return (
                                    <span key={`page-${index}`}
                                        style={{
                                            padding: 'var(--bs-pagination-padding-y) var(--bs-pagination-padding-x)'
                                        }}>
                                        ...
                                    </span>
                                )} else {
                                    return null;
                                }
                            })
                        }
                    </li>
                    <li
                        className={clsx('page-item', {
                            disabled: currentPage === validTotalPages || validTotalPages === 0,
                        })}
                    >
                        <a
                            onClick={nextPage}
                            style={{ cursor: 'pointer' }}
                            className='page-link'
                        >
                            Next
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default TablePaginator