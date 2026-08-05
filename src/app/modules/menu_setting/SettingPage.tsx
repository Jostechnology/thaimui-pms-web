import { Routes, Route, Outlet } from "react-router-dom";

import ModuleManagement from "./components/ModuleManagement";
import RoleManagement from "./components/RoleManagement";
import UserManagement from "./components/UserManagement";
import DocumentCodeSetting from "./components/DocumentCodeSetting";
import BranchManagement from "./components/BranchManagement";
import BranchList from "./components/BranchList";
import BranchCreate from "./components/BranchCreate";
import BranchEdit from "./components/BranchEdit";
import ShiftManagement from "./components/ShiftManagement";
import HolidayManagement from "./components/HolidayManagement";
import ItemDecodeUpload from "./components/ItemDecodeUpload";

const SettingPage = () => {

    return (
        <Routes>
            <Route path="module_management" element={<ModuleManagement />}/>
            <Route path="role_management" element={<RoleManagement />}/>
            <Route path="user_management" element={<UserManagement />}/>
            <Route path="document_code" element={<DocumentCodeSetting />}/>

            <Route path="branch_management" element={<BranchManagement />}/>
            <Route path="branch_list" element={<BranchList />}/>
            <Route path="branch_create" element={<BranchCreate />}/>
            <Route path="branch_edit/:id" element={<BranchEdit />}/>

            <Route path="shift_management" element={<ShiftManagement />}/>
            <Route path="holiday_management" element={<HolidayManagement />}/>
            <Route path="item_decode_upload" element={<ItemDecodeUpload />}/>
        </Routes>
    );

}

export default SettingPage