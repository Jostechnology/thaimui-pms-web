import { Routes, Route } from "react-router-dom";
import PhaseTemplateList from "../workorder/components/PhaseTemplateList";
import PhaseTemplateCreateEdit from "../workorder/components/PhaseTemplateCreateEdit";

const PhaseTemplatePage = () => {
    return (
        <Routes>
            <Route index element={<PhaseTemplateList />} />
            <Route path="list" element={<PhaseTemplateList />} />
            <Route path="create" element={<PhaseTemplateCreateEdit />} />
            <Route path="edit/:id" element={<PhaseTemplateCreateEdit />} />
        </Routes>
    );
};

export default PhaseTemplatePage;
