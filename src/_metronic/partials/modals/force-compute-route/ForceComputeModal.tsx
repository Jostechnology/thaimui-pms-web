import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "react-bootstrap";
import { KTIcon } from "../../../helpers";

type Props = {
  show: boolean;
  handleClose: () => void;
  findRoute: (e: any, force: boolean) => Promise<void>;
};

const modalsRoot = document.getElementById("root-modals") || document.body;

export default function ForceComputeModal({
  show,
  handleClose,
  findRoute,
}: Props) {
  const btnErrRef = useRef<HTMLButtonElement | null>(null);

  const handleFindRoute = async (e) => {
    btnErrRef.current?.setAttribute("data-kt-indicator", "on");

    e.preventDefault();
    await findRoute(e, true);
    btnErrRef.current?.removeAttribute("data-kt-indicator");
    handleClose();
  };

  return createPortal(
    <Modal
      id="kt_modal_create_app"
      tabIndex={-1}
      aria-hidden="true"
      dialogClassName="modal-dialog modal-dialog-centered mw-900px"
      show={show}
      onHide={handleClose}
      onEntered={() => {}}
      backdrop={true}
    >
      <div className="modal-header">
        <h2>บังคับคำนวณ</h2>


        <div
          className="btn btn-sm btn-icon btn-active-color-primary"
          onClick={handleClose}
        >
          <KTIcon className="fs-1" iconName="cross" />
        </div>
      </div>

      <div className="modal-body py-lg-10 px-lg-10 d-flex flex-column">
        <p className="mb-0">
          หากคุณดำเนินการต่อ แอปพลิเคชันจะคำนวณเส้นทางโดยไม่คำนึงถึงช่วงเวลา ปริมาณโหลด หรือข้อจำกัดใดๆ ของคุณ คุณต้องการดำเนินการต่อหรือไม่

        </p>
        <div className="d-flex flex-column gap-3">
          <button
            onClick={handleClose}
            type="button"
            className="btn btn-light-secondary"
          >
            <span className="indicator-label">ยกเลิก</span>
          </button>
          <button
            ref={btnErrRef}
            onClick={(e) => handleFindRoute(e)}
            type="button"
            className={`btn btn-danger`}
            id="kt_button_1"
          >
            <span className="indicator-label">คำนวณ</span>
            <span className="indicator-progress">
              กรุณารอซักครู่...
              <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
            </span>
          </button>
        </div>
      </div>
    </Modal>,
    modalsRoot
  );
}
