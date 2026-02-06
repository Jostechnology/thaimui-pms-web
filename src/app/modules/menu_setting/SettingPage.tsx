import { Routes, Route, Outlet } from "react-router-dom";

import ModuleManagement from "./components/ModuleManagement";
import RoleManagement from "./components/RoleManagement";


const SettingPage = () => {

    return (
        <Routes>
            <Route path="module_management" element={<ModuleManagement />}/>
            <Route path="role_management" element={<RoleManagement />}/>


        </Routes>
    );

}

export default SettingPage