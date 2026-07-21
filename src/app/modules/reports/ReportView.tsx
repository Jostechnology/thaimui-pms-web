import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Content } from '../../../_metronic/layout/components/content';
import PickingRequestsReport from './picking_requests/PickingRequestsReport';
import WorkerTimeReport from './worker_time/WorkerTimeReport';
import EmployeeProductivityReport from './employee_productivity/EmployeeProductivityReport';
import ProductionCostReport from './production_cost/ProductionCostReport';
import TestingCostReport from './testing_cost/TestingCostReport';
import FailedTestsReport from './failed_tests/FailedTestsReport';
import WorkrunDefectsReport from './workrun_defects/WorkrunDefectsReport';
import MachineUtilizationReport from './machine_utilization/MachineUtilizationReport';
import SoCycleTimeReport from './so_cycle_time/SoCycleTimeReport';

// Every report is now bespoke (filters + 2-3 data viz + table + xlsx export).
const BESPOKE: Record<string, React.FC> = {
    picking_requests: PickingRequestsReport,
    worker_time: WorkerTimeReport,
    employee_productivity: EmployeeProductivityReport,
    production_cost: ProductionCostReport,
    testing_cost: TestingCostReport,
    failed_tests: FailedTestsReport,
    workrun_defects: WorkrunDefectsReport,
    machine_utilization: MachineUtilizationReport,
    so_cycle_time: SoCycleTimeReport,
};

const ReportView: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    if (!code) return null;

    const Bespoke = BESPOKE[code];
    if (Bespoke) return <Bespoke />;

    return (
        <Content>
            <div className='d-flex flex-stack mb-8'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>{code}</h1>
                    <span className='text-muted fw-semibold fs-6'>ไม่พบรายงาน</span>
                </div>
                <button className='btn btn-light' onClick={() => navigate('/reports/list')}>
                    <i className='bi bi-arrow-left me-2'></i>กลับ
                </button>
            </div>
        </Content>
    );
};

export default ReportView;
