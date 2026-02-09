import { Button, Form, Modal } from "react-bootstrap";
import Select from "react-select";
import { useState, useEffect } from "react";
import { getRoleList } from "../../../services/settingServices";
import Swal from "sweetalert2";

interface RoleOption {
    value: number;
    label: string;
    data: {
        role_id: number;
        role_code: string;
        role_name: string;
        description: string;
        group_id: number;
        active_flag: boolean;
    };
}

interface FormDataType {
    username: string;
    password: string;
    role_id: number | null;
}

type Props = {
    show: boolean;
    handleClose: () => void;
    isEdit: boolean;
    submitAdd: (data: FormDataType) => Promise<[boolean, string]>;
    submitEdit: (data: FormDataType) => Promise<[boolean, string]>;
    formData: FormDataType | null;
}

function AddEditUser({ show, handleClose, isEdit, submitAdd, submitEdit, formData }: Props) {
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ username?: string; password?: string; role?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ดึง Role List
    const fetchRoleList = async () => {
        try {
            const res = await getRoleList();
            if (res && res.data) {
                const options: RoleOption[] = res.data.map((role: any) => ({
                    value: role.role_id,
                    label: role.role_name,
                    data: role
                }));
                setRoleOptions(options);
            }
        } catch (error) {
            console.error("Error fetching roles:", error);
        }
    };

    useEffect(() => {
        fetchRoleList();
    }, []);

    useEffect(() => {
        if (show) {
            if (isEdit && formData) {
                setUsername(formData.username || "");
                setPassword("");

                const roleOption = roleOptions.find(opt => opt.value === formData.role_id);
                setSelectedRole(roleOption || null);
            } else {

                resetForm();
            }
        }
    }, [show, isEdit, formData, roleOptions]);

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setSelectedRole(null);
        setErrors({});
    };

    const validate = () => {
        const newErrors: { username?: string; password?: string; role?: string } = {};

        if (!username.trim()) {
            newErrors.username = "กรุณากรอกชื่อผู้ใช้";
        }

        // เช็ค Password เฉพาะตอนสร้างใหม่
        if (!isEdit) {
            if (!password.trim()) {
                newErrors.password = "กรุณากรอกรหัสผ่าน";
            }
            // else if (password.trim().length < 6) {
            //     newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
            // }
        }

        if (!selectedRole) {
            newErrors.role = "กรุณาเลือกบทบาท";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const submissionData: FormDataType = {
            username: username.trim(),
            password: password.trim(),
            role_id: selectedRole?.value || null
        };

        setIsSubmitting(true);
        try {
            const [success, message] = isEdit
                ? await submitEdit(submissionData)
                : await submitAdd(submissionData);

            if (success) {
                Swal.fire("Success", isEdit ? "แก้ไขสิทธิ์สำเร็จ" : "สร้างผู้ใช้งานสำเร็จ", "success")
                resetForm();
                handleClose();
            } else {
                Swal.fire("Error", `เกิดข้อผิดพลาด: ${message}`, "error")
            }
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onClose = () => {
        resetForm();
        handleClose();
    };

    return (
        <Modal
            id="kt_modal_create_user"
            tabIndex={-1}
            aria-hidden="true"
            dialogClassName="modal-dialog modal-dialog-centered mw-900px"
            show={show}
            onHide={onClose}
            backdrop="static"
        >
            <Modal.Header closeButton>
                <Modal.Title>{isEdit ? "แก้ไขสิทธิ์ผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-4">
                        <Form.Label>
                            ชื่อผู้ใช้ <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="กรอกชื่อผู้ใช้"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (errors.username) {
                                    setErrors({ ...errors, username: undefined });
                                }
                            }}
                            isInvalid={!!errors.username}
                            // ล็อก Username เมื่ออยู่ในโหมดแก้ไข
                            disabled={isSubmitting || isEdit}
                            style={isEdit ? { backgroundColor: "#e9ecef" } : {}}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.username}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {/* ซ่อน Password เมื่ออยู่ในโหมดแก้ไข */}
                    {!isEdit && (
                        <Form.Group className="mb-4">
                            <Form.Label>
                                รหัสผ่าน <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="กรอกรหัสผ่าน"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) {
                                        setErrors({ ...errors, password: undefined });
                                    }
                                }}
                                isInvalid={!!errors.password}
                                disabled={isSubmitting}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.password}
                            </Form.Control.Feedback>
                        </Form.Group>
                    )}

                    <Form.Group className="mb-4">
                        <Form.Label>
                            บทบาท <span className="text-danger">*</span>
                        </Form.Label>
                        <Select
                            options={roleOptions}
                            value={selectedRole}
                            onChange={(option) => {
                                setSelectedRole(option);
                                if (errors.role) {
                                    setErrors({ ...errors, role: undefined });
                                }
                            }}
                            placeholder="เลือกบทบาท"
                            isClearable={false} // ห้ามเคลียร์ว่าง ต้องเลือกเสมอ
                            isDisabled={isSubmitting}
                            className={errors.role ? "is-invalid" : ""}
                        />
                        {errors.role && (
                            <div className="invalid-feedback d-block">
                                {errors.role}
                            </div>
                        )}
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    ยกเลิก
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AddEditUser;