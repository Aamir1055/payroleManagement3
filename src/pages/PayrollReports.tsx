import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import axios from '../api/axios';
import moment from 'moment';

interface PayrollEntry {
  employeeId: string;
  name: string;
  email: string;
  officeName: string;
  positionTitle: string;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  absentDays: number;
  excessLeaves: number;
  baseSalary: number;
  perDaySalary: number;
  totalDeductions: number;
  netSalary: number;
}

interface Summary {
  totalEmployees: number;
  totalNetSalary: string;
  totalDeductions: string;
  netPayroll: string;
  workingDays: number;
}

interface Office {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
}

const PayrollReports: React.FC = () => {
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [calendarDays, setCalendarDays] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [officeId, setOfficeId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noData, setNoData] = useState(false);
  // NEW STATE: For delete operations
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isInitial = useRef(true);

  const pageSizes = [10, 30, 50, 70, 100, 150, 200, 300, 400, 500];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDropdowns = async () => {
    try {
      const [officeRes, positionRes] = await Promise.all([
        axios.get('/api/payroll/offices'),
        axios.get('/api/payroll/positions')
      ]);
      setOffices(officeRes.data.data);
      setPositions(positionRes.data.data);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchMonthAttendanceDays = async (yearMonth: string) => {
    setCalendarLoading(true);
    const [y, m] = yearMonth.split('-');
    try {
      const res = await axios.get('/api/payroll/attendance-days', {
        params: { year: y, month: m }
      });
      setCalendarDays(res.data.days || []);
    } catch {
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthAttendanceDays(selectedMonth);
  }, [selectedMonth]);

  const fetchPayrollReports = async () => {
    setLoading(true);
    setError('');
    setNoData(false);
    try {
      const fromDate = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
      const toDate = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
      const params: any = { fromDate, toDate, page, pageSize };
      if (officeId) params.office = officeId;
      if (positionId) params.position = positionId;
      const res = await axios.get('/api/payroll/reports', { params });
      setPayrollData(res.data.data);
      setSummary(res.data.summary);
      if (res.data.data.length === 0) {
        setNoData(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // NEW FUNCTION: Delete all attendance data for selected month
  const deleteMonthAttendance = async () => {
    const [year, month] = selectedMonth.split('-');
    const monthName = moment(selectedMonth).format('MMMM YYYY');
    
    const confirmMessage = `🚨 EXTREME WARNING: This will permanently delete ALL attendance data for ${monthName} for ALL employees!\n\nThis action:\n- Cannot be undone\n- Will remove all punch-in/punch-out records\n- Will delete payroll calculations\n- Affects all employees in your system\n\nType "DELETE ${monthName.toUpperCase()}" in the next prompt to confirm this destructive action.`;
    
    if (window.confirm(confirmMessage)) {
      const finalConfirm = window.prompt(
        `Type "DELETE ${monthName.toUpperCase()}" (without quotes) to confirm you want to delete all attendance data for ${monthName}:`
      );
      
      if (finalConfirm === `DELETE ${monthName.toUpperCase()}`) {
        setDeleteLoading(true);
        setError('');
        
        try {
          const response = await axios.delete('/api/payroll/attendance/month', {
            data: {
              year: parseInt(year),
              month: parseInt(month)
            }
          });
          
          if (response.data.success) {
            // Clear current data
            setPayrollData([]);
            setSummary(null);
            setCalendarDays([]);
            setNoData(true);
            
            // Show success message
            alert(`✅ Successfully deleted all attendance data for ${monthName}\n\nDeleted ${response.data.deletedRecords} attendance records.`);
          } else {
            setError(response.data.error || 'Failed to delete attendance data');
          }
        } catch (error: any) {
          console.error('Error deleting month attendance:', error);
          setError(error.response?.data?.error || 'Failed to delete attendance data');
        } finally {
          setDeleteLoading(false);
        }
      } else {
        alert('Confirmation text did not match. Operation cancelled for safety.');
      }
    }
  };

  const buildQS = () => {
    const qs = new URLSearchParams();
    const fromDate = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
    const toDate = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    if (officeId) qs.set('office', officeId);
    if (positionId) qs.set('position', positionId);
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    return qs.toString();
  };

  const handleEmployeeClick = (employee: PayrollEntry) => {
    const qs = buildQS();
    navigate(`/employee/${employee.employeeId}?${qs}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fromDate')) {
      const selectedMonth = params.get('fromDate')?.substring(0, 7);
      setSelectedMonth(selectedMonth || moment().format('YYYY-MM'));
    }
    if (params.get('office')) setOfficeId(params.get('office')!);
    if (params.get('position')) setPositionId(params.get('position')!);
    if (params.get('pageSize')) setPageSize(Number(params.get('pageSize')));
    if (params.get('page')) setPage(Number(params.get('page')));
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (payrollData.length === 0 && calendarDays.length === 0) {
      setNoData(true);
    } else {
      setNoData(false);
    }
  }, [payrollData, calendarDays]);

  useEffect(() => {
    const qs = buildQS();
    window.history.replaceState(null, '', qs ? `?${qs}` : undefined);
  }, [selectedMonth, officeId, positionId, page, pageSize]);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    fetchPayrollReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  return (
    <MainLayout title="Payroll Reports" subtitle="View and manage employee payroll reports">
      <div className="space-y-8">

        {/* FILTERS */}
        <div className="bg-white ring-1 ring-blue-100 rounded-2xl shadow-sm px-6 py-5 mb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-full p-2">
              {/* Filter icon */}
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Filter & Search</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                  setPayrollData([]);
                  setSummary(null);
                }}
                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-blue-50 focus:ring-blue-400 focus:border-blue-500 shadow-sm"
              />
            </div>
            {/* Office */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Office</label>
              <select
                value={officeId}
                onChange={e => { setPage(1); setOfficeId(e.target.value); }}
                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-green-50 focus:ring-green-300 focus:border-green-500 shadow-sm"
              >
                <option value="">All Offices</option>
                {offices.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            {/* Position */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
              <select
                value={positionId}
                onChange={e => { setPage(1); setPositionId(e.target.value); }}
                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-purple-50 focus:ring-purple-300 focus:border-purple-500 shadow-sm"
              >
                <option value="">All Positions</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            {/* Generate */}
            <div className="flex items-end">
              <button
                onClick={fetchPayrollReports}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 rounded-md transition-all shadow disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* NEW: DANGER ZONE - Delete Month Data */}
          {(payrollData.length > 0 || calendarDays.length > 0) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-600 rounded-full p-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-800">🚨 DANGER ZONE</h3>
                    <p className="text-sm text-red-700">
                      Delete all attendance data for {moment(selectedMonth).format('MMMM YYYY')} - This action cannot be undone!
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={deleteMonthAttendance}
                  disabled={deleteLoading || loading}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      🗑️ DELETE ALL DATA FOR {moment(selectedMonth).format('MMM YYYY').toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INFO/STATUS */}
        {loading && (
          <div className="p-4 rounded-md bg-blue-50 border border-blue-100 text-blue-800 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading payroll reports...
          </div>
        )}

        {deleteLoading && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            🗑️ Deleting attendance data for {moment(selectedMonth).format('MMMM YYYY')}...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {noData && (
          <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            No attendance uploaded for {selectedMonth}
          </div>
        )}

        {/* Rest of your existing code remains the same... */}
        {/* SUMMARY CARDS */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Monthly Salary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow p-6 border border-green-100 flex items-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-green-700 mb-1">Total Salary</p>
                <h2 className="text-2xl font-extrabold text-green-800 mb-1">
                  AED {(payrollData.reduce((sum, emp) => sum + emp.baseSalary, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                
              </div>
              <span className="ml-4 bg-green-100 rounded-full p-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </span>
            </div>
            {/* Deductions */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow p-6 border border-red-100 flex items-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-red-700 mb-1">Total Deductions</p>
                <h2 className="text-2xl font-extrabold text-red-800 mb-1">
                  AED {Number(summary.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-xs text-red-600">Working days: {summary.workingDays}</p>
              </div>
              <span className="ml-4 bg-red-100 rounded-full p-4">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </span>
            </div>
            {/* Net Payroll */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow p-6 border border-blue-100 flex items-center">
              <div className="flex-1">
                <p className="text-lg font-bold text-blue-700 mb-1">Net Payroll</p>
                <h2 className="text-2xl font-extrabold text-blue-800 mb-1">
                  AED {Number(summary.totalNetSalary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-xs text-blue-600">After deductions</p>
              </div>
              <span className="ml-4 bg-blue-100 rounded-full p-4">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            </div>
          </div>
        )}

        {/* TABLE - Rest of your existing table code remains exactly the same */}
        {!noData && payrollData.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <h3 className="text-lg font-bold text-gray-800">Employee Payroll Data</h3>
              </div>
              
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-blue-100 sticky top-0 z-10 rounded-t-xl">
                  <tr>
                    <th className="py-3 px-4 font-bold text-gray-600 text-left">#</th>
                    <th className="py-3 px-4 font-bold text-blue-700 text-left">Emp ID</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Present</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Late</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Absent</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Half</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Excess</th>
                    <th className="py-3 px-4 font-bold text-green-700 text-center">Base</th>
                    <th className="py-3 px-4 font-bold text-red-700 text-center">Deduct</th>
                    <th className="py-3 px-4 font-bold text-blue-700 text-center">Net</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payrollData.map((emp, i) => (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-blue-50 cursor-pointer transition"
                      onClick={() => handleEmployeeClick(emp)}
                    >
                      <td className="py-3 px-4 text-gray-500 font-semibold">{(page - 1) * pageSize + i + 1}</td>
                      <td className="py-3 px-4 text-blue-800 font-mono font-bold">{emp.employeeId}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded px-2 bg-green-100 text-green-800 text-xs font-bold">{emp.presentDays}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded px-2 bg-yellow-100 text-yellow-900 text-xs font-bold">{emp.lateDays}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded px-2 bg-red-100 text-red-800 text-xs font-bold">{emp.absentDays}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded px-2 bg-orange-100 text-orange-800 text-xs font-bold">{emp.halfDays}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded px-2 bg-purple-100 text-purple-800 text-xs font-bold">{emp.excessLeaves}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-green-700 font-bold">
                        AED {emp.baseSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center text-red-600 font-semibold">
                        AED {emp.totalDeductions.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-700 font-extrabold">
                        AED {emp.netSalary.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full shadow-sm transition"
                          onClick={e => { e.stopPropagation(); handleEmployeeClick(emp); }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* PAGINATION */}
            <div className="flex flex-wrap items-center justify-between px-6 py-3 border-t bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="text-gray-600 text-sm">
                Showing <span className="font-bold">{summary ? (page - 1) * pageSize + 1 : 0}</span>–<span className="font-bold">{summary ? (page - 1) * pageSize + payrollData.length : 0}</span> of <span className="font-bold">{summary ? summary.totalEmployees : 0}</span> employees
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-1.5 rounded bg-white border border-gray-200 hover:bg-blue-100 text-gray-700 font-semibold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="bg-white rounded px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium">
                  Page {page} of {summary ? Math.max(1, Math.ceil(summary.totalEmployees / pageSize)) : 1}
                </span>
                <button
                  className="px-4 py-1.5 rounded bg-white border border-gray-200 hover:bg-blue-100 text-gray-700 font-semibold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!summary || page >= Math.ceil(summary.totalEmployees / pageSize)}
                >
                  Next
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(+e.target.value);
                    setPage(1);
                  }}
                  className="ml-2 px-2 py-1.5 rounded border border-gray-200 bg-white text-xs font-medium text-gray-700"
                >
                  {pageSizes.map((ps) => (
                    <option key={ps} value={ps}>
                      {ps}/page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PayrollReports;
