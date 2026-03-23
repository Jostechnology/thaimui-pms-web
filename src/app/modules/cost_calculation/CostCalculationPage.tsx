import { Route, Routes } from "react-router-dom";
import MonthlyOperationList from "./components/MonthlyOperationList";
import AddEditViewMonthlyOperation from "./components/AddEditViewMonthlyOperation";

const CostCalculationPage = () => {
    return (
        <Routes>
            <Route path='/monthly_operation' element={<MonthlyOperationList />} />
            <Route path='/create' element={<AddEditViewMonthlyOperation />} />
            <Route path='/edit/:id' element={<AddEditViewMonthlyOperation />} />
            <Route path='/view/:id' element={<AddEditViewMonthlyOperation />} />
        </Routes>
    );
}

export default CostCalculationPage;
