import { Routes, Route, Outlet } from "react-router-dom";
import WorkorderList from "./components/WorkorderList"
import WorkorderDetail from "./components/WorkorderDetail"
import WorkorderDashboard from "./components/WorkorderDashboard"
import WorkorderView from "./components/WorkorderView"
import WorkorderCreate from "./components/WorkorderCreate"

const WorkorderPage = () => {

    return (
        <Routes>
            <Route index element={<WorkorderDashboard />} />
            <Route path="dashboard" element={<WorkorderDashboard />} />
            <Route path="workorders_dashboard" element={<WorkorderDashboard />} />
            <Route path="workorders_list" element={<WorkorderList />} />
            <Route path="workorders_create" element={<WorkorderCreate />} />
            <Route path="workorders_detail/:id" element={<WorkorderDetail />} />
            <Route path="workorders_view/:id" element={<WorkorderView />} />
        </Routes>
    );

}

export default WorkorderPage