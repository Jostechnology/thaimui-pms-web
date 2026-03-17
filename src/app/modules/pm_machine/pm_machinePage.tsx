import { Routes, Route } from "react-router-dom";
import PmRepairList from "./components/pm_item";
import PmDashbord from "./components/pm_dashboard";
const PmMachinePage = () => {
    return (
        <Routes>
            <Route index element={<PmDashbord />} />
            <Route path="item" element={<PmRepairList />} />
            <Route path="dashboard" element={<PmDashbord />} />
        </Routes>
    );
};

export default PmMachinePage;
