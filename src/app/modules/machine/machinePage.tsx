import { Routes, Route } from "react-router-dom";
import MachineList from "./components/MachineList";
import MachineCreate from "./components/MachineCreate";
import MachineDashbord from "./components/MachineDashbord";

const MachinePage = () => {
    return (
        <Routes>
            <Route index element={<MachineList />} />
            <Route path="machine_list" element={<MachineList />} />
            <Route path="machine_create" element={<MachineCreate />} />
            <Route path="machine_dashboard" element={<MachineDashbord />} />
        </Routes>
    );
};

export default MachinePage;