import { Routes, Route } from "react-router-dom";
import PickingRequestList from "./picking_request/PickingRequestList";
import PickingRequestCreate from "./picking_request/PickingRequestCreate";


const DocumentsPage = () => {

    return (
        <Routes>
            <Route path="picking_request" element={<PickingRequestList />} />
            <Route path="picking_request/create" element={<PickingRequestCreate />} />
        </Routes>
    );

}

export default DocumentsPage