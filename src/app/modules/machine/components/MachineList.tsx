import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';

// 1. Mock Data เตรียมรอต่อ Backend
const mockMachines = [
  {
    id: "CNC-ALPHA-01",
    name: "MILLING STATION",
    status: "RUNNING",
    statusColor: "success",
    metric1_label: "CURRENT RPM",
    metric1_value: "12,450",
    metric2_label: "TEMPERATURE",
    metric2_value: "68.2°C",
    maintenance: "12 Days",
    progress: 70,
    isAlert: false,
  },
  {
    id: "IM-BETA-04",
    name: "INJECTION MOLD",
    status: "DOWN",
    statusColor: "danger",
    metric1_label: "VIBRATION",
    metric1_value: "HIGH",
    metric2_label: "OIL PRESSURE",
    metric2_value: "LOW",
    maintenance: "OVERDUE",
    progress: 100,
    isAlert: true, // เครื่องพัง ขอบแดง!
  },
  {
    id: "ARM-DELTA-09",
    name: "ASSEMBLY ARM",
    status: "IDLE",
    statusColor: "warning",
    metric1_label: "PRECISION",
    metric1_value: "99.9%",
    metric2_label: "USAGE",
    metric2_value: "0.0%",
    maintenance: "3 Days",
    progress: 90,
    isAlert: false,
  },
  {
    id: "PRESS-GAMMA-02",
    name: "HYDRAULIC PRESS",
    status: "RUNNING",
    statusColor: "success",
    metric1_label: "PRESSURE",
    metric1_value: "12.2 bar",
    metric2_label: "CYCLE TIME",
    metric2_value: "4.2s",
    maintenance: "45 Days",
    progress: 20,
    isAlert: false,
  },
];

const MachineList: React.FC = () => {
    // ตรงนี้เผื่อไว้ทำ useEffect ยิง API ไปหา Backend ของเราครับ
    const [machines, setMachines] = useState(mockMachines);

    return (
        <Content>
            {/* 2. Header: หัวข้อ และ ป้าย Auto-Refresh */}
            <div className="d-flex flex-wrap flex-stack mb-6">
                <h3 className="fw-bolder my-2">
                    Machine Fleet Status
                    <span className="fs-6 text-gray-400 fw-bold ms-4">Real-time health telemetry across all production units.</span>
                </h3>
                <div className="d-flex align-items-center my-2">
                    <span className="badge badge-light-success fs-base px-4 py-2">
                        <span className="bullet bullet-dot bg-success me-2"></span>AUTO-REFRESH
                    </span>
                </div>
            </div>

            {/* 3. Grid: การ์ดเครื่องจักร */}
            <div className="row g-6 g-xl-9 mb-6 mb-xl-9">
                {machines.map((machine, index) => (
                    <div className="col-md-6 col-xl-4" key={index}>
                        <div className={`card h-100 ${machine.isAlert ? 'border border-danger border-2' : ''}`}>
                            <div className="card-body p-9">
                                
                                {/* โซนหัวการ์ด (ชื่อ + Status) */}
                                <div className="d-flex flex-stack mb-5">
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-45px me-4">
                                            <span className={`symbol-label bg-light-${machine.statusColor}`}>
                                                <i className={`bi bi-cpu fs-2 text-${machine.statusColor}`}></i>
                                            </span>
                                        </div>
                                        <div>
                                            <div className="fs-4 fw-bolder text-dark">{machine.id}</div>
                                            <div className="fs-7 text-muted fw-bold">{machine.name}</div>
                                        </div>
                                    </div>
                                    <span className={`badge badge-light-${machine.statusColor} fw-bolder px-4 py-2`}>
                                        <span className={`bullet bullet-dot bg-${machine.statusColor} me-2`}></span>
                                        {machine.status}
                                    </span>
                                </div>

                                {/* โซนค่า Metrics (ความร้อน, แรงดัน) */}
                                <div className="d-flex flex-wrap mb-7">
                                    <div className={`border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-5 mb-3 ${machine.isAlert ? 'bg-light-danger border-danger' : ''}`}>
                                        <div className="fs-8 text-gray-400 fw-bolder mb-1">{machine.metric1_label}</div>
                                        <div className={`fs-3 fw-bolder ${machine.isAlert ? 'text-danger' : 'text-dark'}`}>{machine.metric1_value}</div>
                                    </div>
                                    <div className={`border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 mb-3 ${machine.isAlert ? 'bg-light-danger border-danger' : ''}`}>
                                        <div className="fs-8 text-gray-400 fw-bolder mb-1">{machine.metric2_label}</div>
                                        <div className={`fs-3 fw-bolder ${machine.isAlert ? 'text-danger' : 'text-dark'}`}>{machine.metric2_value}</div>
                                    </div>
                                </div>

                                {/* โซนหลอด Progress บำรุงรักษา */}
                                <div className="d-flex flex-stack mb-2">
                                    <span className="text-muted fs-8 fw-bolder">Next Maintenance</span>
                                    <span className={`fw-bolder fs-8 ${machine.isAlert ? 'text-danger' : 'text-dark'}`}>{machine.maintenance}</span>
                                </div>
                                <div className="progress h-6px w-100 bg-light-secondary mb-7">
                                    <div className={`progress-bar bg-${machine.statusColor}`} role="progressbar" style={{ width: `${machine.progress}%` }}></div>
                                </div>

                                {/* ปุ่ม Action */}
                                <button className={`btn w-100 py-3 ${machine.isAlert ? 'btn-danger' : 'btn-outline btn-outline-dashed btn-outline-default text-dark fw-bolder'}`}>
                                    {machine.isAlert ? 'URGENT MAINTENANCE' : 'REQUEST MAINTENANCE'}
                                </button>

                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. Summary Stats (การ์ดสรุปยอดด้านล่างสุด) */}
            <div className="row g-6 g-xl-9">
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-check-circle-fill fs-1 text-success me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">24</div>
                                <div className="fs-7 text-muted fw-bold">HEALTHY</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle-fill fs-1 text-warning me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">3</div>
                                <div className="fs-7 text-muted fw-bold">ATTENTION REQUIRED</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100 border border-danger">
                        <div className="card-body d-flex align-items-center bg-light-danger rounded">
                            <i className="bi bi-x-octagon-fill fs-1 text-danger me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-danger">1</div>
                                <div className="fs-7 text-danger fw-bold">DOWNTIME</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-xl-3">
                    <div className="card h-100">
                        <div className="card-body d-flex align-items-center">
                            <i className="bi bi-graph-up fs-1 text-primary me-4"></i>
                            <div>
                                <div className="fs-2 fw-bolder text-dark">94%</div>
                                <div className="fs-7 text-muted fw-bold">FLEET UPTIME</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </Content>
    );
};

export default MachineList;