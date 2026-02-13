import React, { useEffect, useMemo, useState } from 'react';
import { getEmployeeList } from '../../../services/employee';
import { Employee } from '../../../type_interface/EmployeeType';


const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const perPage = 10;

  const fetch = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmployeeList(search);
      // expected: { data: { items: [...] }, success: true }
      if (res && res.success) {
        const items = res.data?.items || [];
        setEmployees(items);
      } else {
        setEmployees([]);
        setError('ไม่สามารถโหลดข้อมูลพนักงานได้');
      }
    } catch (e) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const fullName = `${e.employee_first_name} ${e.employee_last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (e.citizen_id || '').toLowerCase().includes(q) ||
        (e.status || '').toLowerCase().includes(q)
      );
    });
  }, [employees, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="card p-4">
      <h3>Employee List</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="ค้นหา ชื่อ, เลขบัตร, สถานะ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={() => { setQuery(''); fetch(); }}>Reset</button>
        <button onClick={() => fetch(query)} disabled={loading} style={{ marginLeft: 8 }}>Refresh</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <>
          <table className="table table-borderless table-hover">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>ชื่อ</th>
                <th>สถานะ</th>
                <th>user_id</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4}>No employees found.</td>
                </tr>
              )}
              {visible.map((e) => (
                <tr key={e.employee_id}>
                  <td>{e.employee_id}</td>
                  <td>{e.employee_first_name} {e.employee_last_name}</td>
                  <td>{e.status}</td>
                  <td>{e.user_id}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>Showing {visible.length} of {filtered.length}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <div style={{ padding: '4px 8px' }}>{page} / {totalPages}</div>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeList;
