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
        module_code:"MODULE_MANAGEMENT",
        main_module_code: "SETTING",
        path:"/setting/module_management",
        title: "",
        permission:[]
    },
    {
        module_code:"USER_MANAGEMENT",
        main_module_code: "SETTING",
        path:"/setting/user_management",
        title: "",
        permission:[]
    }
    
]