import { createContext, useState, ReactNode, Dispatch, SetStateAction, useContext, useEffect } from "react"
import {
    License, EducationLevel
} from "../type_interface/EmployeeType";
import { FuelType, VehicleModalProps, VehicleModel, VehicleType } from "../type_interface/VehicleType";
import { Province, District, SubDistrict } from "../type_interface/MasterDataType";
import { MainModule, Module } from "../type_interface/SettingType";
import { VehicleCal } from "../type_interface/CalculationType";
import provinceList from '../master_data/province_master.json';
import districtList from '../master_data/district_master.json';
import subdistrictList from '../master_data/subdistrict_master.json';
import companyData from "../master_data/company_data.json"
import { MainRouteType, RouteType } from "../modules/auth/AuthMenu";
import vehicleModelList from '../master_data/vehicle_model_master.json';
import { Fuel } from "../type_interface/FuelType";
import { getFuels } from "../services/fuelService";
import { CompanyData } from "../modules/menu_setting/components/CompanyDetail";

interface MasterDataProviderProps {
    children: ReactNode;
}

interface MasterDataState {
    licenseTypeList: License[],
    educationList: EducationLevel[],
    vehicleTypeList: VehicleType[],
    provinces: Province[],
    districts: District[],
    subdistrict: SubDistrict[],
    vehicleCalList: VehicleCal[],
    mainModuleList: MainModule[],
    moduleList: Module[],
    permissionList: MainRouteType[],
    actionList: RouteType[],
    updatePermission: number,
    vehicleModelList: VehicleModel[],
    fuelTypeList: FuelType[],
    company : CompanyData
}

interface MasterDataContextType {
    masterData: MasterDataState;
    // setMasterData: Dispatch<SetStateAction<MasterDataState>>;
    setLicenseTypeList: (list: License[]) => void;
    setEducationList: (list: EducationLevel[]) => void;
    setVehicleTypeList: (list: VehicleType[]) => void;
    setVehicleCalList: (list: VehicleCal[]) => void;
    setMainModuleList: (list: MainModule[]) => void;
    setModuleList: (list: Module[]) => void;
    setPermissionList: (list: MainRouteType[]) => void;
    setActionList: (list: RouteType[]) => void;
    updatePermission: () => void;
    setVehicleModelList: (list: VehicleModel[]) => void;
    setFuelTypeList: (list: FuelType[]) => void;
    setProvinceList: (list: Province[]) => void;
    setCompanyData: (company : CompanyData) => void
}


const initialState: MasterDataState = {
    licenseTypeList: [],
    educationList: [],
    vehicleTypeList: [],
    provinces: provinceList,
    districts: districtList,
    subdistrict: subdistrictList,
    vehicleCalList: [],
    mainModuleList: [],
    moduleList: [],
    permissionList: [],
    actionList: [],
    updatePermission: 0,
    vehicleModelList: vehicleModelList,
    fuelTypeList: [],
    company : companyData
}

const MasterDataContext = createContext<MasterDataContextType>({
    masterData: initialState,
    // setMasterData: () => {},
    setLicenseTypeList: () => { },
    setEducationList: () => { },
    setVehicleTypeList: () => { },
    setVehicleCalList: () => { },
    setMainModuleList: () => { },
    setModuleList: () => { },
    setPermissionList: () => { },
    setActionList: () => { },
    updatePermission: () => { },
    setVehicleModelList: () => { },
    setFuelTypeList: () => { },
    setProvinceList: () => { },
    setCompanyData:() => { }
})

export const MasterDataProvider = ({ children }: MasterDataProviderProps) => {

    const [masterData, setMasterData] = useState(initialState);

    const updatePermission = () => {
        setMasterData(state => ({ ...state, updatePermission: state.updatePermission + 1 }));
    }

    const setLicenseTypeList = (list: License[]) => {
        setMasterData(state => ({ ...state, licenseTypeList: list }));
    }

    const setEducationList = (list: EducationLevel[]) => {
        setMasterData(state => ({ ...state, educationList: list }));
    }

    const setVehicleTypeList = (list: VehicleType[]) => {
        setMasterData(state => ({ ...state, vehicleTypeList: list }));
    }

    const setVehicleCalList = (list: VehicleCal[]) => {
        setMasterData(state => ({ ...state, vehicleCalList: list }))
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
    const setVehicleModelList = (list: VehicleModel[]) => {
        setMasterData(state => ({ ...state, vehicleModelList: list }))
    }
    const setFuelTypeList = (list: FuelType[]) => {
        setMasterData(state => ({ ...state, fuelTypeList: list }))
    }
    
    const setProvinceList = (list: Province[]) => {
        setMasterData(state => ({ ...state, provinces: list }))
    }

    const setCompanyData = (company : CompanyData) => {
        setMasterData(state => ({ ...state, company: company }))
    }
   
    return (
        <MasterDataContext.Provider
            value={{
                masterData,
                setLicenseTypeList, setEducationList,
                setVehicleTypeList, setVehicleCalList,
                setMainModuleList, setModuleList, setVehicleModelList,
                setPermissionList, setActionList, setProvinceList,
                updatePermission, setFuelTypeList, setCompanyData
            }}>
            {children}
        </MasterDataContext.Provider>
    )

}

export const useMasterData = () => {
    return useContext(MasterDataContext);
}