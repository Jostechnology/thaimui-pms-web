import { createContext, useState, ReactNode, Dispatch, SetStateAction, useContext } from "react"
import Swal from "sweetalert2";

interface ModalProviderProps {
    children: ReactNode;
}

interface ModalState {
    isModalShow: boolean;
    modalStatus: boolean;
    isModaltwoBtnShow: boolean;
    modalText: string;
    handleOkBtn: () => void;
    handleCancelBtn: () => void;
}

interface ModalContextType {
    modal: ModalState;
    setModal: Dispatch<SetStateAction<ModalState>>;
    resetModal: () => void;
    alertMessage: (text: string) => void;
    openAlertModal: (
        text: string, 
        handleOkBtn: () => void, 
        status: boolean
    ) => void;
    openTwoBtnAlertModal: (
        text: string, handleOkBtn: () => void, handleCancelBtn: () => void
    ) => void;
}

const initialState = {
    isModalShow: false,
    modalStatus: false,
    isModaltwoBtnShow: false,
    modalText: "",
    handleOkBtn: () => {},
    handleCancelBtn: () => {}
}

const ModalContext = createContext<ModalContextType>({
    modal: initialState,
    setModal: () => {},
    resetModal: () => {},
    alertMessage: () => {},
    openAlertModal: () => {},
    openTwoBtnAlertModal: () => {}
});

export const ModalProvider = ({ children }: ModalProviderProps) => {

    const [modal, setModal] = useState(initialState);

    const resetModal = () => {
        setModal(initialState);
    }

    const openAlertModal = (text: string, handleOkBtn: () => void, status: boolean=false) => {
        // setModal(state => ({
        //     ...state,
        //     isModalShow: true,
        //     modalStatus: status,
        //     modalText: text,
        //     handleOkBtn
        // }));
        let modalObj = {};
        if (status) {
            modalObj = {
                text: text,
                icon: 'success',
                buttonsStyling: false,
                confirmButtonText: "ยืนยัน",
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    confirmButton: "btn btn-primary"
                }
            };
        } else {
            modalObj = {
                text: text,
                icon: 'error',
                buttonsStyling: false,
                confirmButtonText: "ยืนยัน",
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                    confirmButton: "btn btn-primary"
                }
            };
        }
        Swal.fire(modalObj).then(result => {
            if (result.isConfirmed) {
                handleOkBtn();
            }
        });
    }

    const openTwoBtnAlertModal = (
        text: string, handleOkBtn: () => void, handleCancelBtn: () => void
    ) => {
        // setModal(state => ({
        //     ...state,
        //     isModalShow: true,
        //     isModaltwoBtnShow: true,
        //     modalText: text,
        //     handleOkBtn, handleCancelBtn
        // }));
        Swal.fire({
            text: text,
            icon: "info",
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            cancelButtonText: 'ยกเลิก',
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
                confirmButton: "btn btn-primary",
                cancelButton: 'btn btn-danger'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                handleOkBtn();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                handleCancelBtn();
            }
        });
    }

    const alertMessage = (text: string) => {
        openAlertModal(text, resetModal, false);
    }

    return (
    <ModalContext.Provider value={{
        modal, setModal, resetModal, alertMessage, openAlertModal, openTwoBtnAlertModal
        }}>
        {children}
    </ModalContext.Provider>
    )

}

export const useAlertModal = () => {
    return useContext(ModalContext);
}
