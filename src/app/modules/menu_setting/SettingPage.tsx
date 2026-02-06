import { Routes, Route, Outlet } from "react-router-dom";
import MainMenuSetting from "./components/MainMenuSetting"
import ModuleManagement from "./components/ModuleManagement";
import RoleManagement from "./components/RoleManagement";
import UserManagement from "./components/UserManagement";

const SettingPage = () => {

    return (
        <Routes>
            <Route path="" element={<MainMenuSetting />}/>
            <Route path="module_management" element={<ModuleManagement />}/>
            <Route path="role_management" element={<RoleManagement />}/>
            <Route path="user_management" element={<UserManagement />}/>

        </Routes>
    );

}

export default SettingPage