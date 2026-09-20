import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Building2, 
  DollarSign, 
  FileText, 
  CreditCard, 
  ShieldCheck,
  ArrowDownRight
} from 'lucide-react';
import { EmployeePayrollItem, Language } from '../types';

interface PayslipModalProps {
  item: EmployeePayrollItem;
  month: number;
  year: number;
  language: Language;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  item,
  month,
  year,
  language,
  onClose
}) => {
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesKm = [
    'មករា (Jan)', 'កុម្ភៈ (Feb)', 'មីនា (Mar)', 'មេសា (Apr)', 'ឧសភា (May)', 'មិថុនា (Jun)',
    'កក្កដា (Jul)', 'សីហា (Aug)', 'កញ្ញា (Sep)', 'តុលា (Oct)', 'វិច្ឆិកា (Nov)', 'ធ្នូ (Dec)'
  ];

  const monthLabel = language === 'km' ? monthNamesKm[month - 1] : monthNamesEn[month - 1];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div 
        id="payslip-modal-content"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-auto max-h-[94vh] flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {language === 'km' ? 'ប័ណ្ណបើកប្រាក់ខែបុគ្គលិកផ្លូវការ' : 'Official Employee Payslip'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'បោះពុម្ពប័ណ្ណ (Print)' : 'Print Payslip'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Payslip Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Header */}
          <div className="border-b-2 border-indigo-600 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    HR
                  </div>
                  <div>
                    <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">
                      SMART ATTENDANCE & PAYROLL
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងគណនាប្រាក់ខែស្វ័យប្រវត្តិ' : 'Attendance & Automated Payroll System'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {language === 'km' ? `ប្រចាំខែ ${monthLabel} ${year}` : `Payroll Period: ${monthLabel} ${year}`}
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Issued: {new Date().toISOString().split('T')[0]}
                </p>
              </div>
            </div>
          </div>

          {/* Employee & Shift Info Card */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <img
                src={item.avatar}
                alt={item.fullName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded text-[11px]">
                  {item.employeeId}
                </span>
                <h2 className="font-bold text-slate-900 text-sm mt-0.5">
                  {language === 'km' ? item.fullNameKhmer : item.fullName}
                </h2>
                <p className="text-slate-500 text-[11px]">
                  {language === 'km' ? item.fullName : item.fullNameKhmer}
                </p>
                <p className="text-slate-600 font-medium mt-1">
                  {language === 'km' ? item.departmentKhmer : item.department} • {language === 'km' ? item.roleKhmer : item.role}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0">
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'km' ? 'ម៉ោងចូលធ្វើការ:' : 'Shift Schedule:'}</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {item.workStartTime} - {item.workEndTime} ({item.workingHoursPerDay} hrs)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'km' ? 'ថ្ងៃធ្វើការក្នុងខែ:' : 'Scheduled Days:'}</span>
                <span className="font-semibold text-slate-800">{item.totalScheduledWorkDays} {language === 'km' ? 'ថ្ងៃ' : 'days'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'km' ? 'វត្តមានជាក់ស្តែង:' : 'Days Present:'}</span>
                <span className="font-bold text-emerald-700">{item.daysPresent} {language === 'km' ? 'ថ្ងៃ' : 'days'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'km' ? 'គណនីធនាគារ:' : 'Bank Account:'}</span>
                <span className="font-mono text-slate-700 font-medium">{item.bankAccount || 'ABA: 001-XXX-XXX'}</span>
              </div>
            </div>
          </div>

          {/* Attendance KPI Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                {language === 'km' ? 'មកទាន់ពេល' : 'On-Time Scans'}
              </span>
              <span className="text-lg font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {item.onTimeScans}
              </span>
            </div>

            <div className={`p-3 rounded-xl text-center border ${
              item.lateScans > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                item.lateScans > 0 ? 'text-amber-800' : 'text-slate-500'
              }`}>
                {language === 'km' ? 'ស្កេនចូលយឺត' : 'Late Scans'}
              </span>
              <span className={`text-lg font-extrabold font-mono mt-0.5 block ${
                item.lateScans > 0 ? 'text-amber-700' : 'text-slate-700'
              }`}>
                {item.lateScans}
              </span>
            </div>

            <div className={`p-3 rounded-xl text-center border ${
              item.totalLateMinutes > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                item.totalLateMinutes > 0 ? 'text-rose-800' : 'text-slate-500'
              }`}>
                {language === 'km' ? 'នាទីយឺតសរុប' : 'Total Late Mins'}
              </span>
              <span className={`text-lg font-extrabold font-mono mt-0.5 block ${
                item.totalLateMinutes > 0 ? 'text-rose-700' : 'text-slate-700'
              }`}>
                {item.totalLateMinutes} <span className="text-xs font-normal">m</span>
              </span>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                {language === 'km' ? 'កាត់ប្រាក់យឺត' : 'Late Deduction'}
              </span>
              <span className="text-lg font-extrabold text-rose-600 font-mono mt-0.5 block">
                -${item.lateDeductionAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Salary Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-700 uppercase tracking-wider flex justify-between">
              <span>{language === 'km' ? 'ព័ត៌មានលម្អិតអំពីប្រាក់បៀវត្ស និងការកាត់' : 'Earnings & Deductions Breakdown'}</span>
              <span>USD ($)</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Earnings: Base Salary */}
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-slate-50">
                <span className="font-semibold text-slate-800">
                  {language === 'km' ? '១. ប្រាក់ខែគោល (Base Salary)' : '1. Monthly Base Salary'}
                </span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  ${item.baseSalary.toFixed(2)}
                </span>
              </div>

              {item.bonus > 0 && (
                <div className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 text-emerald-700">
                  <span>{language === 'km' ? '២. ប្រាក់លើកទឹកចិត្ត (Performance Bonus)' : '2. Performance Bonus'}</span>
                  <span className="font-bold font-mono">+${item.bonus.toFixed(2)}</span>
                </div>
              )}

              {item.allowances > 0 && (
                <div className="px-4 py-2 flex justify-between items-center hover:bg-slate-50 text-emerald-700">
                  <span>{language === 'km' ? '៣. ប្រាក់ឧបត្ថម្ភ (Allowances)' : '3. Allowances'}</span>
                  <span className="font-bold font-mono">+${item.allowances.toFixed(2)}</span>
                </div>
              )}

              {/* Deductions: Late Scan Penalty */}
              <div className="px-4 py-2.5 flex justify-between items-center bg-rose-50/40 text-rose-800">
                <div>
                  <span className="font-semibold flex items-center gap-1.5">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {language === 'km' 
                        ? `កាត់ប្រាក់តាមរយៈការ Scan ចូលធ្វើការយឺត (${item.lateScans} លើក / ${item.totalLateMinutes} នាទី)` 
                        : `Late Check-In Scan Deductions (${item.lateScans} scans / ${item.totalLateMinutes} mins)`}
                    </span>
                  </span>
                  <p className="text-[10px] text-rose-600 mt-0.5 pl-5">
                    {language === 'km' 
                      ? `យឺតលើសពីម៉ោងកំណត់ ${item.workStartTime} (+15 នាទី Grace period)` 
                      : `Arrivals beyond scheduled start ${item.workStartTime} with grace window`}
                  </p>
                </div>
                <span className="font-bold font-mono text-rose-600 text-sm">
                  -${item.lateDeductionAmount.toFixed(2)}
                </span>
              </div>

              {item.otherDeductions > 0 && (
                <div className="px-4 py-2 flex justify-between items-center text-slate-600">
                  <span>{language === 'km' ? 'ការកាត់ផ្សេងៗ (Other Deductions)' : 'Other Deductions'}</span>
                  <span className="font-bold font-mono text-rose-600">-${item.otherDeductions.toFixed(2)}</span>
                </div>
              )}

              {/* Net Payout Row */}
              <div className="px-4 py-3.5 bg-indigo-50/80 flex justify-between items-center border-t-2 border-indigo-200">
                <div>
                  <span className="font-extrabold text-indigo-950 text-sm sm:text-base">
                    {language === 'km' ? 'ប្រាក់ខែសុទ្ធជាក់ស្តែង (NET SALARY PAYABLE)' : 'NET SALARY PAYABLE'}
                  </span>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    {language === 'km' ? 'ចំនួនទឹកប្រាក់ត្រូវផ្ទេរចូលគណនីបុគ្គលិក' : 'Net amount to be disbursed'}
                  </p>
                </div>
                <span className="font-extrabold text-indigo-700 font-mono text-lg sm:text-xl">
                  ${item.netPay.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Late Check-In Log Details (if any) */}
          {item.lateScanLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {language === 'km' 
                    ? `កំណត់ត្រាស្កេនយឺតជាក់ស្តែងប្រចាំខែ (${item.lateScanLogs.length} លើក)` 
                    : `Itemized Late Check-In Scan Audit Log (${item.lateScanLogs.length} events)`}
                </span>
              </div>

              <div className="bg-amber-50/40 border border-amber-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-amber-100/60 text-amber-950 font-semibold border-b border-amber-200">
                    <tr>
                      <th className="px-3 py-2">{language === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th className="px-3 py-2">{language === 'km' ? 'ម៉ោងកំណត់' : 'Scheduled'}</th>
                      <th className="px-3 py-2">{language === 'km' ? 'ម៉ោងស្កេនជាក់ស្តែង' : 'Scan Time'}</th>
                      <th className="px-3 py-2">{language === 'km' ? 'យឺត (នាទី)' : 'Minutes Late'}</th>
                      <th className="px-3 py-2 text-right">{language === 'km' ? 'ចំនួនប្រាក់កាត់' : 'Deduction'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-slate-700">
                    {item.lateScanLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-amber-100/30 font-mono">
                        <td className="px-3 py-1.5 font-sans font-semibold text-slate-900">{log.date}</td>
                        <td className="px-3 py-1.5 text-slate-500">{log.scheduledTime}</td>
                        <td className="px-3 py-1.5 font-bold text-amber-800">{log.scanTime}</td>
                        <td className="px-3 py-1.5 text-rose-600 font-bold">+{log.lateMinutes} mins</td>
                        <td className="px-3 py-1.5 text-right font-bold text-rose-700">-${log.deductionAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Authorization & Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-800 mb-10">
                {language === 'km' ? 'អ្នករៀបចំ (Prepared By)' : 'Prepared By'}
              </p>
              <div className="border-t border-slate-300 pt-1 font-mono text-[10px]">
                HR & Payroll Officer
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-800 mb-10">
                {language === 'km' ? 'អ្នកអនុម័ត (Approved By)' : 'Approved By'}
              </p>
              <div className="border-t border-slate-300 pt-1 font-mono text-[10px]">
                Finance Director
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-800 mb-10">
                {language === 'km' ? 'បុគ្គលិកទទួល (Employee Signature)' : 'Employee Signature'}
              </p>
              <div className="border-t border-slate-300 pt-1 font-mono text-[10px]">
                {language === 'km' ? item.fullNameKhmer : item.fullName}
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-medium">
            This is a system-generated payslip computed from official biometric/QR scan attendance logs.
          </div>
        </div>
      </div>
    </div>
  );
};
