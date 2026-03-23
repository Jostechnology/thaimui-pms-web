import { Routes, Route, Outlet } from "react-router-dom";

import ModuleManagement from "./components/ModuleManagement";
import RoleManagement from "./components/RoleManagement";
import UserManagement from "./components/UserManagement";
import DocumentCodeSetting from "./components/DocumentCodeSetting";

const SettingPage = () => {

    return (
        <Routes>
            <Route path="module_management" element={<ModuleManagement />}/>
            <Route path="role_management" element={<RoleManagement />}/>
            <Route path="user_management" element={<UserManagement />}/>
            <Route path="document_code" element={<DocumentCodeSetting />}/>

        </Routes>
    );

}

export default SettingPage