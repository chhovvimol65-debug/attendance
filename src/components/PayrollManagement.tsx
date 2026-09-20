import React, { useState, useMemo, useEffect } from 'react';
import { 
  CircleDollarSign, 
  Sparkles, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ArrowDownRight, 
  Building2, 
  ChevronRight,
  TrendingDown,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  DollarSign,
  Loader2,
  CheckSquare,
  Square,
  FileDown,
  Layers,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  Employee, 
  AttendanceRecord, 
  EmployeePayrollItem, 
  PayrollPeriod, 
  Language, 
  UserAccount 
} from '../types';
import { getStoredEmployees } from '../data/mockEmployees';
import { 
  generateCompanyPayroll, 
  getSavedPayrollPeriods, 
  savePayrollPeriod, 
  getWorkDaysInMonth 
} from '../services/payrollService';
import { exportPayslipsToPdf, PdfExportProgress } from '../services/pdfService';
import { PayslipModal } from './PayslipModal';

interface PayrollManagementProps {
  language: Language;
  currentUser: UserAccount;
  records: AttendanceRecord[];
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({
  language,
  currentUser,
  records
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Late scan deduction configuration
  const [deductionMethod, setDeductionMethod] = useState<'fixed_per_late' | 'hourly_prorated'>('fixed_per_late');
  const [fixedDeductionPerLate, setFixedDeductionPerLate] = useState<number>(2.0); // $2 per late check-in
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);

  // Active employee list
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());

  // Current calculated payroll period
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [selectedPayslipItem, setSelectedPayslipItem] = useState<EmployeePayrollItem | null>(null);

  // Employee selection for batch PDF export
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<PdfExportProgress | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [singleExportingId, setSingleExportingId] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Re-sync employees on custom events
  useEffect(() => {
    const handleEmpSync = () => setEmployees(getStoredEmployees());
    window.addEventListener('storage', handleEmpSync);
    window.addEventListener('employees-updated', handleEmpSync);
    return () => {
      window.removeEventListener('storage', handleEmpSync);
      window.removeEventListener('employees-updated', handleEmpSync);
    };
  }, []);

  // Compute or load payroll on change of month/year/records
  const runPayrollCalculation = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const generated = generateCompanyPayroll(employees, records, {
        month: selectedMonth,
        year: selectedYear,
        gracePeriodMinutes,
        deductionMethod,
        fixedDeductionPerLate
      });
      setCurrentPeriod(generated);
      setIsCalculating(false);
    }, 200);
  };

  useEffect(() => {
    runPayrollCalculation();
  }, [selectedMonth, selectedYear, deductionMethod, fixedDeductionPerLate, gracePeriodMinutes, employees, records]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered payroll items
  const filteredItems = useMemo(() => {
    if (!currentPeriod) return [];
    return currentPeriod.items.filter(item => {
      const matchesDept = departmentFilter === 'all' || item.department === departmentFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.fullName.toLowerCase().includes(query) ||
        item.fullNameKhmer.includes(query) ||
        item.employeeId.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query);
      return matchesDept && matchesSearch;
    });
  }, [currentPeriod, departmentFilter, searchQuery]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (!filteredItems.length) {
      return {
        totalBase: 0,
        totalLateDeductions: 0,
        totalNet: 0,
        totalLateScans: 0,
        totalLateMinutes: 0
      };
    }
    return filteredItems.reduce(
      (acc, item) => ({
        totalBase: acc.totalBase + item.baseSalary,
        totalLateDeductions: acc.totalLateDeductions + item.lateDeductionAmount,
        totalNet: acc.totalNet + item.netPay,
        totalLateScans: acc.totalLateScans + item.lateScans,
        totalLateMinutes: acc.totalLateMinutes + item.totalLateMinutes
      }),
      { totalBase: 0, totalLateDeductions: 0, totalNet: 0, totalLateScans: 0, totalLateMinutes: 0 }
    );
  }, [filteredItems]);

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesKm = [
    'មករា (January)', 'កុម្ភៈ (February)', 'មីនា (March)', 'មេសា (April)', 'ឧសភា (May)', 'មិថុនា (June)',
    'កក្កដា (July)', 'សីហា (August)', 'កញ្ញា (September)', 'តុលា (October)', 'វិច្ឆិកា (November)', 'ធ្នូ (December)'
  ];

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredItems.length) return;
    const headers = [
      'Employee ID',
      'Full Name',
      'Department',
      'Position',
      'Base Salary ($)',
      'Scheduled Start Time',
      'Days Present',
      'Late Scans Count',
      'Total Late Minutes',
      'Late Deduction ($)',
      'Net Pay ($)',
      'Bank Account'
    ];

    const rows = filteredItems.map(item => [
      `"${item.employeeId}"`,
      `"${item.fullName}"`,
      `"${item.department}"`,
      `"${item.role}"`,
      item.baseSalary.toFixed(2),
      `"${item.workStartTime}"`,
      item.daysPresent,
      item.lateScans,
      item.totalLateMinutes,
      item.lateDeductionAmount.toFixed(2),
      item.netPay.toFixed(2),
      `"${item.bankAccount || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection for an individual employee
  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  // Toggle select all filtered employees
  const handleToggleSelectAll = () => {
    if (selectedEmployeeIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredItems.map(item => item.employeeId)));
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Export selected employees to PDF
  const handleExportSelectedPdf = async (mode: 'merged' | 'individual' = 'merged') => {
    const targetItems = filteredItems.filter(item => selectedEmployeeIds.has(item.employeeId));
    if (targetItems.length === 0) return;

    try {
      setIsExportingPdf(true);
      setPdfExportProgress({ current: 1, total: targetItems.length, employeeName: targetItems[0].fullName });
      await exportPayslipsToPdf(targetItems, selectedMonth, selectedYear, language, mode, (p) => {
        setPdfExportProgress(p);
      });
      setExportSuccessMessage(
        language === 'km'
          ? `បានបង្កើតប័ណ្ណបើកប្រាក់ PDF ចំនួន ${targetItems.length} រួចរាល់!`
          : `Successfully exported ${targetItems.length} salary slip(s) as PDF!`
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to export selected payslips PDF:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setExportErrorMessage(
        language === 'km'
          ? `ការទាញយក PDF បរាជ័យ៖ ${errMsg}`
          : `Failed to export selected payslips PDF: ${errMsg}`
      );
      setTimeout(() => setExportErrorMessage(null), 5000);
    } finally {
      setIsExportingPdf(false);
      setPdfExportProgress(null);
      setExportDropdownOpen(false);
    }
  };

  // Export all filtered employees to PDF
  const handleExportAllPdf = async (mode: 'merged' | 'individual' = 'merged') => {
    if (filteredItems.length === 0) return;

    try {
      setIsExportingPdf(true);
      setPdfExportProgress({ current: 1, total: filteredItems.length, employeeName: filteredItems[0].fullName });
      await exportPayslipsToPdf(filteredItems, selectedMonth, selectedYear, language, mode, (p) => {
        setPdfExportProgress(p);
      });
      setExportSuccessMessage(
        language === 'km'
          ? `បានបង្កើតប័ណ្ណបើកប្រាក់ PDF ទាំងអស់ចំនួន ${filteredItems.length} នាក់រួចរាល់!`
          : `Successfully exported all ${filteredItems.length} employee payslips as PDF!`
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to export all payslips PDF:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setExportErrorMessage(
        language === 'km'
          ? `ការទាញយក PDF បរាជ័យ៖ ${errMsg}`
          : `Failed to export all payslips PDF: ${errMsg}`
      );
      setTimeout(() => setExportErrorMessage(null), 5000);
    } finally {
      setIsExportingPdf(false);
      setPdfExportProgress(null);
      setExportDropdownOpen(false);
    }
  };

  // Export single employee to PDF from table row
  const handleExportSingleItemPdf = async (item: EmployeePayrollItem) => {
    try {
      setSingleExportingId(item.employeeId);
      await exportPayslipsToPdf([item], selectedMonth, selectedYear, language, 'merged');
      setExportSuccessMessage(
        language === 'km'
          ? `បានបង្កើតប័ណ្ណបើកប្រាក់ PDF សម្រាប់ ${item.fullNameKhmer || item.fullName} រួចរាល់!`
          : `Successfully exported salary slip for ${item.fullName}!`
      );
      setTimeout(() => setExportSuccessMessage(null), 3500);
    } catch (err: unknown) {
      console.error('Failed to export single payslip PDF:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setExportErrorMessage(
        language === 'km'
          ? `ការទាញយក PDF បរាជ័យ៖ ${errMsg}`
          : `Failed to export payslip PDF: ${errMsg}`
      );
      setTimeout(() => setExportErrorMessage(null), 5000);
    } finally {
      setSingleExportingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{language === 'km' ? 'ការបើកប្រាក់ខែ & ប័ណ្ណបើកប្រាក់' : 'Payroll & Salary Management'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  {language === 'km' ? 'ស្វ័យប្រវត្តិ' : 'Automated'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {language === 'km' 
                  ? 'គណនាប្រាក់ខែបុគ្គលិកដោយមានការកាត់លុយតាមរយៈការ Scan ចូលធ្វើការយឺត' 
                  : 'Generate employee salaries with automated deductions based on late check-in scans'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-recalculate-payroll"
            onClick={runPayrollCalculation}
            disabled={isCalculating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>
              {isCalculating 
                ? (language === 'km' ? 'កំពុងគណនា...' : 'Calculating...') 
                : (language === 'km' ? 'គណនាប្រាក់ខែឡើងវិញ' : 'Generate / Recalculate')}
            </span>
          </button>

          {/* PDF Export Dropdown */}
          <div className="relative">
            <button
              id="btn-export-pdf-menu"
              type="button"
              onClick={() => setExportDropdownOpen(prev => !prev)}
              disabled={isExportingPdf || filteredItems.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>
                {selectedEmployeeIds.size > 0
                  ? (language === 'km' 
                      ? `ទាញយក PDF (${selectedEmployeeIds.size})` 
                      : `Export PDF (${selectedEmployeeIds.size})`)
                  : (language === 'km' ? 'ទាញយក PDF' : 'Export PDF')}
              </span>
              <ChevronDown className="w-3 h-3 text-indigo-500 ml-0.5" />
            </button>

            {exportDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-1 text-slate-700 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setExportDropdownOpen(false)}
              >
                {selectedEmployeeIds.size > 0 ? (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'km' 
                        ? `សម្រាប់បុគ្គលិកដែលបានជ្រើស (${selectedEmployeeIds.size} នាក់)` 
                        : `Selected Staff (${selectedEmployeeIds.size} employees)`}
                    </div>

                    <button
                      id="btn-export-selected-merged"
                      type="button"
                      onClick={() => handleExportSelectedPdf('merged')}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div>{language === 'km' ? 'ឯកសារ PDF រួមបញ្ចូលគ្នា (Merged A4)' : 'Single Merged PDF (A4 Multi-page)'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {language === 'km' ? 'ប័ណ្ណទាំងអស់ក្នុងឯកសារ PDF មួយ' : 'All selected payslips in 1 document'}
                        </div>
                      </div>
                    </button>

                    <button
                      id="btn-export-selected-individual"
                      type="button"
                      onClick={() => handleExportSelectedPdf('individual')}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>{language === 'km' ? 'ឯកសារ PDF ដាច់ដោយឡែក' : 'Individual PDF Files'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {language === 'km' ? 'ទាញយកជា file PDF ម្នាក់មួយ' : 'Separate file downloaded per employee'}
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100"></div>
                  </>
                ) : null}

                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'km' 
                    ? `បុគ្គលិកទាំងអស់ (${filteredItems.length} នាក់)` 
                    : `All Employees (${filteredItems.length} staff)`}
                </div>

                <button
                  id="btn-export-all-merged"
                  type="button"
                  onClick={() => handleExportAllPdf('merged')}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div>{language === 'km' ? 'ទាញយកទាំងអស់ (Merged PDF)' : 'Export All (Single Merged PDF)'}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {language === 'km' ? 'រាល់បុគ្គលិកទាំងអស់ក្នុង file មួយ' : 'Complete payroll batch in one A4 file'}
                    </div>
                  </div>
                </button>

                <button
                  id="btn-export-all-individual"
                  type="button"
                  onClick={() => handleExportAllPdf('individual')}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div>{language === 'km' ? 'ទាញយកទាំងអស់ (Separate PDFs)' : 'Export All (Separate PDFs)'}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {language === 'km' ? 'បង្កើតឯកសារដាច់ដោយឡែកគ្រប់គ្នា' : 'Generates individual PDF per staff member'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            id="btn-export-payroll-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'km' ? 'ទាញយក CSV' : 'Export CSV'}</span>
          </button>

          <button
            id="btn-print-payroll"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'km' ? 'បោះពុម្ព' : 'Print Sheet'}</span>
          </button>
        </div>
      </div>

      {/* 2. Month Selector & Late Deduction Policy Rules Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{language === 'km' ? 'ជ្រើសរើសខែ:' : 'Select Period:'}</span>
            </div>

            <select
              id="select-payroll-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {(language === 'km' ? monthNamesKm : monthNamesEn).map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>

            <select
              id="select-payroll-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-mono">
              {getWorkDaysInMonth(selectedYear, selectedMonth)} {language === 'km' ? 'ថ្ងៃធ្វើការ' : 'Work Days'}
            </span>
          </div>

          {/* Late Scan Penalty Configuration */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
              <span>{language === 'km' ? 'កាត់ប្រាក់ស្កេនយឺត:' : 'Late Scan Deduction Rule:'}</span>
            </div>

            <select
              id="select-deduction-method"
              value={deductionMethod}
              onChange={(e) => setDeductionMethod(e.target.value as any)}
              className="bg-white border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="fixed_per_late">
                {language === 'km' ? 'កាត់ថេរក្នុង១លើកស្កេនយឺត' : 'Fixed Fee per Late Scan'}
              </option>
              <option value="hourly_prorated">
                {language === 'km' ? 'កាត់តាមនាទីជាក់ស្តែង (Prorated)' : 'Exact Minutes Prorated'}
              </option>
            </select>

            {deductionMethod === 'fixed_per_late' && (
              <div className="flex items-center gap-1 bg-white border border-amber-200 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-500 font-semibold">$</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={fixedDeductionPerLate}
                  onChange={(e) => setFixedDeductionPerLate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 text-xs font-bold text-rose-700 text-center focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  /{language === 'km' ? 'លើក' : 'scan'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] text-amber-800">
              <span>{language === 'km' ? 'អនុគ្រោះ:' : 'Grace:'}</span>
              <select
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                className="bg-white border border-amber-200 text-amber-900 rounded-lg px-1.5 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="0">0 mins</option>
                <option value="10">10 mins</option>
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
              </select>
            </div>
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'km' ? 'ស្វែងរកតាមឈ្មោះ ឬអត្តលេខបុគ្គលិក...' : 'Search by staff name or ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">{language === 'km' ? 'គ្រប់ផ្នែកទាំងអស់' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Net Payout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'km' ? 'ប្រាក់ខែសុទ្ធសរុប (Net Pay)' : 'Total Net Payroll'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
              ${summary.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'km' ? `សម្រាប់បុគ្គលិក ${filteredItems.length} នាក់` : `Disbursement for ${filteredItems.length} staff`}
          </p>
        </div>

        {/* Base Salary Budget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'km' ? 'ថវិកាប្រាក់ខែគោល' : 'Base Salary Budget'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 font-mono tracking-tight">
              ${summary.totalBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'km' ? 'ប្រាក់បៀវត្សគោលមិនទាន់កាត់' : 'Gross before late deductions'}
          </p>
        </div>

        {/* Total Late Deductions */}
        <div className="bg-white rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/40 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              {language === 'km' ? 'ប្រាក់កាត់ស្កេនយឺតសរុប' : 'Total Late Deductions'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono tracking-tight">
              -${summary.totalLateDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-rose-600/90 mt-1 font-medium">
            {language === 'km' 
              ? `កាត់ពីការស្កេនយឺត ${summary.totalLateScans} លើក (${summary.totalLateMinutes} នាទី)` 
              : `Deducted across ${summary.totalLateScans} late events`}
          </p>
        </div>

        {/* Total Late Scans */}
        <div className="bg-white rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/40 to-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {language === 'km' ? 'ចំនួនលើកស្កេនយឺត' : 'Late Scan Events'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 font-mono tracking-tight">
              {summary.totalLateScans}
            </span>
            <span className="text-xs text-amber-600 font-bold">
              {language === 'km' ? 'លើក' : 'times'}
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            {language === 'km' ? `យឺតសរុប ${summary.totalLateMinutes} នាទី` : `${summary.totalLateMinutes} cumulative late mins`}
          </p>
        </div>

      </div>

      {/* Selection Action Bar (Appears when 1+ employees are selected) */}
      {selectedEmployeeIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-xs">
              {selectedEmployeeIds.size}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>
                  {language === 'km' 
                    ? `បានជ្រើសរើសបុគ្គលិកចំនួន ${selectedEmployeeIds.size} នាក់` 
                    : `${selectedEmployeeIds.size} employee(s) selected`}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({filteredItems.length} {language === 'km' ? 'សរុប' : 'total in list'})
                </span>
              </div>
              <div className="text-xs text-slate-300">
                {language === 'km' 
                  ? 'ទាញយកប័ណ្ណបើកប្រាក់ជា PDF ផ្លូវការដោយមានការកាត់លុយស្កេនយឺត' 
                  : 'Ready to export official formatted salary slips with late attendance audit'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-export-selected-action-merged"
              type="button"
              onClick={() => handleExportSelectedPdf('merged')}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-950/40 disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{language === 'km' ? 'ទាញយក PDF (A4 Merged)' : 'Export Selected (PDF)'}</span>
            </button>

            <button
              id="btn-export-selected-action-individual"
              type="button"
              onClick={() => handleExportSelectedPdf('individual')}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-all border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'km' ? 'PDF ដាច់ដោយឡែក' : 'Separate PDFs'}</span>
            </button>

            <button
              id="btn-clear-selection"
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors"
            >
              {language === 'km' ? 'ដោះការជ្រើស' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Payroll Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              {language === 'km' ? 'តារាងគណនាប្រាក់ខែបុគ្គលិក' : 'Employee Payroll Breakdown Table'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {language === 'km' 
                ? 'បង្ហាញការកាត់លុយជាក់ស្តែងដោយស្វ័យប្រវត្តិតាមរយៈទិន្នន័យស្កេនវត្តមាន QR' 
                : 'Real-time deduction computed strictly from biometric/QR attendance scan timestamps'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedEmployeeIds.size > 0 && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                {selectedEmployeeIds.size} {language === 'km' ? 'បានជ្រើស' : 'selected'}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">
              {filteredItems.length} {language === 'km' ? 'បុគ្គលិក' : 'employees'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="w-10 px-3 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 text-slate-400 hover:text-indigo-600 focus:outline-hidden transition-colors rounded"
                    title={selectedEmployeeIds.size === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}
                  >
                    {selectedEmployeeIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : selectedEmployeeIds.size > 0 ? (
                      <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-white">
                        <div className="w-2 h-0.5 bg-white"></div>
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">{language === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'ផ្នែក & តួនាទី' : 'Department & Role'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'ម៉ោងកំណត់' : 'Shift Schedule'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'ប្រាក់ខែគោល' : 'Base Salary'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'វត្តមាន' : 'Days Present'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'ស្កេនយឺត (លើក / នាទី)' : 'Late Scans'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'កាត់ប្រាក់យឺត' : 'Late Deduction'}</th>
                <th className="px-4 py-3.5">{language === 'km' ? 'ប្រាក់ខែសុទ្ធ' : 'Net Pay'}</th>
                <th className="px-4 py-3.5 text-right">{language === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.map(item => {
                const hasLate = item.lateScans > 0;
                const isSelected = selectedEmployeeIds.has(item.employeeId);

                return (
                  <tr 
                    key={item.employeeId} 
                    className={`transition-colors ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50/80'}`}
                  >
                    {/* Row Checkbox */}
                    <td className="w-10 px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEmployee(item.employeeId)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    
                    {/* Employee Profile */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.avatar}
                          alt={item.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                              {item.employeeId}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs mt-0.5">
                            {language === 'km' ? item.fullNameKhmer : item.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {language === 'km' ? item.fullName : item.fullNameKhmer}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {language === 'km' ? item.departmentKhmer : item.department}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {language === 'km' ? item.roleKhmer : item.role}
                      </p>
                    </td>

                    {/* Shift & Work hours */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      <div>
                        <span className="font-semibold">{item.workStartTime} - {item.workEndTime}</span>
                        <span className="text-slate-400 block text-[10px]">({item.workingHoursPerDay}h/day)</span>
                      </div>
                    </td>

                    {/* Base Salary */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      ${item.baseSalary.toFixed(2)}
                    </td>

                    {/* Days Present */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-emerald-700">
                          {item.daysPresent}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          / {item.totalScheduledWorkDays} {language === 'km' ? 'ថ្ងៃ' : 'd'}
                        </span>
                      </div>
                    </td>

                    {/* Late Scans Badge */}
                    <td className="px-4 py-3">
                      {hasLate ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[11px]">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span className="font-bold">{item.lateScans} {language === 'km' ? 'លើក' : 'x'}</span>
                          <span className="text-amber-600 text-[10px]">({item.totalLateMinutes}m)</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{language === 'km' ? 'ទាន់ពេល' : 'On-time'}</span>
                        </span>
                      )}
                    </td>

                    {/* Late Deduction Amount */}
                    <td className="px-4 py-3 font-mono">
                      {item.lateDeductionAmount > 0 ? (
                        <span className="font-bold text-rose-600 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" />
                          -${item.lateDeductionAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>

                    {/* Net Pay */}
                    <td className="px-4 py-3 font-mono font-black text-indigo-700 text-sm">
                      ${item.netPay.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Direct Row PDF Export */}
                        <button
                          id={`btn-export-pdf-${item.employeeId}`}
                          onClick={() => handleExportSingleItemPdf(item)}
                          disabled={singleExportingId === item.employeeId || isExportingPdf}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                          title={language === 'km' ? 'ទាញយកប័ណ្ណបើកប្រាក់ជា PDF' : 'Download Salary Slip (PDF)'}
                        >
                          {singleExportingId === item.employeeId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>PDF</span>
                        </button>

                        {/* View Full Payslip Modal */}
                        <button
                          id={`btn-view-payslip-${item.employeeId}`}
                          onClick={() => setSelectedPayslipItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                          title={language === 'km' ? 'មើលប័ណ្ណបើកប្រាក់ខែ' : 'View Payslip'}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{language === 'km' ? 'ប័ណ្ណបើកប្រាក់' : 'Payslip'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">
                      {language === 'km' ? 'មិនមានទិន្នន័យបុគ្គលិកត្រូវបង្ហាញទេ' : 'No employee records found.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Payslip Modal */}
      {selectedPayslipItem && (
        <PayslipModal
          item={selectedPayslipItem}
          month={selectedMonth}
          year={selectedYear}
          language={language}
          onClose={() => setSelectedPayslipItem(null)}
        />
      )}

      {/* Export Progress Modal Overlay */}
      {isExportingPdf && pdfExportProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">
                {language === 'km' ? 'កំពុងបង្កើតឯកសារ PDF...' : 'Generating Salary Slips (PDF)...'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'km' 
                  ? `កំពុងដំណើរការ: ${pdfExportProgress.employeeName} (${pdfExportProgress.current}/${pdfExportProgress.total})` 
                  : `Processing: ${pdfExportProgress.employeeName} (${pdfExportProgress.current} of ${pdfExportProgress.total})`}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((pdfExportProgress.current / pdfExportProgress.total) * 100)}%` }}
              />
            </div>
            
            <p className="text-[11px] text-slate-400">
              {language === 'km' ? 'សូមរង់ចាំមួយភ្លែត...' : 'Rendering high-resolution A4 payslip pages...'}
            </p>
          </div>
        </div>
      )}

      {/* Success Toast Alert */}
      {exportSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
          <span className="text-xs font-bold">{exportSuccessMessage}</span>
        </div>
      )}

      {/* Error Toast Alert */}
      {exportErrorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" />
          <span className="text-xs font-bold">{exportErrorMessage}</span>
        </div>
      )}

    </div>
  );
};
