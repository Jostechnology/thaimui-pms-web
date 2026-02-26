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
  work_order_id: number | null;
  date: string;
  documentNumber: string;
  customerCode: string;
  customerName: string;
  docNum: string;
  customerReceiptNumber: string;
  donEntry: string
  salesName: string
  salesCode: string
  teamCode: string
  teamName: string
  inspectionDate: string
  salesItemId?: number
  salesItemCode?: string

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
  serialImprint: boolean;
  serialTag: boolean;
  serialOthers: boolean;
  serialOthersText: string;

  // Remark
  generalRemark: string;
  details: string

  // Items
  items: QCWorkOrderItem[];
}