export type Language = 'en' | 'km';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserAccount {
  id: string;
  employeeId: string;
  name: string;
  nameKhmer: string;
  role: UserRole;
  department: string;
  departmentKhmer: string;
  title: string;
  titleKhmer: string;
  avatar: string;
}

export type AttendanceAction = 'check_in' | 'check_out';

export type ResponseCode = 
  | 'check_in'
  | 'check_out'
  | 'SCAN_COOLDOWN'
  | 'ATTENDANCE_COMPLETED'
  | 'GEOFENCE_VIOLATION'
  | 'LOCATION_REQUIRED'
  | 'RATE_LIMITED'
  | 'REPLAY_DETECTED'
  | 'UNAUTHORIZED'
  | 'INVALID_PAYLOAD'
  | 'EMPLOYEE_NOT_FOUND'
  | 'SERVER_ERROR';

export interface Department {
  id: string;
  code: string;
  name: string;
  nameKhmer: string;
  description?: string;
  descriptionKhmer?: string;
  managerName?: string;
  managerNameKhmer?: string;
  color?: string;
  createdAt?: string;
}

export type Gender = 'male' | 'female' | 'other';
export type EmploymentType = 'full_time' | 'part_time' | 'probation' | 'contract';
export type EmploymentStatus = 'active' | 'on_leave' | 'probation' | 'resigned';

export interface Employee {
  id: string; // e.g. EMP-1001
  fullName: string;
  fullNameKhmer: string;
  department: string;
  departmentKhmer: string;
  role: string;
  roleKhmer: string;
  roleType?: UserRole;
  avatar: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  genderKhmer?: string; // 'ប្រុស' | 'ស្រី'
  dateOfBirth?: string; // e.g. '1992-05-18'
  joinDate?: string; // e.g. '2023-01-10'
  employmentType?: EmploymentType;
  employmentTypeKhmer?: string; // 'ពេញម៉ោង' | 'សាកល្បង' | 'កិច្ចសន្យា'
  status?: EmploymentStatus;
  statusKhmer?: string; // 'សកម្ម' | 'ច្បាប់សម្រាក' | 'ឈប់ធ្វើការ'
  resignedDate?: string; // e.g. '2026-09-18'
  resignationReason?: string; // e.g. 'លាលែងពីតំណែងផ្ទាល់ខ្លួន', 'ចប់កិច្ចសន្យា'
  nationalId?: string; // e.g. '010582914'
  address?: string; // e.g. 'ខណ្ឌទួលគោក រាជធានីភ្នំពេញ'
  workLocation?: string; // e.g. 'ការិយាល័យកណ្តាល ភ្នំពេញ'
  workSchedule?: string; // e.g. '08:00 - 17:00 (ចន្ទ - សុក្រ)'
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  bankAccount?: string; // e.g. 'ABA: 001 234 567'
  baseSalary?: number; // Base monthly salary in USD, e.g. 800
  workStartTime?: string; // e.g. '08:00'
  workEndTime?: string; // e.g. '17:00'
  workingHoursPerDay?: number; // e.g. 8
  lateGracePeriodMinutes?: number; // Grace period before deduction, e.g. 15 mins
  lateDeductionRate?: number; // Deduction amount per late scan in USD, e.g. 2.0
}

export interface LateScanRecord {
  date: string;
  scanTime: string;
  scheduledTime: string;
  lateMinutes: number;
  deductionAmount: number;
}

export interface EmployeePayrollItem {
  employeeId: string;
  fullName: string;
  fullNameKhmer: string;
  department: string;
  departmentKhmer: string;
  role: string;
  roleKhmer: string;
  avatar: string;
  bankAccount?: string;
  baseSalary: number;
  workStartTime: string;
  workEndTime: string;
  workingHoursPerDay: number;
  totalScheduledWorkDays: number;
  daysPresent: number;
  daysAbsent: number;
  onTimeScans: number;
  lateScans: number;
  totalLateMinutes: number;
  lateDeductionAmount: number;
  allowances: number;
  bonus: number;
  otherDeductions: number;
  netPay: number;
  lateScanLogs: LateScanRecord[];
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  calculatedAt: string;
}

export interface PayrollPeriod {
  id: string;
  month: number; // 1 - 12
  year: number; // e.g. 2026
  workDaysInMonth: number;
  gracePeriodMinutes: number;
  deductionMethod: 'fixed_per_late' | 'hourly_prorated';
  fixedDeductionPerLate: number;
  items: EmployeePayrollItem[];
  generatedAt: string;
}

export interface OfficeLocation {
  name: string;
  nameKhmer: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 100 meters
}

export interface AttendanceLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceMeters?: number;
  inGeofence?: boolean;
}

export interface AttendanceRecord {
  id: string;
  requestId: string;
  clientId: string;
  employeeId: string;
  fullName: string;
  department?: string;
  type: AttendanceAction;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: 'success' | 'warning' | 'error';
  code: ResponseCode | string;
  message?: string;
  syncedToGoogleSheet?: boolean;
  location?: AttendanceLocationData;
}

export interface AttendanceScanPayload {
  apiKey: string;
  clientId: string;
  requestId: string;
  employeeId: string;
  fullName: string;
  action?: AttendanceAction;
  timestamp?: string;
  location?: AttendanceLocationData;
}

export interface AttendanceScanResult {
  success: boolean;
  action?: AttendanceAction;
  code: ResponseCode | string;
  message: string;
  messageKhmer?: string;
  requestId: string;
  employeeId: string;
  fullName: string;
  department?: string;
  timestamp: string;
  record?: AttendanceRecord;
  location?: AttendanceLocationData;
}

export interface AppSettings {
  appsScriptUrl: string;
  attendanceApiKey: string;
  clientId: string;
  soundEnabled: boolean;
  cooldownSeconds: number;
  mockMode: boolean;
  geofenceEnabled: boolean;
  officeLocation: OfficeLocation;
  stationCode: string; // The token encoded in the single shared company QR code
}

export interface DailySummary {
  totalEmployees: number;
  presentToday: number;
  checkedInNow: number;
  checkedOutToday: number;
  attendanceRate: number;
}
