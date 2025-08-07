import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

  // Core state
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<Set<string>>(new Set());
  const [workingDays, setWorkingDays] = useState<number>(1);
  const [workingDaysArray, setWorkingDaysArray] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingLeaves, setProcessingLeaves] = useState<Set<string>>(new Set());
  const [showMissingDatesDetails, setShowMissingDatesDetails] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [modalAttendance, setModalAttendance] = useState<AttendanceRow | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalNotification, setModalNotification] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof DailyRow | 'approvedLeave' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if date is approved leave
  const isApprovedLeave = useCallback((empId: string, date: string) => {
    return approvedLeaves.has(`${empId}-${date}`);
  }, [approvedLeaves]);

  // Calculate payroll data with missing dates
  const payrollData = useMemo(() => {
    console.log('🔄 Calculating payroll data...', {
      employeeExists: !!employee,
      dailyRowsCount: dailyRows.length,
      approvedLeavesCount: approvedLeaves.size,
      workingDays
    });

    if (!employee) {
      return {
        baseSalary: 0,
        perDaySalary: 0,
        actualPresentDays: 0,
        totalHalfDays: 0,
        totalLateDays: 0,
        actualAbsentDays: 0,
        approvedLeaveDays: 0,
        missingDays: 0,
        missingDates: [] as string[],
        excessLeaves: 0,
        totalDeductions: 0,
        netSalary: 0,
        deductionsCapped: false,
        deductionBreakdown: {
          absentDaysDeduction: 0,
          approvedLeavesDeduction: 0,
          halfDaysDeduction: 0,
          missingDaysDeduction: 0,
          excessLeavesDeduction: 0,
          totalBeforeCapping: 0
        }
      };
    }

    const baseSalary = parseFloat(employee.monthlySalary.toString() || '0');
    const perDaySalary = workingDays ? (baseSalary / workingDays) : 0;
    
    // Count approved leaves
    const approvedLeaveDays = approvedLeaves.size;
    
    // Calculate actual attendance stats (excluding approved leaves)
    let actualPresentDays = 0;
    let totalHalfDays = 0;
    let totalLateDays = 0;
    let actualAbsentDays = 0;
    let excessLeaves = 0;

    dailyRows.forEach(row => {
      const dateKey = `${row.employeeId}-${row.date}`;
      const isApproved = approvedLeaves.has(dateKey);
      
      if (!isApproved) {
        // Only count non-approved leave days
        actualPresentDays += row.presentDays || 0;
        totalHalfDays += row.halfDays || 0;
        totalLateDays += row.lateDays || 0;
        if (row.excessLeaves > 0) {
          excessLeaves += row.excessLeaves || 0;
        } else {
          actualAbsentDays += row.absentDays || 0;
        }
      }
    });

    // Calculate missing days and dates (working days without attendance records or approved leaves)
    const allRecordedDates = new Set(dailyRows.map(row => moment(row.date).format('YYYY-MM-DD')));
    const approvedLeaveDates = new Set(
      Array.from(approvedLeaves).map(key => key.split('-').slice(1).join('-'))
    );
    
    const missingDates = workingDaysArray.filter(date => 
      !allRecordedDates.has(date) && !approvedLeaveDates.has(date)
    );
    const missingDays = missingDates.length;

    // Calculate deductions
    const absentDaysDeduction = actualAbsentDays * perDaySalary;
    const approvedLeavesDeduction = approvedLeaveDays * perDaySalary;
    const halfDaysDeduction = totalHalfDays * (perDaySalary / 2);
    const missingDaysDeduction = missingDays * perDaySalary;
    const excessLeavesDeduction = excessLeaves * 2 * perDaySalary;

    const totalDeductionsBeforeCapping = absentDaysDeduction + approvedLeavesDeduction + 
                                          halfDaysDeduction + missingDaysDeduction + excessLeavesDeduction;
    
    const cappedDeductions = Math.min(totalDeductionsBeforeCapping, baseSalary);
    const netSalary = baseSalary - cappedDeductions;
    
    // Display absent days includes approved leaves
    const displayAbsentDays = actualAbsentDays + approvedLeaveDays;

    return {
      baseSalary,
      perDaySalary,
      actualPresentDays,
      totalHalfDays,
      totalLateDays,
      actualAbsentDays: displayAbsentDays,
      approvedLeaveDays,
      missingDays,
      missingDates,
      excessLeaves,
      totalDeductions: cappedDeductions,
      netSalary,
      deductionsCapped: totalDeductionsBeforeCapping > baseSalary,
      deductionBreakdown: {
        absentDaysDeduction,
        approvedLeavesDeduction,
        halfDaysDeduction,
        missingDaysDeduction,
        excessLeavesDeduction,
        totalBeforeCapping: totalDeductionsBeforeCapping
      }
    };
  }, [employee, dailyRows, workingDays, workingDaysArray, approvedLeaves]);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 🔥 Helper function to fetch data without showing loading state
  const fetchDetailsWithoutLoading = async (monthYear?: string) => {
    if (!employeeId) return;
    
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
      console.error('Error fetching details:', err);
    }
  };

  // 🔥 IMPROVED: Better approved leaves refresh function
  const refreshApprovedLeavesOnly = async () => {
    if (!employeeId || !selectedMonth) return;
    
    try {
      const [year, month] = selectedMonth.split('-');
      const { data } = await axios.get(`/approved-leaves/${employeeId}?year=${year}&month=${month}`);
      
      const approvedLeavesSet = new Set<string>();
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((leave: any) => {
          const dateKey = `${employeeId}-${leave.date}`;
          approvedLeavesSet.add(dateKey);
        });
      }
      
      console.log('🔄 Refreshed approved leaves:', Array.from(approvedLeavesSet));
      setApprovedLeaves(approvedLeavesSet);
      
    } catch (error: any) {
      console.error('Error refreshing approved leaves:', error);
    }
  };

  // 🔥 FIXED: Real-time approved leave toggle with complete data refresh
  const handleApprovedLeaveToggle = async (empId: string, date: string, isChecked: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const dateKey = `${empId}-${date}`;
    
    if (processingLeaves.has(dateKey)) {
      return;
    }

    console.log(`🔄 Toggling approved leave: ${dateKey} -> ${isChecked}`);
    setProcessingLeaves(prev => new Set([...prev, dateKey]));

    // Store current scroll position to restore after data refresh
    const scrollContainer = document.querySelector('.max-h-\\[550px\\]');
    const currentScrollTop = scrollContainer?.scrollTop || 0;

    try {
      // 1. Backend operations first
      if (isChecked) {
        console.log(`✅ Adding approved leave for ${dateKey} to backend`);
        
        await axios.post('/approved-leaves/add', {
          employee_id: empId,
          date: moment(date).format('YYYY-MM-DD'),
          approved_by: 'Admin',
          reason: 'Approved via Daily Attendance'
        });

        // Clear attendance data when approving leave
        try {
          await axios.put(`/attendance/${empId}/${moment(date).format('YYYY-MM-DD')}`, {
            punch_in: '',
            punch_out: ''
          });
        } catch (attendanceError) {
          console.log('ℹ️ No existing attendance record to update');
        }
      } else {
        console.log(`❌ Removing approved leave for ${dateKey} from backend`);
        
        await axios.delete('/approved-leaves/remove', {
          data: {
            employee_id: empId,
            date: moment(date).format('YYYY-MM-DD')
          }
        });
      }

      console.log(`✅ Successfully ${isChecked ? 'added' : 'removed'} approved leave for ${dateKey}`);

      // 2. Refresh all data but preserve scroll position
      console.log('🔄 Refreshing all data with scroll preservation...');
      
      // Refresh both attendance data and approved leaves
      await Promise.all([
        fetchDetailsWithoutLoading(selectedMonth),
        refreshApprovedLeavesOnly()
      ]);

      // Restore scroll position after data is loaded
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = currentScrollTop;
        }
      }, 100);

      console.log(`✅ Data refreshed successfully for ${dateKey}`);

    } catch (error: any) {
      console.error(`❌ Error toggling approved leave:`, error);
      alert(`Failed to ${isChecked ? 'add' : 'remove'} approved leave: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(dateKey);
        return newSet;
      });
    }
  };

  // Fetch approved leaves
  const fetchApprovedLeaves = async () => {
    if (!employeeId || !selectedMonth) return;
    
    try {
      const [year, month] = selectedMonth.split('-');
      const { data } = await axios.get(`/approved-leaves/${employeeId}?year=${year}&month=${month}`);
      
      const approvedLeavesSet = new Set<string>();
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((leave: any) => {
          const dateKey = `${employeeId}-${leave.date}`;
          approvedLeavesSet.add(dateKey);
        });
      }
      
      console.log('📥 Setting approved leaves:', Array.from(approvedLeavesSet));
      setApprovedLeaves(approvedLeavesSet);
      
    } catch (error: any) {
      console.error('Error fetching approved leaves:', error);
      setApprovedLeaves(new Set());
    }
  };

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
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkingDays = async (monthYear?: string) => {
    setCalendarLoading(true);
    try {
      const useMonthYear = monthYear || selectedMonth;
      if (useMonthYear) {
        const [year, month] = useMonthYear.split('-');
        const res = await axios.get(`/holidays/working-days?year=${year}&month=${month}`);
        const workingDaysCount = res.data.workingDays;
        const workingDaysArrayData = res.data.days || [];
        
        if (workingDaysCount && workingDaysCount > 0) {
          setWorkingDays(workingDaysCount);
          if (workingDaysArrayData.length === 0) {
            const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
            setWorkingDaysArray(fallbackDays);
          } else {
            setWorkingDaysArray(workingDaysArrayData);
          }
        } else {
          throw new Error('Invalid working days count');
        }
      }
    } catch (error) {
      console.error('Working days fetch error:', error);
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const fallbackDays = generateWorkingDaysArray(parseInt(year), parseInt(month));
        setWorkingDays(fallbackDays.length);
        setWorkingDaysArray(fallbackDays);
      } else {
        setWorkingDays(26);
        setWorkingDaysArray([]);
      }
    } finally {
      setCalendarLoading(false);
    }
  };

  const generateWorkingDaysArray = (year: number, month: number): string[] => {
    const workingDays: string[] = [];
    const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = moment({ year, month: month - 1, day });
      if (date.day() !== 0 && date.day() !== 6) {
        workingDays.push(date.format('YYYY-MM-DD'));
      }
    }
    return workingDays;
  };

  // Simple sort handling
  const handleSort = (field: keyof DailyRow | 'approvedLeave') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: keyof DailyRow) => {
    if (sortField !== field) {
      return <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4 4 4m0-8l-4-4-4 4" /></svg>;
    }
    return sortDirection === 'asc' ? 
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> :
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

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
    const dateKey = `${empId}-${date}`;
    const isApprovedLeave = approvedLeaves.has(dateKey);
    
    if (isApprovedLeave) {
      alert('Cannot edit attendance for approved leave. Please uncheck approved leave first.');
      return;
    }
    
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

  const handleModalAdd = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleModalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // useEffect hooks
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

  useEffect(() => {
    if (selectedMonth && employeeId) {
      console.log('🔄 Fetching initial data for month:', selectedMonth);
      const fetchAllData = async () => {
        try {
          await Promise.all([
            fetchDetails(selectedMonth),
            fetchWorkingDays(selectedMonth),
            fetchApprovedLeaves()
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      
      fetchAllData();
    }
  }, [selectedMonth, employeeId]);

  // Sort daily rows
  const sortedDailyRows = sortField ? 
    [...dailyRows].sort((a, b) => {
      if (sortField === 'approvedLeave') {
        // Sort by approved leave status (checked first or last)
        const aApproved = approvedLeaves.has(`${a.employeeId}-${a.date}`) ? 1 : 0;
        const bApproved = approvedLeaves.has(`${b.employeeId}-${b.date}`) ? 1 : 0;
        const comparison = aApproved - bApproved;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      const aValue = a[sortField!];
      const bValue = b[sortField!];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      return 0;
    }) : dailyRows;

  // Early returns after all hooks
  if (loading || calendarLoading) {
    return (
      <MainLayout title="Loading…">
        <div className="text-center text-lg text-gray-600 py-12 animate-pulse">Loading…</div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Error">
        <div className="text-red-600 text-center text-lg py-12">{error}</div>
      </MainLayout>
    );
  }

  if (!employee) {
    return <MainLayout title="Not Found">Employee not found.</MainLayout>;
  }

  return (
    <MainLayout title={`${employee.name}`} subtitle={`ID: ${employee.employeeId}`}>
      <div className="space-y-8 p-4">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              navigate(-1);
            }}
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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openAddModal();
              }}
              className="flex items-center gap-2 px-4 py-1.5 font-semibold bg-green-500 text-white rounded hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Attendance
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
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
              {payrollData.approvedLeaveDays > 0 && (
                <>Includes {payrollData.approvedLeaveDays} approved leaves</>
              )}
            </div>
          </div>
          <div className="rounded-md bg-purple-50 p-4 border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">{payrollData.excessLeaves}</div>
            <div className="text-sm text-purple-600 font-semibold">Excess Leaves</div>
          </div>
        </div>

        {/* Missing Days Information Card - UPDATED */}
        {payrollData.missingDays > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-600 rounded-full p-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-800">Missing Attendance Days</h3>
                <div className="mt-2">
                  <p className="text-sm text-amber-700 mb-2">
                    {payrollData.missingDays} working days have no attendance records.
                    <button 
                      onClick={() => setShowMissingDatesDetails(!showMissingDatesDetails)}
                      className="ml-2 text-blue-600 underline hover:text-blue-800 transition"
                    >
                      {showMissingDatesDetails ? 'Hide' : 'Show'} dates
                    </button>
                  </p>
                  
                  {showMissingDatesDetails && payrollData.missingDates && payrollData.missingDates.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded">
                      <strong className="text-amber-800">Missing dates:</strong>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {payrollData.missingDates.map((date, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 bg-amber-200 text-amber-800 text-xs rounded font-medium"
                          >
                            {formatDate(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-amber-700 mt-2">
                    Deduction applied: AED {payrollData.deductionBreakdown.missingDaysDeduction.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Attendance Table */}
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
                    <th
                      className="py-3 px-4 font-bold text-teal-700 text-center cursor-pointer hover:bg-blue-200 transition-colors select-none"
                      onClick={() => handleSort('approvedLeave')}
                    >
                      <div className="flex items-center justify-center">
                        Approved Leave
                        {renderSortIcon('approvedLeave' as any)}
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedDailyRows.map((row, index) => {
                    const isApprovedLeave = approvedLeaves.has(`${row.employeeId}-${row.date}`);
                    const uniqueKey = `${row.employeeId}-${row.date}-${index}`;
                    
                    return (
                      <tr
                        key={uniqueKey}
                        className={`transition ${
                          isApprovedLeave 
                            ? 'bg-green-50 border-l-4 border-green-400' 
                            : 'hover:bg-blue-50 cursor-pointer'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isApprovedLeave) {
                            openEditModal(row.employeeId, row.date);
                          }
                        }}
                        style={{ 
                          cursor: isApprovedLeave ? 'not-allowed' : 'pointer',
                          opacity: isApprovedLeave ? 0.8 : 1 
                        }}
                      >
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-800">
                          <div className="flex items-center gap-2">
                            {moment(row.date).format('YYYY-MM-DD')}
                            {isApprovedLeave && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Approved Leave
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-700">
                          {isApprovedLeave ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            row.workingHours ? `${row.workingHours} h` : '0'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-green-700">
                          {isApprovedLeave ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            row.presentDays
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-yellow-700">
                          {isApprovedLeave ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            row.lateDays
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-indigo-700">
                          {isApprovedLeave ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            row.halfDays
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-red-700">
                          {isApprovedLeave ? (
                            <span className="font-semibold text-red-700">1</span>
                          ) : (
                            row.absentDays
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-pink-700">
                          {isApprovedLeave ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            row.excessLeaves
                          )}
                        </td>
                        <td 
                          className="py-3 px-4 text-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {processingLeaves.has(`${row.employeeId}-${row.date}`) ? (
                            <div className="w-5 h-5 mx-auto">
                              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : (
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                              checked={isApprovedLeave}
                              onChange={(e) => {
                                handleApprovedLeaveToggle(row.employeeId, row.date, e.target.checked, e);
                              }}
                              disabled={processingLeaves.has(`${row.employeeId}-${row.date}`)}
                              title={`Toggle approved leave for ${moment(row.date).format('YYYY-MM-DD')}`}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 font-medium rounded-full shadow-sm transition ${
                              isApprovedLeave 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isApprovedLeave) {
                                openEditModal(row.employeeId, row.date);
                              }
                            }}
                            disabled={isApprovedLeave}
                            title={isApprovedLeave ? 'Cannot edit approved leave' : 'Edit attendance'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {isApprovedLeave ? 'Locked' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
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
                  onSubmit={modalMode === 'add' ? handleModalAdd : handleModalUpdate}
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
                      onClick={(e) => {
                        e.preventDefault();
                        handleModalDelete();
                      }}
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
