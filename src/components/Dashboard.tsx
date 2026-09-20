import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Percent, 
  QrCode, 
  Clock, 
  Calendar, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  Building2,
  Shield,
  Briefcase,
  Filter
} from 'lucide-react';
import { Language, AppSettings, AttendanceRecord, DailySummary, UserAccount, Department } from '../types';
import { translations } from '../i18n/translations';
import { getStoredEmployees } from '../data/mockEmployees';
import { getStoredDepartments, isEmployeeInDepartment } from '../data/mockDepartments';
import { calculateDailySummary } from '../services/attendanceService';
import { WeeklyTrendsChart } from './WeeklyTrendsChart';
import { MonthlyReport } from './MonthlyReport';

interface DashboardProps {
  language: Language;
  settings: AppSettings;
  records: AttendanceRecord[];
  onOpenScanner: () => void;
  onOpenHistory: () => void;
  currentUser?: UserAccount;
}

export const Dashboard: React.FC<DashboardProps> = ({
  language,
  settings,
  records,
  onOpenScanner,
  onOpenHistory,
  currentUser
}) => {
  const t = translations[language];
  const isManager = currentUser?.role === 'manager';
  const isAdmin = currentUser?.role === 'admin';

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const storedEmployees = useMemo(() => getStoredEmployees(), []);

  // Configured departments strictly loaded from Department Management
  const [configuredDepartments, setConfiguredDepartments] = useState<Department[]>(() => getStoredDepartments());

  // Listen to updates from Department Management or cross-tab storage
  useEffect(() => {
    const handleDeptSync = () => {
      setConfiguredDepartments(getStoredDepartments());
    };
    window.addEventListener('storage', handleDeptSync);
    window.addEventListener('departments-updated', handleDeptSync);
    return () => {
      window.removeEventListener('storage', handleDeptSync);
      window.removeEventListener('departments-updated', handleDeptSync);
    };
  }, []);

  // Admin-specific department filter (all or department id)
  const [adminDeptFilter, setAdminDeptFilter] = useState<string>('all');

  // Selected department configured in Department Management
  const selectedDeptObj = useMemo<Department | null>(() => {
    if (adminDeptFilter === 'all') return null;
    return configuredDepartments.find(d => d.id === adminDeptFilter) || null;
  }, [adminDeptFilter, configuredDepartments]);

  // Manager's configured department
  const managerDeptObj = useMemo<Department | null>(() => {
    if (!isManager || !currentUser?.department) return null;
    const normUserDept = currentUser.department.toLowerCase();
    return configuredDepartments.find(d => {
      const dName = d.name.toLowerCase();
      const dCode = d.code.toLowerCase();
      const dId = d.id.toLowerCase();
      return dName.includes(normUserDept) || normUserDept.includes(dName) || dCode === normUserDept || dId === normUserDept;
    }) || null;
  }, [isManager, currentUser, configuredDepartments]);

  // Scoped employees list
  const scopedEmployees = useMemo(() => {
    if (isManager) {
      if (managerDeptObj) {
        return storedEmployees.filter(e => isEmployeeInDepartment(e, managerDeptObj));
      }
      const mgrDept = (currentUser?.department || '').toLowerCase();
      return storedEmployees.filter(e => (e.department || '').toLowerCase().includes(mgrDept));
    }

    if (!selectedDeptObj) return storedEmployees;

    return storedEmployees.filter(e => isEmployeeInDepartment(e, selectedDeptObj));
  }, [storedEmployees, isManager, currentUser, managerDeptObj, selectedDeptObj]);

  // Scoped attendance records
  const scopedRecords = useMemo(() => {
    if (!isManager && !selectedDeptObj) return records;
    const scopedEmpIds = new Set(scopedEmployees.map(e => e.id));
    return records.filter(r => scopedEmpIds.has(r.employeeId));
  }, [records, isManager, selectedDeptObj, scopedEmployees]);

  const summary: DailySummary = useMemo(() => {
    return calculateDailySummary(scopedRecords, scopedEmployees.length);
  }, [scopedRecords, scopedEmployees]);

  // Filter for recent scans feed
  const [feedFilter, setFeedFilter] = useState<'all' | 'check_in' | 'check_out'>('all');

  const filteredScans = useMemo(() => {
    return scopedRecords
      .filter(r => feedFilter === 'all' || r.type === feedFilter)
      .slice(0, 10); // Show latest 10 scans
  }, [scopedRecords, feedFilter]);

  const formattedDate = currentTime.toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString(language === 'km' ? 'km-KH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Centered Refined Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/20 px-6 py-8 sm:py-10 text-white shadow-xl">
        
        {/* Soft Ambient Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-3.5 max-w-2xl mx-auto">
          {/* Centered Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន' : t.appName}
          </h1>

          {/* Centered Date & Live Clock Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs sm:text-sm text-indigo-200/90 pt-0.5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="font-semibold text-white tracking-wider">{formattedTime}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Role-Based Department Scope Banner / Filter */}
      {isManager ? (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50/70 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {t.managerDeptScope}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                  {language === 'km' ? currentUser?.departmentKhmer : currentUser?.department}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {t.managerDeptNotice} ({scopedEmployees.length} {language === 'km' ? 'នាក់' : 'members'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-800 shadow-2xs">
              {language === 'km' ? 'បុគ្គលិកក្នុងផ្នែក៖' : 'Team Roster:'} <span className="font-bold text-indigo-950">{scopedEmployees.length}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">
                  {language === 'km' ? 'សិទ្ធិមើលគ្រប់ផ្នែកទាំងអស់ (Admin Company-Wide)' : 'Company-Wide Overview (All Departments)'}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === 'km' ? 'ចុចលើផ្នែកខាងក្រោមដើម្បីចម្រាញ់ទិន្នន័យ ឬមើលទាំងអស់' : 'Filter metrics and scans by department or view company-wide totals'}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
              {language === 'km' ? 'សរុបបុគ្គលិកទាំងអស់៖' : 'Total Company Staff:'} <span className="font-bold text-slate-800">{storedEmployees.length}</span>
            </div>
          </div>

          {/* Department Filter Pills for Admin: ONLY show departments configured in Department Management */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              id="admin-filter-dept-all"
              onClick={() => setAdminDeptFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                adminDeptFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {language === 'km' ? 'គ្រប់ផ្នែកទាំងអស់' : 'All Departments'} ({storedEmployees.length})
            </button>

            {configuredDepartments.map((dept) => {
              const count = storedEmployees.filter(e => isEmployeeInDepartment(e, dept)).length;
              const isSelected = adminDeptFilter === dept.id;
              const displayName = language === 'km' ? (dept.nameKhmer || dept.name) : dept.name;

              return (
                <button
                  key={dept.id}
                  id={`admin-filter-dept-${dept.id}`}
                  onClick={() => setAdminDeptFilter(dept.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`${dept.code} • ${dept.name}`}
                >
                  <span>{displayName}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Staff */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              {t.totalStaff}
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {summary.totalEmployees}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered Staff Roster
            </p>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-emerald-700">
              {t.presentToday}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-950 tracking-tight">
                {summary.presentToday}
              </p>
              <span className="text-xs font-semibold text-emerald-700">
                / {summary.totalEmployees}
              </span>
            </div>
            <div className="mt-2 w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${summary.attendanceRate}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Currently In */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-indigo-700">
              {t.currentlyIn}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight">
              {summary.checkedInNow}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Active on Premises
            </p>
          </div>
        </div>

        {/* Checked Out */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              {t.checkedOut}
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {summary.checkedOutToday}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed Shifts
            </p>
          </div>
        </div>

      </div>

      {/* Monthly Report: Summary of Total Hours Worked by Department using Recharts Bar Chart */}
      <MonthlyReport
        records={records}
        departments={configuredDepartments}
        employees={storedEmployees}
        language={language}
        departmentScope={
          isManager
            ? (language === 'km' ? currentUser?.departmentKhmer : currentUser?.department)
            : selectedDeptObj
              ? (language === 'km' ? (selectedDeptObj.nameKhmer || selectedDeptObj.name) : selectedDeptObj.name)
              : null
        }
      />

      {/* Weekly Attendance Trends Chart */}
      <WeeklyTrendsChart
        records={scopedRecords}
        language={language}
        departmentScope={
          isManager
            ? (language === 'km' ? currentUser?.departmentKhmer : currentUser?.department)
            : selectedDeptObj
              ? (language === 'km' ? (selectedDeptObj.nameKhmer || selectedDeptObj.name) : selectedDeptObj.name)
              : null
        }
      />

      {/* Recent Scans Live Feed Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t.recentScansFeed}
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audit stream of attendance scans
            </p>
          </div>

          {/* Quick Type Filter & History Link */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFeedFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  feedFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                {t.allTypes}
              </button>
              <button
                onClick={() => setFeedFilter('check_in')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  feedFilter === 'check_in' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                {t.checkIn}
              </button>
              <button
                onClick={() => setFeedFilter('check_out')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  feedFilter === 'check_out' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                {t.checkOut}
              </button>
            </div>

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 transition-colors"
            >
              <span>{t.viewAllHistory}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scans List */}
        {filteredScans.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-sm font-medium">{t.noScansToday}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredScans.map((rec) => {
              const emp = storedEmployees.find(e => e.id === rec.employeeId);
              const avatar = emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
              const displayName = language === 'km' && emp ? emp.fullNameKhmer : rec.fullName;

              return (
                <div key={rec.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                  
                  {/* Left: Avatar & Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={avatar} 
                      alt={rec.fullName}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {displayName}
                        </p>
                        <span className="text-xs font-mono text-slate-400">
                          {rec.employeeId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {rec.department || 'General'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Type, Time & Sync Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        rec.type === 'check_in' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {rec.type === 'check_in' ? t.checkIn : t.checkOut}
                      </span>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {rec.time}
                      </p>
                    </div>

                    {/* Sync Indicator */}
                    <span 
                      title={rec.syncedToGoogleSheet ? 'Synced with Google Sheet' : 'Saved Locally'}
                      className="w-2 h-2 rounded-full"
                    >
                      {rec.syncedToGoogleSheet ? (
                        <span className="w-2 h-2 block rounded-full bg-emerald-500" />
                      ) : (
                        <span className="w-2 h-2 block rounded-full bg-amber-400" />
                      )}
                    </span>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
