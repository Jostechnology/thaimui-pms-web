import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ssoLogin } from '../../../services/dedicated_auth';
import Swal from 'sweetalert2';

const SSOCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status] = useState<string>('กำลังเข้าสู่ระบบ...');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const verify = async () => {
            console.log('SSO token:', token);
            const res = await ssoLogin(token);
            console.log('SSO response:', res);

            if (!res.success) {
                Swal.fire({
                    icon: 'error',
                    title: 'เข้าสู่ระบบไม่สำเร็จ',
                    text: res.message,
                    confirmButtonColor: '#1d84f5',
                }).then(() => navigate('/login'));
                return;
            }

            navigate(`/select-branch?token=${encodeURIComponent(res.branch_select_token)}`);
        };

        verify();
    }, [token, navigate]);

    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="text-center">
                <div className="spinner-border text-primary mb-3" />
                <p className="text-muted">{status}</p>
            </div>
        </div>
    );
};

export default SSOCallback;
