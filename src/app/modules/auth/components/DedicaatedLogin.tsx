import React, { useState } from 'react';
import { login } from '../../../services/dedicated_auth';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const DedicatedLogin: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await login(username, password);
      if (res) {
        window.location.href = '/main';
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: 'Username หรือ Password ไม่ถูกต้อง',
          confirmButtonColor: '#1d84f5',
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        Swal.fire("ระงับชั่วคราว", "คุณกดล็อกอินบ่อยเกินไป กรุณารอสักครู่", "warning");
      } else {
        Swal.fire("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigate = useNavigate();

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

        .login-wrapper {
          min-height: 100vh;
        }

        /* --- ฝั่งซ้าย: Visual Panel --- */
        .side-visual {
          position: relative;
          background: #137fec;
          overflow: hidden;
          padding: 4rem;
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
          opacity: 0.7;
        }

        /* Gradient Overlay ให้เหมือนในรูป */
        .side-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(19, 127, 236, 0.9) 0%, rgba(19, 127, 236, 0.2) 100%);
          z-index: 1;
        }

        .visual-content {
          position: relative;
          z-index: 10;
          color: white;
        }

        /* --- ฝั่งขวา: Form Panel --- */
        .form-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .login-box {
          width: 100%;
          max-width: 440px;
        }

        /* ปรับแต่ง Input ให้เป๊ะ */
        .input-container {
          position: relative;
        }

        .input-container .material-symbols-outlined {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 20px;
        }

        .form-control-custom {
          padding: 0.85rem 1rem 0.85rem 3rem !important;
          border-radius: 0.75rem !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 0.95rem;
        }

        .form-control-custom:focus {
          border-color: #1d84f5 !important;
          box-shadow: 0 0 0 4px rgba(29, 132, 245, 0.1) !important;
        }

        .btn-login-custom {
          background: #1d84f5 !important;
          color: white !important;
          border: none !important;
          border-radius: 0.75rem !important;
          padding: 1rem !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 12px rgba(29, 132, 245, 0.25);
        }

        /* จัดการเรื่อง Responsive */
        @media (max-width: 991.98px) {
          .side-visual { display: none; }
          .form-container { padding: 2rem 1rem; }
        }
      `}</style>

      {/* เรียกใช้งาน Material Symbols */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

      <div className="container-fluid p-0">
        <div className="row g-0 login-wrapper">

          {/* ส่วนซ้าย (Desktop Only) */}
          <div className="col-lg-6 side-visual h-auto">
            <img src="https://www.thaimui.co.th/wp-content/uploads/2019/01/IMG_1529-1024x768.jpg" alt="Production" />

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

              <div style={{ marginTop: '25vh' }}>
                <h1 className="display-4 fw-extrabold mb-4">
                  Empowering Your <br /> Production Line
                </h1>
                <p className="lead opacity-75 mb-5">
                  Experience the next generation of industrial management. Reliability, efficiency, and clarity at every step.
                </p>
              </div>
            </div>

            <div className="visual-content small opacity-50 mt-auto">
              © 2026 Production Management System. All rights reserved.
            </div>
          </div>

          {/* ส่วนขวา (Login Form) */}
          <div className="col-lg-6 col-12 form-container">
            <div className="login-box">
              <div className="mb-5">
                <h1 className="fw-extrabold mb-1 text-dark" style={{ fontSize: '3.5rem', lineHeight: '1.2' }}>
                  Welcome Back
                </h1>
                <p className="text-muted fw-medium">กรุณาเข้าสู่ระบบเพื่อจัดการสายการผลิตของคุณ</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label small fw-bold text-dark">Username</label>
                  <div className="input-container">
                    <span className="material-symbols-outlined">person</span>
                    <input
                      type="text"
                      className="form-control form-control-custom"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label small fw-bold text-dark mb-0">Password</label>
                    <a href="#" className="small fw-bold text-primary text-decoration-none">Forgot Password?</a>
                  </div>
                  <div className="input-container">
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
                </div>

                <div className="mb-4 d-flex align-items-center">
                  <input type="checkbox" className="form-check-input me-2" id="remember" style={{ width: '18px', height: '18px' }} />
                  <label className="form-check-label small fw-semibold text-muted" htmlFor="remember">
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-login-custom w-100 d-flex align-items-center justify-content-center gap-2"
                  disabled={isLoading}
                >
                  <span>{isLoading ? 'Processing...' : 'Login'}</span>
                  {!isLoading && <span className="material-symbols-outlined">arrow_forward</span>}
                </button>
              </form>
              <div className="mt-5 text-center">
                <p className="small text-muted mb-0">
                  Don't have an account yet? 
                  <button 
                    onClick={() => navigate('/register')}
                    className="btn btn-link p-0 ms-1 fw-bold text-primary text-decoration-none"
                    style={{verticalAlign: 'baseline'}}
                  >
                    Register
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

export default DedicatedLogin;