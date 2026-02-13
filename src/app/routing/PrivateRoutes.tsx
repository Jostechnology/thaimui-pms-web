import { lazy, FC, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { MasterLayout } from "../../_metronic/layout/MasterLayout";
import TopBarProgress from "react-topbar-progress-indicator";
import { getCSSVariableValue } from "../../_metronic/assets/ts/_utils";
import { WithChildren } from "../../_metronic/helpers";
import WorkorderPage from "../modules/workorder/WorkorderPage";
import SettingPage from "../modules/menu_setting/SettingPage";
import EmployeePage from "../modules/Employee/employeePage";
import WorkorderDashboard from "../modules/workorder/components/WorkorderDashboard";
const PrivateRoutes = () => {

  return (
    <Routes>

      <Route element={<MasterLayout />}>

        <Route path="main" element={<div></div>} />
        <Route path="setting/*" element={<SettingPage />} />
        <Route path="employee/*" element={<EmployeePage />} />
        <Route path="workorder/*" element={<WorkorderPage />} />
        <Route path="workorder/dashboard" element={<WorkorderDashboard />} />


      </Route>
    </Routes>

  );
};

const SuspensedView: FC<WithChildren> = ({ children }) => {
  const baseColor = getCSSVariableValue("--bs-primary");
  TopBarProgress.config({
    barColors: {
      "0": baseColor,
    },
    barThickness: 1,
    shadowBlur: 5,
  });
  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>;
};

export { PrivateRoutes };
