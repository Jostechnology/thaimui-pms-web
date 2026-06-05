import { Routes, Route } from "react-router-dom";
import ReportsList from "./ReportsList";
import ReportView from "./ReportView";

const ReportsPage = () => {
    return (
        <Routes>
            <Route path="list" element={<ReportsList />} />
            <Route path="view/:code" element={<ReportView />} />
            <Route index element={<ReportsList />} />
        </Routes>
    );
};

export default ReportsPage;
