import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import axios from '../api/axios';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface DailyRow {
  employeeId: string;
  date: string;
  punch_in: string;
  punch_out: string;
  workingHours: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  excessLeaves: number;
}
interface Employee {
  employeeId: string;
  name: string;
  email: string;
  monthlySalary: number;
}
interface AttendanceRow {
  employee_id: string;
  date: string;
  punch_in: string;
  punch_out: string;
}

const EmployeePayrollDetails: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [workingDays, setWorkingDays] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  // NEW STATE: For delete operations
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [modalAttendance, setModalAttendance] = useState<AttendanceRow | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalNotification, setModalNotification] = useState('');

  // Fetch payroll details for employee & period
  const fetchDetails = async (monthYear?: string) => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      const useMonthYear = monthYear || selectedMonth;
      if (useMonthYear) {
        const fromDate = `${useMonthYear}-01`;
        const lastDay = moment(useMonthYear, 'YYYY-MM').daysInMonth();
        const toDate = `${useMonthYear}-${lastDay.toString().padStart(2, '0')}`;
        params.fromDate = fromDate;
        params.toDate = toDate;
      }
      const { data } = await axios.get(`/payroll/employee/${employeeId}`, { params });
      setEmployee(data.employee);

      // Calculate working hours for each row
      const rowsWithWorkingHours = (data.dailyRows || []).map((row: any) => {
        let workingHours = 0;
        if (row.punch_in && row.punch_out) {
          const punchIn = moment(row.punch_in, 'HH:mm:ss');
          const punchOut = moment(row.punch_out, 'HH:mm:ss');
          const duration = moment.duration(punchOut.diff(punchIn));
          workingHours = parseFloat(duration.asHours().toFixed(2));
        }
        return { ...row, workingHours };
      });

      setDailyRows(rowsWithWorkingHours);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch working days for month and year
  const fetchWorkingDays = async (monthYear?: string) => {
    setCalendarLoading(true);
    try {
      const useMonthYear = monthYear || selectedMonth;
      if (useMonthYear) {
        const [year, month] = useMonthYear.split('-');
        const res = await axios.get(`/api/holidays/working-days?month=${month}&year=${year}`);
        const workingDaysCount = res.data.workingDays;
        if (workingDaysCount && workingDaysCount > 0) {
          setWorkingDays(workingDaysCount);
        } else {
          throw new Error('Invalid working days count: ' + workingDaysCount);
        }
      }
    } catch {
      setWorkingDays(26); // fallback default
    } finally {
      setCalendarLoading(false);
    }
  };

  // NEW FUNCTION: Delete employee attendance data for selected month
  const deleteEmployeeMonthData = async () => {
    if (!employeeId || !selectedMonth || !employee) return;
    
    const [year, month] = selectedMonth.split('-');
    const monthName = moment(selectedMonth).format('MMMM YYYY');
    
    const confirmMessage = `🚨 WARNING: This will permanently delete ALL attendance data for employee "${employee.name}" (${employeeId}) in ${monthName}!\n\nThis action:\n- Cannot be undone\n- Will remove all punch-in/punch-out records\n- Will delete payroll calculations\n- Only affects this specific employee\n\nType "DELETE ${employee.name.toUpperCase()}" in the next prompt to confirm.`;
    
    if (window.confirm(confirmMessage)) {
      const finalConfirm = window.prompt(
        `Type "DELETE ${employee.name.toUpperCase()}" (without quotes) to confirm you want to delete all attendance data for ${employee.name} in ${monthName}:`
      );
      
      if (finalConfirm === `DELETE ${employee.name.toUpperCase()}`) {
        setDeleteLoading(true);
        setError('');
        
        try {
          const response = await axios.delete('/attendance/employee-month', {
            data: {
              employeeId,
              year: parseInt(year),
              month: parseInt(month)
            }
          });
          
          if (response.data.success) {
            // Clear current data
            setDailyRows([]);
            
            // Show success message
            alert(`✅ Successfully deleted all attendance data for ${employee.name} in ${monthName}\n\nDeleted ${response.data.deletedRecords} attendance records.`);
            
            // Optionally navigate back to reports or refresh
            // navigate(-1); // Uncomment if you want to go back to reports
          } else {
            setError(response.data.error || 'Failed to delete employee attendance data');
          }
        } catch (error: any) {
          console.error('Error deleting employee attendance:', error);
          setError(error.response?.data?.error || 'Failed to delete employee attendance data');
        } finally {
          setDeleteLoading(false);
        }
      } else {
        alert('Confirmation text did not match. Operation cancelled for safety.');
      }
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchDetails(selectedMonth);
      fetchWorkingDays(selectedMonth);
    }
    // eslint-disable-next-line
  }, [selectedMonth]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fromDateParam = p.get('fromDate');
    if (fromDateParam) {
      const date = moment(fromDateParam);
      setSelectedMonth(date.format('YYYY-MM'));
    } else {
      setSelectedMonth(moment().format('YYYY-MM'));
    }
    // eslint-disable-next-line
  }, [employeeId]);

  // Modal handlers
  const openAddModal = () => {
    setModalMode('add');
    const defaultDate = selectedMonth ? `${selectedMonth}-01` : moment().format('YYYY-MM-DD');
    setModalAttendance({
      employee_id: employeeId!,
      date: defaultDate,
      punch_in: '',
      punch_out: '',
    });
    setModalOpen(true);
    setModalNotification('');
    setModalLoading(false);
    setModalError('');
  };

  const openEditModal = async (empId: string, date: string) => {
    setModalMode('edit');
    setModalLoading(true);
    setModalError('');
    setModalOpen(true);
    setModalNotification('');
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const { data } = await axios.get(`/attendance/${empId}/${formattedDate}`);
      setModalAttendance(data);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to load attendance');
      setModalAttendance({
        employee_id: empId,
        date: moment(date).format('YYYY-MM-DD'),
        punch_in: '',
        punch_out: '',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalChange = (field: 'date' | 'punch_in' | 'punch_out', value: string) => {
    setModalAttendance((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleModalAdd = async () => {
    if (!modalAttendance) return;
    setModalError('');
    setModalLoading(true);
    setModalNotification('');
    try {
      const { employee_id, date, punch_in, punch_out } = modalAttendance;
      if (!date || !punch_in || !punch_out) {
        setModalError('All fields are required');
        setModalLoading(false);
        return;
      }
      await axios.post(`/attendance`, {
        employee_id,
        date: moment(date).format('YYYY-MM-DD'),
        punch_in,
        punch_out,
      });
      setModalNotification('Attendance added successfully!');
      setTimeout(() => {
        setModalOpen(false);
        setModalNotification('');
        fetchDetails();
      }, 1300);
    } catch (err: any) {
      setModalNotification(err.response?.data?.message || 'Add failed');
      setModalError(err.response?.data?.message || 'Add failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalUpdate = async () => {
    if (!modalAttendance) return;
    setModalError('');
    setModalLoading(true);
    setModalNotification('');
    try {
      await axios.put(
        `/attendance/${modalAttendance.employee_id}/${moment(modalAttendance.date).format('YYYY-MM-DD')}`,
        {
          punch_in: modalAttendance.punch_in,
          punch_out: modalAttendance.punch_out,
        }
      );
      setModalNotification('Updated successfully');
      setTimeout(() => {
        setModalOpen(false);
        setModalNotification('');
        fetchDetails();
      }, 1300);
    } catch {
      setModalNotification('Update failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalDelete = async () => {
    if (!modalAttendance) return;
    if (!window.confirm('Are you sure? This will permanently delete the attendance for this date.')) return;
    setModalNotification('');
    try {
      const formattedDate = moment(modalAttendance.date).format('YYYY-MM-DD');
      await axios.delete(`/attendance/${modalAttendance.employee_id}/${formattedDate}`);
      setModalNotification('Deleted successfully');
      setTimeout(() => {
        setModalOpen(false);
        setModalNotification('');
        fetchDetails();
      }, 1300);
    } catch {
      setModalNotification('Delete failed');
    }
  };

  if (loading || calendarLoading)
    return (
      <MainLayout title="Loading…">
        <div className="text-center text-lg text-gray-600 py-12 animate-pulse">Loading…</div>
      </MainLayout>
    );
  if (error)
    return (
      <MainLayout title="Error">
        <div className="text-red-600 text-center text-lg py-12">{error}</div>
      </MainLayout>
    );
  if (!employee) return <MainLayout title="Not Found">Employee not found.</MainLayout>;

  const perDaySalary = employee.monthlySalary / workingDays;
  const attendanceDataCount = dailyRows.length;
  const missingDataCount = workingDays - attendanceDataCount;
  const actualAbsentDays = dailyRows.reduce((t, r) => t + r.absentDays, 0);
  const totalHalfDays = dailyRows.reduce((t, r) => t + r.halfDays, 0);
  const totalAbsentDays = actualAbsentDays + missingDataCount;
  const actualDataDeductions = dailyRows.reduce((t, r) => t + (r.absentDays + r.halfDays * 0.5) * perDaySalary, 0);
  const missingDaysDeductions = missingDataCount * perDaySalary;
  const excessLeave = dailyRows.reduce((t, r) => t + (r.excessLeaves || 0), 0);
  const excessLeaveDeductions = 2 * excessLeave * perDaySalary;
  
  // Calculate total deductions but cap it at monthly salary to prevent negative net salary
  const calculatedDeductions = actualDataDeductions + missingDaysDeductions + excessLeaveDeductions;
  const totalDeductions = Math.min(calculatedDeductions, employee.monthlySalary);
  const totalNetSalary = employee.monthlySalary - totalDeductions;
  
  // Track if deductions were capped
  const deductionsCapped = calculatedDeductions > employee.monthlySalary;

  return (
    <MainLayout title={`${employee.name}`} subtitle={`ID: ${employee.employeeId}`}>
      <div className="space-y-8 p-4">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-700 rounded hover:bg-blue-200 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Back to Payroll Reports"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-semibold text-sm">Back to Reports</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-1.5 font-semibold bg-green-500 text-white rounded hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Attendance
            </button>
            <button
              onClick={() => {
                if (dailyRows.length === 0) return;
                const exportData = dailyRows.map(row => ({
                  Date: moment(row.date).format('YYYY-MM-DD'),
                  'Punch In': row.punch_in,
                  'Punch Out': row.punch_out,
                  'Working Hours': row.workingHours,
                  'Present Days': row.presentDays,
                  'Late Days': row.lateDays,
                  'Half Days': row.halfDays,
                  'Absent Days': row.absentDays,
                  'Excess Leaves': row.excessLeaves
                }));
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Attendance");
                const xlsbData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
                saveAs(new Blob([xlsbData], { type: "application/octet-stream" }), `${employee?.name}_Attendance_${selectedMonth}.xlsx`);
              }}
              disabled={dailyRows.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Export to Excel
            </button>
          </div>
        </div>

        {/* Filter Period */}
        <div className="flex items-center gap-4 p-4 bg-white border rounded-md shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-700">Filter by Month</h3>
            <p className="text-gray-600 text-sm">See attendance for selected period</p>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* NEW: DANGER ZONE - Delete Employee Month Data */}
        {dailyRows.length > 0 && selectedMonth && employee && (
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
                  Delete all attendance data for {employee.name} in {moment(selectedMonth).format('MMMM YYYY')} - This action cannot be undone!
                </p>
              </div>
            </div>
            
            <button
              onClick={deleteEmployeeMonthData}
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
        )}

        {/* Delete Loading State */}
        {deleteLoading && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            🗑️ Deleting attendance data for {employee.name} in {moment(selectedMonth).format('MMMM YYYY')}...
          </div>
        )}

        {/* Salary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md bg-green-50 p-4 border border-green-200 hover:shadow-sm transition">
            <div className="text-sm text-green-600 font-semibold mb-0.5">Monthly Gross Salary</div>
            <div className="text-2xl font-bold text-green-700">AED {employee.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-green-500 mt-1">Before deductions</div>
          </div>
          <div className="rounded-md bg-red-50 p-4 border border-red-200 hover:shadow-sm transition">
            <div className="text-sm text-red-600 font-semibold mb-0.5">Total Deductions</div>
            <div className="text-2xl font-bold text-red-700">AED {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-red-500 mt-1">
              Working days:{' '}
              <span className="ml-1 inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">{workingDays}</span>
            </div>
          </div>
          <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200 hover:shadow-sm transition">
            <div className="text-sm text-indigo-600 font-semibold mb-0.5">Net Salary</div>
            <div className="text-2xl font-bold text-indigo-700">AED {totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Rest of your existing code remains the same... */}
        {/* Daily Attendance */}
        <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm max-h-[550px] overflow-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b border-gray-300 pb-2">
            Daily Attendance
          </h3>

          {dailyRows.length === 0 ? (
            <p className="text-center text-gray-500 italic py-16">No attendance records found.</p>
          ) : (
            <div className="flex flex-col space-y-3">
              {dailyRows.map((row) => (
                <div
                  key={row.date}
                  className="border rounded-md p-3 hover:shadow-md transition-shadow cursor-pointer select-none"
                  onClick={() => openEditModal(row.employeeId, row.date)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openEditModal(row.employeeId, row.date);
                  }}
                  aria-label={`View attendance for ${moment(row.date).format('YYYY-MM-DD')}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-base truncate">
                        {moment(row.date).format('YYYY-MM-DD')}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-7 gap-x-3 text-center text-xs md:text-sm w-full md:w-auto flex-1 md:flex-none">
                      <div>
                        <div className="font-semibold text-blue-600">Working Hours</div>
                        <div className="mt-0.5 font-semibold text-blue-800">{row.workingHours ? `${row.workingHours} h` : '0'}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">Present</div>
                        <div className="mt-0.5 font-semibold text-green-800">{row.presentDays}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-600">Late</div>
                        <div className="mt-0.5 font-semibold text-yellow-800">{row.lateDays}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-indigo-600">Half Days</div>
                        <div className="mt-0.5 font-semibold text-indigo-800">{row.halfDays}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-red-600">Absent</div>
                        <div className="mt-0.5 font-semibold text-red-800">{row.absentDays}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-pink-600">Excess Leave</div>
                        <div className="mt-0.5 font-semibold text-pink-800">{row.excessLeaves}</div>
                      </div>
                      <button
                        className="text-blue-600 hover:text-blue-800 font-semibold md:hidden underline underline-offset-2 text-xs"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(row.employeeId, row.date);
                        }}
                        aria-label={`Edit attendance for ${moment(row.date).format('YYYY-MM-DD')}`}
                      >
                        Edit
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(row.employeeId, row.date);
                      }}
                      className="hidden md:inline-block text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded ring-1 ring-blue-300 hover:ring-blue-500 transition text-sm"
                      aria-label={`Edit attendance for ${moment(row.date).format('YYYY-MM-DD')}`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal - Rest of your existing modal code remains the same */}
        {modalOpen && (
          <div className="fixed z-50 inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-blue-700">{modalMode === 'add' ? 'Add Attendance' : 'Edit Attendance'}</h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setModalNotification('');
                  }}
                  className="text-gray-400 hover:text-blue-600 text-2xl leading-none focus:outline-none"
                  aria-label="Close Modal"
                >
                  &times;
                </button>
              </div>

              {modalNotification && (
                <div
                  className={`mb-4 px-3 py-2 rounded text-center font-medium border ${
                    modalNotification.toLowerCase().includes('success')
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}
                  role="alert"
                  aria-live="assertive"
                >
                  {modalNotification}
                </div>
              )}

              {modalLoading ? (
                <div className="flex items-center justify-center py-6 animate-pulse">
                  <span className="w-6 h-6 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></span>
                  <span className="ml-3 text-gray-600">Loading...</span>
                </div>
              ) : modalError ? (
                <div className="text-center text-red-600 py-2">{modalError}</div>
              ) : modalAttendance && (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    modalMode === 'add' ? handleModalAdd() : handleModalUpdate();
                  }}
                >
                  <div>
                    <label htmlFor="modalDate" className="block font-medium text-gray-700 mb-1 text-sm">
                      Date
                    </label>
                    <input
                      id="modalDate"
                      type="date"
                      className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={modalAttendance?.date ? moment(modalAttendance.date).format('YYYY-MM-DD') : ''}
                      onChange={(e) => handleModalChange('date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="modalPunchIn" className="block font-medium text-gray-700 mb-1 text-sm">
                      Punch In
                    </label>
                    <input
                      id="modalPunchIn"
                      type="time"
                      className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={modalAttendance.punch_in || ''}
                      onChange={(e) => handleModalChange('punch_in', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="modalPunchOut" className="block font-medium text-gray-700 mb-1 text-sm">
                      Punch Out
                    </label>
                    <input
                      id="modalPunchOut"
                      type="time"
                      className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={modalAttendance.punch_out || ''}
                      onChange={(e) => handleModalChange('punch_out', e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={handleModalDelete}
                      className={`flex-1 px-4 py-2 rounded-md font-semibold transition ${
                        modalMode === 'add'
                          ? 'bg-red-200 text-red-400 cursor-not-allowed'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                      disabled={modalLoading || modalMode === 'add'}
                    >
                      Delete
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 px-4 py-2 font-bold text-white rounded-md transition ${
                        modalMode === 'add'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={modalLoading}
                    >
                      {modalMode === 'add' ? 'Add' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EmployeePayrollDetails;
