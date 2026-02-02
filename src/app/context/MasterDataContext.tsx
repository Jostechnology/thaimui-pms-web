import { createContext, useState, ReactNode, Dispatch, SetStateAction, useContext, useEffect } from "react"

import { MainModule, Module } from "../type_interface/SettingType";
import { MainRouteType, RouteType } from "../modules/auth/AuthMenu";

interface MasterDataProviderProps {
    children: ReactNode;
}

interface MasterDataState {
    mainModuleList: MainModule[],
    moduleList: Module[],
    permissionList: MainRouteType[],
    actionList: RouteType[],
    updatePermission: number,
}

interface MasterDataContextType {
    masterData: MasterDataState;
    // setMasterData: Dispatch<SetStateAction<MasterDataState>>;
    setMainModuleList: (list: MainModule[]) => void;
    setModuleList: (list: Module[]) => void;
    setPermissionList: (list: MainRouteType[]) => void;
    setActionList: (list: RouteType[]) => void;
    updatePermission: () => void;
}


const initialState: MasterDataState = {
    mainModuleList: [],
    moduleList: [],
    permissionList: [],
    actionList: [],
    updatePermission: 0,
}

const MasterDataContext = createContext<MasterDataContextType>({
    masterData: initialState,
    // setMasterData: () => {},
    setMainModuleList: () => { },
    setModuleList: () => { },
    setPermissionList: () => { },
    setActionList: () => { },
    updatePermission: () => { },
})

export const MasterDataProvider = ({ children }: MasterDataProviderProps) => {

    const [masterData, setMasterData] = useState(initialState);

    const updatePermission = () => {
        setMasterData(state => ({ ...state, updatePermission: state.updatePermission + 1 }));
    }

    const setMainModuleList = (list: MainModule[]) => {
        setMasterData(state => ({ ...state, mainModuleList: list }))
    }

    const setModuleList = (list: Module[]) => {
        setMasterData(state => ({ ...state, moduleList: list }))
    }

    const setPermissionList = (list: MainRouteType[]) => {
        setMasterData(state => ({ ...state, permissionList: list }))
    }

    const setActionList = (list: RouteType[]) => {
        setMasterData(state => ({ ...state, actionList: list }))
    }
   
    return (
        <MasterDataContext.Provider
            value={{
                masterData,
                setMainModuleList, setModuleList,
                setPermissionList, setActionList, 
                updatePermission,
            }}>
            {children}
        </MasterDataContext.Provider>
    )

}

export const useMasterData = () => {
    return useContext(MasterDataContext);
}