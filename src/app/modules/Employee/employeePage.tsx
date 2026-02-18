import { Routes, Route, Outlet } from "react-router-dom";
import EmployeeSalaryList from "./components/EmployeeSalaryList"
// import WorkorderDetail from "./components/WorkorderDetail"
const WorkorderPage = () => {

    return (
        <Routes>
            {/* <Route path="employee_list" element={<EmployeeList/>}/> */}
            <Route path="employee_salary_history" element={<EmployeeSalaryList/>}/>
            {/* <Route path="workorders_detail/:id" element={<WorkorderDetail/>}/> */}
        </Routes>
    );

}

export default WorkorderPage