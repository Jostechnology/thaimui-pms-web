
import { Outlet, Route, Routes } from "react-router-dom";
import SalesOrderDashboard from "./components/SalesOrderDashboard";
import SalesOrderList from "./components/SalesOrderList";
import SalesOrderView from "./components/SalesOrderView";

const WorkorderPage = () => {

    return (
        <Routes>
            <Route index element={<SalesOrderDashboard />} />
            <Route path="dashboard" element={<SalesOrderDashboard />} />
            <Route path="list" element={<SalesOrderList />} />
            <Route path="view/:id" element={<SalesOrderView />} />
        </Routes>
    );

}

export default WorkorderPage