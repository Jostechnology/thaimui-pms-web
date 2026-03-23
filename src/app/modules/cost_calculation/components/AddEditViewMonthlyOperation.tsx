import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Content } from '../../../../_metronic/layout/components/content';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import {
    createOperationCostMonthly,
    getOperationCostMonthlyById,
    updateOperationCostMonthly,
} from '../../../services/costCalculation';
import Swal from 'sweetalert2';

type PageMode = 'create' | 'edit' | 'view';

const AddEditViewMonthlyOperation: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { setLoading, setUnLoading } = useAppLoading();
    const { alertMessage } = useAlertModal();

    // Determine mode from URL path
    const getMode = (): PageMode => {
        if (location.pathname.includes('/edit/')) return 'edit';
        if (location.pathname.includes('/view/')) return 'view';
        return 'create';
    };

    const mode = getMode();
    const isViewMode = mode === 'view';
    const isEditMode = mode === 'edit';
    const isCreateMode = mode === 'create';

    const [formData, setFormData] = useState({
        operation_cost_date: new Date(),
        depreciation_building_cost: '',
        depreciation_building_period: '1',
        depreciation_util_cost: '',
        depreciation_util_period: '1',
        office_rent_cost: '',
        office_supplies_cost: '',
        water_cost: '',
        electricity_cost: '',
        utility_cost: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(isCreateMode);

    // Fetch existing data for edit/view modes
    useEffect(() => {
        if ((isEditMode || isViewMode) && id) {
            fetchData(parseInt(id));
        }
    }, [id, mode]);

    const fetchData = async (operationId: number) => {
        setLoading();
        try {
            const result = await getOperationCostMonthlyById(operationId);
            if (result.success && result.data) {
                const data = result.data;
                setFormData({
                    operation_cost_date: new Date(data.operation_cost_date),
                    depreciation_building_cost: data.depreciation_building_cost != null ? String(data.depreciation_building_cost) : '',
                    depreciation_building_period: data.depreciation_building_period != null ? String(data.depreciation_building_period) : '1',
                    depreciation_util_cost: data.depreciation_util_cost != null ? String(data.depreciation_util_cost) : '',
                    depreciation_util_period: data.depreciation_util_period != null ? String(data.depreciation_util_period) : '1',
                    office_rent_cost: data.office_rent_cost != null ? String(data.office_rent_cost) : '',
                    office_supplies_cost: data.office_supplies_cost != null ? String(data.office_supplies_cost) : '',
                    water_cost: data.water_cost != null ? String(data.water_cost) : '',
                    electricity_cost: data.electricity_cost != null ? String(data.electricity_cost) : '',
                    utility_cost: data.utility_cost != null ? String(data.utility_cost) : '',
                });
                setDataLoaded(true);
            } else {
                alertMessage(result.message || 'ไม่สามารถดึงข้อมูลได้');
                navigate('/cost_calculation/monthly_operation');
            }
        } catch (error) {
            console.error('Error fetching operation cost:', error);
            alertMessage('เกิดข้อผิดพลาดในการดึงข้อมูล');
            navigate('/cost_calculation/monthly_operation');
        } finally {
            setUnLoading();
        }
    };

    const handleCostChange = (field: string, value: string) => {
        // อนุญาตให้ใส่ได้เฉพาะตัวเลขและทศนิยม
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handlePeriodChange = (field: string, value: string) => {
        // อนุญาตให้ใส่ได้เฉพาะตัวเลขจำนวนเต็ม
        if (value === '' || /^\d+$/.test(value)) {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleDateChange = (date: Date | null) => {
        if (date) {
            setFormData(prev => ({
                ...prev,
                operation_cost_date: date
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.operation_cost_date) {
            alertMessage('โปรดเลือกวันที่');
            return;
        }

        setIsSubmitting(true);
        setLoading();

        try {
            // Format date to YYYY-MM-DD
            const dateString = formData.operation_cost_date.toISOString().split('T')[0];

            const payload = {
                operation_cost_date: dateString,
                depreciation_building_cost: parseFloat(formData.depreciation_building_cost) || 0,
                depreciation_building_period: parseInt(formData.depreciation_building_period) || 1,
                depreciation_util_cost: parseFloat(formData.depreciation_util_cost) || 0,
                depreciation_util_period: parseInt(formData.depreciation_util_period) || 1,
                office_rent_cost: parseFloat(formData.office_rent_cost) || 0,
                office_supplies_cost: parseFloat(formData.office_supplies_cost) || 0,
                water_cost: parseFloat(formData.water_cost) || 0,
                electricity_cost: parseFloat(formData.electricity_cost) || 0,
                utility_cost: parseFloat(formData.utility_cost) || 0,
            };

            let response;
            if (isEditMode && id) {
                response = await updateOperationCostMonthly(parseInt(id), payload);
            } else {
                response = await createOperationCostMonthly(payload);
            }

            if (response.success) {
                Swal.fire({
                    title: 'สำเร็จ!',
                    text: isEditMode
                        ? 'แก้ไขข้อมูลต้นทุนการบริหารรายเดือนเรียบร้อยแล้ว'
                        : 'บันทึกข้อมูลต้นทุนการบริหารรายเดือนเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    navigate('/cost_calculation/monthly_operation');
                });
            } else {
                Swal.fire({
                    title: 'ผิดพลาด!',
                    text: response.message || 'ไม่สามารถบันทึกข้อมูลได้',
                    icon: 'error',
                    confirmButtonText: 'ตกลง'
                });
            }
        } catch (error) {
            console.error('Error saving operation cost:', error);
            Swal.fire({
                title: 'ผิดพลาด!',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
        } finally {
            setIsSubmitting(false);
            setUnLoading();
        }
    };

    const CustomDateInput = React.forwardRef(({ value, onClick }: any, ref: any) => (
        <div className="d-flex align-items-center position-relative cursor-pointer" onClick={isViewMode ? undefined : onClick} ref={ref}>
            <button className="btn btn-sm btn-light-primary fw-bold" type="button" disabled={isViewMode}>
                <i className="bi bi-calendar3"></i>
            </button>
            <input
                type="text"
                className="form-control form-control-sm form-control-solid w-150px text-center fw-bold cursor-pointer ms-2"
                value={value}
                readOnly
            />
        </div>
    ));

    const getPageTitle = () => {
        switch (mode) {
            case 'edit': return 'แก้ไขค่าใช้จ่ายในการดำเนินการ';
            case 'view': return 'ดูรายละเอียดค่าใช้จ่ายในการดำเนินการ';
            default: return 'ค่าใช้จ่ายในการดำเนินการ';
        }
    };

    const getPageSubtitle = () => {
        switch (mode) {
            case 'edit': return 'แก้ไขข้อมูลต้นทุนการบริหารรายเดือน';
            case 'view': return 'รายละเอียดข้อมูลต้นทุนการบริหารรายเดือน';
            default: return 'บันทึกข้อมูลต้นทุนการบริหารรายเดือน';
        }
    };

    if (!dataLoaded) {
        return (
            <Content>
                <div className='d-flex justify-content-center align-items-center' style={{ minHeight: '400px' }}>
                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                    <span className="ms-3 text-gray-500">กำลังดึงข้อมูล...</span>
                </div>
            </Content>
        );
    }

    return (
        <Content>
            {/* Header Section */}
            <div className='d-flex flex-stack mb-10'>
                <div className='d-flex flex-column'>
                    <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>{getPageTitle()}</h1>
                    <span className='text-muted fw-semibold fs-6'>{getPageSubtitle()}</span>
                </div>
                {isViewMode && (
                    <div className='d-flex align-items-center gap-2'>
                        <button
                            className='btn btn-light-primary fw-bold px-6'
                            onClick={() => navigate(`/cost_calculation/edit/${id}`)}
                        >
                            <i className='bi bi-pencil-square me-2 fs-4'></i> แก้ไข
                        </button>
                    </div>
                )}
            </div>

            {/* Form Card */}
            <div className='card card-flush shadow-sm border-0'>
                <div className='card-body pt-6'>
                    <form onSubmit={handleSubmit}>
                        {/* Date Selection */}
                        <div className='mb-10'>
                            <label className='form-label fw-semibold'>วันที่ *</label>
                            <div>
                                <DatePicker
                                    selected={formData.operation_cost_date}
                                    onChange={handleDateChange}
                                    customInput={<CustomDateInput />}
                                    dateFormat="dd/MM/yyyy"
                                    disabled={isViewMode}
                                />
                            </div>
                        </div>

                        {/* Data Input Table */}
                        <div className='table-responsive'>
                            <table className='table table-row-dashed table-row-gray-300 gy-7'>
                                <thead>
                                    <tr className='fw-semibold fs-6 text-gray-800 border-bottom border-gray-200'>
                                        <th className='min-w-250px ps-2'>รายการ</th>
                                        <th className='min-w-150px text-center'>ค่าใช้จ่าย (บาท/เดือน) *</th>
                                        <th className='min-w-100px text-center'>จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Row 1 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>เสื่อมอาคารสำนักงาน</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.depreciation_building_cost}
                                                onChange={(e) => handleCostChange('depreciation_building_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.depreciation_building_period}
                                                onChange={(e) => handlePeriodChange('depreciation_building_period', e.target.value)}
                                                placeholder='1'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                    </tr>

                                    {/* Row 2 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>เสื่อมสิ่งปลูกสร้าง</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.depreciation_util_cost}
                                                onChange={(e) => handleCostChange('depreciation_util_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.depreciation_util_period}
                                                onChange={(e) => handlePeriodChange('depreciation_util_period', e.target.value)}
                                                placeholder='1'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                    </tr>

                                    {/* Row 3 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>ค่าเช่าห้องสำนักงาน</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.office_rent_cost}
                                                onChange={(e) => handleCostChange('office_rent_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className='fw-semibold text-gray-400'>-</span>
                                        </td>
                                    </tr>

                                    {/* Row 4 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>ค่าอุปกรณ์สำนักงาน</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.office_supplies_cost}
                                                onChange={(e) => handleCostChange('office_supplies_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className='fw-semibold text-gray-400'>-</span>
                                        </td>
                                    </tr>

                                    {/* Row 5 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>ค่าน้ำ</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.water_cost}
                                                onChange={(e) => handleCostChange('water_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className='fw-semibold text-gray-400'>-</span>
                                        </td>
                                    </tr>

                                    {/* Row 6 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>ค่าไฟฟ้า</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.electricity_cost}
                                                onChange={(e) => handleCostChange('electricity_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className='fw-semibold text-gray-400'>-</span>
                                        </td>
                                    </tr>

                                    {/* Row 7 */}
                                    <tr>
                                        <td className='ps-2'>
                                            <span className='fw-semibold'>ค่าใช้จ่ายอื่นๆ</span>
                                        </td>
                                        <td className='text-center'>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm form-control-solid'
                                                value={formData.utility_cost}
                                                onChange={(e) => handleCostChange('utility_cost', e.target.value)}
                                                placeholder='0'
                                                disabled={isViewMode}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className='fw-semibold text-gray-400'>-</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Action Buttons */}
                        <div className='d-flex gap-3 justify-content-end mt-10'>
                            <button
                                type='button'
                                className='btn btn-light-secondary fw-bold px-8'
                                onClick={() => navigate('/cost_calculation/monthly_operation')}
                                disabled={isSubmitting}
                            >
                                {isViewMode ? 'กลับ' : 'ยกเลิก'}
                            </button>
                            {!isViewMode && (
                                <button
                                    type='submit'
                                    className='btn btn-primary fw-bold px-8'
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true'></span>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>
                                            <i className='bi bi-check-lg me-2 fs-4'></i> {isEditMode ? 'บันทึกการแก้ไข' : 'บันทึก'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </Content>
    );
};

export default AddEditViewMonthlyOperation;
