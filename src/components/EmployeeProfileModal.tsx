import React from 'react';
import { 
  X, 
  QrCode, 
  Sparkles, 
  Edit2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Building2, 
  Briefcase, 
  Shield, 
  HeartHandshake,
  User,
  CheckCircle2,
  AlertCircle,
  UserMinus,
  UserCheck,
  UserX,
  Trash2
} from 'lucide-react';
import { Employee, Language, AttendanceRecord } from '../types';
import { translations } from '../i18n/translations';

interface EmployeeProfileModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  records: AttendanceRecord[];
  onViewBadge: (employee: Employee) => void;
  onSimulateScan: (empId: string) => void;
  onEdit?: (employee: Employee) => void;
  onResign?: (employee: Employee) => void;
  onReactivate?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
  canEdit?: boolean;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  isOpen,
  onClose,
  language,
  records,
  onViewBadge,
  onSimulateScan,
  onEdit,
  onResign,
  onReactivate,
  onDelete,
  canEdit = false
}) => {
  if (!isOpen || !employee) return null;

  const t = translations[language];

  // Calculate attendance status for today
  const today = new Date().toISOString().split('T')[0];
  const empTodayRecords = records
    .filter(r => r.employeeId === employee.id && r.date === today)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const lastTodayRecord = empTodayRecords[empTodayRecords.length - 1];
  const isPresent = lastTodayRecord?.type === 'check_in';
  const isCheckedOut = lastTodayRecord?.type === 'check_out';

  // Total historical records for this employee
  const totalLogs = records.filter(r => r.employeeId === employee.id).length;

  const genderLabel = language === 'km' 
    ? (employee.genderKhmer || (employee.gender === 'female' ? 'ស្រី' : employee.gender === 'male' ? 'ប្រុស' : 'ផ្សេងទៀត'))
    : (employee.gender ? (employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)) : 'Not specified');

  const employmentTypeLabel = language === 'km'
    ? (employee.employmentTypeKhmer || (employee.employmentType === 'probation' ? 'សាកល្បង' : employee.employmentType === 'contract' ? 'កិច្ចសន្យា' : 'ពេញម៉ោង'))
    : (employee.employmentType ? employee.employmentType.replace('_', ' ').toUpperCase() : 'Full-Time');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div 
        id="employee-profile-modal-container"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-slate-900 p-6 text-white relative shrink-0">
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar with status indicator */}
            <div className="relative shrink-0">
              <img
                src={employee.avatar}
                alt={employee.fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-white/30 shadow-md"
                referrerPolicy="no-referrer"
              />
              <span 
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                  isPresent 
                    ? 'bg-emerald-500' 
                    : isCheckedOut 
                      ? 'bg-indigo-400' 
                      : 'bg-slate-400'
                }`}
                title={isPresent ? 'Currently Present' : isCheckedOut ? 'Checked Out' : 'Absent'}
              />
            </div>

            {/* Core titles */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-white/20 text-white tracking-wider">
                  {employee.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  employee.roleType === 'admin' 
                    ? 'bg-rose-500/80 text-white' 
                    : employee.roleType === 'manager'
                      ? 'bg-amber-500/80 text-white'
                      : 'bg-indigo-500/80 text-white'
                }`}>
                  {employee.roleType || 'staff'}
                </span>
                {employee.status === 'resigned' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white border border-rose-400 shadow-xs flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    <span>{language === 'km' ? 'ឈប់ធ្វើការ (Resigned)' : 'Resigned'}</span>
                  </span>
                ) : employee.status === 'on_leave' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-300">
                    {language === 'km' ? 'ច្បាប់សម្រាក' : 'On Leave'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                    {employmentTypeLabel}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight truncate">
                {language === 'km' ? employee.fullNameKhmer : employee.fullName}
              </h2>

              <p className="text-sm text-indigo-100 font-medium">
                {language === 'km' ? employee.roleKhmer : employee.role} • <span className="text-indigo-200">{language === 'km' ? employee.departmentKhmer : employee.department}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          
          {/* Resigned Employee Notice Banner */}
          {employee.status === 'resigned' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
              <UserX className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-950">
                  {language === 'km' ? 'បុគ្គលិកនេះបានឈប់ធ្វើការហើយ (Resigned / Terminated)' : 'Employee Has Resigned / Terminated'}
                </p>
                {employee.resignedDate && (
                  <p>
                    <span className="font-semibold text-rose-950">{t.resignedDateLabel}:</span> {employee.resignedDate}
                  </p>
                )}
                {employee.resignationReason && (
                  <p>
                    <span className="font-semibold text-rose-950">{t.resignationReasonLabel}:</span> {employee.resignationReason}
                  </p>
                )}
                <p className="text-[11px] text-rose-700 pt-0.5">
                  {language === 'km' 
                    ? 'បុគ្គលិកនេះត្រូវបានបិទមិនឱ្យស្កេនវត្តមានបានឡើយ ប៉ុន្តែកំណត់ត្រាវត្តមានចាស់ៗនៅតែរក្សាទុកដដែល។'
                    : 'This employee is barred from scanning attendance. Historical records remain preserved.'}
                </p>
              </div>
            </div>
          )}

          {/* Real-time Status Card */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isPresent ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : isCheckedOut ? (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {language === 'km' ? 'ស្ថានភាពវត្តមានថ្ងៃនេះ' : "Today's Status"}
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {isPresent 
                    ? (language === 'km' ? `មានវត្តមាន (ស្កេនចូលម៉ោង ${lastTodayRecord.time})` : `Present (Checked In at ${lastTodayRecord.time})`)
                    : isCheckedOut 
                      ? (language === 'km' ? `បានចេញរួចរាល់ (ម៉ោង ${lastTodayRecord.time})` : `Checked Out at ${lastTodayRecord.time}`)
                      : (language === 'km' ? 'មិនទាន់មានការស្កេនវត្តមានថ្ងៃនេះនៅឡើយទេ' : 'Not yet scanned today')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 self-end sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                {totalLogs} {language === 'km' ? 'កំណត់ត្រាសរុប' : 'Total Scans'}
              </span>
            </div>
          </div>

          {/* Grid of Profile Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <User className="w-4 h-4" />
                <span>{t.personalInfo}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">{t.genderLabel}:</span>
                  <span className="font-semibold text-slate-900">{genderLabel}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.dobLabel}:</span>
                  <span className="font-semibold text-slate-900">{employee.dateOfBirth || '-'}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.nationalIdLabel}:</span>
                  <span className="font-mono font-semibold text-slate-900">{employee.nationalId || '-'}</span>
                </div>

                <div className="py-0.5 border-t border-slate-50 space-y-1">
                  <span className="text-slate-500 font-medium block">{t.addressLabel}:</span>
                  <span className="text-slate-800 font-medium leading-relaxed block pl-1 text-[11px]">
                    <MapPin className="w-3 h-3 inline text-slate-400 mr-1" />
                    {employee.address || (language === 'km' ? 'រាជធានីភ្នំពេញ' : 'Phnom Penh, Cambodia')}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Employment & Job Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4" />
                <span>{t.jobInfo}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">{t.departmentLabel}:</span>
                  <span className="font-semibold text-slate-900">
                    {language === 'km' ? employee.departmentKhmer : employee.department}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.roleLabel}:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {language === 'km' ? employee.roleKhmer : employee.role}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.joinDateLabel}:</span>
                  <span className="font-semibold text-slate-900">{employee.joinDate || '-'}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.workScheduleLabel}:</span>
                  <span className="font-semibold text-slate-900 text-right text-[11px]">
                    {employee.workStartTime || '08:00'} - {employee.workEndTime || '17:00'} ({employee.workingHoursPerDay || 8}h/day)
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{language === 'km' ? 'ប្រាក់ខែគោល:' : 'Base Salary:'}</span>
                  <span className="font-mono font-bold text-emerald-700 text-right text-xs">
                    ${(employee.baseSalary ?? 650).toFixed(2)} / mo
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{language === 'km' ? 'កាត់ប្រាក់ពេលយឺត:' : 'Late Scan Rate:'}</span>
                  <span className="font-mono font-semibold text-rose-600 text-right text-[11px]">
                    -${(employee.lateDeductionRate ?? 2.0).toFixed(2)} / scan (&gt;{employee.lateGracePeriodMinutes ?? 15}m)
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.workLocationLabel}:</span>
                  <span className="font-semibold text-slate-900 text-right text-[11px]">
                    {employee.workLocation || 'Phnom Penh HQ'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Contact Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <Phone className="w-4 h-4" />
                <span>{language === 'km' ? 'ព័ត៌មានទំនាក់ទំនង' : 'Contact Details'}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">{t.phoneLabel}:</span>
                  {employee.phone ? (
                    <a 
                      href={`tel:${employee.phone.replace(/\s+/g, '')}`}
                      className="font-mono font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{employee.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.emailLabel}:</span>
                  {employee.email ? (
                    <a 
                      href={`mailto:${employee.email}`}
                      className="font-semibold text-indigo-600 hover:underline truncate max-w-[200px]"
                      title={employee.email}
                    >
                      {employee.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.bankAccountLabel}:</span>
                  <span className="font-mono font-semibold text-slate-900 text-[11px]">
                    {employee.bankAccount || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Emergency Contact Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <HeartHandshake className="w-4 h-4" />
                <span>{t.emergencyContactLabel}</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">{language === 'km' ? 'ឈ្មោះអ្នកទាក់ទង' : 'Name'}:</span>
                  <span className="font-semibold text-slate-900">{employee.emergencyContactName || '-'}</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.emergencyPhoneLabel}:</span>
                  {employee.emergencyContactPhone ? (
                    <a 
                      href={`tel:${employee.emergencyContactPhone.replace(/\s+/g, '')}`}
                      className="font-mono font-semibold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{employee.emergencyContactPhone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>

                <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                  <span className="text-slate-500 font-medium">{t.emergencyRelationLabel}:</span>
                  <span className="font-semibold text-slate-900">{employee.emergencyContactRelation || '-'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* View Digital QR Badge */}
            <button
              id="btn-profile-view-badge"
              onClick={() => {
                onClose();
                onViewBadge(employee);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{t.viewBadge}</span>
            </button>

            {/* Simulate Scan */}
            <button
              id="btn-profile-simulate-scan"
              onClick={() => {
                onSimulateScan(employee.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.testScanBadge}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && onEdit && (
              <button
                id="btn-profile-edit"
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.editEmployee}</span>
              </button>
            )}

            {/* Mark Resigned or Reactivate button */}
            {canEdit && (
              employee.status === 'resigned' ? (
                onReactivate && (
                  <button
                    id="btn-profile-reactivate"
                    onClick={() => {
                      onClose();
                      onReactivate(employee);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title={t.rehireEmployee}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.rehireEmployee}</span>
                  </button>
                )
              ) : (
                onResign && (
                  <button
                    id="btn-profile-resign"
                    onClick={() => {
                      onClose();
                      onResign(employee);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title={t.markAsResigned}
                  >
                    <UserX className="w-3.5 h-3.5 text-amber-700" />
                    <span>{t.markAsResigned}</span>
                  </button>
                )
              )
            )}

            {/* Permanent Delete Button */}
            {canEdit && onDelete && (
              <button
                id="btn-profile-delete"
                onClick={() => {
                  onClose();
                  onDelete(employee);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title={t.deleteEmployee}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{t.deleteEmployee}</span>
              </button>
            )}

            <button
              id="btn-profile-close-bottom"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {language === 'km' ? 'បិទ' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
