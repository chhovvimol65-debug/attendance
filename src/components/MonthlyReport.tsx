import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
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
  TableProperties,
  Sparkles
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

interface DepartmentMonthlyStat {
  id: string;
  code: string;
  name: string;
  nameKhmer: string;
  displayName: string;
  managerName?: string;
  managerNameKhmer?: string;
  color: string;
  colorHex: string;
  totalHours: number;
  shiftCount: number;
  activeStaffCount: number;
  avgHoursPerStaff: number;
  percentageOfTotal: number;
}

// Map department color names to vibrant hex colors for Recharts
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

  // Calculate monthly stats per department
  const { departmentStats, totalHoursAll, totalShiftsAll, topDept, avgHoursOverall } = useMemo(() => {
    // 1. Filter successful records for the selected month
    const monthRecords = records.filter(r => 
      r.date && r.date.startsWith(selectedMonth) && r.status === 'success'
    );

    // 2. Group records by (employeeId + date) to calculate hours worked
    interface Shift {
      checkInTime?: number;
      checkOutTime?: number;
      empId: string;
      deptName: string;
      date: string;
    }

    const shiftsMap = new Map<string, Shift>();

    monthRecords.forEach(r => {
      const key = `${r.employeeId}_${r.date}`;
      if (!shiftsMap.has(key)) {
        shiftsMap.set(key, {
          empId: r.employeeId,
          deptName: r.department || '',
          date: r.date
        });
      }
      const shift = shiftsMap.get(key)!;
      const recTime = new Date(r.timestamp).getTime();

      if (r.type === 'check_in') {
        if (!shift.checkInTime || recTime < shift.checkInTime) {
          shift.checkInTime = recTime;
        }
      } else if (r.type === 'check_out') {
        if (!shift.checkOutTime || recTime > shift.checkOutTime) {
          shift.checkOutTime = recTime;
        }
      }
    });

    // Employee department lookup
    const empDeptMap = new Map<string, Employee>();
    employees.forEach(e => empDeptMap.set(e.id, e));

    // Department aggregated data
    // Key: department ID
    const deptAccumulator = new Map<string, {
      totalHours: number;
      shifts: number;
      employees: Set<string>;
    }>();

    // Initialize all configured departments so every department appears
    departments.forEach(dept => {
      deptAccumulator.set(dept.id, {
        totalHours: 0,
        shifts: 0,
        employees: new Set<string>()
      });
    });

    const isCurrentMonth = selectedMonth === currentYearMonth;
    const todayStr = now.toISOString().split('T')[0];

    // Compute hours for each shift
    shiftsMap.forEach(shift => {
      let durationHours = 0;

      if (shift.checkInTime && shift.checkOutTime && shift.checkOutTime > shift.checkInTime) {
        durationHours = (shift.checkOutTime - shift.checkInTime) / (1000 * 60 * 60);
      } else if (shift.checkInTime && !shift.checkOutTime && isCurrentMonth && shift.date === todayStr) {
        // Active shift in progress today
        const elapsed = (Date.now() - shift.checkInTime) / (1000 * 60 * 60);
        durationHours = Math.max(0.5, Math.min(10, elapsed));
      }

      // Filter out unreasonable outliers (e.g. > 16 hours)
      durationHours = Math.min(16, Math.max(0, durationHours));

      if (durationHours > 0) {
        // Resolve target department
        const emp = empDeptMap.get(shift.empId);
        let matchedDept = departments.find(d => emp && isEmployeeInDepartment(emp, d));

        if (!matchedDept && shift.deptName) {
          matchedDept = departments.find(d => 
            d.name.toLowerCase().includes(shift.deptName.toLowerCase()) ||
            d.code.toLowerCase() === shift.deptName.toLowerCase() ||
            (d.nameKhmer && d.nameKhmer.includes(shift.deptName))
          );
        }

        // Fallback to first department or 'dept-eng' if not resolved
        const deptId = matchedDept ? matchedDept.id : (departments[0]?.id || 'other');

        if (!deptAccumulator.has(deptId)) {
          deptAccumulator.set(deptId, {
            totalHours: 0,
            shifts: 0,
            employees: new Set<string>()
          });
        }

        const data = deptAccumulator.get(deptId)!;
        data.totalHours += durationHours;
        data.shifts += 1;
        data.employees.add(shift.empId);
      }
    });

    // Compute total company hours
    let grandTotalHours = 0;
    let grandTotalShifts = 0;
    const allActiveStaff = new Set<string>();

    deptAccumulator.forEach(d => {
      grandTotalHours += d.totalHours;
      grandTotalShifts += d.shifts;
      d.employees.forEach(id => allActiveStaff.add(id));
    });

    // Build final stats array
    const stats: DepartmentMonthlyStat[] = departments.map(dept => {
      const data = deptAccumulator.get(dept.id) || { totalHours: 0, shifts: 0, employees: new Set<string>() };
      const hours = Math.round(data.totalHours * 10) / 10;
      const staffCount = data.employees.size;
      const avg = staffCount > 0 ? Math.round((hours / staffCount) * 10) / 10 : 0;
      const pct = grandTotalHours > 0 ? Math.round((hours / grandTotalHours) * 100) : 0;
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
        totalHours: hours,
        shiftCount: data.shifts,
        activeStaffCount: staffCount,
        avgHoursPerStaff: avg,
        percentageOfTotal: pct
      };
    });

    // Sort by total hours descending for optimal visual presentation
    stats.sort((a, b) => b.totalHours - a.totalHours);

    // Find top department
    const top = stats.length > 0 && stats[0].totalHours > 0 ? stats[0] : null;
    const overallAvg = allActiveStaff.size > 0 
      ? Math.round((grandTotalHours / allActiveStaff.size) * 10) / 10 
      : 0;

    return {
      departmentStats: stats,
      totalHoursAll: Math.round(grandTotalHours * 10) / 10,
      totalShiftsAll: grandTotalShifts,
      topDept: top,
      avgHoursOverall: overallAvg
    };
  }, [records, selectedMonth, departments, employees, language, currentYearMonth]);

  // Formatted Month Label
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
      'Active Staff Count',
      'Completed Shifts',
      'Total Hours Worked',
      'Avg Hours / Staff',
      'Share (%)'
    ];

    const rows = departmentStats.map(d => [
      `"${d.code}"`,
      `"${language === 'km' ? (d.nameKhmer || d.name) : d.name}"`,
      `"${language === 'km' ? (d.managerNameKhmer || d.managerName || 'N/A') : (d.managerName || 'N/A')}"`,
      d.activeStaffCount,
      d.shiftCount,
      d.totalHours,
      d.avgHoursPerStaff,
      `${d.percentageOfTotal}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Hours_Report_${selectedMonth}.csv`);
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
              onClick={handlePrevMonth}
              title={t.prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
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
              onClick={handleNextMonth}
              title={t.nextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Toggle: Chart vs Table */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 text-xs font-medium border border-slate-200/80">
            <button
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
            onClick={handleExportCSV}
            title={t.exportMonthlyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.exportMonthlyReport}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Hours Worked */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 rounded-2xl p-4 border border-indigo-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">
              {t.totalHoursWorked}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-950 tracking-tight">
                {totalHoursAll.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {t.hoursUnit}
              </span>
            </div>
            <p className="text-[11px] text-indigo-600/80 mt-0.5">
              Across all department shifts
            </p>
          </div>
        </div>

        {/* Top Department */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl p-4 border border-emerald-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 truncate pr-1">
              {t.topDepartment}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-base sm:text-lg font-bold text-emerald-950 truncate" title={topDept?.displayName}>
              {topDept ? topDept.displayName : '—'}
            </p>
            <p className="text-[11px] font-medium text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span>{topDept ? `${topDept.totalHours} ${t.hoursUnit}` : '0'}</span>
              {topDept && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-900 font-bold">
                  {topDept.percentageOfTotal}% share
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Avg Hours / Staff */}
        <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/40 rounded-2xl p-4 border border-purple-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">
              {t.avgHoursPerStaff}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-purple-950 tracking-tight">
                {avgHoursOverall}
              </span>
              <span className="text-xs font-bold text-purple-600">
                {t.hoursUnit}
              </span>
            </div>
            <p className="text-[11px] text-purple-600/80 mt-0.5">
              Average per active team member
            </p>
          </div>
        </div>

        {/* Completed Shifts */}
        <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-2xl p-4 border border-amber-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">
              {t.completedShifts}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-tight">
              {totalShiftsAll}
            </span>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              Logged check-out sessions
            </p>
          </div>
        </div>

      </div>

      {/* Main Content: Recharts Bar Chart or Detailed Table */}
      {viewMode === 'chart' ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {language === 'km' ? 'ក្រាហ្វិកម៉ោងការងារតាមផ្នែក (ម៉ោង)' : 'Total Hours Worked by Department'}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>{language === 'km' ? 'ម៉ោងការងារ' : 'Hours Worked'}</span>
              </span>
            </div>
          </div>

          {totalHoursAll === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
              <Clock className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-sm font-medium">{t.noMonthlyData}</p>
            </div>
          ) : (
            <div className="h-72 sm:h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentStats}
                  margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
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
                    unit={` ${t.hoursUnit}`}
                  />

                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DepartmentMonthlyStat;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[200px]">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                              <span className="font-bold text-sm text-white flex items-center gap-1.5">
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

                            <div className="space-y-1 text-slate-300">
                              <div className="flex justify-between items-center">
                                <span>{t.totalHoursWorked}:</span>
                                <span className="font-bold text-emerald-400 text-sm">
                                  {data.totalHours} {t.hoursUnit}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>{language === 'km' ? 'បុគ្គលិកសកម្ម' : 'Active Staff'}:</span>
                                <span className="font-semibold text-white">
                                  {data.activeStaffCount} {language === 'km' ? 'នាក់' : 'members'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>{t.avgHoursPerStaff}:</span>
                                <span className="font-semibold text-white">
                                  {data.avgHoursPerStaff} {t.hoursUnit}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>{language === 'km' ? 'ចំណែកភាគរយ' : 'Share of Total'}:</span>
                                <span className="font-bold text-indigo-300">
                                  {data.percentageOfTotal}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Bar
                    dataKey="totalHours"
                    name={t.totalHoursWorked}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={54}
                  >
                    {departmentStats.map((entry) => (
                      <Cell key={entry.id} fill={entry.colorHex} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department Legend Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
                <span className="font-mono text-slate-900 font-bold ml-1">
                  {dept.totalHours}h
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
                <th className="px-4 py-3 text-center">{language === 'km' ? 'បុគ្គលិក' : 'Staff'}</th>
                <th className="px-4 py-3 text-center">{t.completedShifts}</th>
                <th className="px-4 py-3 text-right">{t.totalHoursWorked}</th>
                <th className="px-4 py-3 text-right">{t.avgHoursPerStaff}</th>
                <th className="px-4 py-3 text-right">{language === 'km' ? 'ចំណែក %' : 'Share %'}</th>
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
                      {dept.activeStaffCount}
                    </td>

                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {dept.shiftCount}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      <span className="text-emerald-700">{dept.totalHours}</span> {t.hoursUnit}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                      {dept.avgHoursPerStaff} {t.hoursUnit}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${dept.percentageOfTotal}%`,
                              backgroundColor: dept.colorHex
                            }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 w-8 text-right">
                          {dept.percentageOfTotal}%
                        </span>
                      </div>
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
