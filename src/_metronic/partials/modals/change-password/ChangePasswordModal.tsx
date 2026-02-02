import { useState } from "react";
import { Form } from "react-bootstrap";
import { ChangePasswordForm, ChangePasswordModalProps } from "../../../../app/type_interface/EmployeeType";


const ChangePasswordModal = (props: ChangePasswordModalProps) => {

    const {
        isModalShow,
        formData,
        handleChange,
        handleSubmit,
        handleClose
    } = props;

    const modalContent = !isModalShow ? null : (
        <>
            <div className="fade modal-backdrop show" style={{ zIndex: "7998" }}></div>
            <div role="dialog" aria-modal="true"
                className="fade modal show" tabIndex={-1}
                style={{ display: "flex", zIndex: "7999", justifyContent: "center", alignItems: "center" }}>

                <div style={{ backgroundColor: "white", width: "500px", height: "530px", borderRadius: "10px" }}>
                    <Form onSubmit={handleSubmit}>

                        <div className="modal-header">
                            <h5 className="modal-title">เปลี่ยน Password</h5>
                        </div>

                        <div className="modal-body">
                            <div className="col-md-12">
                                <div className="column">

                                    <div>
                                        <Form.Group className='mb-3' controlId='oldPassword'>
                                            <label className='col-lg-5 col-form-label required fw-bold fs-6'>
                                                Password เก่า
                                            </label>
                                            <Form.Control
                                                type='password'
                                                name="oldPassword"
                                                value={formData.oldPassword}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </div>

                                    <div>
                                        <Form.Group className='mb-3' controlId='newPassword'>
                                            <label className='col-lg-5 col-form-label required fw-bold fs-6'>
                                                Password ใหม่
                                            </label>
                                            <Form.Control
                                                type='password'
                                                name="newPassword"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </div>

                                    <div>
                                        <Form.Group className='mb-3' controlId='confirmPassword'>
                                            <label className='col-lg-5 col-form-label required fw-bold fs-6'>
                                                ยืนยัน Password ใหม่
                                            </label>
                                            <Form.Control
                                                type='password'
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </div>

                                    <div>
                                        {
                                            (formData.confirmPassword.length >= formData.newPassword.length)
                                            && (formData.confirmPassword !== formData.newPassword)?
                                            <span style={{color: "red"}}>**กรุณากรอก Password ใหม่และยืนยัน Password ให้ตรงกัน**</span>
                                            : null
                                        }
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-light" onClick={handleClose}>
                                ยกเลิก
                            </button>
                            <button type="submit" className="btn btn-primary"
                                disabled={
                                    !formData.oldPassword || !formData.newPassword
                                    || !formData.confirmPassword
                                    || (formData.newPassword !== formData.confirmPassword)
                                    }>
                                ยืนยัน
                            </button>
                        </div>

                    </Form>
                </div>
            </div>
        </>
    )

    return (<>{modalContent}</>);

}

export default ChangePasswordModal;