import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleBranchSelect, handleAllBranchSelect } from '../../../services/dedicated_auth';
import Swal from 'sweetalert2';

interface BranchOption {
    branch_id: number;
    branch_name: string;
}

interface BranchSelectData {
    user_branches: BranchOption[];
    has_all_branch_access: boolean;
}

const BranchSelect: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [branchData, setBranchData] = useState<BranchSelectData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | 'all_branch' | null>(null);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const stored = sessionStorage.getItem('branch_select_data');
        if (!stored) {
            navigate('/login');
            return;
        }

        try {
            const parsed = JSON.parse(stored) as BranchSelectData;
            setBranchData(parsed);
        } catch {
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSelect = async (branchId: number, branchName: string) => {
        if (isLoading || !token) return;
        setIsLoading(true);
        setSelectedId(branchId);
        try {
            const res = await handleBranchSelect(token, branchId, branchName);
            if (res && res.success) {
                window.location.href = '/main';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: res.message,
                    confirmButtonColor: '#1d84f5',
                });
            }
        } catch {
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            setIsLoading(false);
            setSelectedId(null);
        }
    };

    const handleAllBranch = async () => {
        if (isLoading || !token) return;
        setIsLoading(true);
        setSelectedId('all_branch');
        try {
            const res = await handleAllBranchSelect(token);
            if (res && res.success) {
                window.location.href = '/main';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: res.message,
                    confirmButtonColor: '#1d84f5',
                });
            }
        } catch {
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        } finally {
            setIsLoading(false);
            setSelectedId(null);
        }
    };

    if (!branchData) return null;

    return (
        <>
            <style>{`
                body, html, #root {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    font-family: 'Manrope', sans-serif;
                    background-color: #f8fafc;
                }

                .branch-select-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }

                .branch-select-box {
                    width: 100%;
                    max-width: 560px;
                }

                .branch-card {
                    border: 2px solid #e2e8f0;
                    border-radius: 1rem;
                    padding: 1.25rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: white;
                }

                .branch-card:hover {
                    border-color: #1d84f5;
                    box-shadow: 0 4px 12px rgba(29, 132, 245, 0.15);
                    transform: translateY(-2px);
                }

                .branch-card.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }

                .branch-card-all {
                    border: 2px solid #e2e8f0;
                    border-radius: 1rem;
                    padding: 1.25rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
                }

                .branch-card-all:hover {
                    border-color: #0d6efd;
                    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2);
                    transform: translateY(-2px);
                }

                .branch-card-all.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }
            `}</style>

            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

            <div className="branch-select-wrapper">
                <div className="branch-select-box">
                    <div className="text-center mb-5">
                        <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
                            <div className="d-flex align-items-center justify-content-center rounded-4"
                                style={{
                                    width: '56px', height: '56px',
                                    background: '#1d84f5',
                                }}>
                                <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>
                                    precision_manufacturing
                                </span>
                            </div>
                            <h1 className="fw-extrabold mb-0 text-dark" style={{ fontSize: '2rem', letterSpacing: '-1px' }}>
                                PMS
                            </h1>
                        </div>
                        <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '1.5rem' }}>
                            เลือกสาขาที่ต้องการเข้าทำงาน
                        </h2>
                        <p className="text-muted">กรุณาเลือกสาขาเพื่อดำเนินการเข้าสู่ระบบ</p>
                    </div>

                    <div className="d-flex flex-column gap-3">
                        {branchData.has_all_branch_access && (
                            <div
                                className={`branch-card-all ${isLoading ? 'disabled' : ''}`}
                                onClick={handleAllBranch}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center justify-content-center rounded-3"
                                        style={{ width: '44px', height: '44px', background: '#0d6efd' }}>
                                        <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>
                                            monitoring
                                        </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-dark fs-6">ดูทุกสาขา</div>
                                        <div className="text-muted small">อ่านอย่างเดียว - ดูข้อมูลรวมทุกสาขา</div>
                                    </div>
                                    {selectedId === 'all_branch' ? (
                                        <span className="spinner-border spinner-border-sm text-primary" />
                                    ) : (
                                        <span className="material-symbols-outlined text-muted">arrow_forward</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {branchData.has_all_branch_access && branchData.user_branches.length > 0 && (
                            <div className="d-flex align-items-center gap-3 my-1">
                                <hr className="flex-grow-1" />
                                <span className="text-muted small fw-semibold">หรือเลือกสาขา</span>
                                <hr className="flex-grow-1" />
                            </div>
                        )}

                        {branchData.user_branches.map((branch) => (
                            <div
                                key={branch.branch_id}
                                className={`branch-card ${isLoading ? 'disabled' : ''}`}
                                onClick={() => handleSelect(branch.branch_id, branch.branch_name)}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center justify-content-center rounded-3"
                                        style={{ width: '44px', height: '44px', background: '#f1f5f9' }}>
                                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                                            apartment
                                        </span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-dark fs-6">{branch.branch_name}</div>
                                    </div>
                                    {selectedId === branch.branch_id ? (
                                        <span className="spinner-border spinner-border-sm text-primary" />
                                    ) : (
                                        <span className="material-symbols-outlined text-muted">arrow_forward</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-5">
                        <button
                            className="btn btn-link text-muted fw-semibold text-decoration-none"
                            onClick={() => {
                                sessionStorage.removeItem('branch_select_data');
                                navigate('/login');
                            }}
                        >
                            <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                                arrow_back
                            </span>
                            กลับหน้าเข้าสู่ระบบ
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BranchSelect;
