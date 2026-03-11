import { QCWorkOrderData } from "../type_interface/QCWorkOrderType";

export const qcWorkData: QCWorkOrderData = {
    work_order_id: null,
    date: new Date().toISOString().split("T")[0],
    documentNumber: "",
    customerCode: "",
    customerName: "",
    docNum: "",
    customerReceiptNumber: "",
    inspectionDate: "",
    docEntry: "",
    salesName: "",
    salesCode: "",
    teamCode: "",
    teamName: "",
    quantity : 0,

    ptt: false,
    chevron: false,
    valeur: false,
    ophir: false,
    threeSpec: false,
    standardOthers: false,
    standardOthersText: "",

    inHouse: false,
    thirdParty: false,
    ndt: false,
    testingOthers: false,
    testingOthersText: "",

    continueSerial: false,
    serialImprint: false,
    serialTag: false,
    serialOthers: false,
    serialOthersText: "",

    generalRemark: "",
    details: "",
    items: [],
}