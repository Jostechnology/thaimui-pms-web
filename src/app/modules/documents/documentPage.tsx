import { Routes, Route } from "react-router-dom";
import PickingRequestList from "./picking_request/PickingRequestList";
import PickingRequestCreate from "./picking_request/PickingRequestCreate";
import PickingRequestView from "./picking_request/PickingRequestView";


const DocumentsPage = () => {

    return (
        <Routes>
            <Route path="picking_request" element={<PickingRequestList />} />
            <Route path="picking_request/create" element={<PickingRequestCreate />} />
            <Route path="picking_request/:pickingRequestId" element={<PickingRequestView />} />
        </Routes>
    );

}

export default DocumentsPage