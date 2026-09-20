import { Employee, AttendanceRecord, EmployeePayrollItem, PayrollPeriod, LateScanRecord } from '../types';
import { getStoredEmployees } from '../data/mockEmployees';
import { getAttendanceRecords } from './attendanceService';

const PAYROLL_STORAGE_KEY = 'attendance_payroll_history';

/**
 * Calculates the number of working days (Monday-Friday) in a given month and year.
 */
export function getWorkDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }
  return workDays || 22;
}

/**
 * Converts HH:mm:ss or HH:mm string to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 8 * 60; // default 08:00
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export interface PayrollCalculationOptions {
  month: number; // 1-12
  year: number; // e.g. 2026
  gracePeriodMinutes?: number; // default 15
  deductionMethod?: 'fixed_per_late' | 'hourly_prorated';
  fixedDeductionPerLate?: number; // default $2.00
  bonusMap?: Record<string, number>;
  allowanceMap?: Record<string, number>;
  otherDeductionMap?: Record<string, number>;
}

/**
 * Calculates payroll for a single employee based on real attendance records
 */
export function calculateEmployeePayroll(
  employee: Employee,
  attendanceRecords: AttendanceRecord[],
  options: PayrollCalculationOptions
): EmployeePayrollItem {
  const {
    month,
    year,
    gracePeriodMinutes = employee.lateGracePeriodMinutes ?? 15,
    deductionMethod = 'fixed_per_late',
    fixedDeductionPerLate = employee.lateDeductionRate ?? 2.0,
    bonusMap = {},
    allowanceMap = {},
    otherDeductionMap = {}
  } = options;

  const baseSalary = employee.baseSalary ?? 650;
  const scheduledStartTime = employee.workStartTime || '08:00';
  const scheduledEndTime = employee.workEndTime || '17:00';
  const workingHoursPerDay = employee.workingHoursPerDay || 8;
  const totalScheduledWorkDays = getWorkDaysInMonth(year, month);

  // Filter check-in attendance records for this employee in the specified month & year
  // Record date format: YYYY-MM-DD
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const empCheckIns = attendanceRecords.filter(r => 
    r.employeeId === employee.id &&
    r.type === 'check_in' &&
    r.date.startsWith(monthPrefix)
  );

  // Group check-ins by date to find earliest scan per day
  const dailyScans = new Map<string, AttendanceRecord>();
  empCheckIns.forEach(record => {
    const existing = dailyScans.get(record.date);
    if (!existing || record.time < existing.time) {
      dailyScans.set(record.date, record);
    }
  });

  const scheduledStartMinutes = timeStringToMinutes(scheduledStartTime);
  const hourlyRate = baseSalary / totalScheduledWorkDays / workingHoursPerDay;
  const minuteRate = hourlyRate / 60;

  const lateScanLogs: LateScanRecord[] = [];
  let onTimeScans = 0;
  let lateScans = 0;
  let totalLateMinutes = 0;
  let lateDeductionAmount = 0;

  dailyScans.forEach((record, date) => {
    const actualMinutes = timeStringToMinutes(record.time);
    const diffMinutes = actualMinutes - scheduledStartMinutes;

    // Check if employee arrived beyond scheduled start time + grace period
    if (diffMinutes > gracePeriodMinutes) {
      lateScans++;
      totalLateMinutes += diffMinutes;

      let deduction = 0;
      if (deductionMethod === 'hourly_prorated') {
        deduction = Math.round(diffMinutes * minuteRate * 100) / 100;
      } else {
        deduction = fixedDeductionPerLate;
      }

      deduction = Math.min(deduction, Math.round(hourlyRate * 4 * 100) / 100); // safety cap
      lateDeductionAmount += deduction;

      lateScanLogs.push({
        date,
        scanTime: record.time,
        scheduledTime: scheduledStartTime,
        lateMinutes: diffMinutes,
        deductionAmount: deduction
      });
    } else {
      onTimeScans++;
    }
  });

  // Sort late logs chronologically
  lateScanLogs.sort((a, b) => a.date.localeCompare(b.date));

  const daysPresent = dailyScans.size;
  const daysAbsent = Math.max(0, totalScheduledWorkDays - daysPresent);
  const allowances = allowanceMap[employee.id] ?? 0;
  const bonus = bonusMap[employee.id] ?? 0;
  const otherDeductions = otherDeductionMap[employee.id] ?? 0;

  const totalDeductions = lateDeductionAmount + otherDeductions;
  const netPay = Math.max(0, Math.round((baseSalary + allowances + bonus - totalDeductions) * 100) / 100);

  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    fullNameKhmer: employee.fullNameKhmer,
    department: employee.department,
    departmentKhmer: employee.departmentKhmer,
    role: employee.role,
    roleKhmer: employee.roleKhmer,
    avatar: employee.avatar,
    bankAccount: employee.bankAccount,
    baseSalary,
    workStartTime: scheduledStartTime,
    workEndTime: scheduledEndTime,
    workingHoursPerDay,
    totalScheduledWorkDays,
    daysPresent,
    daysAbsent,
    onTimeScans,
    lateScans,
    totalLateMinutes,
    lateDeductionAmount: Math.round(lateDeductionAmount * 100) / 100,
    allowances,
    bonus,
    otherDeductions,
    netPay,
    lateScanLogs,
    status: 'calculated',
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Generates full company payroll period calculation
 */
export function generateCompanyPayroll(
  employees: Employee[],
  records: AttendanceRecord[],
  options: PayrollCalculationOptions
): PayrollPeriod {
  const items = employees
    .filter(emp => emp.status !== 'resigned')
    .map(emp => calculateEmployeePayroll(emp, records, options));

  const periodId = `payroll-${options.year}-${String(options.month).padStart(2, '0')}`;

  const period: PayrollPeriod = {
    id: periodId,
    month: options.month,
    year: options.year,
    workDaysInMonth: getWorkDaysInMonth(options.year, options.month),
    gracePeriodMinutes: options.gracePeriodMinutes ?? 15,
    deductionMethod: options.deductionMethod ?? 'fixed_per_late',
    fixedDeductionPerLate: options.fixedDeductionPerLate ?? 2.0,
    items,
    generatedAt: new Date().toISOString()
  };

  savePayrollPeriod(period);
  return period;
}

/**
 * Retrieves all saved payroll periods
 */
export function getSavedPayrollPeriods(): PayrollPeriod[] {
  const raw = localStorage.getItem(PAYROLL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves a payroll period to localStorage
 */
export function savePayrollPeriod(period: PayrollPeriod): void {
  const existing = getSavedPayrollPeriods();
  const index = existing.findIndex(p => p.id === period.id);
  let updated: PayrollPeriod[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = period;
  } else {
    updated = [period, ...existing];
  }
  localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('payroll-updated'));
  }
}
