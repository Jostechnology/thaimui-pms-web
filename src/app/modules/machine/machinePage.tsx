import { Routes, Route } from "react-router-dom";
import MachineList from "./components/MachineList";
import MachineCreate from "./components/MachineCreate";
import MachineDashbord from "./components/MachineDashbord";
import MachineUpdate from "./components/MachineUpdate";
import MachineDetail from "./components/MachineDetail";

const MachinePage = () => {
    return (
        <Routes>
            <Route index element={<MachineList />} />
            <Route path="machine_list" element={<MachineList />} />
            <Route path="machine_create" element={<MachineCreate />} />
            <Route path="machine_dashboard" element={<MachineDashbord />} />
            <Route path="machine_detail/:id" element={<MachineDetail />} />
            <Route path="machine_update/:id" element={<MachineUpdate />} />
        </Routes>
    );
};

export default MachinePage;