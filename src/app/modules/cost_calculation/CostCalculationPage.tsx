import { Route, Routes } from "react-router-dom";
import MonthlyOperationList from "./components/MonthlyOperationList";

const CostCalculationPage = () => {
    return (
        <Routes>
            <Route path='/monthly_operation' element={<MonthlyOperationList />} />
        </Routes>
    );
}

export default CostCalculationPage;