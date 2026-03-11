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
}

export const mainRoutesConfig: MainRouteType[] = [
    {
        module_code: "test",
        path: "/main",
        title: "",
        fontIcon: "bi-currency-exchange",
        icon: "bi bi-currency-exchange",
        subMenu: [],
        permission: []
    },
    {
        module_code: "SETTING",
        path: "/setting",
        title: "",
        fontIcon: "bi-gear",
        icon: "bi bi-gear",
        subMenu: [],
        permission: []
    },
    {
        module_code: "WORKORDERS",
        path: "/workorder",
        title: "",
        fontIcon: "bi-speedometer2",
        icon: "bi bi-speedometer2",
        subMenu: [],
        permission: []
    },
    {
        module_code: "EMPLOYEE",
        path: "/employee",
        title: "",
        fontIcon: "bi-people",
        icon: "bi bi-people",
        subMenu: [],
        permission: []
    },
    {
        module_code: "QC",
        path: "/quality_control",
        title: "",
        fontIcon: "bi-search",
        icon: "bi bi-search",
        subMenu: [],
        permission: []
    },
    {
        module_code: "SALE_ORDER",
        path: "/sales_order",
        title: "",
        fontIcon: "bi-cart",
        icon: "bi bi-cart",
        subMenu: [],
        permission: []
    },
    {
        module_code: "TRACKING",
        path: "/tracking",
        title: "",
        fontIcon: "bi-graph-up",
        icon: "bi bi-graph-up",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PM_MACHINE",
        path: "/pm_machine",
        title: "",
        fontIcon: "bi-hammer",
        icon: "bi bi-hammer",
        subMenu: [],
        permission: []
    }
]

export const subRoutesConfig: SubRouteType[] = [

    {
        module_code: "TARN",
        main_module_code: "test",
        path: "/settings",
        title: "",
        permission: []
    },
    {
        module_code: "ROLE_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/role_management",
        title: "",
        permission: []
    },
    {
        module_code: "MODULE_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/module_management",
        title: "",
        permission: []
    },
    {
        module_code: "USER_MANAGEMENT",
        main_module_code: "SETTING",
        path: "/setting/user_management",
        title: "",
        permission: []
    },
    {
        module_code: "EMPLOYEE_LIST",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_list",
        title: "",
        permission: []
    },
    {
        module_code: "DASHBOARD",
        main_module_code: "WORKORDERS",
        path: "/workorder/workorders_dashboard",
        title: "",
        permission: []
    },
    {
        module_code: "WORKORDERS_LIST",
        main_module_code: "WORKORDERS",
        path: "/workorder/workorders_list",
        title: "",
        permission: []
    },
    {
        module_code: "EMPLOYEE_SAL",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_salary_history",
        title: "",
        permission: []
    },
    {
        module_code: "QC_WORKORDERS",
        main_module_code: "QC",
        path: "/quality_control/qc_workorders_list",
        title: "",
        permission: []
    },
    {
        module_code: "QC_TEST_CERT",
        main_module_code: "QC",
        path: "/quality_control/qc_test_cert_list",
        title: "",
        permission: []
    },
    {
        module_code: "SALE_ORD_LIST",
        main_module_code: "SALE_ORDER",
        path: "/sales_order/list",
        title: "",
        permission: []
    },
    {
        module_code: "SALE_ORD_DASHBOARD",
        main_module_code: "SALE_ORDER",
        path: "/sales_order/dashboard",
        title: "",
        permission: []
    },
    {
        module_code: "TEST_TRACKING",
        main_module_code: "TRACKING",
        path: "/tracking/test_tracking",
        title: "",
        permission: []
    },
    {
        module_code: "PRODUCTION_TRACKING",
        main_module_code: "TRACKING",
        path: "/tracking/production_tracking",
        title: "",
        permission: []
    },
    {
        module_code: "PM_ITEM",
        main_module_code: "PM_MACHINE",
        path: "/pm_machine/item",
        title: "",
        permission: []
    }
]