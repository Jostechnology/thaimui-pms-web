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
    
]