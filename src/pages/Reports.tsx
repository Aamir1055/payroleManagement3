import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const getDefaultMonth = () => {
  const now = new Date();
  return { month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()) };
};

export const Reports: React.FC = () => {
  const [{ month, year }, setDate] = useState(getDefaultMonth());
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const fetchReport = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/reports/report?month=${month}&year=${year}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(data.message || 'No data found');
      setReport(data);
    } catch (e: any) {
      setErr(e.message || 'Failed to fetch report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const openEmployeeDetail = (employeeId: string) => {
    navigate(`/reports/employee/${employeeId}?month=${month}&year=${year}`);
  };

  const totalEmployees = report.length;
  const totalDeductions = report.reduce((sum, r) => sum + parseFloat(r.deductions || 0), 0);
  const totalNetSalary = report.reduce((sum, r) => sum + parseFloat(r.netSalary || 0), 0);
  const averageAttendance = report.length > 0
    ? report.reduce((sum, r) => sum + parseInt(r.presentDays || 0), 0) / report.length
    : 0;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 bg-white rounded-xl shadow mt-6">
      <h2 className="text-3xl font-bold text-blue-800 mb-6">Payroll Report</h2>

      <div className="flex flex-wrap gap-4 mb-8 items-end">
        <div>
          <label className="text-sm font-medium text-blue-700 mb-1 block">Month</label>
          <select
            value={month}
            onChange={e => setDate(d => ({ ...d, month: e.target.value }))}
            className="px-4 py-2 border border-blue-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-blue-700 mb-1 block">Year</label>
          <select
            value={year}
            onChange={e => setDate(d => ({ ...d, year: e.target.value }))}
            className="px-4 py-2 border border-blue-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {err && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{err}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard title="Total Deductions" value={`₹${totalDeductions.toFixed(2)}`} icon="📟" />
        <SummaryCard title="Total Net Salary" value={`₹${totalNetSalary.toFixed(2)}`} icon="💰" />
        <SummaryCard title="Avg. Attendance" value={`${Math.round(averageAttendance)} Days`} icon="📈" />
        <SummaryCard title="Employees" value={totalEmployees} icon="👥" />
      </div>

      <div className="overflow-x-auto rounded border border-blue-100">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Office</th>
              <th className="p-2 border">Position</th>
              <th className="p-2 border">Salary</th>
              <th className="p-2 border">Present</th>
              <th className="p-2 border">Late</th>
              <th className="p-2 border">Absent</th>
              <th className="p-2 border">Halfdays</th>
              <th className="p-2 border">Leaves</th>
              <th className="p-2 border">Deductions</th>
              <th className="p-2 border">Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {report.map(emp => (
              <tr
                key={emp.employeeId}
                onClick={() => openEmployeeDetail(emp.employeeId)}
                className="cursor-pointer hover:bg-blue-50 transition"
              >
                <td className="p-2 border">{emp.employeeId}</td>
                <td className="p-2 border">{emp.name}</td>
                <td className="p-2 border">{emp.office}</td>
                <td className="p-2 border">{emp.position}</td>
                <td className="p-2 border">{emp.monthlySalary}</td>
                <td className="p-2 border">{emp.presentDays}</td>
                <td className="p-2 border">{emp.lateDays}</td>
                <td className="p-2 border">{emp.absentDays}</td>
                <td className="p-2 border">{emp.halfDays}</td>
                <td className="p-2 border">{emp.leaves}</td>
                <td className="p-2 border">{emp.deductions}</td>
                <td className="p-2 border">{emp.netSalary}</td>
              </tr>
            ))}
            {!loading && report.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-gray-500 py-4">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon }: { title: string; value: any; icon: string }) => (
  <div className="p-5 bg-blue-50 rounded-xl shadow hover:shadow-md transition duration-200 border border-blue-100">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-sm text-blue-600 font-semibold">{title}</div>
    <div className="text-xl font-bold text-blue-900">{value}</div>
  </div>
);