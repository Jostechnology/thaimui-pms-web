import { lazy, FC, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { MasterLayout } from "../../_metronic/layout/MasterLayout";
import TopBarProgress from "react-topbar-progress-indicator";
import { getCSSVariableValue } from "../../_metronic/assets/ts/_utils";
import { WithChildren } from "../../_metronic/helpers";
const WorkorderPage = lazy(() => import("../modules/workorder/WorkorderPage"));
const SettingPage = lazy(() => import("../modules/menu_setting/SettingPage"));
const EmployeePage = lazy(() => import("../modules/Employee/employeePage"));
const WorkorderDashboard = lazy(() => import("../modules/workorder/components/WorkorderDashboard"));
const PrivateRoutes = () => {

const WorkorderPage = lazy(() => import("../modules/workorder/WorkorderPage"));
const QualityControlPage = lazy(() => import("../modules/quality_control/QualityControlPage"));

const SettingPage = lazy(() => import("../modules/menu_setting/SettingPage"));
const EmployeePage = lazy(() => import("../modules/Employee/employeePage"));
const WorkorderDashboard = lazy(
  () => import("../modules/workorder/components/WorkorderDashboard"),
);

const PrivateRoutes = () => {
  return (
    <Routes>
      <Route element={<MasterLayout />}>
        <Route
          path="main"
          element={
            <SuspensedView>
              <WorkorderDashboard />
            </SuspensedView>
          }
        />

<<<<<<< HEAD
        <Route
          path="setting/*"
          element={
            <SuspensedView>
              <SettingPage />
            </SuspensedView>
          }
        />
=======
        <Route path="main" element={<div></div>} />
        <Route path="setting/*" element={
          <SuspensedView>
            <SettingPage />
          </SuspensedView>
        } />
        <Route path="employee/*" element={
          <SuspensedView>
            <EmployeePage />
          </SuspensedView>
        } />
        <Route path="workorder/*" element={
          <SuspensedView>
            <WorkorderPage />
          </SuspensedView>
        } />
        <Route path="workorder/dashboard" element={
          <SuspensedView>
            <WorkorderDashboard />
          </SuspensedView>
        } />
>>>>>>> origin/feature-wo-dashboard

        <Route
          path="employee/*"
          element={
            <SuspensedView>
              <EmployeePage />
            </SuspensedView>
          }
        />

        <Route
          path="workorder/*"
          element={
            <SuspensedView>
              <WorkorderPage />
            </SuspensedView>
          }
        />

        <Route
          path="quality_control/*"
            element={
              <SuspensedView>
                <QualityControlPage />
              </SuspensedView>
            }
        />
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
