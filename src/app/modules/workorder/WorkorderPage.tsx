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
import ComponentDetailEditor from "./components/ComponentDetailEditor"
import PhaseTemplateList from "./components/PhaseTemplateList";
import PhaseTemplateCreateEdit from "./components/PhaseTemplateCreateEdit";
import ComponentEditRequestList from "./components/ComponentEditRequestList";

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
            <Route path="work_run_cost/:workRunId" element={<WorkPhaseDetail />} />
            <Route path="work_run/:workRunId" element={<WorkRunDetail />} />
            <Route path="workorders_template" element={<TemplateManagement />} />
            <Route path="template_builder" element={<TemplateBuilder />} />
            <Route path="template_builder/:templateId" element={<TemplateBuilder />} />
            <Route path="component_detail/:workOrderId/:componentId" element={<ComponentDetailEditor />} />
            <Route path="component_edit_requests" element={<ComponentEditRequestList />} />
            <Route path="phase_template" element={<PhaseTemplateList />} />
            <Route path="phase_template/create" element={<PhaseTemplateCreateEdit />} />
            <Route path="phase_template/edit/:id" element={<PhaseTemplateCreateEdit />} />
        </Routes>
    );

}

export default WorkorderPage