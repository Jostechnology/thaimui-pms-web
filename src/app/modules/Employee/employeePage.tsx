import { Routes, Route, Outlet } from "react-router-dom";
import EmployeeList from "./components/EmployeeList"
import EmployeeDetail from "./components/EmployeeDetail"
const EmployeePage = () => {

    return (
        <Routes>
            <Route path="employee_list" element={<EmployeeList />} />
            <Route path="employee_detail/:employee_id" element={<EmployeeDetail />} />
        </Routes>
    );

}

export default EmployeePage