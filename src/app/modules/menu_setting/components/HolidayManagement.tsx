import React, { useEffect, useState } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import Swal from 'sweetalert2';
import {
    getHolidayList,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    syncHolidaysFromApi,
} from '../../../services/shiftHolidayService';
import { Holiday } from '../../../type_interface/EmployeeType';

const TH_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const fmtDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const HolidayManagement: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Add form
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');

    const fetchHolidays = async () => {
        setLoading(true);
        const res = await getHolidayList(1, 366, search, year);
        if (res?.success) {
            setHolidays(res.data?.items || []);
        } else {
            setHolidays([]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchHolidays(); /* eslint-disable-next-line */ }, [year]);

    const handleSync = async () => {
        const ok = await Swal.fire({
            title: `ดึงวันหยุดปี ${year} จาก API?`,
            text: 'จะเพิ่มเฉพาะวันที่ยังไม่มีในระบบ (ไม่ทับของเดิม)',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ดึงข้อมูล',
            cancelButtonText: 'ยกเลิก',
        });
        if (!ok.isConfirmed) return;
        setLoading(true);
        const res = await syncHolidaysFromApi(year);
        setLoading(false);
        if (res?.success) {
            Swal.fire({
                icon: 'success',
                title: 'ดึงสำเร็จ',
                text: `เพิ่มใหม่ ${res.data?.inserted ?? 0} วัน, ข้ามที่มีแล้ว ${res.data?.skipped_existing ?? 0} วัน`,
            });
            await fetchHolidays();
        } else {
            Swal.fire({ icon: 'error', title: 'ดึงไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const handleToggleActive = async (h: Holiday) => {
        const res = await updateHoliday(h.holiday_id, { is_active: !h.is_active });
        if (res?.success) {
            setHolidays(prev => prev.map(x => x.holiday_id === h.holiday_id ? { ...x, is_active: !h.is_active } : x));
        } else {
            Swal.fire({ icon: 'error', title: 'อัปเดตไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const handleDelete = async (h: Holiday) => {
        const ok = await Swal.fire({
            title: `ลบวันหยุด "${h.name}"?`, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
        });
        if (!ok.isConfirmed) return;
        const res = await deleteHoliday(h.holiday_id);
        if (res?.success) {
            setHolidays(prev => prev.filter(x => x.holiday_id !== h.holiday_id));
            Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const handleAdd = async () => {
        if (!newDate || !newName.trim()) {
            Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลให้ครบ', text: 'ระบุวันที่และชื่อวันหยุด' });
            return;
        }
        const res = await createHoliday({
            holiday_date: newDate,
            name: newName.trim(),
            is_active: true,
            source: 'MANUAL',
        });
        if (res?.success) {
            Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ', timer: 1200, showConfirmButton: false });
            setNewDate('');
            setNewName('');
            await fetchHolidays();
        } else {
            Swal.fire({ icon: 'error', title: 'เพิ่มไม่สำเร็จ', text: res?.error || '' });
        }
    };

    const filtered = search
        ? holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase()))
        : holidays;

    const yearOptions: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) yearOptions.push(y);

    return (
        <Content>
            <div className="d-flex flex-wrap flex-stack mb-6">
                <h3 className="fw-bolder my-2">
                    จัดการวันหยุดประจำปี
                    <span className="fs-6 text-gray-400 fw-bold ms-4">Holiday Master</span>
                </h3>
                <div className="d-flex align-items-center gap-2 my-2">
                    <select
                        className="form-select form-select-sm w-150px"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>ปี {y + 543} ({y})</option>
                        ))}
                    </select>
                    <button className="btn btn-sm btn-light-primary fw-bold" onClick={handleSync}>
                        <i className="bi bi-cloud-download me-2"></i>ดึงจาก API
                    </button>
                </div>
            </div>

            {/* Quick add row */}
            <div className="card mb-5">
                <div className="card-body py-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="fs-8 fw-bold text-muted mb-1">วันที่</label>
                            <input
                                type="date"
                                className="form-control"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="fs-8 fw-bold text-muted mb-1">ชื่อวันหยุด</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="เช่น วันแรงงานแห่งชาติ"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <button className="btn btn-primary fw-bold w-100" onClick={handleAdd}>
                                <i className="bi bi-plus-lg me-2"></i>เพิ่มวันหยุด
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header border-0 pt-6">
                    <div className="card-title">
                        <div className="d-flex align-items-center position-relative my-1">
                            <i className="bi bi-search position-absolute ms-4 fs-4 text-gray-500"></i>
                            <input
                                type="text"
                                className="form-control form-control-lg w-250px ps-12"
                                placeholder="ค้นหาชื่อวันหยุด..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="card-body pt-0">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed fs-6 gy-5">
                            <thead>
                                <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                                    <th className="min-w-150px">วันที่</th>
                                    <th className="min-w-250px">ชื่อวันหยุด</th>
                                    <th className="min-w-100px">แหล่งที่มา</th>
                                    <th className="min-w-100px text-center">ใช้งาน</th>
                                    <th className="text-end min-w-100px">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 fw-bold">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-10"><span className="spinner-border text-primary"></span></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-muted">ยังไม่มีวันหยุดในปีนี้ — กดปุ่ม "ดึงจาก API" เพื่อเริ่มต้น</td></tr>
                                ) : filtered.map(h => (
                                    <tr key={h.holiday_id}>
                                        <td className="text-gray-800">{fmtDate(h.holiday_date)}</td>
                                        <td>{h.name}</td>
                                        <td>
                                            <span className={`badge badge-light-${h.source === 'API' ? 'info' : 'secondary'}`}>{h.source}</span>
                                        </td>
                                        <td className="text-center">
                                            <div className="form-check form-switch form-check-custom d-inline-flex">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={!!h.is_active}
                                                    onChange={() => handleToggleActive(h)}
                                                />
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-icon btn-bg-light btn-color-danger"
                                                title="ลบ"
                                                onClick={() => handleDelete(h)}
                                            >
                                                <i className="bi bi-trash3 fs-5"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Content>
    );
};

export default HolidayManagement;
