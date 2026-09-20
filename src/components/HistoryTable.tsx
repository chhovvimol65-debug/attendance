import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  CheckCircle2, 
  CloudOff, 
  ArrowUpDown,
  Calendar,
  Layers,
  FileSpreadsheet,
  Building2,
  Shield
} from 'lucide-react';
import { Language, AttendanceRecord, UserAccount, Department } from '../types';
import { translations } from '../i18n/translations';
import { getStoredEmployees } from '../data/mockEmployees';
import { getStoredDepartments, isEmployeeInDepartment } from '../data/mockDepartments';

interface HistoryTableProps {
  language: Language;
  records: AttendanceRecord[];
  onClearRecords: () => void;
  currentUser?: UserAccount;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  language,
  records,
  onClearRecords,
  currentUser
}) => {
  const t = translations[language];
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isStaff = currentUser?.role === 'staff';
  const managerDept = currentUser?.department;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'check_in' | 'check_out'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [staffOnlyFilter, setStaffOnlyFilter] = useState<boolean>(isStaff);

  const storedEmployees = useMemo(() => getStoredEmployees(), []);

  const [configuredDepartments, setConfiguredDepartments] = useState<Department[]>(() => getStoredDepartments());

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

  const selectedDeptObj = useMemo<Department | null>(() => {
    if (selectedDepartment === 'all') return null;
    return configuredDepartments.find(d => d.id === selectedDepartment) || null;
  }, [selectedDepartment, configuredDepartments]);

  // Extract distinct dates from records
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.date)));
    return dates.sort().reverse();
  }, [records]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const emp = storedEmployees.find(e => e.id === r.employeeId);

        // Staff self filter
        if (staffOnlyFilter && currentUser?.employeeId && r.employeeId !== currentUser.employeeId) {
          return false;
        }

        // Manager department scope constraint
        if (isManager && managerDept) {
          const deptMatch = (r.department && r.department.toLowerCase() === managerDept.toLowerCase()) || 
                            (emp && emp.department.toLowerCase() === managerDept.toLowerCase());
          if (!deptMatch) return false;
        }

        // Admin department filter
        if (isAdmin && selectedDeptObj) {
          if (emp) {
            if (!isEmployeeInDepartment(emp, selectedDeptObj)) return false;
          } else {
            const rDept = (r.department || '').toLowerCase();
            const dName = selectedDeptObj.name.toLowerCase();
            if (!rDept.includes(dName) && !dName.includes(rDept)) return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = r.employeeId.toLowerCase().includes(q);
          const matchName = r.fullName.toLowerCase().includes(q);
          const matchDept = (r.department || emp?.department || '').toLowerCase().includes(q);
          const matchKhmer = emp?.fullNameKhmer.includes(q) || false;

          if (!matchId && !matchName && !matchDept && !matchKhmer) {
            return false;
          }
        }

        // Date filter
        if (selectedDate !== 'all' && r.date !== selectedDate) {
          return false;
        }

        // Action type filter
        if (selectedType !== 'all' && r.type !== selectedType) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [records, searchQuery, selectedDate, selectedType, sortOrder]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Record ID', 'Request ID', 'Client ID', 'Employee ID', 'Full Name', 'Department', 'Action', 'Date', 'Time', 'Timestamp', 'Synced'];
    const rows = filteredRecords.map(r => [
      r.id,
      r.requestId,
      r.clientId,
      r.employeeId,
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      r.type,
      r.date,
      r.time,
      r.timestamp,
      r.syncedToGoogleSheet ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearWithPrompt = () => {
    if (window.confirm(t.confirmClear)) {
      onClearRecords();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.historyTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t.historySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsv}</span>
          </button>

          {isAdmin ? (
            <button
              id="btn-clear-logs"
              onClick={handleClearWithPrompt}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 disabled:opacity-40 border border-slate-200 rounded-xl text-sm font-medium transition-colors"
              title={t.clearLogs}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div 
              className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-400 cursor-not-allowed hidden sm:block"
              title={t.adminOnlyClear}
            >
              Admin Clear Only
            </div>
          )}
        </div>
      </div>

      {/* Staff Self Filter Switch if Staff */}
      {isStaff && (
        <div className="flex items-center gap-2 bg-indigo-50/60 p-2.5 rounded-2xl border border-indigo-100">
          <button
            onClick={() => setStaffOnlyFilter(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              staffOnlyFilter 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-indigo-700 hover:bg-indigo-100/60'
            }`}
          >
            My Records ({currentUser?.employeeId})
          </button>
          <button
            onClick={() => setStaffOnlyFilter(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !staffOnlyFilter 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-indigo-700 hover:bg-indigo-100/60'
            }`}
          >
            All Company Records
          </button>
        </div>
      )}

      {/* Manager Department Scope Banner */}
      {isManager && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong className="font-bold">{t.managerDeptScope}:</strong> {language === 'km' ? currentUser?.departmentKhmer : currentUser?.department}
            </span>
            <span className="text-indigo-600 hidden sm:inline">
              — {t.managerDeptNotice}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold text-[11px] shrink-0">
            {filteredRecords.length} {language === 'km' ? 'កំណត់ត្រា' : 'records'}
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-history-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Department Filter (Admin can choose all, Manager is fixed) */}
          <div>
            {isAdmin ? (
              <select
                id="select-history-department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{language === 'km' ? 'គ្រប់ផ្នែកទាំងអស់' : 'All Departments'}</option>
                {configuredDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {language === 'km' ? (dept.nameKhmer || dept.name) : dept.name}
                  </option>
                ))}
              </select>
            ) : isManager ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 truncate">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{managerDept}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 truncate">
                <span>{currentUser?.department || 'My Department'}</span>
              </div>
            )}
          </div>

          {/* Date Filter */}
          <div>
            <select
              id="select-history-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t.allDates}</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <select
              id="select-history-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t.allTypes}</option>
              <option value="check_in">{t.checkIn}</option>
              <option value="check_out">{t.checkOut}</option>
            </select>
          </div>

        </div>

        {/* Counter & Sort Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            {t.totalRecords}: <strong className="text-slate-800">{filteredRecords.length}</strong>
          </span>

          <button
            id="btn-sort-order"
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileSpreadsheet className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-sm font-medium">{t.noRecordsFound}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{t.tableEmpId}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t.tableName}</th>
                  <th className="py-3.5 px-4 sm:px-6 hidden md:table-cell">{t.tableDepartment}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t.tableType}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t.tableTime}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const emp = storedEmployees.find(e => e.id === r.employeeId);
                  const avatar = emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                  const displayName = language === 'km' && emp ? emp.fullNameKhmer : r.fullName;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* ID */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-semibold text-slate-700">
                        {r.employeeId}
                      </td>

                      {/* Name + Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={avatar} 
                            alt={r.fullName} 
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-semibold text-slate-900">
                            {displayName}
                          </span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-600 hidden md:table-cell">
                        {r.department || 'General'}
                      </td>

                      {/* Action Type */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.type === 'check_in'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {r.type === 'check_in' ? t.checkIn : t.checkOut}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="text-slate-900 font-medium">{r.time}</div>
                        <div className="text-xs text-slate-400 font-mono">{r.date}</div>
                      </td>

                      {/* Cloud Sync Status */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {r.syncedToGoogleSheet ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Synced</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <CloudOff className="w-3 h-3 text-amber-600" />
                            <span>Local</span>
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
