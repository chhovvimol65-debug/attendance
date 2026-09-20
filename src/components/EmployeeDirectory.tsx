import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  Users, 
  QrCode, 
  Download, 
  Search, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Printer,
  Mail, 
  Phone, 
  Plus, 
  Trash2, 
  Edit2, 
  Shield, 
  Briefcase, 
  UserCheck, 
  UserX,
  UserMinus,
  AlertTriangle,
  Building2,
  Eye,
  LayoutGrid,
  List,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  User,
  HeartHandshake,
  FileSpreadsheet
} from 'lucide-react';
import { Language, Employee, AttendanceRecord, UserAccount, UserRole, Gender, EmploymentType, EmploymentStatus, Department } from '../types';
import { translations } from '../i18n/translations';
import { getStoredEmployees, saveStoredEmployees } from '../data/mockEmployees';
import { getStoredDepartments, isEmployeeInDepartment } from '../data/mockDepartments';
import { downloadAttendanceExcelTemplate } from '../utils/excelExport';
import { EmployeeProfileModal } from './EmployeeProfileModal';

interface EmployeeDirectoryProps {
  language: Language;
  currentUser: UserAccount;
  records: AttendanceRecord[];
  onSimulateScan: (empId: string) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  language,
  currentUser,
  records,
  onSimulateScan
}) => {
  const t = translations[language];

  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resigned' | 'on_leave'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Modal states
  const [activeBadgeEmployee, setActiveBadgeEmployee] = useState<Employee | null>(null);
  const [detailedProfileEmployee, setDetailedProfileEmployee] = useState<Employee | null>(null);
  const [badgeQrDataUrl, setBadgeQrDataUrl] = useState<string>('');

  // Resignation Modal state
  const [resigningEmployee, setResigningEmployee] = useState<Employee | null>(null);
  const [resignationDate, setResignationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resignationReason, setResignationReason] = useState<string>('លាលែងពីតំណែងផ្ទាល់ខ្លួន');

  // Permanent Delete Modal state
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deleteCascadeRecords, setDeleteCascadeRecords] = useState<boolean>(false);

  // Toast feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add/Edit Employee Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formTab, setFormTab] = useState<'personal' | 'job' | 'contact'>('personal');

  // Form fields
  const [formData, setFormData] = useState<{
    id: string;
    fullName: string;
    fullNameKhmer: string;
    department: string;
    departmentKhmer: string;
    role: string;
    roleKhmer: string;
    roleType: UserRole;
    phone: string;
    email: string;
    gender: Gender;
    genderKhmer: string;
    dateOfBirth: string;
    joinDate: string;
    employmentType: EmploymentType;
    employmentTypeKhmer: string;
    status: EmploymentStatus;
    statusKhmer?: string;
    resignedDate?: string;
    resignationReason?: string;
    nationalId: string;
    address: string;
    workLocation: string;
    workSchedule: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    bankAccount: string;
    baseSalary: number;
    workStartTime: string;
    workEndTime: string;
    workingHoursPerDay: number;
    lateGracePeriodMinutes: number;
    lateDeductionRate: number;
  }>({
    id: '',
    fullName: '',
    fullNameKhmer: '',
    department: 'Engineering',
    departmentKhmer: 'វិស្វកម្ម',
    role: '',
    roleKhmer: '',
    roleType: 'staff',
    phone: '',
    email: '',
    gender: 'male',
    genderKhmer: 'ប្រុស',
    dateOfBirth: '1995-05-15',
    joinDate: '2023-01-10',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'កំពុងបម្រើការ',
    resignedDate: '',
    resignationReason: '',
    nationalId: '',
    address: '',
    workLocation: 'Phnom Penh HQ',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    bankAccount: '',
    baseSalary: 650,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  });

  // Configured departments strictly loaded from Department Management
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

  // Generate QR code for active employee badge
  useEffect(() => {
    if (!activeBadgeEmployee) {
      setBadgeQrDataUrl('');
      return;
    }

    const qrPayload = activeBadgeEmployee.id;

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    })
      .then(url => setBadgeQrDataUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
  }, [activeBadgeEmployee]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextNum = employees.length + 1001;
    const newId = `EMP-${nextNum}`;
    setEditingEmployee(null);
    setFormTab('personal');
    setFormData({
      id: newId,
      fullName: '',
      fullNameKhmer: '',
      department: 'Engineering',
      departmentKhmer: 'វិស្វកម្ម',
      role: '',
      roleKhmer: '',
      roleType: 'staff',
      phone: '+855 12 000 ' + String(nextNum).slice(-3),
      email: '',
      gender: 'male',
      genderKhmer: 'ប្រុស',
      dateOfBirth: '1996-06-20',
      joinDate: new Date().toISOString().split('T')[0],
      employmentType: 'full_time',
      employmentTypeKhmer: 'ពេញម៉ោង',
      status: 'active',
      nationalId: `090${Math.floor(100000 + Math.random() * 900000)}`,
      address: 'សង្កាត់ទួលទំពូង រាជធានីភ្នំពេញ',
      workLocation: 'Phnom Penh HQ',
      workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
      emergencyContactName: '',
      emergencyContactPhone: '+855 12 999 888',
      emergencyContactRelation: 'បងប្អូន',
      bankAccount: `ABA Bank: 00${Math.floor(1000000 + Math.random() * 9000000)}`,
      baseSalary: 650,
      workStartTime: '08:00',
      workEndTime: '17:00',
      workingHoursPerDay: 8,
      lateGracePeriodMinutes: 15,
      lateDeductionRate: 2.0
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormTab('personal');
    setFormData({
      id: emp.id,
      fullName: emp.fullName,
      fullNameKhmer: emp.fullNameKhmer || emp.fullName,
      department: emp.department,
      departmentKhmer: emp.departmentKhmer || emp.department,
      role: emp.role,
      roleKhmer: emp.roleKhmer || emp.role,
      roleType: emp.roleType || 'staff',
      phone: emp.phone || '',
      email: emp.email || '',
      gender: emp.gender || 'male',
      genderKhmer: emp.genderKhmer || (emp.gender === 'female' ? 'ស្រី' : 'ប្រុស'),
      dateOfBirth: emp.dateOfBirth || '1995-01-01',
      joinDate: emp.joinDate || '2023-01-01',
      employmentType: emp.employmentType || 'full_time',
      employmentTypeKhmer: emp.employmentTypeKhmer || 'ពេញម៉ោង',
      status: emp.status || 'active',
      resignedDate: emp.resignedDate || '',
      resignationReason: emp.resignationReason || '',
      nationalId: emp.nationalId || '',
      address: emp.address || '',
      workLocation: emp.workLocation || 'Phnom Penh HQ',
      workSchedule: emp.workSchedule || '08:00 - 17:00 (ចន្ទ - សុក្រ)',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
      emergencyContactRelation: emp.emergencyContactRelation || '',
      bankAccount: emp.bankAccount || '',
      baseSalary: emp.baseSalary !== undefined ? emp.baseSalary : 650,
      workStartTime: emp.workStartTime || '08:00',
      workEndTime: emp.workEndTime || '17:00',
      workingHoursPerDay: emp.workingHoursPerDay || 8,
      lateGracePeriodMinutes: emp.lateGracePeriodMinutes !== undefined ? emp.lateGracePeriodMinutes : 15,
      lateDeductionRate: emp.lateDeductionRate !== undefined ? emp.lateDeductionRate : 2.0
    });
    setIsAddModalOpen(true);
  };

  // Save Employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.id.trim()) return;

    let updatedList: Employee[];
    const avatar = editingEmployee?.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

    const statusKhmer = formData.status === 'resigned' 
      ? 'ឈប់ធ្វើការ' 
      : formData.status === 'on_leave' 
        ? 'ច្បាប់សម្រាក' 
        : formData.status === 'probation'
          ? 'សាកល្បង'
          : 'សកម្ម';

    if (editingEmployee) {
      updatedList = employees.map(emp => 
        emp.id === editingEmployee.id 
          ? {
              ...emp,
              fullName: formData.fullName,
              fullNameKhmer: formData.fullNameKhmer || formData.fullName,
              department: formData.department,
              departmentKhmer: formData.departmentKhmer || formData.department,
              role: formData.role,
              roleKhmer: formData.roleKhmer || formData.role,
              roleType: formData.roleType,
              phone: formData.phone,
              email: formData.email,
              gender: formData.gender,
              genderKhmer: formData.genderKhmer,
              dateOfBirth: formData.dateOfBirth,
              joinDate: formData.joinDate,
              employmentType: formData.employmentType,
              employmentTypeKhmer: formData.employmentTypeKhmer,
              status: formData.status,
              statusKhmer,
              resignedDate: formData.status === 'resigned' ? (formData.resignedDate || new Date().toISOString().split('T')[0]) : undefined,
              resignationReason: formData.status === 'resigned' ? (formData.resignationReason || '') : undefined,
              nationalId: formData.nationalId,
              address: formData.address,
              workLocation: formData.workLocation,
              workSchedule: formData.workSchedule,
              emergencyContactName: formData.emergencyContactName,
              emergencyContactPhone: formData.emergencyContactPhone,
              emergencyContactRelation: formData.emergencyContactRelation,
              bankAccount: formData.bankAccount,
              baseSalary: Number(formData.baseSalary) || 0,
              workStartTime: formData.workStartTime || '08:00',
              workEndTime: formData.workEndTime || '17:00',
              workingHoursPerDay: Number(formData.workingHoursPerDay) || 8,
              lateGracePeriodMinutes: Number(formData.lateGracePeriodMinutes) || 15,
              lateDeductionRate: Number(formData.lateDeductionRate) || 0
            }
          : emp
      );
    } else {
      const newEmp: Employee = {
        id: formData.id.trim().toUpperCase(),
        fullName: formData.fullName.trim(),
        fullNameKhmer: formData.fullNameKhmer.trim() || formData.fullName.trim(),
        department: formData.department,
        departmentKhmer: formData.departmentKhmer || formData.department,
        role: formData.role.trim(),
        roleKhmer: formData.roleKhmer.trim() || formData.role.trim(),
        roleType: formData.roleType,
        avatar,
        phone: formData.phone,
        email: formData.email || `${formData.fullName.toLowerCase().replace(/\s+/g, '.')}@company.kh`,
        gender: formData.gender,
        genderKhmer: formData.genderKhmer,
        dateOfBirth: formData.dateOfBirth,
        joinDate: formData.joinDate,
        employmentType: formData.employmentType,
        employmentTypeKhmer: formData.employmentTypeKhmer,
        status: formData.status,
        statusKhmer,
        resignedDate: formData.status === 'resigned' ? (formData.resignedDate || new Date().toISOString().split('T')[0]) : undefined,
        resignationReason: formData.status === 'resigned' ? (formData.resignationReason || '') : undefined,
        nationalId: formData.nationalId,
        address: formData.address,
        workLocation: formData.workLocation,
        workSchedule: formData.workSchedule,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation,
        bankAccount: formData.bankAccount,
        baseSalary: Number(formData.baseSalary) || 0,
        workStartTime: formData.workStartTime || '08:00',
        workEndTime: formData.workEndTime || '17:00',
        workingHoursPerDay: Number(formData.workingHoursPerDay) || 8,
        lateGracePeriodMinutes: Number(formData.lateGracePeriodMinutes) || 15,
        lateDeductionRate: Number(formData.lateDeductionRate) || 0
      };
      updatedList = [newEmp, ...employees];
    }

    setEmployees(updatedList);
    saveStoredEmployees(updatedList);
    setIsAddModalOpen(false);
    setToastMessage(language === 'km' ? 'បានរក្សាទុកព័ត៌មានបុគ្គលិកដោយជោគជ័យ' : 'Employee information saved successfully');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Resignation Modal (Admin & Manager)
  const handleOpenResignModal = (emp: Employee) => {
    setResigningEmployee(emp);
    setResignationDate(emp.resignedDate || new Date().toISOString().split('T')[0]);
    setResignationReason(emp.resignationReason || (language === 'km' ? 'លាលែងពីតំណែងផ្ទាល់ខ្លួន' : 'Personal Resignation'));
  };

  // Confirm Resignation
  const handleConfirmResign = () => {
    if (!resigningEmployee) return;
    const targetId = resigningEmployee.id;
    const targetName = language === 'km' ? (resigningEmployee.fullNameKhmer || resigningEmployee.fullName) : resigningEmployee.fullName;

    const updated = employees.map(emp => {
      if (emp.id === targetId) {
        return {
          ...emp,
          status: 'resigned' as EmploymentStatus,
          statusKhmer: 'ឈប់ធ្វើការ',
          resignedDate: resignationDate || new Date().toISOString().split('T')[0],
          resignationReason: resignationReason || (language === 'km' ? 'លាលែងពីតំណែងផ្ទាល់ខ្លួន' : 'Personal Resignation')
        };
      }
      return emp;
    });

    setEmployees(updated);
    saveStoredEmployees(updated);
    setResigningEmployee(null);
    setToastMessage(language === 'km' ? `បានកត់ត្រាការឈប់ធ្វើការរបស់ ${targetName} ដោយជោគជ័យ` : `Successfully marked ${targetName} as resigned`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reactivate Resigned Employee
  const handleReactivateEmployee = (emp: Employee) => {
    const targetName = language === 'km' ? (emp.fullNameKhmer || emp.fullName) : emp.fullName;
    const updated = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          status: 'active' as EmploymentStatus,
          statusKhmer: 'សកម្ម',
          resignedDate: undefined,
          resignationReason: undefined
        };
      }
      return e;
    });

    setEmployees(updated);
    saveStoredEmployees(updated);
    setToastMessage(language === 'km' ? `បានដំណើរការបុគ្គលិក ${targetName} ឡើងវិញដោយជោគជ័យ` : `Successfully reactivated ${targetName}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Permanent Delete Modal (Admin only)
  const handleOpenDeleteModal = (emp: Employee) => {
    setDeletingEmployee(emp);
    setDeleteCascadeRecords(false);
  };

  // Confirm Permanent Deletion
  const handleConfirmPermanentDelete = () => {
    if (!deletingEmployee) return;
    const targetId = deletingEmployee.id;
    const targetName = language === 'km' ? (deletingEmployee.fullNameKhmer || deletingEmployee.fullName) : deletingEmployee.fullName;

    const updated = employees.filter(e => e.id !== targetId);
    setEmployees(updated);
    saveStoredEmployees(updated);

    if (deleteCascadeRecords && typeof window !== 'undefined') {
      try {
        const rawRecs = localStorage.getItem('company_attendance_records');
        if (rawRecs) {
          const parsed: AttendanceRecord[] = JSON.parse(rawRecs);
          const filtered = parsed.filter(r => r.employeeId !== targetId);
          localStorage.setItem('company_attendance_records', JSON.stringify(filtered));
          window.dispatchEvent(new Event('attendance-records-updated'));
        }
      } catch (err) {
        console.error(err);
      }
    }

    setDeletingEmployee(null);
    setToastMessage(language === 'km' ? `បានលុបបុគ្គលិក ${targetName} (${targetId}) ចេញពីប្រព័ន្ធដោយជោគជ័យ` : `Successfully deleted employee ${targetName} (${targetId})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isManager = currentUser?.role === 'manager';
  const isAdmin = currentUser.role === 'admin';
  const canManageEmployees = isAdmin || isManager;
  const managerDept = currentUser?.department;

  const statusCounts = useMemo(() => {
    const activeCount = employees.filter(e => e.status !== 'resigned' && e.status !== 'on_leave').length;
    const resignedCount = employees.filter(e => e.status === 'resigned').length;
    const onLeaveCount = employees.filter(e => e.status === 'on_leave').length;
    return {
      all: employees.length,
      active: activeCount,
      resigned: resignedCount,
      onLeave: onLeaveCount
    };
  }, [employees]);

  const selectedDeptObj = useMemo<Department | null>(() => {
    if (selectedDept === 'all') return null;
    return configuredDepartments.find(d => d.id === selectedDept || d.name === selectedDept) || null;
  }, [selectedDept, configuredDepartments]);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    // Employment Status filter
    if (statusFilter === 'active' && (emp.status === 'resigned' || emp.status === 'on_leave')) return false;
    if (statusFilter === 'resigned' && emp.status !== 'resigned') return false;
    if (statusFilter === 'on_leave' && emp.status !== 'on_leave') return false;

    // Manager department scope constraint
    if (isManager && managerDept) {
      if (!emp.department.toLowerCase().includes(managerDept.toLowerCase()) && 
          !managerDept.toLowerCase().includes(emp.department.toLowerCase())) {
        return false;
      }
    } else if (selectedDept !== 'all' && selectedDeptObj) {
      if (!isEmployeeInDepartment(emp, selectedDeptObj)) {
        return false;
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = emp.fullName.toLowerCase().includes(q);
      const matchKhmer = (emp.fullNameKhmer || '').includes(q);
      const matchId = emp.id.toLowerCase().includes(q);
      const matchRole = emp.role.toLowerCase().includes(q);
      const matchPhone = (emp.phone || '').includes(q);
      const matchNationalId = (emp.nationalId || '').includes(q);
      if (!matchName && !matchKhmer && !matchId && !matchRole && !matchPhone && !matchNationalId) return false;
    }

    if (selectedRoleType !== 'all' && (emp.roleType || 'staff') !== selectedRoleType) return false;
    return true;
  });

  // Calculate today's status for employee
  const today = new Date().toISOString().split('T')[0];
  const getEmployeeStatus = (empId: string) => {
    const todayRecs = records.filter(r => r.employeeId === empId && r.date === today && r.status === 'success');
    if (todayRecs.length === 0) return 'absent';
    const last = todayRecs[0];
    return last.type === 'check_in' ? 'checked_in' : 'checked_out';
  };

  const downloadQrCode = () => {
    if (!badgeQrDataUrl || !activeBadgeEmployee) return;
    const a = document.createElement('a');
    a.href = badgeQrDataUrl;
    a.download = `QR_Badge_${activeBadgeEmployee.id}_${activeBadgeEmployee.fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.directoryTitle}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Export Excel Database Template Button */}
          <button
            id="btn-export-excel-directory"
            type="button"
            onClick={() => {
              const depts = getStoredDepartments();
              downloadAttendanceExcelTemplate(employees, depts, records);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
            title={language === 'km' ? 'ទាញយកឯកសារ Excel សម្រាប់ Google Sheets' : 'Download Excel for Google Sheets'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'km' ? 'Excel (.xlsx)' : 'Export Excel'}</span>
          </button>

          {/* Admin Action: Add New Employee */}
          {isAdmin && (
            <button
              id="btn-add-employee"
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addEmployee}</span>
            </button>
          )}
        </div>
      </div>

      {/* Manager Department Scope Banner */}
      {isManager && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-indigo-950">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {t.managerDeptScope}: <span className="text-indigo-700">{language === 'km' ? currentUser.departmentKhmer : currentUser.department}</span>
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                {t.managerDeptNotice}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-indigo-100 text-indigo-800 font-bold text-xs">
            {filteredEmployees.length} {language === 'km' ? 'បុគ្គលិកក្នុងផ្នែក' : 'Team Members'}
          </span>
        </div>
      )}

      {/* Employment Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          id="tab-filter-status-all"
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{language === 'km' ? 'ទាំងអស់' : 'All Staff'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {statusCounts.all}
          </span>
        </button>

        <button
          id="tab-filter-status-active"
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'km' ? 'កំពុងបម្រើការ' : 'Active'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'active' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {statusCounts.active}
          </span>
        </button>

        <button
          id="tab-filter-status-resigned"
          type="button"
          onClick={() => setStatusFilter('resigned')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            statusFilter === 'resigned'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5 text-rose-500" />
          <span>{language === 'km' ? 'ឈប់ធ្វើការ' : 'Resigned / Terminated'}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            statusFilter === 'resigned' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-700'
          }`}>
            {statusCounts.resigned}
          </span>
        </button>

        {statusCounts.onLeave > 0 && (
          <button
            id="tab-filter-status-onleave"
            type="button"
            onClick={() => setStatusFilter('on_leave')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'on_leave'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'km' ? 'ច្បាប់សម្រាក' : 'On Leave'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === 'on_leave' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800'
            }`}>
              {statusCounts.onLeave}
            </span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-staff-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'km' ? 'ស្វែងរកឈ្មោះ, លេខកូដ, តួនាទី, ទូរស័ព្ទ...' : 'Search by name, ID, role, phone...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Department Filter */}
        {isManager ? (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{managerDept}</span>
          </div>
        ) : (
          <select
            id="select-dept-filter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">{t.allDepartments}</option>
            {configuredDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {language === 'km' ? (dept.nameKhmer || dept.name) : dept.name}
              </option>
            ))}
          </select>
        )}

        {/* Role Type Filter */}
        <select
          id="select-role-filter"
          value={selectedRoleType}
          onChange={(e) => setSelectedRoleType(e.target.value)}
          className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="all">{language === 'km' ? 'គ្រប់តួនាទី' : 'All Roles'}</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>

        {/* Compact View Switcher (Icon-only) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-end sm:self-center">
          <button
            id="btn-view-mode-table"
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title={language === 'km' ? 'ទិដ្ឋភាពតារាង (Table)' : 'Table View'}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            id="btn-view-mode-cards"
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title={language === 'km' ? 'ទិដ្ឋភាពប័ណ្ណ (Cards)' : 'Card View'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Mode: Cards Grid */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const status = getEmployeeStatus(emp.id);
            const roleType = emp.roleType || 'staff';
            const genderDisplay = language === 'km' 
              ? (emp.genderKhmer || (emp.gender === 'female' ? 'ស្រី' : 'ប្រុស'))
              : (emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : 'Male');

            const typeDisplay = language === 'km'
              ? (emp.employmentTypeKhmer || (emp.employmentType === 'probation' ? 'សាកល្បង' : 'ពេញម៉ោង'))
              : (emp.employmentType ? emp.employmentType.replace('_', ' ') : 'Full-time');

            return (
              <div
                key={emp.id}
                id={`employee-card-${emp.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Card Top: Avatar, Status & Role Pills */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <img
                        src={emp.avatar}
                        alt={emp.fullName}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                      {/* Live Status indicator */}
                      <span 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          status === 'checked_in' 
                            ? 'bg-emerald-500 ring-1 ring-emerald-300' 
                            : status === 'checked_out' 
                              ? 'bg-indigo-500 ring-1 ring-indigo-300' 
                              : 'bg-slate-300'
                        }`}
                        title={status === 'checked_in' ? 'Present' : status === 'checked_out' ? 'Checked Out' : 'Absent'}
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        roleType === 'admin'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : roleType === 'manager'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {roleType}
                      </span>
                      {emp.status === 'resigned' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <UserX className="w-3 h-3 text-rose-600" />
                          <span>{language === 'km' ? 'ឈប់ធ្វើការ' : 'Resigned'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {typeDisplay}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core Information */}
                  <div className="mt-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {emp.id}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {genderDisplay}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mt-1.5 leading-snug">
                      {language === 'km' ? emp.fullNameKhmer : emp.fullName}
                    </h3>
                    {language === 'km' && (
                      <p className="text-xs text-slate-400 font-medium">
                        {emp.fullName}
                      </p>
                    )}

                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      {language === 'km' ? emp.roleKhmer : emp.role}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'km' ? emp.departmentKhmer : emp.department}
                    </p>

                    {/* Resigned details tag */}
                    {emp.status === 'resigned' && (
                      <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-800 space-y-0.5">
                        <div className="font-semibold flex items-center gap-1 text-rose-900">
                          <UserX className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{language === 'km' ? `ឈប់ត្រឹម: ${emp.resignedDate || 'មិនបានបញ្ជាក់'}` : `Resigned: ${emp.resignedDate || 'N/A'}`}</span>
                        </div>
                        {emp.resignationReason && (
                          <p className="text-[10px] text-rose-600 truncate" title={emp.resignationReason}>
                            {emp.resignationReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rich Profile Details Snippet */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono">{emp.phone}</span>
                      </div>
                    )}
                    {emp.email && (
                      <div className="flex items-center gap-2 text-[11px] truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100/80">
                      <span className="text-slate-500">{language === 'km' ? 'ប្រាក់ខែគោល:' : 'Base Salary:'}</span>
                      <span className="font-mono font-bold text-emerald-700">${(emp.baseSalary ?? 650).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{language === 'km' ? 'ម៉ោងចូល:' : 'Shift:'}</span>
                      <span className="font-mono text-slate-700">{emp.workStartTime || '08:00'} - {emp.workEndTime || '17:00'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* View Full Profile button */}
                    <button
                      id={`btn-view-profile-${emp.id}`}
                      onClick={() => setDetailedProfileEmployee(emp)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors"
                      title={t.viewFullProfile}
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{language === 'km' ? 'ព័ត៌មានលម្អិត' : 'Full Profile'}</span>
                    </button>

                    {/* View QR Badge */}
                    <button
                      id={`btn-view-badge-${emp.id}`}
                      onClick={() => setActiveBadgeEmployee(emp)}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      title={t.viewBadge}
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    {/* Simulate Scan */}
                    <button
                      id={`btn-simulate-scan-${emp.id}`}
                      onClick={() => onSimulateScan(emp.id)}
                      className="flex items-center justify-center gap-1 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                      title="Simulate Instant Attendance Scan"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>

                  {/* Management Actions: Edit / Resign / Reactivate / Delete */}
                  {canManageEmployees && (
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 mt-2">
                      <div className="flex items-center gap-1">
                        {emp.status === 'resigned' ? (
                          <button
                            id={`btn-reactivate-emp-${emp.id}`}
                            onClick={() => handleReactivateEmployee(emp)}
                            className="flex items-center gap-1 px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title={t.rehireEmployee}
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{language === 'km' ? 'ចូលធ្វើការវិញ' : 'Rehire'}</span>
                          </button>
                        ) : (
                          <button
                            id={`btn-resign-emp-${emp.id}`}
                            onClick={() => handleOpenResignModal(emp)}
                            className="flex items-center gap-1 px-2 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title={language === 'km' ? 'កំណត់ថាឈប់ធ្វើការ' : 'Mark as Resigned'}
                          >
                            <UserX className="w-3.5 h-3.5 text-amber-700" />
                            <span>{language === 'km' ? 'ឈប់ធ្វើការ' : 'Resign'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          id={`btn-edit-emp-${emp.id}`}
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs transition-colors cursor-pointer"
                          title={t.editEmployee}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            id={`btn-delete-emp-${emp.id}`}
                            onClick={() => handleOpenDeleteModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors cursor-pointer"
                            title={language === 'km' ? 'លុបបុគ្គលិកជាអចិន្ត្រៃយ៍' : 'Delete Employee'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: Data Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">{language === 'km' ? 'បុគ្គលិក' : 'Employee'}</th>
                  <th className="px-4 py-3.5">{t.departmentLabel} & {t.roleLabel}</th>
                  <th className="px-4 py-3.5">{t.genderLabel} / {t.employmentTypeLabel}</th>
                  <th className="px-4 py-3.5">{language === 'km' ? 'ទំនាក់ទំនង' : 'Contact'}</th>
                  <th className="px-4 py-3.5">{t.joinDateLabel}</th>
                  <th className="px-4 py-3.5">{t.filterStatus}</th>
                  <th className="px-4 py-3.5 text-right">{language === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => {
                  const status = getEmployeeStatus(emp.id);
                  const roleType = emp.roleType || 'staff';
                  const genderDisplay = language === 'km' 
                    ? (emp.genderKhmer || (emp.gender === 'female' ? 'ស្រី' : 'ប្រុស'))
                    : (emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : 'Male');

                  const typeDisplay = language === 'km'
                    ? (emp.employmentTypeKhmer || (emp.employmentType === 'probation' ? 'សាកល្បង' : 'ពេញម៉ោង'))
                    : (emp.employmentType ? emp.employmentType.replace('_', ' ') : 'Full-time');

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Avatar & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatar}
                            alt={emp.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {emp.id}
                            </span>
                            <p className="font-bold text-slate-900 text-sm mt-0.5">
                              {language === 'km' ? emp.fullNameKhmer : emp.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {language === 'km' ? emp.fullName : emp.fullNameKhmer}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Role */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {language === 'km' ? emp.departmentKhmer : emp.department}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {language === 'km' ? emp.roleKhmer : emp.role}
                        </p>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                          {roleType}
                        </span>
                      </td>

                      {/* Gender & Employment Type */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">
                          {genderDisplay}
                        </p>
                        <span className="inline-block text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                          {typeDisplay}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <p className="text-slate-800 font-medium">{emp.phone || '-'}</p>
                        <p className="text-slate-500 text-[10px] font-sans truncate max-w-[160px]">{emp.email || '-'}</p>
                      </td>

                      {/* Join Date */}
                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        {emp.joinDate || '-'}
                      </td>

                      {/* Today Status */}
                      <td className="px-4 py-3">
                        {emp.status === 'resigned' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX className="w-3 h-3 text-rose-600" />
                            {language === 'km' ? 'ឈប់ធ្វើការ' : 'Resigned'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            status === 'checked_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'checked_out'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              status === 'checked_in' ? 'bg-emerald-600' : status === 'checked_out' ? 'bg-indigo-600' : 'bg-slate-400'
                            }`} />
                            {status === 'checked_in' 
                              ? (language === 'km' ? 'មានវត្តមាន' : 'In') 
                              : status === 'checked_out' 
                                ? (language === 'km' ? 'បានចេញ' : 'Out') 
                                : (language === 'km' ? 'អវត្តមាន' : 'Absent')}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Full Profile */}
                          <button
                            id={`btn-table-profile-${emp.id}`}
                            onClick={() => setDetailedProfileEmployee(emp)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title={t.viewFullProfile}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* View QR Badge */}
                          <button
                            id={`btn-table-badge-${emp.id}`}
                            onClick={() => setActiveBadgeEmployee(emp)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={t.viewBadge}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Simulate scan */}
                          <button
                            id={`btn-table-scan-${emp.id}`}
                            onClick={() => onSimulateScan(emp.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Simulate Scan"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>

                          {/* Management Actions: Edit / Resign / Reactivate / Delete */}
                          {canManageEmployees && (
                            <>
                              {emp.status === 'resigned' ? (
                                <button
                                  id={`btn-table-reactivate-${emp.id}`}
                                  onClick={() => handleReactivateEmployee(emp)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title={t.rehireEmployee}
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  id={`btn-table-resign-${emp.id}`}
                                  onClick={() => handleOpenResignModal(emp)}
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title={language === 'km' ? 'កំណត់ថាឈប់ធ្វើការ' : 'Mark as Resigned'}
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                id={`btn-table-edit-${emp.id}`}
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title={t.editEmployee}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {isAdmin && (
                                <button
                                  id={`btn-table-delete-${emp.id}`}
                                  onClick={() => handleOpenDeleteModal(emp)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={language === 'km' ? 'លុបបុគ្គលិកជាអចិន្ត្រៃយ៍' : 'Delete Employee'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Digital QR ID Badge */}
      {activeBadgeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 p-6 text-white text-center relative">
              <button
                id="btn-close-badge-modal"
                onClick={() => setActiveBadgeEmployee(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-xs uppercase tracking-widest font-semibold text-indigo-200">
                {t.badgeModalTitle}
              </h3>
              <p className="text-lg font-bold mt-1">
                {language === 'km' ? activeBadgeEmployee.fullNameKhmer : activeBadgeEmployee.fullName}
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">
                {activeBadgeEmployee.role} • {activeBadgeEmployee.department}
              </p>
            </div>

            {/* Badge Body */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                {badgeQrDataUrl ? (
                  <img
                    src={badgeQrDataUrl}
                    alt={`QR for ${activeBadgeEmployee.id}`}
                    className="w-52 h-52 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR code...
                  </div>
                )}
                <p className="font-mono text-sm font-bold text-slate-900 mt-2 tracking-wider">
                  {activeBadgeEmployee.id}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full">
                <button
                  id="btn-download-qr-badge"
                  onClick={downloadQrCode}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadBadge}</span>
                </button>
                <button
                  id="btn-print-qr-badge"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  title="Print Badge"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Full Employee Profile Detail */}
      <EmployeeProfileModal
        employee={detailedProfileEmployee}
        isOpen={!!detailedProfileEmployee}
        onClose={() => setDetailedProfileEmployee(null)}
        language={language}
        records={records}
        onViewBadge={(emp) => {
          setActiveBadgeEmployee(emp);
        }}
        onSimulateScan={(empId) => {
          onSimulateScan(empId);
        }}
        onEdit={(emp) => {
          handleOpenEditModal(emp);
        }}
        onResign={(emp) => {
          setDetailedProfileEmployee(null);
          handleOpenResignModal(emp);
        }}
        onReactivate={(emp) => {
          handleReactivateEmployee(emp);
          setDetailedProfileEmployee(null);
        }}
        onDelete={(emp) => {
          setDetailedProfileEmployee(null);
          handleOpenDeleteModal(emp);
        }}
        canEdit={canManageEmployees}
      />

      {/* Modal: Add or Edit Employee (Admin Only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingEmployee ? t.editEmployee : t.addEmployee}
                </h3>
              </div>
              <button
                id="btn-close-add-modal"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setFormTab('personal')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  formTab === 'personal'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.personalInfo}</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTab('job')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  formTab === 'job'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>{t.jobInfo}</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTab('contact')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  formTab === 'contact'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>{t.contactEmergency}</span>
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="flex-1 flex flex-col overflow-hidden">
              
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                
                {/* TAB 1: Personal Info */}
                {formTab === 'personal' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Employee ID */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.employeeIdLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.id}
                          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          disabled={!!editingEmployee}
                        />
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.genderLabel}
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => {
                            const val = e.target.value as Gender;
                            setFormData({
                              ...formData,
                              gender: val,
                              genderKhmer: val === 'female' ? 'ស្រី' : val === 'male' ? 'ប្រុស' : 'ផ្សេងទៀត'
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="male">{language === 'km' ? 'ប្រុស (Male)' : 'Male'}</option>
                          <option value="female">{language === 'km' ? 'ស្រី (Female)' : 'Female'}</option>
                          <option value="other">{language === 'km' ? 'ផ្សេងទៀត (Other)' : 'Other'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Full Name EN & Khmer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.fullNameLabel}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. David Som"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.fullNameKhmerLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. ដាវីត សោម"
                          value={formData.fullNameKhmer}
                          onChange={(e) => setFormData({ ...formData, fullNameKhmer: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Date of Birth & National ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.dobLabel}
                        </label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.nationalIdLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 090123456"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Current Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.addressLabel}
                      </label>
                      <input
                        type="text"
                        placeholder="ឧ. ផ្ទះលេខ ១២ ផ្លូវ ២៧១ សង្កាត់ទួលទំពូង ខណ្ឌចំការមន រាជធានីភ្នំពេញ"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Job & Employment */}
                {formTab === 'job' && (
                  <div className="space-y-3">
                    {/* Department Quick Select & Inputs */}
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{language === 'km' ? 'ជ្រើសរើសផ្នែកដែលបានកំណត់' : 'Select Configured Department'}</span>
                        </label>
                        <span className="text-[11px] text-indigo-600 font-medium">
                          {language === 'km' ? 'បំពេញស្វ័យប្រវត្តិ' : 'Auto-fills names'}
                        </span>
                      </div>
                      <select
                        id="select-employee-configured-dept"
                        onChange={(e) => {
                          const d = configuredDepartments.find(cd => cd.id === e.target.value);
                          if (d) {
                            setFormData({
                              ...formData,
                              department: d.name,
                              departmentKhmer: d.nameKhmer
                            });
                          }
                        }}
                        className="w-full text-xs font-medium bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="">{language === 'km' ? '-- ជ្រើសរើសផ្នែកដែលមានស្រាប់ --' : '-- Choose from Configured Departments --'}</option>
                        {configuredDepartments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.code} — {language === 'km' ? (dept.nameKhmer || dept.name) : dept.name} ({dept.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.departmentLabel} (English)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Engineering"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.departmentLabel} (Khmer)
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. វិស្វកម្ម"
                          value={formData.departmentKhmer}
                          onChange={(e) => setFormData({ ...formData, departmentKhmer: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Job Title EN & Khmer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.roleLabel} (English)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Software Engineer"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.roleLabel} (Khmer)
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. វិស្វករកម្មវិធីកុំព្យូទ័រ"
                          value={formData.roleKhmer}
                          onChange={(e) => setFormData({ ...formData, roleKhmer: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Role Type & Employment Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.roleTypeLabel}
                        </label>
                        <select
                          value={formData.roleType}
                          onChange={(e) => setFormData({ ...formData, roleType: e.target.value as UserRole })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="staff">Staff (បុគ្គលិកទូទៅ)</option>
                          <option value="manager">Manager (ប្រធានគ្រប់គ្រង)</option>
                          <option value="admin">Admin (អ្នកគ្រប់គ្រងប្រព័ន្ធ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.employmentTypeLabel}
                        </label>
                        <select
                          value={formData.employmentType}
                          onChange={(e) => {
                            const val = e.target.value as EmploymentType;
                            setFormData({
                              ...formData,
                              employmentType: val,
                              employmentTypeKhmer: val === 'probation' ? 'សាកល្បង' : val === 'contract' ? 'កិច្ចសន្យា' : 'ពេញម៉ោង'
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="full_time">{t.fullTime}</option>
                          <option value="probation">{t.probation}</option>
                          <option value="contract">{t.contract}</option>
                          <option value="part_time">{t.partTime}</option>
                        </select>
                      </div>
                    </div>

                    {/* Employment Status & Resignation fields */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        {language === 'km' ? 'ស្ថានភាពបុគ្គលិក' : 'Employment Status'}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          formData.status === 'active' 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="employee-form-status"
                            value="active"
                            checked={formData.status === 'active'}
                            onChange={() => setFormData({ ...formData, status: 'active', statusKhmer: 'កំពុងបម្រើការ' })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs">{language === 'km' ? 'កំពុងបម្រើការ' : 'Active'}</span>
                        </label>

                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          formData.status === 'resigned' 
                            ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="employee-form-status"
                            value="resigned"
                            checked={formData.status === 'resigned'}
                            onChange={() => setFormData({ 
                              ...formData, 
                              status: 'resigned', 
                              statusKhmer: 'ឈប់ធ្វើការ',
                              resignedDate: formData.resignedDate || new Date().toISOString().split('T')[0]
                            })}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs">{language === 'km' ? 'ឈប់ធ្វើការ' : 'Resigned'}</span>
                        </label>

                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          formData.status === 'on_leave' 
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' 
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <input
                            type="radio"
                            name="employee-form-status"
                            value="on_leave"
                            checked={formData.status === 'on_leave'}
                            onChange={() => setFormData({ ...formData, status: 'on_leave', statusKhmer: 'ច្បាប់សម្រាក' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs">{language === 'km' ? 'ច្បាប់សម្រាក' : 'On Leave'}</span>
                        </label>
                      </div>

                      {/* If resigned, show resignation details */}
                      {formData.status === 'resigned' && (
                        <div className="pt-2.5 border-t border-rose-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in">
                          <div>
                            <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                              {language === 'km' ? 'កាលបរិច្ឆេទឈប់ធ្វើការ' : 'Resignation Date'}
                            </label>
                            <input
                              type="date"
                              value={formData.resignedDate || ''}
                              onChange={(e) => setFormData({ ...formData, resignedDate: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                              {language === 'km' ? 'មូលហេតុឈប់ធ្វើការ' : 'Reason for Resignation'}
                            </label>
                            <input
                              type="text"
                              placeholder={language === 'km' ? 'ឧ. ប្តូរការងារ, ផ្លាស់ប្តូរទីលំនៅ...' : 'e.g. Career change, relocation...'}
                              value={formData.resignationReason || ''}
                              onChange={(e) => setFormData({ ...formData, resignationReason: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Join Date & Work Schedule */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.joinDateLabel}
                        </label>
                        <input
                          type="date"
                          value={formData.joinDate}
                          onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.workScheduleLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 08:00 - 17:00 (ចន្ទ - សុក្រ)"
                          value={formData.workSchedule}
                          onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Work Location & Bank Account */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.workLocationLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Phnom Penh HQ"
                          value={formData.workLocation}
                          onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.bankAccountLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ABA Bank: 001 554 992"
                          value={formData.bankAccount}
                          onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Salary & Working Hours Section for Payroll & Late Deductions */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          $
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950">
                            {t.salaryAndScheduleSection}
                          </h4>
                          <p className="text-[10px] text-emerald-700">
                            {t.salaryAndScheduleDesc}
                          </p>
                        </div>
                      </div>

                      {/* Base Salary & Daily Hours */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {t.baseSalaryLabel}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              step="10"
                              min="0"
                              required
                              placeholder="e.g. 650"
                              value={formData.baseSalary}
                              onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {t.workingHoursPerDayLabel}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="24"
                            required
                            placeholder="8"
                            value={formData.workingHoursPerDay}
                            onChange={(e) => setFormData({ ...formData, workingHoursPerDay: parseFloat(e.target.value) || 8 })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Work Start Time & Work End Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{t.workStartTimeLabel}</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.workStartTime}
                            onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.workEndTimeLabel}</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={formData.workEndTime}
                            onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Grace Period & Deduction Rate */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {t.lateGracePeriodMinutesLabel}
                          </label>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={formData.lateGracePeriodMinutes}
                              onChange={(e) => setFormData({ ...formData, lateGracePeriodMinutes: parseInt(e.target.value, 10) || 0 })}
                              className="w-full text-sm font-mono font-semibold focus:outline-none"
                            />
                            <span className="text-xs text-slate-400 font-medium">min</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {t.lateDeductionRateLabel}
                          </label>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                            <span className="text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={formData.lateDeductionRate}
                              onChange={(e) => setFormData({ ...formData, lateDeductionRate: parseFloat(e.target.value) || 0 })}
                              className="w-full text-sm font-mono font-bold text-rose-700 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400 font-medium">/scan</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 3: Contact & Emergency */}
                {formTab === 'contact' && (
                  <div className="space-y-3">
                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.phoneLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="+855 12 345 678"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t.emailLabel}
                        </label>
                        <input
                          type="email"
                          placeholder="staff@company.kh"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1.5">
                        <HeartHandshake className="w-4 h-4" />
                        <span>{t.emergencyContactLabel}</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            {language === 'km' ? 'ឈ្មោះអ្នកទាក់ទង' : 'Contact Name'}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sok Sovann"
                            value={formData.emergencyContactName}
                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            {t.emergencyPhoneLabel}
                          </label>
                          <input
                            type="text"
                            placeholder="+855 12 888 999"
                            value={formData.emergencyContactPhone}
                            onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            {t.emergencyRelationLabel}
                          </label>
                          <input
                            type="text"
                            placeholder="ឧ. បងប្រុស / ស្វាមី"
                            value={formData.emergencyContactRelation}
                            onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Actions */}
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  {formTab === 'job' && (
                    <button
                      type="button"
                      onClick={() => setFormTab('personal')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      ← {language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
                    </button>
                  )}
                  {formTab === 'contact' && (
                    <button
                      type="button"
                      onClick={() => setFormTab('job')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      ← {language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
                    </button>
                  )}
                  {formTab === 'personal' && (
                    <button
                      type="button"
                      onClick={() => setFormTab('job')}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      {language === 'km' ? 'បន្ទាប់' : 'Next'} →
                    </button>
                  )}
                  {formTab === 'job' && (
                    <button
                      type="button"
                      onClick={() => setFormTab('contact')}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      {language === 'km' ? 'បន្ទាប់' : 'Next'} →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    {language === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
                  >
                    {t.saveEmployee}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Mark Employee as Resigned */}
      {resigningEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'km' ? 'កត់ត្រាបុគ្គលិកឈប់ធ្វើការ' : 'Record Employee Resignation'}
                  </h3>
                  <p className="text-slate-500 text-xs font-mono">
                    {resigningEmployee.id}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-resign-modal"
                onClick={() => setResigningEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Target employee card summary */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <img
                  src={resigningEmployee.avatar}
                  alt={resigningEmployee.fullName}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {language === 'km' ? resigningEmployee.fullNameKhmer : resigningEmployee.fullName}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {language === 'km' ? resigningEmployee.roleKhmer : resigningEmployee.role} • {language === 'km' ? resigningEmployee.departmentKhmer : resigningEmployee.department}
                  </p>
                </div>
              </div>

              {/* Policy note */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <p className="font-semibold text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  {language === 'km' ? 'ប្រសិទ្ធភាពនៃការកំណត់ឈប់ធ្វើការ:' : 'Resignation Impact:'}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  <li>{language === 'km' ? 'ប្រព័ន្ធស្កេនវត្តមាននឹងបដិសេធការស្កេនរបស់បុគ្គលិកនេះដោយស្វ័យប្រវត្តិ។' : 'Scanner will immediately reject attendance scans for this employee.'}</li>
                  <li>{language === 'km' ? 'ប្រវត្តិនៃការចុះវត្តមានកន្លងមកនឹងត្រូវរក្សាទុកដដែល មិនបាត់បង់ឡើយ។' : 'All historical attendance records will remain preserved for audit.'}</li>
                  <li>{language === 'km' ? 'អ្នកអាចដំណើរការបុគ្គលិកនេះឡើងវិញ (Rehire) បានគ្រប់ពេលវេលា។' : 'You can reactivate / rehire this employee at any time with one click.'}</li>
                </ul>
              </div>

              {/* Resignation Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'km' ? 'កាលបរិច្ឆេទឈប់ធ្វើការ' : 'Effective Resignation Date'}
                </label>
                <input
                  id="input-resign-date"
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Resignation Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'km' ? 'មូលហេតុនៃការឈប់' : 'Reason for Resignation'}
                </label>
                <input
                  id="input-resign-reason"
                  type="text"
                  placeholder={language === 'km' ? 'ឧ. លាលែងផ្ទាល់ខ្លួន, ប្តូរការងារ...' : 'e.g. Personal resignation, contract ended...'}
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                {/* Quick reason suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    language === 'km' ? 'លាលែងផ្ទាល់ខ្លួន' : 'Personal Resignation',
                    language === 'km' ? 'ចប់កិច្ចសន្យាការងារ' : 'Contract Ended',
                    language === 'km' ? 'ប្តូរទៅកន្លែងការងារថ្មី' : 'Career Transition',
                    language === 'km' ? 'ផ្លាស់ប្តូរទីលំនៅ' : 'Relocation'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResignationReason(preset)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-resign"
                type="button"
                onClick={() => setResigningEmployee(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-resign"
                type="button"
                onClick={handleConfirmResign}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>{language === 'km' ? 'យល់ព្រម កត់ត្រាឈប់' : 'Confirm Resignation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permanent Delete Employee (Admin Only) */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'km' ? 'លុបបុគ្គលិកជាអចិន្ត្រៃយ៍' : 'Delete Employee Permanently'}
                  </h3>
                  <p className="text-rose-600 text-xs font-mono font-bold">
                    {deletingEmployee.id}
                  </p>
                </div>
              </div>
              <button
                id="btn-close-delete-modal"
                onClick={() => setDeletingEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <img
                  src={deletingEmployee.avatar}
                  alt={deletingEmployee.fullName}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {language === 'km' ? deletingEmployee.fullNameKhmer : deletingEmployee.fullName}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {language === 'km' ? deletingEmployee.roleKhmer : deletingEmployee.role}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  {language === 'km' ? 'ការព្រមានសំខាន់:' : 'Warning:'}
                </p>
                {language === 'km'
                  ? 'ព័ត៌មានបុគ្គលិកនេះនឹងត្រូវលុបចេញពីប្រព័ន្ធទាំងស្រុង។ ប្រសិនបើបុគ្គលិកគ្រាន់តែឈប់ធ្វើការ យើងសូមណែនាំឱ្យប្រើមុខងារ "ឈប់ធ្វើការ (Resign)" ជំនួសវិញ ដើម្បីរក្សាទុកប្រវត្តិការងារ។'
                  : 'This employee profile will be completely purged. If the employee merely resigned, consider using "Mark as Resigned" instead to preserve attendance history.'}
              </div>

              {/* Cascade attendance delete option */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  id="checkbox-cascade-records"
                  type="checkbox"
                  checked={deleteCascadeRecords}
                  onChange={(e) => setDeleteCascadeRecords(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <p className="font-semibold text-slate-800 text-xs">
                    {language === 'km' ? 'លុបកំណត់ត្រាវត្តមានទាំងអស់របស់បុគ្គលិកនេះផងដែរ' : 'Also cascade delete all attendance records for this employee'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'km' ? 'បើគូសយក កំណត់ត្រាវត្តមានពីមុនទាំងអស់នឹងត្រូវលុបចោលទាំងស្រុង' : 'If checked, all previous scan history for this employee will be purged'}
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'km' ? 'លុបជាអចិន្ត្រៃយ៍' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-xs animate-in slide-in-from-bottom-2 fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
