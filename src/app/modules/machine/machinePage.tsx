import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MachineList from "./components/MachineList";
import MachineCreate from "./components/MachineCreate";
import MachineDashbord from "./components/MachineDashbord";
import MachineUpdate from "./components/MachineUpdate";
import MachineDetail from "./components/MachineDetail";
import MachineTypeList from "./components/MachineTypeList";
import MachineTypeCreateEdit from "./components/MachineTypeCreateEdit";
import { getIsAllBranch } from "../../helpers/appHelpers";

const AllBranchGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (getIsAllBranch()) return <Navigate to="/machine/machine_list" replace />;
    return children;
};

const MachinePage = () => {
    return (
        <Routes>
            <Route index element={<MachineList />} />
            <Route path="machine_list" element={<MachineList />} />
            <Route path="machine_create" element={<AllBranchGuard><MachineCreate /></AllBranchGuard>} />
            <Route path="machine_dashboard" element={<MachineDashbord />} />
            <Route path="machine_detail/:id" element={<MachineDetail />} />
            <Route path="machine_update/:id" element={<MachineUpdate />} />
            <Route path="machine_type_list" element={<MachineTypeList />} />
            <Route path="machine_type_create" element={<MachineTypeCreateEdit />} />
            <Route path="machine_type_edit/:id" element={<MachineTypeCreateEdit />} />
        </Routes>
    );
};

export default MachinePage;