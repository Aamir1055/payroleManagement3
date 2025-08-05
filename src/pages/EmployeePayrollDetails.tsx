import React, { useEffect, useState, useRef } from 'react';
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
  const [workingDaysArray, setWorkingDaysArray] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [modalAttendance, setModalAttendance] = useState<AttendanceRow | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalNotification, setModalNotification] = useState('');

  // Sorting state for table
  const [sortField, setSortField] = useState<keyof DailyRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Updated calculation logic matching the controller exactly
  const calculateEmployeePayroll = (employee: any, dailyRows: any[], workingDays: number, workingDaysArray: string[]) => {
    const baseSalary = parseFloat(employee.monthlySalary || 0);
    const perDaySalary = workingDays ? (baseSalary / workingDays) : 0;
    
    // Calculate metrics from daily records (matching controller logic)
    const actualPresentDays = dailyRows.reduce((total, record) => total + (record.presentDays || 0), 0);
    const totalHalfDays = dailyRows.reduce((total, record) => total + (record.halfDays || 0), 0);
    const actualAbsentDays = dailyRows.reduce((total, record) => total + (record.absentDays || 0), 0);
    const totalLateDays = dailyRows.reduce((total, record) => total + (record.lateDays || 0), 0);
    const excessLeaves = dailyRows.reduce((total, record) => total + (record.excessLeaves || 0), 0);
    
    // Calculate missing days (CRITICAL: This was missing in the frontend)
    const attendanceDataCount = dailyRows.length;
    const attendedDates = new Set(
      dailyRows.map(row => moment(row.date).format('YYYY-MM-DD'))
    );
    
    // Calculate missing days from working days array
    const missingDays = workingDaysArray.filter(date => !attendedDates.has(date)).length;
    
    console.log('🐛 CALCULATION DEBUG:', {
      workingDaysCount: workingDays,
      workingDaysArrayLength: workingDaysArray.length,
      attendanceDataCount,
      attendedDatesCount: attendedDates.size,
      missingDays,
      actualAbsentDays,
      workingDaysArray: workingDaysArray.slice(0, 10), // First 10 days
      attendedDates: Array.from(attendedDates).slice(0, 10), // First 10 dates
    });
    
    // For display: Show actual absent days only (don't include missing days in count)
    const displayAbsentDays = actualAbsentDays;
    
    // For calculation: Include missing days in total absent days for deductions
    const totalAbsentDaysForDeduction = actualAbsentDays + missingDays;
    
    // Calculate deductions step by step (matching controller logic)
    let totalDeductions = 0;
    
    // Deductions for actual absent days (invalid punch records)
    if (actualAbsentDays > 0) {
      totalDeductions += actualAbsentDays * perDaySalary;
    }
    
    // Deductions for half days
    if (totalHalfDays > 0) {
      totalDeductions += totalHalfDays * (perDaySalary / 2);
    }
    
    // Deductions for missing data days (treated as absent) - THIS IS THE KEY FIX
    if (missingDays > 0) {
      totalDeductions += missingDays * perDaySalary;
    }
    
    // Deductions for excess leaves (2x penalty)
    if (excessLeaves > 0) {
      totalDeductions += excessLeaves * 2 * perDaySalary;
    }
    
    // Cap deductions to not exceed base salary
    const cappedDeductions = Math.min(totalDeductions, baseSalary);
    const netSalary = baseSalary - cappedDeductions;
    
    // Track if deductions were capped
    const deductionsCapped = totalDeductions > baseSalary;
    
    console.log('🐛 DEDUCTION DEBUG:', {
      baseSalary,
      perDaySalary,
      actualAbsentDays,
      missingDays,
      totalHalfDays,
      excessLeaves,
      totalDeductionsCalculated: totalDeductions,
      cappedDeductions,
      netSalary
    });
    
    return {
      baseSalary,
      perDaySalary,
      actualPresentDays,
      totalHalfDays,
      totalLateDays,
      actualAbsentDays: displayAbsentDays, // Display actual absent days only
      missingDays,
      attendanceDataCount,
      totalAbsentDaysForDeduction, // Total for calculation including missing
      excessLeaves,
      totalDeductions: cappedDeductions,
      netSalary,
      deductionsCapped,
      // Breakdown for transparency
      deductionBreakdown: {
        absentDaysDeduction: actualAbsentDays * perDaySalary,
        halfDaysDeduction: totalHalfDays * (perDaySalary / 2),
        missingDaysDeduction: missingDays * perDaySalary,
        excessLeavesDeduction: excessLeaves * 2 * perDaySalary,
        totalBeforeCapping: totalDeductions
      }
    };
  };

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

  // FIXED: Use the correct API endpoint for working days
  // const fetchWorkingDays = async (monthYear?: string) => {
  //   setCalendarLoading(true);
  //   try {
  //     const useMonthYear = monthYear || selectedMonth;
  //     if (useMonthYear) {
  //       const [year, month] = useMonthYear.split('-');
        
  //       // Use the correct API endpoint as specified
  //       const res = await axios.get(`http://localhost:5000/api/holidays/working-days?year=${year}&month=${month}`);
        
  //       console.log('🐛 Working Days API Response:', res.data);
        
  //       const workingDaysCount = res.data.workingDays;
  //       const workingDaysArrayData = res.data.days || [];
        
  //       if (workingDaysCount && workingDaysCount > 0) {
  //         setWorkingDays(workingDaysCount);
          
  //         // If the API doesn't return days array, generate it
  //         if (workingDaysArrayData.length === 0) {
  //           console.log('🐛 No days array from API, generating fallback...');
  //           const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
  //           setWorkingDaysArray(fallbackDays);
  //         } else {
  //           setWorkingDaysArray(workingDaysArrayData);
  //         }
  //       } else {
  //         throw new Error('Invalid working days count: ' + workingDaysCount);
  //       }
        
  //       console.log('🐛 Working days set:', {
  //         count: workingDaysCount,
  //         arrayLength: workingDaysArrayData.length || generateWorkingDaysArray(parseInt(year), parseInt(month)).length
  //       });
  //     }
  //   } catch (error) {
  //     console.error('🐛 Working days fetch error:', error);
      
  //     // Generate fallback working days array for UAE (Saturday-Sunday weekend)
  //     if (selectedMonth) {
  //       const [year, month] = selectedMonth.split('-');
  //       const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
  //       setWorkingDays(fallbackDays.length);
  //       setWorkingDaysArray(fallbackDays);
  //     } else {
  //       setWorkingDays(26); // fallback default
  //       setWorkingDaysArray([]);
  //     }
  //   } finally {
  //     setCalendarLoading(false);
  //   }
  // };
const fetchWorkingDays = async (monthYear?: string) => {
  setCalendarLoading(true);
  try {
    const useMonthYear = monthYear || selectedMonth;
    if (useMonthYear) {
      const [year, month] = useMonthYear.split('-');
      
      // FIXED: Use the axios instance instead of hardcoded URL
      const res = await axios.get(`/holidays/working-days?year=${year}&month=${month}`);
      
      console.log('🐛 Working Days API Response:', res.data);
      
      const workingDaysCount = res.data.workingDays;
      const workingDaysArrayData = res.data.days || [];
      
      if (workingDaysCount && workingDaysCount > 0) {
        setWorkingDays(workingDaysCount);
        
        // If the API doesn't return days array, generate it
        if (workingDaysArrayData.length === 0) {
          console.log('🐛 No days array from API, generating fallback...');
          const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
          setWorkingDaysArray(fallbackDays);
        } else {
          setWorkingDaysArray(workingDaysArrayData);
        }
      } else {
        throw new Error('Invalid working days count: ' + workingDaysCount);
      }
      
      console.log('🐛 Working days set:', {
        count: workingDaysCount,
        arrayLength: workingDaysArrayData.length || generateWorkingDaysArray(parseInt(year), parseInt(month)).length
      });
    }
  } catch (error) {
    console.error('🐛 Working days fetch error:', error);
    
    // Generate fallback working days array for UAE (Saturday-Sunday weekend)
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
      setWorkingDays(fallbackDays.length);
      setWorkingDaysArray(fallbackDays);
    } else {
      setWorkingDays(26); // fallback default
      setWorkingDaysArray([]);
    }
  } finally {
    setCalendarLoading(false);
  }
};


  // Helper function to generate working days array for UAE (excluding Saturdays and Sundays)
const generateWorkingDaysArray = (year: number, month: number): string[] => {
    const workingDays: string[] = [];
    const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = moment({ year, month: month - 1, day });
      // UAE weekend is Saturday (6) and Sunday (0)
if (date.day() !== 0 && date.day() !== 6) {
        workingDays.push(date.format('YYYY-MM-DD'));
      }
    }
    
    console.log('🐛 Generated UAE working days array:', {
      year,
      month,
      totalDays: daysInMonth,
      workingDays: workingDays.length,
      sampleDays: workingDays.slice(0, 10)
    });
    
    return workingDays;
  };

  // Sort the dailyRows data
const sortedDailyRows = React.useMemo(() => {
    if (!sortField) return dailyRows;

return [...dailyRows].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  }, [dailyRows, sortField, sortDirection]);

  // Column sorting toggle handler
const handleSort = (field: keyof DailyRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon function
const renderSortIcon = (field: keyof DailyRow) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  // Delete employee attendance data for selected month
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
            setDailyRows([]);
            alert(`✅ Successfully deleted all attendance data for ${employee.name} in ${monthName}\n\nDeleted ${response.data.deletedRecords} attendance records.`);
            
            // Refresh the data
            fetchDetails();
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

  // Calculate payroll data using the updated function
  const payrollData = calculateEmployeePayroll(employee, dailyRows, workingDays, workingDaysArray);

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

        {/* DANGER ZONE - Delete Employee Month Data */}
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            🗑️ Deleting attendance data for {employee.name} in {moment(selectedMonth).format('MMMM YYYY')}...
          </div>
        )}

        {/* Debug Information - Development Mode */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">🐛 Debug Information</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>**UAE WORKING DAYS CALCULATION:**</div>
              <div>Working Days Count: {workingDays}</div>
              <div>Working Days Array Length: {workingDaysArray.length}</div>
              <div>Daily Records Count: {payrollData.attendanceDataCount}</div>
              <div>**MISSING DAYS CALCULATION:**</div>
              <div>Missing Days Count: {payrollData.missingDays}</div>
              <div>Actual Present Days: {payrollData.actualPresentDays}</div>
              <div>Actual Absent Days (invalid punches): {payrollData.actualAbsentDays}</div>
              <div>**DEDUCTIONS:**</div>
              <div>Per Day Salary: AED {payrollData.perDaySalary.toFixed(2)}</div>
              <div>Missing Days Deductions: AED {payrollData.deductionBreakdown.missingDaysDeduction.toFixed(2)}</div>
              <div>Invalid Punch Deductions: AED {payrollData.deductionBreakdown.absentDaysDeduction.toFixed(2)}</div>
              <div>Half Day Deductions: AED {payrollData.deductionBreakdown.halfDaysDeduction.toFixed(2)}</div>
              <div>Excess Leave Deductions: AED {payrollData.deductionBreakdown.excessLeavesDeduction.toFixed(2)}</div>
              <div>Total Calculated Deductions: AED {payrollData.deductionBreakdown.totalBeforeCapping.toFixed(2)}</div>
              <div>Final Deductions (capped): AED {payrollData.totalDeductions.toFixed(2)}</div>
              {payrollData.deductionsCapped && <div className="text-red-600 font-semibold">⚠️ Deductions were capped at monthly salary</div>}
              <div>**WORKING DAYS ARRAY SAMPLE:**</div>
              <div className="text-xs bg-gray-100 p-2 rounded">
                {workingDaysArray.slice(0, 10).join(', ')}...
              </div>
            </div>
          </div>
        )} */}

        {/* Salary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md bg-green-50 p-4 border border-green-200 hover:shadow-sm transition">
            <div className="text-sm text-green-600 font-semibold mb-0.5">Monthly Gross Salary</div>
            <div className="text-2xl font-bold text-green-700">AED {payrollData.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-green-500 mt-1">Before deductions</div>
          </div>
          <div className="rounded-md bg-red-50 p-4 border border-red-200 hover:shadow-sm transition">
            <div className="text-sm text-red-600 font-semibold mb-0.5">Total Deductions</div>
            <div className="text-2xl font-bold text-red-700">AED {payrollData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-red-500 mt-1">
              Working days:{' '}
              <span className="ml-1 inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">{workingDays}</span>
              {/* {payrollData.missingDays > 0 && (
                <><br />Missing days: <span className="text-red-600 font-semibold">{payrollData.missingDays}</span></>
              )} */}
            </div>
          </div>
          <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200 hover:shadow-sm transition">
            <div className="text-sm text-indigo-600 font-semibold mb-0.5">Net Salary</div>
            <div className="text-2xl font-bold text-indigo-700">AED {payrollData.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-md bg-blue-50 p-4 border border-blue-200 text-center">
            <div className="text-2xl font-bold text-blue-700">{payrollData.actualPresentDays}</div>
            <div className="text-sm text-blue-600 font-semibold">Present Days</div>
          </div>
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200 text-center">
            <div className="text-2xl font-bold text-yellow-700">{payrollData.totalLateDays}</div>
            <div className="text-sm text-yellow-600 font-semibold">Late Days</div>
          </div>
          <div className="rounded-md bg-orange-50 p-4 border border-orange-200 text-center">
            <div className="text-2xl font-bold text-orange-700">{payrollData.totalHalfDays}</div>
            <div className="text-sm text-orange-600 font-semibold">Half Days</div>
          </div>
          <div className="rounded-md bg-red-50 p-4 border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-700">{payrollData.actualAbsentDays}</div>
            <div className="text-sm text-red-600 font-semibold">Absent Days</div>
            <div className="text-xs text-red-500 mt-1">
              
            </div>
          </div>
          <div className="rounded-md bg-purple-50 p-4 border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">{payrollData.excessLeaves}</div>
            <div className="text-sm text-purple-600 font-semibold">Excess Leaves</div>
          </div>
        </div>

        {/* Missing Days Information Card */}
        {payrollData.missingDays > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-600 rounded-full p-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-800">Missing Attendance Days</h3>
                <p className="text-sm text-amber-700">
                  {payrollData.missingDays} working days have no attendance records. 
                  Deduction applied: AED {payrollData.deductionBreakdown.missingDaysDeduction.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Attendance */}
        <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm max-h-[550px] overflow-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 border-b border-gray-300 pb-2">
            Daily Attendance
          </h3>

          {dailyRows.length === 0 ? (
            <p className="text-center text-gray-500 italic py-16">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm" role="grid">
                <thead className="bg-gradient-to-r from-gray-100 to-blue-100 sticky top-0 z-10 rounded-t-xl">
                  <tr>
                    <th
                      className="py-3 px-4 font-bold text-gray-600 text-left cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center justify-start">
                        Date
                        {renderSortIcon('date')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-blue-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('workingHours')}
                    >
                      <div className="flex items-center justify-center">
                        Working Hours
                        {renderSortIcon('workingHours')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-green-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('presentDays')}
                    >
                      <div className="flex items-center justify-center">
                        Present
                        {renderSortIcon('presentDays')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-yellow-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('lateDays')}
                    >
                      <div className="flex items-center justify-center">
                        Late
                        {renderSortIcon('lateDays')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-indigo-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('halfDays')}
                    >
                      <div className="flex items-center justify-center">
                        Half Days
                        {renderSortIcon('halfDays')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-red-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('absentDays')}
                    >
                      <div className="flex items-center justify-center">
                        Absent
                        {renderSortIcon('absentDays')}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-bold text-pink-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('excessLeaves')}
                    >
                      <div className="flex items-center justify-center">
                        Excess Leave
                        {renderSortIcon('excessLeaves')}
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedDailyRows.map((row) => (
                    <tr
                      key={row.date}
                      className="hover:bg-blue-50 cursor-pointer transition"
                      onClick={() => openEditModal(row.employeeId, row.date)}
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-800">
                        {moment(row.date).format('YYYY-MM-DD')}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-blue-700">
                        {row.workingHours ? `${row.workingHours} h` : '0'}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-green-700">
                        {row.presentDays}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-yellow-700">
                        {row.lateDays}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-indigo-700">
                        {row.halfDays}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-red-700">
                        {row.absentDays}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-pink-700">
                        {row.excessLeaves}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full shadow-sm transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(row.employeeId, row.date);
                          }}
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
          )}
        </div>

        {/* Modal */}
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
