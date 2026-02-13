import { Routes, Route, Outlet } from "react-router-dom";
import WorkorderList from "./components/WorkorderList"
import WorkorderDetail from "./components/WorkorderDetail"
import WorkorderDashboard from "./components/WorkorderDashboard"

const WorkorderPage = () => {

    return (
        <Routes>
            <Route index element={<WorkorderDashboard />} />
            <Route path="dashboard" element={<WorkorderDashboard />} />
            <Route path="workorders_dashboard" element={<WorkorderDashboard />} />
            <Route path="workorders_list" element={<WorkorderList />} />
            <Route path="workorders_detail/:id" element={<WorkorderDetail />} />
        </Routes>
    );

}

export default WorkorderPage