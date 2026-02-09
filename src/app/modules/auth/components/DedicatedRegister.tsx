import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { register } from '../../../services/dedicated_auth';

const DedicatedRegister: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        try {
            const res = await register(username, password);
            if (res) {
                Swal.fire({
                    icon: 'success',
                    title: 'ดำเนินการต่อ',
                    text: 'ข้อมูลบัญชีถูกต้อง ระบบกำลังพาคุณไปยังหน้าหลัก',
                    confirmButtonColor: '#1d84f5',
                    confirmButtonText: 'ตกลง',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/login';
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เข้าสมัครไม่สำเร็จ',
                    text: 'กรุณาลองใหม่อีกครั้ง',
                    confirmButtonColor: '#1d84f5',
                });
            }
        } catch (error: any) {
            if (error.response && error.response.status === 429) {
                Swal.fire("ระงับชั่วคราว", "คุณกดสมัครสมาชิกบ่อยเกินไป กรุณารอสักครู่", "warning");
            } else {
                Swal.fire("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        body, html, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          font-family: 'Manrope', sans-serif;
          background-color: #ffffff;
        }

        .main-wrapper {
          min-height: 100vh;
        }

        /* --- ส่วนซ้าย: Visual Panel (Copy จาก Login) --- */
        .side-visual {
          position: relative;
          background: #101922; /* สีพื้นหลังเข้มตาม Template */
          overflow: hidden;
          padding: 3.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .side-visual img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          opacity: 0.6;
        }

        .side-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(19, 127, 236, 0.9) 0%, rgba(16, 25, 34, 0.4) 100%);
          z-index: 1;
        }

        .visual-content {
          position: relative;
          z-index: 10;
          color: white;
        }

        /* --- ส่วนขวา: Form Panel --- */
        .form-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
        }

        .register-box {
          width: 100%;
          max-width: 480px; /* ขยายกว้างกว่า login นิดหน่อยเพื่อให้ใส่ข้อมูลได้ครบ */
        }

        .progress-bar-custom {
          height: 8px;
          background-color: #f1f5f9;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .progress-fill {
          height: 100%;
          background-color: #1d84f5;
          width: 33%; /* Step 1 of 3 */
          border-radius: 10px;
        }

        .input-group-custom {
          position: relative;
        }

        .input-group-custom .material-symbols-outlined {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 20px;
          z-index: 5;
        }

        .form-control-custom {
          padding: 0.85rem 1rem 0.85rem 3rem !important;
          border-radius: 0.75rem !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 0.95rem;
        }

        .btn-continue {
          background: #1d84f5;
          color: white;
          border: none;
          border-radius: 0.75rem;
          padding: 1rem;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(29, 132, 245, 0.25);
          transition: all 0.2s;
        }

        .btn-continue:hover {
          background: #1669c1;
          transform: translateY(-1px);
        }

        @media (max-width: 991.98px) {
          .side-visual { display: none; }
          .form-container { padding: 2rem 1.5rem; }
        }
      `}</style>

            {/* เรียกใช้งาน Material Symbols */}
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

            <div className="container-fluid p-0">
                <div className="row g-0 main-wrapper">

                    {/* ส่วนซ้าย (Desktop Only) */}
                    <div className="col-lg-6 side-visual h-auto">
                        <img src="https://www.thaimui.co.th/wp-content/uploads/2015/12/services-tabs-146143418-1.jpg" alt="Factory" />

                        <div className="visual-content">
                            <div className="d-flex align-items-center gap-3 mb-auto">
                                <div className="bg-white bg-opacity-25 p-3 rounded-4 border border-2 border-white border-opacity-25 d-flex align-items-center justify-content-center"
                                    style={{ width: '64px', height: '64px' }}>
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: '36px' }}>
                                        precision_manufacturing
                                    </span>
                                </div>
                                <h1 className="fw-extrabold mb-0 text-white" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>
                                    PMS
                                </h1>
                            </div>

                            <div style={{ marginTop: '20vh' }}>
                                <h1 className="display-4 fw-extrabold mb-4">
                                    Optimize Your <br /> Production Line.
                                </h1>
                                <p className="lead opacity-75 mb-5">
                                    Join thousands of plant managers tracking real-time efficiency and output with PMS Pro.
                                </p>
                            </div>
                        </div>

                        <div className="visual-content small opacity-50 mt-auto">
                            © 2026 Production Management System. All rights reserved.
                        </div>
                    </div>

                    {/* ส่วนขวา (Register Form) */}
                    <div className="col-lg-6 col-12 form-container">
                        <div className="register-box">
                            <div className="mb-5">
                                <h1 className="fw-extrabold mb-2" style={{ fontSize: '2.5rem' }}>Account Credentials</h1>
                                <p className="text-muted fw-medium">Let's set up your secure login details to get started.</p>
                            </div>

                            <form onSubmit={handleRegister}>
                                <div className="mb-4 text-start">
                                    <label className="form-label small fw-bold text-dark mb-2">USERNAME</label>
                                    <div className="input-group-custom">
                                        <span className="material-symbols-outlined">person</span>
                                        <input
                                            type="text"
                                            className="form-control form-control-custom w-100"
                                            placeholder="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4 text-start">
                                    <label className="form-label small fw-bold text-dark mb-2">PASSWORD</label>
                                    <div className="input-group-custom">
                                        <span className="material-symbols-outlined">lock</span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control form-control-custom w-100"
                                            placeholder="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn position-absolute end-0 top-50 translate-middle-y border-0 text-secondary"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <span className="material-symbols-outlined fs-5">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    {/* Password Strength Meter (Simplified) */}
                                    <div className="mt-2">
                                        <div className="d-flex gap-1 mb-1" style={{ height: '4px' }}>
                                            <div className="flex-grow-1 rounded-pill bg-warning"></div>
                                            <div className="flex-grow-1 rounded-pill bg-warning"></div>
                                            <div className="flex-grow-1 rounded-pill bg-light"></div>
                                            <div className="flex-grow-1 rounded-pill bg-light"></div>
                                        </div>
                                        <div className="d-flex justify-content-between small">
                                            <span className="text-warning fw-bold" style={{ fontSize: '10px' }}>Strength: Medium</span>
                                            <span className="text-muted" style={{ fontSize: '10px' }}>At least 8 characters</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-continue w-100 d-flex align-items-center justify-content-center gap-2 mt-4"
                                >
                                    <span>Register</span>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </form>

                            <div className="mt-5 text-center">
                                <p className="small text-muted mb-0">
                                    Already have an account?
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="btn btn-link p-0 ms-1 fw-bold text-primary text-decoration-none"
                                        style={{ verticalAlign: 'baseline' }}
                                    >
                                        Login
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default DedicatedRegister;