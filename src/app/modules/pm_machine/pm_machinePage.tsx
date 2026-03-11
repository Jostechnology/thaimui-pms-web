import { Routes, Route } from "react-router-dom";
import PmRepairList from "./components/pm_item";

const PmMachinePage = () => {
    return (
        <Routes>
            <Route index element={<PmRepairList />} />
            <Route path="item" element={<PmRepairList />} />
        </Routes>
    );
};

export default PmMachinePage;
