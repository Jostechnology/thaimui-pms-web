import React, { useState, useEffect } from 'react';
import { Content } from '../../../../_metronic/layout/components/content';
import { useNavigate } from 'react-router-dom';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useAlertModal } from '../../../context/ModalContext';
import { getComponentTemplates, deleteComponentTemplate } from '../../../services/componentTemplateService';
import TablePaginator from '../../../custom_components/TablePaginator';
import Swal from 'sweetalert2';
import type { ComponentTemplate, TemplateSection } from '../../../type_interface/ComponentTemplateType';

const TemplateManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading, setUnLoading } = useAppLoading();
  const { alertMessage } = useAlertModal();

  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageConfig] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(false);

  const fetchTemplates = async () => {
    setDataLoading(true);
    setLoading();
    try {
      const result = await getComponentTemplates(currentPage, pageConfig, searchTerm);
      if (result && result.success) {
        setTemplates(result.data?.items || []);
        setTotalPages(result.pagination?.pages ?? 0);
      } else {
        setTemplates([]);
        setTotalPages(0);
      }
    } catch (error) {
      console.error(error);
      alertMessage("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setUnLoading();
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, searchTerm, pageConfig]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(keyword);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [keyword]);

  const handleDelete = async (templateId: number, templateName: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      html: `คุณต้องการลบ Template <b>"${templateName}"</b> หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (result.isConfirmed) {
      setLoading();
      try {
        const res = await deleteComponentTemplate(templateId);
        if (res && res.success) {
          Swal.fire({ title: 'ลบสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
          fetchTemplates();
        } else {
          Swal.fire('เกิดข้อผิดพลาด', res?.message || 'ไม่สามารถลบ Template ได้', 'error');
        }
      } catch {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อ API ได้', 'error');
      } finally {
        setUnLoading();
      }
    }
  };

  const getSectionSummary = (sections: TemplateSection[]) => {
    if (!sections || !Array.isArray(sections)) return '-';
    const types = sections.map(s => s.type).filter(Boolean);
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.length > 0 ? `${sections.length} sections (${uniqueTypes.join(', ')})` : '-';
  };

  return (
    <Content>
      {/* Header */}
      <div className='d-flex flex-stack mb-8'>
        <div className='d-flex flex-column'>
          <h1 className='text-gray-900 fw-bold fs-2qx mb-1'>
            จัดการ Template
          </h1>
          <span className='text-muted fw-semibold fs-7'>จัดการ Template สำหรับ Item Component</span>
        </div>
        <button
          className='btn btn-primary fw-bold px-6'
          onClick={() => navigate('/workorder/template_builder')}
        >
          <i className='bi bi-plus-lg me-2'></i>
          สร้าง Template ใหม่
        </button>
      </div>

      {/* Search */}
      <div className='card shadow-sm mb-6'>
        <div className='card-body py-4'>
          <div className='d-flex align-items-center'>
            <i className='bi bi-search text-muted fs-4 me-3'></i>
            <input
              type='text'
              className='form-control form-control-lg border-0'
              placeholder='ค้นหา Template ตามชื่อ...'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='card shadow-sm'>
        <div className='card-body p-0'>
          <div className='table-responsive'>
            <table className='table table-row-dashed table-row-gray-300 align-middle gs-4 gy-4 mb-0'>
              <thead>
                <tr className='fw-bold text-muted bg-light'>
                  <th className='ps-6 rounded-start' style={{ width: '60px' }}>#</th>
                  <th style={{ minWidth: '200px' }}>ชื่อ Template</th>
                  <th style={{ minWidth: '250px' }}>รายละเอียด Sections</th>
                  <th style={{ width: '150px' }}>สร้างโดย</th>
                  <th style={{ width: '160px' }}>วันที่สร้าง</th>
                  <th style={{ width: '160px' }}>วันที่แก้ไข</th>
                  <th className='pe-6 rounded-end text-center' style={{ width: '150px' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan={7} className='text-center py-10'>
                      <div className='spinner-border text-primary' role='status'>
                        <span className='visually-hidden'>Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='text-center py-10 text-muted fs-6'>
                      <i className='bi bi-inbox fs-1 d-block mb-3'></i>
                      ไม่พบข้อมูล Template
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl, idx) => (
                    <tr key={tpl.component_template_id}>
                      <td className='ps-6 text-muted fw-semibold'>
                        {(currentPage - 1) * pageConfig + idx + 1}
                      </td>
                      <td>
                        <span className='text-gray-900 fw-bold fs-6'>{tpl.name}</span>
                      </td>
                      <td>
                        <span className='text-muted fs-7'>{getSectionSummary(tpl.sections)}</span>
                      </td>
                      <td>
                        <span className='text-gray-700 fs-7'>{tpl.created_by || '-'}</span>
                      </td>
                      <td>
                        <span className='text-gray-600 fs-7'>
                          {tpl.created_date
                            ? new Date(tpl.created_date).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <span className='text-gray-600 fs-7'>
                          {tpl.updated_date
                            ? new Date(tpl.updated_date).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                            : '-'}
                        </span>
                      </td>
                      <td className='pe-6'>
                        <div className='d-flex justify-content-center gap-2'>
                          <button
                            className='btn btn-sm btn-icon btn-light-primary'
                            title='แก้ไข'
                            onClick={() => navigate(`/workorder/template_builder/${tpl.component_template_id}`)}
                          >
                            <i className='bi bi-pencil-square'></i>
                          </button>
                          <button
                            className='btn btn-sm btn-icon btn-light-danger'
                            title='ลบ'
                            onClick={() => handleDelete(tpl.component_template_id, tpl.name)}
                          >
                            <i className='bi bi-trash'></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className='card-footer py-4'>
            <TablePaginator
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>
    </Content>
  );
};

export default TemplateManagement;