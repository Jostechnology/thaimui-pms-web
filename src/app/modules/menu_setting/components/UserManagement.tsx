import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAlertModal } from '../../../context/ModalContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import TableListConfig from '../../../custom_components/TableListConfig';
import TablePaginator from '../../../custom_components/TablePaginator';
import SearchComponent from '../../../custom_components/SearchComponent';
import AddEditUser from '../../../modals/setting_modal/user_modal/dedicatedAddUser';
import { useTableParams } from '../../../hooks/useTableParams';
import { getUserList, register, editUser, changePassword, createUser, banUser } from '../../../services/dedicated_auth';
import { getRoleList } from '../../../services/settingServices';

interface UserData {
    username: string;
    role_id: number;
    role_name: string;
    group_id: number;
    created_date: string;
    is_active: boolean;
}

interface RoleData {
    role_id: number;
    role_name: string;
}

const UserManagement: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage, openAlertModal } = useAlertModal();

    const [users, setUsers] = useState<UserData[]>([]);
    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
    const [pageConfig, setPageConfig] = useState(parseInt(searchParams.get("pageConfig") || "10"));
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
    const [keyword, setKeyword] = useState<string>(searchParams.get("search") || "");
    const [totalPages, setTotalPages] = useState<number>(0);

    const [roleOptions, setRoleOptions] = useState<RoleData[]>([]);
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [filter, setFilter] = useState(searchParams.get("filter") || "ทั้งหมด");

    const [showModalUser, setShowModalUser] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    useTableParams({
        currentPage,
        setCurrentPage,
        keyword,
        setKeyword,
        setSearchTerm,
        pageConfig,
        setPageConfig,
        filter,
        setFilter,
    });

    useEffect(() => {
        const fetchRoles = async () => {
            const res = await getRoleList();
            if (res && res.data) {
                setRoleOptions(res.data);
            }
        };
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        setDataLoading(true);
        setLoading();
        try {
            const result = await getUserList(currentPage, pageConfig, keyword, roleFilter);
            if (result && result.success) {
                setUsers(result.data.items);
                setTotalPages(result.pagination?.pages ?? 0);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error(error);
            alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setUnLoading();
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [currentPage, keyword, pageConfig, roleFilter]);

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setSelectedUser(null);
        setShowModalUser(true);
    };

    const handleOpenEdit = (user: UserData) => {
        setIsEditMode(true);
        setSelectedUser({
            username: user.username,
            role_id: user.role_id,
            password: ""
        });
        setShowModalUser(true);
    };

    const handleAddUserSubmit = async (data: any) => {
        try {
            const res = await createUser(data.username, data.password, data.role_id);
            if (res && res.success) {
                fetchUsers();
                return [true, ""] as [boolean, string];
            }
            return [false, res?.message || "เพิ่มผู้ใช้ไม่สำเร็จ"] as [boolean, string];
        } catch (err: any) {
            return [false, err.message] as [boolean, string];
        }
    };

    const handleEditUserSubmit = async (data: any) => {
        try {
            const res = await editUser(data);
            if (res && res.success) {
                fetchUsers();
                return [true, ""] as [boolean, string];
            }
            return [false, res?.message || "แก้ไขไม่สำเร็จ"] as [boolean, string];
        } catch (err: any) {
            return [false, err.message] as [boolean, string];
        }
    };

    const handleChangePasswordClick = async (username: string) => {
        const { value: formValues } = await Swal.fire({
            title: 'เปลี่ยนรหัสผ่าน',
            html:
                `<input id="swal-old-pass" class="swal2-input" type="password" placeholder="รหัสผ่านเดิม">` +
                `<input id="swal-new-pass" class="swal2-input" type="password" placeholder="รหัสผ่านใหม่">` +
                `<input id="swal-con-new-pass" class="swal2-input" type="password" placeholder="ยืนยันรหัสผ่านใหม่">`,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return [
                    (document.getElementById('swal-old-pass') as HTMLInputElement).value,
                    (document.getElementById('swal-new-pass') as HTMLInputElement).value,
                    (document.getElementById('swal-con-new-pass') as HTMLInputElement).value
                ]
            }
        });

        if (formValues) {
            const [oldPass, newPass, conNewPass] = formValues;
            if (!oldPass || !newPass) return alertMessage("กรุณากรอกข้อมูลให้ครบ");
            if (newPass !== conNewPass) return alertMessage("รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน");
            setLoading();
            const res = await changePassword({
                username: username,
                old_password: oldPass,
                new_password: newPass
            });
            setUnLoading();

            if (res && res.success) {
                openAlertModal("เปลี่ยนรหัสผ่านสำเร็จ", () => { }, true);
            } else {
                alertMessage(res?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
            }
        }
    }

    const handleToggleActiveClick = async (username: string, currentStatus: boolean) => {
        const adminUsername = localStorage.getItem('username') || 'System';
        const actionText = currentStatus ? "ระงับสิทธิ์" : "คืนสิทธิ์การใช้งาน";

        const result = await Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: `คุณกำลังจะทำการ${actionText}ผู้ใช้ "${username}"`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#d33' : '#28a745',
            confirmButtonText: 'ตกลง',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setLoading();
            try {
                const res = await banUser({
                    username: username,
                    is_active: !currentStatus,
                    updated_by: adminUsername
                });

                if (res && res.success) {
                    openAlertModal(`${actionText}สำเร็จ`, () => {
                        fetchUsers();
                    }, true);
                } else {
                    alertMessage(res?.message || "ดำเนินการไม่สำเร็จ");
                }
            } catch (error) {
                alertMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            } finally {
                setUnLoading();
            }
        }
    }

    return (
        <div className={`card custom-responsive-font`} style={{ paddingBottom: "20px" }}>
            <div className='card-header border-0 pt-5 d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-4'>
                <h3 className='card-title align-items-start flex-column'>
                    <span className='card-label fw-bold fs-3 mb-1'>User Management</span>
                </h3>
                <div className='d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 w-100 w-md-auto'>


                    <div className='w-100 w-sm-auto'>
                        <SearchComponent
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            setKeyword={(val) => {
                                setKeyword(val);
                                setCurrentPage(1);
                            }}
                            placeholer="ค้นหา Username..."
                        />
                    </div>
                    <div className='w-100 w-sm-auto'>
                        <select
                            className="form-select form-select-sm"
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ width: "200px", height: "44px" }}
                        >
                            <option value="">ทั้งหมด (บทบาท)</option>
                            {roleOptions.map((role) => (
                                <option key={role.role_id} value={role.role_id}>
                                    {role.role_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <button
                            type="button"
                            className='btn btn-sm btn-primary'
                            style={{ height: "44px" }}
                            onClick={handleOpenCreate}
                        >
                            เพิ่มผู้ใช้งาน
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-body py-3">
                <div className='table-responsive'>
                    <table className='table table-row-bordered table-row-gray-100 align-middle gs-0 gy-3'>
                        <thead>
                            <tr className='fw-bold text-muted'>
                                <th className='min-w-150px text-start'>Username</th>
                                <th className='min-w-150px text-center'>Role</th>
                                <th className='min-w-150px text-center'>วันที่สร้าง</th>
                                <th className='min-w-100px text-center'>สถานะใช้งาน</th>
                                <th className='min-w-100px text-center'>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataLoading ? (
                                <tr><td colSpan={5} className='text-center'>Loading...</td></tr>
                            ) : users.length > 0 ? (
                                users.map((user, index) => (
                                    <tr key={index}>
                                        <td className='text-start fw-bold text-dark'>{user.username}</td>
                                        <td className='text-center'>
                                            <span className='badge badge-light-primary fs-7'>{user.role_name}</span>
                                        </td>
                                        <td className='text-center'>{user.created_date ? user.created_date.split(" ")[0] : "-"}</td>

                                        <td className='text-center'>
                                            {Number(user.is_active) === 1 ? (
                                                <span className='badge badge-light-success fw-bold px-4 py-3'>ใช้งานปกติ</span>
                                            ) : (
                                                <span className='badge badge-light-danger fw-bold px-4 py-3'>ระงับสิทธิ์</span>
                                            )}
                                        </td>
                                        <td className='text-center'>
                                            <div className="d-flex justify-content-center gap-2">
                                                <button
                                                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1"
                                                    onClick={() => handleOpenEdit(user)}
                                                    title="แก้ไขสิทธิ์"
                                                >
                                                    <i className="fa fa-pencil"></i>
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-bg-light btn-active-color-warning btn-sm"
                                                    onClick={() => handleChangePasswordClick(user.username)}
                                                    title="เปลี่ยนรหัสผ่าน"
                                                >
                                                    <i className="fa fa-key"></i>
                                                </button>
                                                <button
                                                    className={`btn btn-icon btn-sm btn-bg-light ${user.is_active ? 'btn-active-color-danger' : 'btn-active-color-success'}`}
                                                    onClick={() => handleToggleActiveClick(user.username, user.is_active)}
                                                    title={user.is_active ? "ระงับสิทธิ์" : "คืนสิทธิ์"}
                                                >
                                                    <i className={`fa ${user.is_active ? 'fa-ban' : 'fa-check-circle'}`}></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center">ไม่พบข้อมูล</td></tr>
                            )}
                        </tbody>
                    </table>
                    <TableListConfig
                        pageConfig={pageConfig}
                        setPageConfig={setPageConfig}
                    />

                    <TablePaginator
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                    />
                </div>


            </div>

            <AddEditUser
                show={showModalUser}
                handleClose={() => setShowModalUser(false)}
                isEdit={isEditMode}
                submitAdd={handleAddUserSubmit}
                submitEdit={handleEditUserSubmit}
                formData={selectedUser}
            />
        </div>
    );
}

export default UserManagement;