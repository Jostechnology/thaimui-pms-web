import React, { useState } from 'react';
import { login } from '../../../services/dedicated_auth';
import Swal from 'sweetalert2';

const DedicatedLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit =  async(e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(username, password)
    if (res) {
      window.location.href = '/main';
    } else {
      Swal.fire("Error", "Username หรือ Passwork ผิด", "error")
    }
  };

  return (
    <>
      <style>{`
        body, html, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        
         .gradient-side {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #4facfe 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          position: relative;
          overflow: hidden;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .gradient-side::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 15s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        
        .login-container {
          height: 100vh;
        }
        
        .form-side {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
        }
        
        .login-form-wrapper {
          width: 100%;
          max-width: 400px;
          padding: 2rem;
        }
        
        .brand-text {
          color: #667eea;
          font-weight: 700;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .welcome-text {
          color: #6c757d;
          margin-bottom: 2rem;
        }
        
        .btn-primary {
          background-color: #667eea;
          border-color: #667eea;
          padding: 0.75rem;
          font-weight: 500;
        }
        
        .btn-primary:hover {
          background-color: #5568d3;
          border-color: #5568d3;
        }
        
        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        
        .gradient-overlay-text {
          color: white;
          font-size: 3rem;
          font-weight: 700;
          text-align: center;
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="login-container">
        <div className="row h-100 g-0">
          {/* Left side - Gradient */}
          <div className="col-lg-6 d-none d-lg-flex gradient-side align-items-center justify-content-center">
            <div className="gradient-overlay-text">
              TMS
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="col-lg-6 col-12 form-side">
            <div className="login-form-wrapper">
              <h1 className="brand-text">เข้าสู่ระบบ</h1>
              <p className="welcome-text">กรอกข้อมูลเพื่อเข้าสู่ระบบ TMS</p>

              <div onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    placeholder="กรอก Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">รหัสผ่าน</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3 d-flex justify-content-between align-items-center">
                  
                  <a href="#" className="text-decoration-none">Forgot password?</a>
                </div>

                <button onClick={handleSubmit} className="btn btn-primary w-100 mb-3">
                  เข้าสู่ระบบ
                </button>

                
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DedicatedLogin;