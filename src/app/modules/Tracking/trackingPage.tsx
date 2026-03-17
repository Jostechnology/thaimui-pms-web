import { Routes, Route } from "react-router-dom";
import TestTracking from "./components/TestTracking";
import ProductionTracking from "./components/ProductionTracking";

const TrackingPage = () => {
    return (
        <Routes>
            <Route index element={<TestTracking />} />
            <Route path="test_tracking" element={<TestTracking />} />
            <Route path="production_tracking" element={<ProductionTracking />} />
        </Routes>
    );
};

export default TrackingPage;
