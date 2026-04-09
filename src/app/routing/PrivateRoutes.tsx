import { lazy, FC, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { MasterLayout } from "../../_metronic/layout/MasterLayout";
import TopBarProgress from "react-topbar-progress-indicator";
import { getCSSVariableValue } from "../../_metronic/assets/ts/_utils";
import { WithChildren } from "../../_metronic/helpers";
import CostCalculationPage from "../modules/cost_calculation/CostCalculationPage";
const MachinePage = lazy(() => import("../modules/machine/machinePage"));
const WorkorderPage = lazy(() => import("../modules/workorder/WorkorderPage"));
const SettingPage = lazy(() => import("../modules/menu_setting/SettingPage"));
const EmployeePage = lazy(() => import("../modules/Employee/employeePage"));
const PmMachinePage = lazy(() => import("../modules/pm_machine/pm_machinePage"));
const WorkorderDashboard = lazy(() => import("../modules/workorder/components/WorkorderDashboard"));
const QualityControlPage = lazy(() => import("../modules/quality_control/QualityControlPage"));
const SalesOrderPage = lazy(() => import("../modules/sales_order/SalesOrderPage"));
const TrackingPage = lazy(() => import("../modules/Tracking/trackingPage"));
const DocumentsPage = lazy(() => import("../modules/documents/documentPage"))
const PhaseTemplatePage = lazy(() => import("../modules/phase_template/PhaseTemplatePage"));
const PrivateRoutes = () => {
  return (
    <Routes>
      <Route element={<MasterLayout />}>
        <Route
          path="main"
          element={
            <SuspensedView>
              <div></div>
            </SuspensedView>
          }
        />

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
        <Route
          path="sales_order/*"
          element={
            <SuspensedView>
              <SalesOrderPage />
            </SuspensedView>
          }
        />
        <Route
          path="tracking/*"
          element={
            <SuspensedView>
              <TrackingPage />
            </SuspensedView>
          }
        />
        <Route
          path="pm_machine/*"
          element={
            <SuspensedView>
              <PmMachinePage />
            </SuspensedView>
          }
        />
        <Route
          path="machine/*"
          element={
            <SuspensedView>
              <MachinePage />
            </SuspensedView>
          }
        />

        <Route
          path="documents/*"
          element={
            <SuspensedView>
              <DocumentsPage />
            </SuspensedView>
          }
        />
        <Route
          path="cost_calculation/*"
            element={
              <SuspensedView>
                <CostCalculationPage />
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
