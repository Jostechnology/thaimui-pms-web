import { Routes, Route } from "react-router-dom";
import MachineList from "./components/MachineList";

const MachinePage = () => {
    return (
        <Routes>
            <Route index element={<MachineList />} />
            <Route path="machine_list" element={<MachineList />} />
        </Routes>
    );
};

export default MachinePage;