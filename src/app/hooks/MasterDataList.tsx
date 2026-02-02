import { useMasterData } from "../context/MasterDataContext"
import { useEffect } from "react";
import { getVehicleTypes } from "../services/vehicleServices";
import { getLicenseType, getEducationList } from "../services/employeeServices";
import { getVehicleTypeCal } from "../services/calculationServices";
import { getMainModuleList, getModuleList } from "../services/settingServices";
import { get_provinces } from "../services/address";

import { FuelType, VehicleType } from "../type_interface/VehicleType";
import { VehicleCal } from "../type_interface/CalculationType";
import { MainModule, Module } from "../type_interface/SettingType";
import { License, EducationLevel } from "../type_interface/EmployeeType";
import { getFuels } from "../services/fuelService";
import { Province } from "../type_interface/MasterDataType";

export const useVehicleTypes = () => {

    const { masterData, setVehicleTypeList } = useMasterData();

    const fetchVehicleTypes = async () => {
        try {
            const result = await getVehicleTypes() as any;
            if (result) {
                const data: VehicleType[] = result.data.vehicle_type;
                setVehicleTypeList(data); //
            } else {
                throw new Error("getVehicleTypes return errors.");
            }
        } catch (error) {
            console.error("Error fetching vehicle types:", error);
        }
    };

    useEffect(() => {
        if (masterData.vehicleTypeList.length === 0) {
            fetchVehicleTypes();
        }
    }, [])
}

export const useLicenseTypes = () => {

    const { masterData, setLicenseTypeList } = useMasterData();

    const fetchLicenseType = async () => {
        try {
            let result = await getLicenseType();
            if (result) {
                if (result.success) {
                    let data = result.data as License[];
                    setLicenseTypeList(data);
                }
            } else {
                throw new Error("getLicenseType returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchLicenseType returns error.");
        }
    }

    useEffect(() => {
        if (masterData.licenseTypeList.length === 0) {
            fetchLicenseType();
        }
    }, [])
}

export const useEducationLevels = () => {

    const { masterData, setEducationList } = useMasterData();

    const fetchEducationLevel = async () => {
        try {
            let result = await getEducationList();
            if (result) {
                if (result.success) {
                    let data = result.data as EducationLevel[];
                    setEducationList(data);
                }
            } else {
                throw new Error("getEducationList returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchEducationLevel returns error.");
        }
    }

    useEffect(() => {
        if (masterData.educationList.length === 0) {
            fetchEducationLevel();
        }
    }, [])
}

export const useVehicleCalList = () => {

    const { masterData, setVehicleCalList } = useMasterData();

    const fetchVehicleCalList = async () => {
        try {
            let result = await getVehicleTypeCal();
            if (result) {
                if (result.success) {
                    let data = result.data as VehicleCal[];
                    setVehicleCalList(data);
                }
            } else {
                throw new Error("getVehicleTypeCal returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchVehicleCalList returns error.");
        }
    }

    useEffect(() => {
        if (masterData.vehicleCalList.length === 0) {
            fetchVehicleCalList();
        }
    }, [])
}

export const useMainModuleList = () => {

    const { masterData, setMainModuleList } = useMasterData();

    const fetchMainModuleList = async () => {
        try {
            let result = await getMainModuleList();
            if (result) {
                if (result.success) {
                    let data = result.data as MainModule[];
                    setMainModuleList(data);
                }
            } else {
                throw new Error("getMainModuleList returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchMainModuleList returns error.");
        }
    }

    useEffect(() => {
        if (masterData.mainModuleList.length === 0) {
            fetchMainModuleList();
        }
    }, [])
}

export const useModuleList = () => {
    const { masterData, setModuleList } = useMasterData();

    const fetchModuleList = async () => {
        try {
            let result = await getModuleList();
            if (result) {
                if (result.success) {
                    let data = result.data as Module[];
                    setModuleList(data);
                }
            } else {
                throw new Error("getModuleList returns error.");
            }
        } catch (e) {
            console.error(e);
            console.log("fetchModuleList returns error.");
        }
    }

    useEffect(() => {
        if (masterData.moduleList.length === 0) {
            fetchModuleList();
        }
    }, [])
}

export const useFuelTypes = () => {
    const { masterData, setFuelTypeList } = useMasterData();

    const fetchFuelTypes = async () => {
        try {
            let result = await getFuels();
            if (result) {
                const data: FuelType[] = result.data;
                setFuelTypeList(data);
            } else {
                throw new Error("getFuels returns error.");
            }
        } catch (error) {
            console.error("Error fetching fuel types:", error);
        }
    };

    useEffect(() => {
        if (masterData.fuelTypeList.length === 0) {
            fetchFuelTypes();
        }
    }, []);
}

export const useProvinces = () => {
    const { masterData, setProvinceList } = useMasterData();

    const fetchProvinces = async () => {
        try {
            let result = await get_provinces("") as any;
            if (result) {
                const data: Province[] = result.data;
                setProvinceList(data);
            } else {
                throw new Error("get_provinces returns error.");
            }
        } catch (error) {
            console.error("Error fetching provinces:", error);
        }
    }

    useEffect(() => {
        if (masterData.provinces.length === 0) {
            fetchProvinces();
        }
    }, [])
}