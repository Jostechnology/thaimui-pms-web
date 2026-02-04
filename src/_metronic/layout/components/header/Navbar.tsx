import { useAlertModal } from "../../../../app/context/ModalContext"
import { deleteTokenFromLocal, getEmpId, getUsernameLocal, giveAccessDenied, logout ,destroyToken } from "../../../../app/helpers/appHelpers";
import ChangePasswordModal from "../../../partials/modals/change-password/ChangePasswordModal";
import { useEffect, useRef, useState } from "react";
import { changeEmpPass } from "../../../../app/services/authenticationServices";
import { isUserSubscribed, NotificationPayload, sendTestNotification, subscribeUserToPush, unsubscribeUserFromPush } from "../../../../app/libs/notificationUtil";
import NotificationHistory from "../../../partials/modals/notification_history/NotificationHistoryModal";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const username = getUsernameLocal()
  const employee_id = getEmpId()
  const { resetModal, openTwoBtnAlertModal, alertMessage, openAlertModal } = useAlertModal();
  const [isModalShow, setIsModalShow] = useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [employeeName, setEmployeeName] = useState<string>("")
  const navigate = useNavigate()

  useEffect(() => {
    const getSubscribed = async () => {
      const sub = await isUserSubscribed()
      setSubscribed(sub)
    }
    getSubscribed()
  }, [])

  useEffect(() => {
    fetchEmployee()
  }, [employee_id])

  const fetchEmployee = async () => {
    
    setEmployeeName("TEST THAIMUI PMS")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    
  }

  const handleSubmit = async (e: React.FormEvent) => {
    
  }

  const handleClose = () => {
    setIsModalShow(false);
  }

  const handleLogout = () => {
    deleteTokenFromLocal();
    destroyToken();
    giveAccessDenied();
  }

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);

  // Check if screen is mobile size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownItemClick = (callback) => {
    callback();
    setIsDropdownOpen(false);
  };

  const handleOpenNotiHistory = () => {
    setShowHistory(true)
  }

  const handleGotoPersonalInformation = () => {
    navigate(`/employee/employee_details/manage/?employee_id=${employee_id}`)
  }

  return (
    <>
      <ChangePasswordModal
        isModalShow={isModalShow}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        handleClose={handleClose}
      />
      <NotificationHistory show={showHistory} handleClose={() => setShowHistory(false)}/>
      <div className='app-navbar flex-shrink-0'>
          {true ? (
            <div className="dropdown" ref={dropdownRef}>
              <style>{`
                .app-navbar .dropdown-menu {
                  min-width: 175px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  border-radius: 8px;
                  padding: 0.5rem 0;
                  right: 0.4rem;
                }
                
                .app-navbar .dropdown-toggle {
                  border-radius: 6px;
                  font-weight: 500;
                }
                
                .app-navbar .dropdown-toggle:hover {
                  background-color: #5a6268;
                  border-color: #5a6268;
                }
                
                .app-navbar .user-info-section {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 1rem;
                  margin: 0.5rem;
                  border-radius: 6px;
                  color: white;
                }
                
                .app-navbar .user-info-label {
                  font-size: 0.75rem;
                  opacity: 0.9;
                  font-weight: 600;
                  margin-bottom: 0.25rem;
                }
                
                .app-navbar .user-info-value {
                  font-size: 0.9rem;
                  font-weight: 500;
                  word-break: break-word;
                  line-height: 1.4;
                }
                
                .app-navbar .dropdown-item {
                  padding: 0.65rem 1rem;
                  transition: all 0.2s;
                }
                
                .app-navbar .dropdown-item:hover {
                  background-color: #f8f9fa;
                  padding-left: 1.25rem;
                }
                
                .app-navbar .dropdown-item.text-danger:hover {
                  background-color: #fff5f5;
                  color: #dc3545 !important;
                }
              `}</style>
              
              <button 
                className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center"
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
              >
                <svg width="16" height="16" className="me-2" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                </svg>
                เพิ่มเติม
              </button>
              
              <ul className={`dropdown-menu mr-5 ${isDropdownOpen ? 'show' : ''}`}>
                <li>
                  <div className="user-info-section">
                    <div className="mb-2">
                      <div className="user-info-label">ผู้ใช้</div>
                      <div className="user-info-value">{username}</div>
                    </div>
                    <div>
                      <div className="user-info-label">ชื่อ</div>
                      <div className="user-info-value">{employeeName}</div>
                    </div>
                  </div>
                </li>
                
                <li><hr className="dropdown-divider" /></li>

                <li>
                  <button 
                    className="dropdown-item"
                    onClick={handleGotoPersonalInformation}
                  >
                    <svg width="16" height="16" className="me-2" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                    ประวัติส่วนตัว
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                
                <li>
                  <button 
                    className="dropdown-item"
                    onClick={() => handleDropdownItemClick(async () => {
                      if (!subscribed) {
                        await subscribeUserToPush();
                        setSubscribed(true);
                      } else {
                        await unsubscribeUserFromPush();
                        setSubscribed(false);
                      }
                    })}
                  >
                    <svg width="16" height="16" className="me-2" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
                    </svg>
                    {subscribed ? "ปิดการแจ้งเตือน" : "รับการแจ้งเตือน"}
                  </button>
                </li>
                
                <li><hr className="dropdown-divider" /></li>
                
                <li>
                  <button 
                    className="dropdown-item"
                    onClick={handleOpenNotiHistory}
                  >
                    <svg width="16" height="16" className="me-2" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>
                    ประวัติการแจ้งเตือน
                  </button>
                </li>
                
                <li>
                  <button 
                    className="dropdown-item text-danger"
                    onClick={() => handleDropdownItemClick(() => {
                      openTwoBtnAlertModal(
                        "ต้องการออกจากระบบใช่หรือไม่?",
                        handleLogout,
                        resetModal
                      );
                    })}
                  >
                    <svg width="16" height="16" className="me-2" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                      <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                    </svg>
                    ออกจากระบบ
                  </button>
                </li>
              </ul>
            </div>
          ) : (
          <div className="d-flex gap-2 flex-wrap">
            
            <button className='btn btn-outline-secondary btn-sm'
              onClick={async () => {
                if (!subscribed) {
                  await subscribeUserToPush();
                  setSubscribed(true);
                  return;
                } else {
                  await unsubscribeUserFromPush();
                  setSubscribed(false);
                  return;
                }
              }}>
              {subscribed ? "ปิดการแจ้งเตือน" : "รับการแจ้งเตือน"}
            </button>

            <button className='btn btn-outline-secondary btn-sm'
              onClick={handleOpenNotiHistory}>
              ประวัติการแจ้งเตือน
            </button>
            
            {/* <button className='btn btn-outline-secondary btn-sm'
              onClick={() => {
                setIsModalShow(true);
              }}>
              เปลี่ยนรหัสผ่าน
            </button> */}
            <button className='btn btn-outline-secondary btn-sm'
              onClick={() => {
                openTwoBtnAlertModal(
                  "ต้องการออกจากระบบใช่หรือไม่?",
                  handleLogout,
                  resetModal
                );
              }}>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export {Navbar}