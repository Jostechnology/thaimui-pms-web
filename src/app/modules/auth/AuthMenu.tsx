export interface RouteType {
    module_code: string;
    path: string;
    title: string;
    permission: string[];
    main_module_code?: string;
}

export interface SubRouteType extends RouteType {
    main_module_code: string;
}

export interface MainRouteType extends RouteType {
    fontIcon: string;
    icon: string;
    subMenu: SubRouteType[];
    customIcon?: string;
}

export const mainRoutesConfig: MainRouteType[] = [
    {
        module_code: "SALE_ORDER",
        path: "/sales_order",
        title: "ใบสั่งขาย",
        fontIcon: "bi-cart",
        icon: "bi bi-cart",
        subMenu: [],
        permission: []
    },
    {
        module_code: "WORKORDERS",
        path: "/workorder",
        title: "ใบสั่งผลิต",
        fontIcon: "bi-wrench-adjustable-circle",
        icon: "bi bi-wrench-adjustable-circle",
        subMenu: [],
        permission: []
    },
    {
        module_code: "QC",
        path: "/quality_control",
        title: "การเทส",
        fontIcon: "bi-search",
        icon: "bi bi-search",
        subMenu: [],
        permission: []
    },
    {
        module_code: "EMPLOYEE",
        path: "/employee",
        title: "พนักงาน",
        fontIcon: "bi-people",
        icon: "bi bi-people",
        subMenu: [],
        permission: []
    },
    {
        module_code: "DOCUMENTS",
        path: "/document",
        title: "รายการเอกสาร",
        fontIcon: "bi-archive",
        icon: "bi bi-archive",
        subMenu: [],
        permission: []
    },
    {
        module_code: "CAL_COST",
        path: "/cost_calculation",
        title: "คำนวณต้นทุน",
        fontIcon: "bi-layers",
        icon: "bi bi-calculator",
        subMenu: [],
        permission: []
    },
    {
        module_code: "MACHINE",
        path: "/machine",
        title: "เครื่องจักร",
        fontIcon: "bi-gear-wide-connected",
        icon: "wrench",
        customIcon: "/media/icons/machine.svg",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PM_MACHINE",
        path: "/pm_machine",
        title: "ซ่อมเครื่องจักร",
        fontIcon: "bi-hammer",
        icon: "bi bi-hammer",
        subMenu: [],
        permission: []
    },
    {
        module_code: "SETTING",
        path: "/setting",
        title: "ตั้งค่า",
        fontIcon: "bi-gear",
        icon: "bi bi-gear",
        subMenu: [],
        permission: []
    },
    
    // {
    //     module_code: "TRACKING",
    //     path: "/tracking",
    //     title: "",
    //     fontIcon: "bi-graph-up",
    //     icon: "bi bi-graph-up",
    //     subMenu: [],
    //     permission: []
    // },
]

export const subRoutesConfig: SubRouteType[] = [
    {
        module_code: "EMPLOYEE_LIST",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_list",
        title: "รายชื่อพนักงาน",
        permission: []
    },
    {
        module_code: "ROLE_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/role_management",
        title: "จัดการสิทธิ์ผู้ใช้งาน",
        permission: []
    },
    {
        module_code: "MODULE_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/module_management",
        title: "จัดการโมดูล",
        permission: []
    },
    {
        module_code: "USER_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/user_management",
        title: "จัดการผู้ใช้",
        permission: []
    },
    {
        module_code: "DOCUMENT_CODE",
        main_module_code: "SETTING",
        path: "/setting/document_code",
        title: "จัดการเลขที่เอกสาร",
        permission: []
    },
    {
        module_code: "BRANCH_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/branch_management",
        title: "จัดการสาขา",
        permission: []
    },
    {
        module_code: "BRANCH_LIST",
        main_module_code: "SETTING",
        path: "/setting/branch_list",
        title: "รายชื่อสาขา",
        permission: []
    },
    {
        module_code: "DASHBOARD",
        main_module_code: "WORKORDERS",
        path: "/workorder/workorders_dashboard",
        title: "ภาพรวมใบสั่งผลิต",
        permission: []
    },
    {
        module_code: "WORKORDERS_LIST",
        main_module_code: "WORKORDERS",
        path: "/workorder/workorders_list",
        title: "รายการใบสั่งผลิต",
        permission: []
    },
    {
        module_code: "WORKORDERS_TEMPLATE",
        main_module_code: "WORKORDERS",
        path: "/workorder/workorders_template",
        title: "แบบเอกสารใบสั่งผลิต",
        permission: []
    },
    {
        module_code: "EMPLOYEE_SAL",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_salary_history",
        title: "เงินเดือนพนักงาน",
        permission: []
    },
    {
        module_code: "QC_WORKORDERS",
        main_module_code: "QC",
        path: "/quality_control/qc_workorders_list",
        title: "รายการใบสั่งเทส",
        permission: []
    },
    {
        module_code: "QC_TEST_CERT",
        main_module_code: "QC",
        path: "/quality_control/qc_test_cert_list",
        title: "ใบรับรอง",
        permission:[]
    },
    {
        module_code: "CAL_COST_MONTHLY",
        main_module_code: "CAL_COST",
        path: "/cost_calculation/monthly_operation",
        title: "คำนวณต้นทุนรายเดือน",
        permission: []
    },
    {
        module_code: "SALE_ORD_LIST",
        main_module_code: "SALE_ORDER",
        path: "/sales_order/list",
        title: "รายการใบสั่งขาย",
        permission: []
    },
    {
        module_code: "SALE_ORD_DASHBOARD",
        main_module_code: "SALE_ORDER",
        path: "/sales_order/dashboard",
        title: "ภาพรวมใบสั่งขาย",
        permission: []
    },
    // {
    //     module_code: "TEST_TRACKING",
    //     main_module_code: "TRACKING",
    //     path: "/tracking/test_tracking",
    //     title: "",
    //     permission: []
    // },
    // {
    //     module_code: "PRODUCTION_TRACKING",
    //     main_module_code: "TRACKING",
    //     path: "/tracking/production_tracking",
    //     title: "",
    //     permission: []
    // },
    {
        module_code: "PM_ITEM",
        main_module_code: "PM_MACHINE",
        path: "/pm_machine/item",
        title: "รายการซ่อมเครื่องจักร",
        permission: []
    },
    {
        module_code: "PM_DASHBOARD",
        main_module_code: "PM_MACHINE",
        path: "/pm_machine/dashboard",
        title: "ภาพรวมการซ่อมเครื่องจักร",
        permission: []
    },
    {
        module_code: "MACHINE_LIST",
        main_module_code: "MACHINE",
        path: "/machine/machine_list",
        title: "รายการเครื่องจักร",
        permission: []
    },
    {
        module_code: "MACHINE_CREATE",
        main_module_code: "MACHINE",
        path: "/machine/machine_create",
        title: "เพิ่มข้อมูลเครื่องจักน",
        permission: []
    },
    {
        module_code: "MACHINE_DASHBOARD",
        main_module_code: "MACHINE",
        path: "/machine/machine_dashboard",
        title: "ภาพรวมเครื่องจักร",
        permission: []
    },
    {
        module_code: "PICKING_REQUEST",
        main_module_code: "DOCUMENTS",
        path: "/documents/picking_request",
        title: "คำขอเบิก",
        permission: []
    }
]