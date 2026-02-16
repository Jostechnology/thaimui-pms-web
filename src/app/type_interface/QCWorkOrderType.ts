export interface QCWorkOrderItem {
  id: string;
  code: string;
  description: string;
  wll: string;
  quantity: string;
  serialNo: string;
  remark: string;
}

export interface QCWorkOrderData {
  id?: string;
  date: string;
  documentNumber: string;
  customerCode: string;
  customerName: string;
  invoiceNumber: string;
  customerReceiptNumber: string;
  inspectionDate: string;
  salesOrderCode : string

  // Testing standards
  ptt: boolean;
  chevron: boolean;
  valeur: boolean;
  ophir: boolean;
  threeSpec: boolean;
  standardOthers: boolean;
  standardOthersText: string;

  // Testing types
  inHouse: boolean;
  thirdParty: boolean;
  ndt: boolean;
  testingOthers: boolean;
  testingOthersText: string;

  // Serial number options
  continueSerial: boolean;
  separateSerial: boolean;
  combinedSerial: boolean;
  serialOthers: boolean;
  serialOthersText: string;

  // Remark
  generalRemark: string;
  details : string

  // Items
  items: QCWorkOrderItem[];
}