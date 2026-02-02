export interface RouteType {
    module_code: string;
    path: string;
    title: string;
    permission: string[];
    main_module_code? : string;
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
        module_code: "ORDER",
        path: "/order/order_table",
        title: "",
        fontIcon: "bi-currency-exchange",
        icon: "bi bi-currency-exchange",
        subMenu: [],
        permission: []
    },
    {
        module_code: "SUPPLIER",
        path: "/suppliers",
        title: "ซัพพลายเออร์",
        fontIcon: "bi-layers", 
        icon: "bi bi-people-fill",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PM",
        path: "/pm",
        title: "",
        fontIcon: "bi-wrench-adjustable-circle",
        icon: "bi bi-wrench-adjustable-circle",
        subMenu: [],
        permission: []
    },
    {
        module_code: "CUSTOMER",
        path: "/customer",
        title: "",
        fontIcon: "bi-buildings",
        icon: "bi bi-buildings",
        subMenu: [],
        permission: []
    },
    {
        module_code: "WORK_ASSIGN",
        path: "/work_assign",
        title: "",
        fontIcon: "bi-sticky",
        icon: "bi bi-calendar-check",
        subMenu: [],
        permission: []
    },
    {
        module_code: "VEHICLE",
        path: "/vehicle",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-car-front-fill",
        subMenu: [],
        permission: []
    },
    {
        module_code: "EMPLOYEE",
        path: "/employee",
        title: "",
        fontIcon: "bi-person",
        icon: "profile-circle",
        subMenu: [],
        permission: []
    },
    {
        module_code: "CUSTOMER",
        path: "/customer",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-person-badge-fill",
        subMenu: [],
        permission: []
    },
    {
        module_code: "SUPPLIER",
        path: "/supplier",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-box",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PALLET_MA",
        path: "/pallet_management",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-kanban-fill",
        subMenu: [],
        permission: []
    },
    {
        module_code: "CAL_COST",
        path: "/calculation",
        title: "",
        fontIcon: "bi-layers",
        icon: "bi bi-calculator",
        subMenu: [],
        permission: []
    },
    {
        module_code: "DRIVER",
        path: "/driver",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-car-front-fill",
        subMenu: [],
        permission: []
    },
    {
        module_code: "CALENDAR",
        path: "/calendar",
        title: "",
        fontIcon: "bi-archive",
        icon: "bi bi-calendar-check",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PRODUCT",
        path: "/product",
        title: "",
        fontIcon: "bi-layers",
        icon: "bi bi-box",
        subMenu: [],
        permission: []
    },
    {
        module_code: "PACKAGE",
        path: "/package",
        title: "",
        fontIcon: "bi-layers",
        icon: "bi bi-box",
        subMenu: [],
        permission: []
    },
    {
        module_code: "DOCUMENT",
        path: "/document",
        title: "",
        fontIcon: "bi-receipt",
        icon: "bi bi-receipt",
        subMenu: [],
        permission: []
    },
    {
        module_code: "REPORT",
        path: "/report",
        title: "รายงาน",
        fontIcon: "bi-journal-text", 
        icon: "bi bi-journal-text",
        subMenu: [],
        permission: []
    },
    {
        module_code: "FINANCE",
        path: "/finance",
        title: "การเงิน",
        fontIcon: "bi-currency-exchange", 
        icon: "bi bi-currency-exchange",
        subMenu: [],
        permission: []
    },
    {
        module_code: "ACCOUNTING",
        path: "/accounting",
        title: "บัญชี",
        fontIcon: "bi-receipt", 
        icon: "bi bi-receipt",
        subMenu: [],
        permission: []
    },{
        module_code: "SPARE_PART",
        path: "/spare_part",
        title: "อะไหล่",
        fontIcon: "bi-receipt", 
        icon: "bi bi-screwdriver",
        subMenu: [],
        permission: []
    }
]

export const subRoutesConfig: SubRouteType[] = [


    {
        module_code: "ORDER_DET",
        main_module_code: "ORDER",
        path: "/order/order_table",
        title: "",
        permission: []
    },
    {
        module_code: "LIST_DELIVER_CUS",
        main_module_code: "ORDER",
        path: "/order/list-deliver-customer",
        title: "",
        permission: []
    },
    {
        module_code: "WORK_ASSIGN_DET",
        main_module_code: "WORK_ASSIGN",
        path: "/work_assign/assignment_details",
        title: "",
        permission: []
    },
    {
        module_code: "VEHICLE_DET",
        main_module_code: "VEHICLE",
        path: "/vehicle/vehicle_details",
        title: "",
        permission: []
    },
    {
        module_code: "VEHICLE_TYPE",
        main_module_code: "VEHICLE",
        path: "/vehicle/vehicle_types_details",
        title: "",
        permission: []
    },

    {
        module_code: "FUEL_TYPE",
        main_module_code: "VEHICLE",
        path: "/fuel_type",
        title: "",
        permission: []
    },

    {
        module_code: "EMPLOYEE_DET",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_details",
        title: "",
        permission: []
    },
    {
        module_code: "EMPLOYEE_POT",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_position",
        title: "",
        permission: []
    },
    {
        module_code: "EMPLOYEE_SAL",
        main_module_code: "EMPLOYEE",
        path: "/employee/employee_salary",
        title: "",
        permission: []
    },


    {
        module_code: "CUSTOMER_DET",
        main_module_code: "CUSTOMER",
        path: "/customer/customer_details",
        title: "",
        permission: []
    },


    {
        module_code: "SUPPLIER_DET",
        main_module_code: "SUPPLIER",
        path: "/supplier/supplier_details",
        title: "",
        permission: []
    },


    {
        module_code: "PALLET_MA_DET",
        main_module_code: "PALLET_MA",
        path: "/pallet_management/pallet_details",
        title: "",
        permission: []
    },


    {
        module_code: "CAL_COST_DAILY",
        main_module_code: "CAL_COST",
        path: "/calculation/cost_calculation",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_TIME",
        main_module_code: "CAL_COST",
        path: "/calculation/quotation_calculation",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_LONG",
        main_module_code: "CAL_COST",
        path: "/calculation/long_term_cost_calculation",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_MONTHLY",
        main_module_code: "CAL_COST",
        path: "/calculation/monthly_operation",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_TRANSPORT",
        main_module_code: "CAL_COST",
        path: "/calculation/transportation_cost",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_MAKE_QUO",
        main_module_code: "CAL_COST",
        path: "/calculation/make_quotation",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_COST_QUO_DET",
        main_module_code: "CAL_COST",
        path: "/calculation/quotation_details",
        title: "",
        permission: []
    },
    {
        module_code: "CAL_SHIPPING_RATE",
        main_module_code: "CAL_COST",
        path: "/calculation/shipping_rate",
        title: "",
        permission: []
    },

    {
        module_code: "DRIVER_ORDER_LIST",
        main_module_code: "DRIVER",
        path: "/driver/list-workorder",
        title: "",
        permission: []
    },


    {
        module_code: "CALENDAR_VEHICLE",
        main_module_code: "CALENDAR",
        path: "/calendar/calendar-plan",
        title: "",
        permission: []
    },
    {
        module_code: "PRODUCT_LIST",
        main_module_code: "PRODUCT",
        path: "/product/list-products",
        title: "",
        permission: []
    },

    {
        module_code: "PACK_TRACK",
        main_module_code: "PACKAGE",
        path: "/packaging/track-package",
        title: "",
        permission: []
    },
    {
        module_code: "PACK_LIST",
        main_module_code: "PACKAGE",
        path: "/packaging/list-packages",
        title: "",
        permission: []
    },
    {
        module_code: "MANAGE_DOC",
        main_module_code: "DOCUMENT",
        path: "/document/location_document",
        title: "",
        permission: []
    },
    {
        module_code: "DRIVER_BEWAGON",
        main_module_code: "DRIVER",
        path: "/work_orders/bewagons/",
        title: "",
        permission: []
    },
    {
        module_code: "REPORTS",
        main_module_code: "REPORT",
        path: "/report/reports",
        title: "",
        permission: []
    },
    {
        module_code: "GEOCODING",
        main_module_code: "DRIVER",
        path: "/geocode",
        title: "",
        permission: []
    },

    {
        module_code: "PM_DASHBOARD",
        main_module_code: "PM",
        path: "/pm/dashboard",
        title: "",
        permission: []
    },
    {
        module_code: "PM_ITEM",
        main_module_code: "PM",
        path: "/pm/pm_item",
        title: "",
        permission: []
    },
    {
        module_code: "PM_MA_ORDER",
        main_module_code: "PM",
        path: "/pm/maintenance_order",
        title: "",
        permission: []
    },
     {
        module_code: "PM_MA_STATUS",
        main_module_code: "PM",
        path: "/pm/maintenance_order_status",
        title: "",
        permission: []
    },
    {
        module_code: "PM_DET",
        main_module_code: "PM",
        path: "/pm/pm_history",
        title: "",
        permission: []
    },
    {
        module_code: "PM_TIRE",
        main_module_code: "PM",
        path: "/pm/tire",
        title: "",
        permission: []
    },
    {
        module_code: "PM_ACCIDENT",
        main_module_code: "PM",
        path: "/pm/accident",
        title: "",
        permission: []
    },
    {
        module_code: "PM_BEWAGON",
        main_module_code: "PM",
        path: "/pm/bewagons",
        title: "",
        permission: []
    },
    {
        module_code: "QUOTATION",
        main_module_code: "ORDER",
        path: "/quotation",
        title: "",
        permission: []
    },
    {
        module_code: "ROUTES",
        main_module_code: "ORDER",
        path: "/routes",
        title: "",
        permission: []
    },
     {
        module_code: "PURCHASE_ORDER",
        main_module_code: "ORDER",
        path: "/purchase_orders",
 		title: "",
        permission: []
    },
    {
        module_code: "VEHICLE_TIRE",
        main_module_code: "VEHICLE",
        path: "/vehicle/tires",
        title: "",
        permission: []
    },
    {
        module_code: "FINANCE_INVOICE",
        main_module_code: "FINANCE",
        path: "/finance/invoice",
        title: "",
        permission: []
    },
    {
        module_code: "BILLING",
        main_module_code: "ACCOUNTING",
        path: "/accounting/billing",
        title: "",
        permission: []
    },
    {
        module_code: "RECEIPT",
        main_module_code: "ACCOUNTING",
        path: "/accounting/receipt",
        title: "",
        permission: []
    },{
        module_code: "CANCEL_LOCATION",
        main_module_code: "DRIVER",
        path: "/deliver_locations/cancel",
        title: "",
        permission: []
    },
    {
        module_code: "FLEET_SUPPLIER",
        main_module_code: "SUPPLIER",
        path: "/supplier/fleet_supplier",
        title: "",
        permission: []
    },
    {
        module_code: "GARAGE_SUPPLIER",
        main_module_code: "SUPPLIER",
        path: "/supplier/garage_supplier",
        title: "",
        permission: []
    }, 
    {
        module_code: "GOODS_RECEIPT",
        main_module_code: "SPARE_PART",
        path: "/spare_part/goods_receipt",
        title: "",
        permission: []
    },
    {
        module_code: "SPARE_ISSUE",
        main_module_code: "SPARE_PART",
        path: "/spare_part/spare_issue",
        title: "",
        permission: []
    },
    {
        module_code: "SPARE_ITEM_LIST",
        main_module_code: "SPARE_PART",
        path: "/spare_part/spare_item_list",
        title: "",
        permission: []
    },
    {
        module_code: "STOCK_COUNT",
        main_module_code: "SPARE_PART",
        path: "/spare_part/stock_count",
        title: "",
        permission: []
    },
    {
        module_code: "MANAGE_CATEGORY",
        main_module_code: "SPARE_PART",
        path: "/spare_part/manage_category",
        title: "",
        permission: []
    }
]