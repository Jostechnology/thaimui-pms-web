import { Routes, Route, Outlet } from "react-router-dom";
import WorkorderList from "./components/WorkorderList"
import WorkorderDetail from "./components/WorkorderDetail"
import WorkorderDashboard from "./components/WorkorderDashboard"
import WorkorderView from "./components/WorkorderView"
import WorkPhaseDetail from "./components/WorkPhaseDetail"
import WorkorderCreate from "./components/WorkorderCreate"
import WorkRunDetail from "./components/WorkRunDetail"
import TemplateManagement from "./components/TemplateManagement"
import TemplateBuilder from "./components/TemplateBuilder"

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
            <Route path="workorders_phase_detail/:phaseId" element={<WorkPhaseDetail />} />
            <Route path="work_run/:workRunId" element={<WorkRunDetail />} />
            <Route path="workorders_template" element={<TemplateManagement />} />
            <Route path="template_builder" element={<TemplateBuilder />} />
            <Route path="template_builder/:templateId" element={<TemplateBuilder />} />
        </Routes>
    );

}

export default WorkorderPage