export interface Employee {
  id: number; // Remove undefined if it's always required
  employeeId: string;
  name: string;
  email: string;
  office_id: number;
  office_name: string;
  position_id: number;
  position_name: string;
  monthlySalary: number;
  joiningDate: string;
  status: boolean;
  reporting_time?: string;
  duty_hours?: number;
  position_title?: string; // Optional, if not always present
  dob?: string;
  passport_number?: string;
  passport_expiry?: string;
  visa_type?: number; // This stores the ID
  visa_type_name?: string; // This stores the actual visa type name
  visa_type_id?: number; // For form handling
  platform?: string; // This stores the platform name
  platform_id?: number; // For form handling
  address?: string;
  phone?: string;
  gender?: string;
  
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: number;
  isLate: boolean;
  isHalfDay: boolean;
  isAbsent: boolean;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string;
  month: string;
  year: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  leaves: number;
  excessLeaves: number;
  deductionDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

export interface Office {
  id: string;
  name: string;
  location: string;
}

export interface Platform {
  id: number;
  platform_name: string;
  created_at: string;
  employeeCount?: number;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: 'admin' | 'hr' | 'floor_manager';
  two_factor_secret?: string;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
  offices?: Office[];
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalDeductions: number;
  presentEmployees: number;
  absentEmployees: number;
}
