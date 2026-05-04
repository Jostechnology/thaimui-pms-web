import { Routes, Route, Outlet } from "react-router-dom";
import QCWorkOrdersList from "./components/QCWorkOrdersList";
import CreateEditViewQCWorkOrder from "./components/CreateEditViewQCWorkOrder";
import ViewQCWorkOrder from "./components/ViewQCWorkOrder";
import ViewTestResultSession from "./components/ViewTestResultSession";
import TestCertificate from "./components/TestCertificateList";
import CreateTestCertificate from "./components/CreateTestCertificate";
import CertificateDetail from "./components/CertificateDetail";
import EditTestCertificate from "./components/EditTestCertificate";
const WorkorderPage = () => {

    return (
        <Routes>
            <Route path="qc_workorders_list/create" element={<CreateEditViewQCWorkOrder />} />
            <Route path="qc_workorders_list/edit/:qc_workorder_id" element={<CreateEditViewQCWorkOrder />} />
            <Route path="qc_workorders_list/view/:qc_workorder_id" element={<ViewQCWorkOrder />} />
            <Route path="test_result/:test_result_id" element={<ViewTestResultSession />} />

            <Route path="qc_test_cert_list/create" element={<CreateTestCertificate />} />
            <Route path="qc_test_cert_list/edit/:qc_certification_id" element={<EditTestCertificate />} />
            <Route path="qc_test_cert_list/view/:qc_certification_id" element={<CertificateDetail />} />
            <Route path="qc_test_cert_list" element={<TestCertificate />} />
            <Route path="qc_workorders_list" element={<QCWorkOrdersList />} 
            
            />
        </Routes>
    );

}

export default WorkorderPage