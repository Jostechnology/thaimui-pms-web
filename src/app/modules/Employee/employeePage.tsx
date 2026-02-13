import { Routes, Route, Outlet } from "react-router-dom";
import EmployeeList from "./components/EmployeeList"
// import WorkorderDetail from "./components/WorkorderDetail"
const WorkorderPage = () => {

    return (
        <Routes>
            <Route path="employee_list" element={<EmployeeList/>}/>
            {/* <Route path="workorders_detail/:id" element={<WorkorderDetail/>}/> */}
        </Routes>
    );

}

export default WorkorderPage