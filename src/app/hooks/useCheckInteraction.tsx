import { useEffect, useRef, useState } from 'react';
import { useAlertModal } from '../context/ModalContext';
import { isTokenAlmostExpired, isTokenExpired } from '../helpers/authenticationHelpers';
import { getTokenFromLocal, saveTokenExpiredDateToLocal, giveAccessDenied } from '../helpers/appHelpers';
import { extendsTokenTime } from '../services/authenticationServices';

const useCheckInteraction = () => {

    const { openAlertModal } = useAlertModal();
    
    const [isInactive, setIsInactive] = useState<boolean>(false);
    const [isLogoutMessageShow, setIsLogoutMessageShow] = useState<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const minutes = 5;
    const minutesConfig = minutes * 60 * 1000;

    const activityEvents = [
        'click',
        // 'keydown',
        // 'mousemove',
        // 'mousedown',
        'touchstart',
        // 'scroll',
    ];

    const setLoopCheckToken = () => timerRef.current = setTimeout(checkIfTokenExpired, minutesConfig);

    const checkIfTokenExpired = () => {
        if (isTokenExpired()) {
            if (!isLogoutMessageShow) {
                setIsInactive(true);
                setIsLogoutMessageShow(true);
                openAlertModal(
                    "Session หมดอายุ กรุณา Login ใหม่อีกครั้ง",
                    () => giveAccessDenied(),
                    false
                );
            }
        } else {
            setLoopCheckToken();
        }
    }


    const resetTimer = async () => {
        if (getTokenFromLocal()) {
            if (!isInactive) {
                // extends token for user that still active by clicking
                if (isTokenAlmostExpired()) {
                    let result = await extendsTokenTime();
                    if (result) {
                        if (result.success) {
                            console.log("result", result);
                            let expireTime = result.data.expired_date;
                            saveTokenExpiredDateToLocal(expireTime);
                        }
                    } else {
                        console.log("Function extendsTokenTime returns error.");
                    }
                }
            }
    
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
    
            setLoopCheckToken();
        }
    };


    useEffect(() => {
        if (window.location.pathname !== "/login") {
            activityEvents.forEach((event) => {
                window.addEventListener(event, resetTimer);
            });
            resetTimer();
    
            return () => {
                activityEvents.forEach((event) => {
                    window.removeEventListener(event, resetTimer);
                });
    
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
            };
        }
    }, []);
}

export default useCheckInteraction;