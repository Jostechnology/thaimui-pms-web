import { Routes, Route, Outlet } from "react-router-dom";
import QCWorkOrdersList from "./components/QCWorkOrdersList";
import CreateEditViewQCWorkOrder from "./components/CreateEditViewQCWorkOrder";


const WorkorderPage = () => {

    return (
        <Routes>
            <Route path="qc_workorders_list/create" element={<CreateEditViewQCWorkOrder />} />
            <Route path="qc_workorders_list/edit/:qc_workorder_id" element={<CreateEditViewQCWorkOrder />} />
            <Route path="qc_workorders_list/view/:qc_workorder_id" element={<CreateEditViewQCWorkOrder />} />

            <Route path="qc_workorders_list" element={<QCWorkOrdersList />} />
        </Routes>
    );

}

export default WorkorderPage