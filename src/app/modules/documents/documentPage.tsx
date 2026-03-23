import { Routes, Route, Outlet } from "react-router-dom";
import PickingRequestList from "./picking_request/PickingRequestList";


const EmployeePage = () => {

    return (
        <Routes>
            <Route path="picking_request" element={<PickingRequestList />} />
        </Routes>
    );

}

export default EmployeePage