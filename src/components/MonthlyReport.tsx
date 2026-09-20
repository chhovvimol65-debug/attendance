import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Download, 
  Building2, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  UserX,
  Layers,
  TableProperties,
  Sparkles,
  Award,
  Filter
} from 'lucide-react';
import { AttendanceRecord, Language, Department, Employee } from '../types';
import { translations } from '../i18n/translations';
import { isEmployeeInDepartment } from '../data/mockDepartments';

interface MonthlyReportProps {
  records: AttendanceRecord[];
  departments: Department[];
  employees: Employee[];
  language: Language;
  departmentScope?: string | null;
}

export interface DepartmentMonthlyStat {
  id: string;
  code: string;
  name: string;
  nameKhmer: string;
  displayName: string;
  managerName?: string;
  managerNameKhmer?: string;
  color: string;
  colorHex: string;
  staffCount: number;
  totalAttendance: number; // Total attendance days recorded for staff in this dept
  lateArrivals: number; // Total late arrivals recorded
  absentDays: number; // Total scheduled days absent
  expectedPersonDays: number; // Total scheduled person-days
  attendanceRate: number; // % attendance rate
  punctualityRate: number; // % on-time arrivals
  avgAttendancePerStaff: number;
}

// Map department color names to vibrant hex colors
const COLOR_HEX_MAP: Record<string, string> = {
  blue: '#3b82f6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  purple: '#a855f7',
  indigo: '#6366f1',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  orange: '#f97316'
};

// Distinct colors for the 3 core metrics
const METRIC_COLORS = {
  attendance: '#10b981', // Emerald
  late: '#f59e0b',       // Amber
  absent: '#ef4444'      // Rose / Red
};

/**
 * Calculates the number of working days (Monday-Friday) in a given month and year.
 * Optionally limits calculation up to a given day of the month.
 */
function getWorkDaysCount(year: number, month: number, upToDay?: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxDay = upToDay !== undefined ? Math.min(upToDay, daysInMonth) : daysInMonth;
  let workDays = 0;
  for (let day = 1; day <= maxDay; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }
  return workDays || 1;
}

/**
 * Converts HH:mm:ss or HH:mm string to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 8 * 60;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  records,
  departments,
  employees,
  language,
  departmentScope
}) => {
  const t = translations[language];

  // Current year-month as default (YYYY-MM)
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [chartMetricFilter, setChartMetricFilter] = useState<'all' | 'attendance' | 'late' | 'absent' | 'stacked'>('all');

  // Generate available month options (last 6 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const khmerMonths = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let label = '';
      if (language === 'km') {
        label = `ខែ${khmerMonths[d.getMonth()]} ឆ្នាំ ${d.getFullYear()}`;
      } else {
        label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      options.push({ value: val, label });
    }
    return options;
  }, [language]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Parse Year and Month number
  const { selectedYear, selectedMonthNum, isCurrentMonth, elapsedWorkDaysInMonth } = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const isCurr = selectedMonth === currentYearMonth;
    const elapsedDays = isCurr 
      ? getWorkDaysCount(y, m, now.getDate()) 
      : getWorkDaysCount(y, m);

    return {
      selectedYear: y,
      selectedMonthNum: m,
      isCurrentMonth: isCurr,
      elapsedWorkDaysInMonth: Math.max(1, elapsedDays)
    };
  }, [selectedMonth, currentYearMonth]);

  // Calculate monthly stats per department: Attendance, Late Arrivals, Absent Days
  const {
    departmentStats,
    totalAttendanceAll,
    totalLateAll,
    totalAbsentAll,
    overallAttendanceRate,
    overallPunctualityRate,
    topDept
  } = useMemo(() => {
    // 1. Filter check-in records for the selected month
    const monthCheckIns = records.filter(r => 
      r.date && 
      r.date.startsWith(selectedMonth) && 
      r.status === 'success' && 
      r.type === 'check_in'
    );

    // 2. Map of employeeId -> Map of date -> earliest check_in record
    const empDailyCheckIns = new Map<string, Map<string, AttendanceRecord>>();
    monthCheckIns.forEach(r => {
      if (!empDailyCheckIns.has(r.employeeId)) {
        empDailyCheckIns.set(r.employeeId, new Map());
      }
      const dayMap = empDailyCheckIns.get(r.employeeId)!;
      const existing = dayMap.get(r.date);
      if (!existing || r.time < existing.time) {
        dayMap.set(r.date, r);
      }
    });

    // 3. For each employee, compute:
    // - daysPresent (attendance)
    // - lateArrivals
    // - expectedWorkDays
    // - daysAbsent
    interface EmpMonthlySummary {
      employeeId: string;
      daysPresent: number;
      lateArrivals: number;
      expectedWorkDays: number;
      daysAbsent: number;
    }

    const empStatsMap = new Map<string, EmpMonthlySummary>();

    employees.forEach(emp => {
      const dayMap = empDailyCheckIns.get(emp.id) || new Map();
      const daysPresent = dayMap.size;

      // Calculate expected working days for this employee in this month
      let expectedWorkDays = elapsedWorkDaysInMonth;
      if (emp.status === 'resigned' && emp.resignedDate && emp.resignedDate.startsWith(selectedMonth)) {
        const resDate = new Date(emp.resignedDate);
        expectedWorkDays = getWorkDaysCount(selectedYear, selectedMonthNum, resDate.getDate());
      } else if (emp.status === 'resigned' && emp.resignedDate && emp.resignedDate < selectedMonth) {
        expectedWorkDays = 0; // Resigned before this month
      }

      const scheduledStartTime = emp.workStartTime || '08:00';
      const gracePeriodMinutes = emp.lateGracePeriodMinutes ?? 15;
      const startMinutes = timeToMinutes(scheduledStartTime);
      const lateThresholdMinutes = startMinutes + gracePeriodMinutes;

      let lateArrivals = 0;
      dayMap.forEach(record => {
        const scanMinutes = timeToMinutes(record.time);
        if (scanMinutes > lateThresholdMinutes) {
          lateArrivals++;
        }
      });

      const daysAbsent = Math.max(0, expectedWorkDays - daysPresent);

      empStatsMap.set(emp.id, {
        employeeId: emp.id,
        daysPresent,
        lateArrivals,
        expectedWorkDays,
        daysAbsent
      });
    });

    // 4. Department level aggregation
    const stats: DepartmentMonthlyStat[] = departments.map(dept => {
      // Find all employees belonging to this department
      const deptEmployees = employees.filter(e => isEmployeeInDepartment(e, dept));
      const staffCount = deptEmployees.length;

      let totalAttendance = 0;
      let totalLate = 0;
      let totalAbsent = 0;
      let expectedPersonDays = 0;

      deptEmployees.forEach(emp => {
        const empSummary = empStatsMap.get(emp.id);
        if (empSummary) {
          totalAttendance += empSummary.daysPresent;
          totalLate += empSummary.lateArrivals;
          totalAbsent += empSummary.daysAbsent;
          expectedPersonDays += empSummary.expectedWorkDays;
        }
      });

      // Also account for any records where department name matches directly
      // but employee might not be in standard roster
      monthCheckIns.forEach(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        if (!emp && r.department) {
          const matches = 
            dept.name.toLowerCase().includes(r.department.toLowerCase()) ||
            dept.code.toLowerCase() === r.department.toLowerCase();
          if (matches) {
            totalAttendance += 1;
          }
        }
      });

      const attendanceRate = expectedPersonDays > 0 
        ? Math.min(100, Math.round((totalAttendance / expectedPersonDays) * 100)) 
        : 0;
      
      const punctualityRate = totalAttendance > 0 
        ? Math.min(100, Math.round(((totalAttendance - totalLate) / totalAttendance) * 100)) 
        : 100;

      const avgAttendancePerStaff = staffCount > 0 
        ? Math.round((totalAttendance / staffCount) * 10) / 10 
        : 0;

      const colorHex = COLOR_HEX_MAP[dept.color || 'indigo'] || '#6366f1';

      return {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        nameKhmer: dept.nameKhmer,
        displayName: language === 'km' ? (dept.nameKhmer || dept.name) : dept.name,
        managerName: dept.managerName,
        managerNameKhmer: dept.managerNameKhmer,
        color: dept.color || 'indigo',
        colorHex,
        staffCount,
        totalAttendance,
        lateArrivals: totalLate,
        absentDays: totalAbsent,
        expectedPersonDays,
        attendanceRate,
        punctualityRate,
        avgAttendancePerStaff
      };
    });

    // Calculate totals across all departments
    let grandAttendance = 0;
    let grandLate = 0;
    let grandAbsent = 0;
    let grandExpected = 0;

    stats.forEach(d => {
      grandAttendance += d.totalAttendance;
      grandLate += d.lateArrivals;
      grandAbsent += d.absentDays;
      grandExpected += d.expectedPersonDays;
    });

    const grandAttendanceRate = grandExpected > 0 
      ? Math.min(100, Math.round((grandAttendance / grandExpected) * 100)) 
      : 0;

    const grandPunctualityRate = grandAttendance > 0 
      ? Math.min(100, Math.round(((grandAttendance - grandLate) / grandAttendance) * 100)) 
      : 100;

    // Find top department based on attendance rate & total attendance
    const sortedByAttendance = [...stats].sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      return b.totalAttendance - a.totalAttendance;
    });

    const top = sortedByAttendance.length > 0 && sortedByAttendance[0].totalAttendance > 0 
      ? sortedByAttendance[0] 
      : null;

    return {
      departmentStats: stats,
      totalAttendanceAll: grandAttendance,
      totalLateAll: grandLate,
      totalAbsentAll: grandAbsent,
      overallAttendanceRate: grandAttendanceRate,
      overallPunctualityRate: grandPunctualityRate,
      topDept: top
    };
  }, [
    records, 
    selectedMonth, 
    departments, 
    employees, 
    language, 
    elapsedWorkDaysInMonth, 
    selectedYear, 
    selectedMonthNum
  ]);

  // Formatted Month Title
  const formattedMonthTitle = useMemo(() => {
    const opt = monthOptions.find(o => o.value === selectedMonth);
    if (opt) return opt.label;
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', { month: 'long', year: 'numeric' });
  }, [monthOptions, selectedMonth, language]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Department Code',
      'Department Name',
      'Manager',
      'Staff Count',
      'Total Attendance (Days)',
      'Attendance Rate (%)',
      'Late Arrivals (Times)',
      'Absent Days (Days)',
      'Punctuality Rate (%)'
    ];

    const rows = departmentStats.map(d => [
      `"${d.code}"`,
      `"${language === 'km' ? (d.nameKhmer || d.name) : d.name}"`,
      `"${language === 'km' ? (d.managerNameKhmer || d.managerName || 'N/A') : (d.managerName || 'N/A')}"`,
      d.staffCount,
      d.totalAttendance,
      `${d.attendanceRate}%`,
      d.lateArrivals,
      d.absentDays,
      `${d.punctualityRate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
      
      {/* Header with Title & Month Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {t.monthlyReport}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {formattedMonthTitle}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {elapsedWorkDaysInMonth} {t.workDaysElapsed}
              </span>
              {departmentScope && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {departmentScope}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.monthlyReportSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Month Picker, View Switcher & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Month Navigation & Dropdown */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80 shadow-2xs">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              title={t.prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              id="select-monthly-report-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 py-1 px-2 border-0 outline-none cursor-pointer focus:ring-0"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              title={t.nextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Toggle: Bar Chart vs Table */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 text-xs font-medium border border-slate-200/80">
            <button
              id="btn-view-mode-chart"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'chart'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t.chartView}</span>
            </button>
            <button
              id="btn-view-mode-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>{t.tableBreakdown}</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            id="btn-export-monthly-csv"
            onClick={handleExportCSV}
            title={t.exportMonthlyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.exportMonthlyReport}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary Cards: Total Attendance, Late Arrivals, Absent Days, Top Department */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Attendance Card */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl p-4 border border-emerald-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              {t.totalAttendance}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
                {totalAttendanceAll.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {t.daysUnit}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-20 bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${overallAttendanceRate}%` }} 
                />
              </div>
              <span className="text-[11px] font-bold text-emerald-700">
                {overallAttendanceRate}% {t.attendanceRate}
              </span>
            </div>
          </div>
        </div>

        {/* Late Arrivals Card */}
        <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-2xl p-4 border border-amber-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">
              {t.lateArrivals}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-tight">
                {totalLateAll.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-700">
                {t.timesUnit}
              </span>
            </div>
            <p className="text-[11px] text-amber-700/90 mt-1 flex items-center gap-1.5">
              <span>{overallPunctualityRate}% {t.punctualityRate}</span>
            </p>
          </div>
        </div>

        {/* Absent Days Card */}
        <div className="bg-gradient-to-br from-rose-50/70 to-pink-50/40 rounded-2xl p-4 border border-rose-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">
              {t.absentDays}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-950 tracking-tight">
                {totalAbsentAll.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-rose-700">
                {t.daysUnit}
              </span>
            </div>
            <p className="text-[11px] text-rose-700/90 mt-1">
              Across all department staff
            </p>
          </div>
        </div>

        {/* Top Performing Department */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-2xl p-4 border border-indigo-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 truncate pr-1">
              {t.topDepartment}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-bold text-indigo-950 truncate" title={topDept?.displayName}>
              {topDept ? topDept.displayName : '—'}
            </p>
            <p className="text-[11px] font-medium text-indigo-700 mt-1 flex items-center gap-1.5">
              <span>{topDept ? `${topDept.attendanceRate}% ${t.attendanceRate}` : '0%'}</span>
              {topDept && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 font-bold">
                  {topDept.code}
                </span>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Main Visualizer: Recharts Bar Chart or Detailed Table */}
      {viewMode === 'chart' ? (
        <div className="space-y-4">
          
          {/* Chart Metric Mode Toggles & Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {language === 'km' 
                  ? 'ក្រាហ្វិកសសរប្រៀបធៀបតាមផ្នែក (Bar Chart)' 
                  : 'Department Attendance, Late & Absence Comparison'}
              </span>
            </div>

            {/* Quick Metric Toggle Chips */}
            <div className="flex items-center flex-wrap gap-1.5 text-xs">
              <button
                id="btn-metric-all"
                onClick={() => setChartMetricFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartMetricFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.allMetrics}
              </button>

              <button
                id="btn-metric-attendance"
                onClick={() => setChartMetricFilter('attendance')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  chartMetricFilter === 'attendance'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t.totalAttendance}</span>
              </button>

              <button
                id="btn-metric-late"
                onClick={() => setChartMetricFilter('late')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  chartMetricFilter === 'late'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{t.lateArrivals}</span>
              </button>

              <button
                id="btn-metric-absent"
                onClick={() => setChartMetricFilter('absent')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  chartMetricFilter === 'absent'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{t.absentDays}</span>
              </button>

              <button
                id="btn-metric-stacked"
                onClick={() => setChartMetricFilter('stacked')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  chartMetricFilter === 'stacked'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{t.stackedView}</span>
              </button>
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          {departmentStats.length === 0 || totalAttendanceAll === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
              <Clock className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-sm font-medium">{t.noMonthlyData}</p>
            </div>
          ) : (
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentStats}
                  margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                  barGap={chartMetricFilter === 'all' ? 4 : 8}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis
                    dataKey="code"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    interval={0}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    unit={` ${t.daysUnit}`}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DepartmentMonthlyStat;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-2.5 min-w-[220px]">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                              <span className="font-bold text-sm text-white flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: data.colorHex }} 
                                />
                                <span className="truncate">{data.displayName}</span>
                              </span>
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-semibold">
                                {data.code}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-slate-300">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">{t.staffCount}:</span>
                                <span className="font-semibold text-white">
                                  {data.staffCount} {language === 'km' ? 'នាក់' : 'staff'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span>{t.totalAttendance}:</span>
                                </span>
                                <span className="font-bold text-emerald-400">
                                  {data.totalAttendance} {t.daysUnit} ({data.attendanceRate}%)
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1 text-amber-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  <span>{t.lateArrivals}:</span>
                                </span>
                                <span className="font-bold text-amber-400">
                                  {data.lateArrivals} {t.timesUnit}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1 text-rose-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                  <span>{t.absentDays}:</span>
                                </span>
                                <span className="font-bold text-rose-400">
                                  {data.absentDays} {t.daysUnit}
                                </span>
                              </div>

                              <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                                <span className="text-slate-400">{t.punctualityRate}:</span>
                                <span className="font-bold text-indigo-300">
                                  {data.punctualityRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Render bars based on metric toggle */}
                  {(chartMetricFilter === 'all' || chartMetricFilter === 'attendance') && (
                    <Bar
                      dataKey="totalAttendance"
                      name={t.totalAttendance}
                      fill={METRIC_COLORS.attendance}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  )}

                  {(chartMetricFilter === 'all' || chartMetricFilter === 'late') && (
                    <Bar
                      dataKey="lateArrivals"
                      name={t.lateArrivals}
                      fill={METRIC_COLORS.late}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  )}

                  {(chartMetricFilter === 'all' || chartMetricFilter === 'absent') && (
                    <Bar
                      dataKey="absentDays"
                      name={t.absentDays}
                      fill={METRIC_COLORS.absent}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    />
                  )}

                  {chartMetricFilter === 'stacked' && (
                    <>
                      <Bar
                        dataKey="totalAttendance"
                        name={t.totalAttendance}
                        stackId="a"
                        fill={METRIC_COLORS.attendance}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={44}
                      />
                      <Bar
                        dataKey="lateArrivals"
                        name={t.lateArrivals}
                        stackId="a"
                        fill={METRIC_COLORS.late}
                        radius={[0, 0, 0, 0]}
                        maxBarSize={44}
                      />
                      <Bar
                        dataKey="absentDays"
                        name={t.absentDays}
                        stackId="a"
                        fill={METRIC_COLORS.absent}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={44}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Visual Legend Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 pb-1 text-xs border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700">{t.totalAttendance}</span>
              <span className="text-slate-400 font-mono">({totalAttendanceAll} {t.daysUnit})</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700">{t.lateArrivals}</span>
              <span className="text-slate-400 font-mono">({totalLateAll} {t.timesUnit})</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
              <span className="font-semibold text-slate-700">{t.absentDays}</span>
              <span className="text-slate-400 font-mono">({totalAbsentAll} {t.daysUnit})</span>
            </div>
          </div>

          {/* Department Legend Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {departmentStats.map(dept => (
              <div
                key={dept.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: dept.colorHex }}
                />
                <span className="font-semibold">{dept.code}</span>
                <span className="text-slate-500 truncate max-w-[120px]">{dept.displayName}</span>
                <span className="font-bold text-emerald-700 ml-1">
                  {dept.totalAttendance}d
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-amber-700">
                  {dept.lateArrivals}L
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Detailed Department Breakdown Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{language === 'km' ? 'ផ្នែក' : 'Department'}</th>
                <th className="px-4 py-3">{language === 'km' ? 'ប្រធានផ្នែក' : 'Manager'}</th>
                <th className="px-4 py-3 text-center">{t.staffCount}</th>
                <th className="px-4 py-3 text-center text-emerald-800">{t.totalAttendance}</th>
                <th className="px-4 py-3 text-center text-amber-800">{t.lateArrivals}</th>
                <th className="px-4 py-3 text-center text-rose-800">{t.absentDays}</th>
                <th className="px-4 py-3 text-right">{t.attendanceRate}</th>
                <th className="px-4 py-3 text-right">{t.punctualityRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {departmentStats.map((dept) => {
                const manager = language === 'km' 
                  ? (dept.managerNameKhmer || dept.managerName || '—') 
                  : (dept.managerName || '—');

                return (
                  <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: dept.colorHex }}
                      />
                      <div>
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">
                          {dept.displayName}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {dept.code}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {manager}
                    </td>

                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {dept.staffCount}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        {dept.totalAttendance} {t.daysUnit}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        {dept.lateArrivals} {t.timesUnit}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-semibold border border-rose-200">
                        {dept.absentDays} {t.daysUnit}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${dept.attendanceRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 w-9 text-right">
                          {dept.attendanceRate}%
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                      <span className={dept.punctualityRate >= 80 ? 'text-indigo-700' : 'text-amber-700'}>
                        {dept.punctualityRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
