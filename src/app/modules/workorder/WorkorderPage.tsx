import { Routes, Route, Outlet } from "react-router-dom";
import WorkorderList from "./components/WorkorderList"
import WorkorderDetail from "./components/WorkorderDetail"
const WorkorderPage = () => {

    return (
        <Routes>
            <Route path="workorders_list" element={<WorkorderList/>}/>
            <Route path="workorders_detail/:id" element={<WorkorderDetail/>}/>
        </Routes>
    );

}

export default WorkorderPage