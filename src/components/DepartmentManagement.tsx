import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  QrCode,
  Briefcase
} from 'lucide-react';
import { Language, Department, Employee, AttendanceRecord, UserAccount } from '../types';
import { translations } from '../i18n/translations';
import { getStoredDepartments, saveStoredDepartments } from '../data/mockDepartments';
import { getStoredEmployees } from '../data/mockEmployees';
import { showKhmerSaveAlert, showKhmerDeleteAlert } from '../utils/alertNotification';

interface DepartmentManagementProps {
  language: Language;
  currentUser: UserAccount;
  records: AttendanceRecord[];
  onOpenScanner?: () => void;
  onSelectEmployeeBadge?: (emp: Employee) => void;
}

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  language,
  currentUser,
  records,
  onOpenScanner
}) => {
  const t = translations[language];

  const [departments, setDepartments] = useState<Department[]>(() => getStoredDepartments());
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [selectedDeptMembers, setSelectedDeptMembers] = useState<Department | null>(null);
  const [deleteConfirmDept, setDeleteConfirmDept] = useState<Department | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameKhmer: '',
    description: '',
    descriptionKhmer: '',
    managerName: '',
    managerNameKhmer: '',
    color: 'indigo'
  });

  const [formError, setFormError] = useState('');

  // Calculate today's date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's checked-in employee IDs
  const checkedInTodayEmpIds = useMemo(() => {
    const todayRecords = records.filter(r => r.date === todayStr);
    const empStatusMap = new Map<string, string>();
    // Iterate ascending
    const sorted = [...todayRecords].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sorted.forEach(r => {
      empStatusMap.set(r.employeeId, r.type);
    });
    const presentSet = new Set<string>();
    empStatusMap.forEach((status, empId) => {
      if (status === 'check_in') {
        presentSet.add(empId);
      }
    });
    return presentSet;
  }, [records, todayStr]);

  // Map employee counts to departments
  const departmentStats = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    
    // Normalization helper
    const normalize = (name: string) => name.trim().toLowerCase();

    departments.forEach(dept => {
      const deptEmployees = employees.filter(e => {
        const empDeptNorm = normalize(e.department);
        const deptNorm = normalize(dept.name);
        const deptKhmerNorm = normalize(dept.nameKhmer);
        const empDeptKhmerNorm = normalize(e.departmentKhmer || '');
        return empDeptNorm.includes(deptNorm) || 
               deptNorm.includes(empDeptNorm) || 
               (deptKhmerNorm && empDeptKhmerNorm && (empDeptKhmerNorm.includes(deptKhmerNorm) || deptKhmerNorm.includes(empDeptKhmerNorm)));
      });

      const total = deptEmployees.length;
      const present = deptEmployees.filter(e => checkedInTodayEmpIds.has(e.id)).length;
      map.set(dept.id, { total, present });
    });

    return map;
  }, [departments, employees, checkedInTodayEmpIds]);

  // Overall summary metrics
  const totalDepartments = departments.length;
  const totalAssignedStaff = employees.length;
  const totalPresentToday = checkedInTodayEmpIds.size;
  const overallRate = totalAssignedStaff > 0 ? Math.round((totalPresentToday / totalAssignedStaff) * 100) : 0;

  // Filtered departments list
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.nameKhmer.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.managerName && d.managerName.toLowerCase().includes(q)) ||
      (d.managerNameKhmer && d.managerNameKhmer.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      code: '',
      name: '',
      nameKhmer: '',
      description: '',
      descriptionKhmer: '',
      managerName: '',
      managerNameKhmer: '',
      color: 'indigo'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      nameKhmer: dept.nameKhmer,
      description: dept.description || '',
      descriptionKhmer: dept.descriptionKhmer || '',
      managerName: dept.managerName || '',
      managerNameKhmer: dept.managerNameKhmer || '',
      color: dept.color || 'indigo'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Save Department Form (Create or Update)
  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nameKhmer.trim() || !formData.code.trim()) {
      setFormError(language === 'km' ? 'សូមបំពេញលេខកូដ និងឈ្មោះផ្នែកជាភាសាខ្មែរ និងអង់គ្លេស' : 'Please fill in Department Code, Khmer Name, and English Name.');
      return;
    }

    const cleanCode = formData.code.trim().toUpperCase();

    if (editingDept) {
      // Check duplicate code with others
      const duplicate = departments.some(d => d.id !== editingDept.id && d.code.toUpperCase() === cleanCode);
      if (duplicate) {
        setFormError(language === 'km' ? 'លេខកូដផ្នែកនេះមានរួចហើយ' : 'Department Code already exists.');
        return;
      }

      const updated = departments.map(d => {
        if (d.id === editingDept.id) {
          return {
            ...d,
            code: cleanCode,
            name: formData.name.trim(),
            nameKhmer: formData.nameKhmer.trim(),
            description: formData.description.trim(),
            descriptionKhmer: formData.descriptionKhmer.trim(),
            managerName: formData.managerName.trim(),
            managerNameKhmer: formData.managerNameKhmer.trim(),
            color: formData.color
          };
        }
        return d;
      });

      setDepartments(updated);
      saveStoredDepartments(updated);
      const deptName = formData.nameKhmer.trim() || formData.name.trim();
      showKhmerSaveAlert(`បានរក្សាទុកការកែប្រែនាយកដ្ឋាន «${deptName}» (${cleanCode}) ដោយជោគជ័យ!`, 'រក្សាទុកជោគជ័យ');
    } else {
      // Create new
      const duplicate = departments.some(d => d.code.toUpperCase() === cleanCode);
      if (duplicate) {
        setFormError(language === 'km' ? 'លេខកូដផ្នែកនេះមានរួចហើយ' : 'Department Code already exists.');
        return;
      }

      const newDept: Department = {
        id: `dept-${Date.now()}`,
        code: cleanCode,
        name: formData.name.trim(),
        nameKhmer: formData.nameKhmer.trim(),
        description: formData.description.trim(),
        descriptionKhmer: formData.descriptionKhmer.trim(),
        managerName: formData.managerName.trim(),
        managerNameKhmer: formData.managerNameKhmer.trim(),
        color: formData.color,
        createdAt: todayStr
      };

      const updated = [...departments, newDept];
      setDepartments(updated);
      saveStoredDepartments(updated);
      const deptName = formData.nameKhmer.trim() || formData.name.trim();
      showKhmerSaveAlert(`បានរក្សាទុកនាយកដ្ឋានថ្មី «${deptName}» (${cleanCode}) ដោយជោគជ័យ!`, 'រក្សាទុកជោគជ័យ');
    }

    setIsAddModalOpen(false);
  };

  // Delete Department Confirmation
  const handleDeleteDepartment = (dept: Department) => {
    const updated = departments.filter(d => d.id !== dept.id);
    setDepartments(updated);
    saveStoredDepartments(updated);
    setDeleteConfirmDept(null);
    const deptName = dept.nameKhmer || dept.name;
    showKhmerDeleteAlert(`បានលុបនាយកដ្ឋាន «${deptName}» (${dept.code}) ចេញពីប្រព័ន្ធដោយជោគជ័យ!`, 'លុបបានជោគជ័យ');
  };

  // Color theme helper
  const getColorStyles = (color?: string) => {
    switch (color) {
      case 'rose':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          accent: 'from-rose-500 to-rose-600',
          dot: 'bg-rose-500'
        };
      case 'blue':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          accent: 'from-blue-500 to-blue-600',
          dot: 'bg-blue-500'
        };
      case 'amber':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          accent: 'from-amber-500 to-amber-600',
          dot: 'bg-amber-500'
        };
      case 'emerald':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          accent: 'from-emerald-500 to-emerald-600',
          dot: 'bg-emerald-500'
        };
      case 'purple':
        return {
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          accent: 'from-purple-500 to-purple-600',
          dot: 'bg-purple-500'
        };
      case 'indigo':
      default:
        return {
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          accent: 'from-indigo-500 to-indigo-600',
          dot: 'bg-indigo-500'
        };
    }
  };

  // Get employees for a selected department
  const getEmployeesForDept = (dept: Department) => {
    const normalize = (name: string) => name.trim().toLowerCase();
    const deptNorm = normalize(dept.name);
    const deptKhmerNorm = normalize(dept.nameKhmer);

    return employees.filter(e => {
      const empDeptNorm = normalize(e.department);
      const empDeptKhmerNorm = normalize(e.departmentKhmer || '');
      return empDeptNorm.includes(deptNorm) || 
             deptNorm.includes(empDeptNorm) || 
             (deptKhmerNorm && empDeptKhmerNorm && (empDeptKhmerNorm.includes(deptKhmerNorm) || deptKhmerNorm.includes(empDeptKhmerNorm)));
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {language === 'km' ? 'ការគ្រប់គ្រងផ្នែក (Departments)' : 'Department Management'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {language === 'km' 
                  ? 'រៀបចំរចនាសម្ព័ន្ធផ្នែក ក្រុមការងារ និងតាមដានវត្តមានតាមផ្នែកនីមួយៗ' 
                  : 'Organize team structures, department leads, and monitor attendance by team'}
              </p>
            </div>
          </div>
        </div>

        {/* Add Department Button */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-department"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'km' ? 'បន្ថែមផ្នែកថ្មី' : 'Add Department'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'km' ? 'ផ្នែកសរុប' : 'Total Departments'}</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalDepartments}</p>
          <p className="text-[11px] text-slate-400 font-medium">
            {language === 'km' ? 'រចនាសម្ព័ន្ធក្នុងស្ថាប័ន' : 'Configured organizational units'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'km' ? 'បុគ្គលិកសរុប' : 'Assigned Staff'}</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{totalAssignedStaff}</p>
          <p className="text-[11px] text-slate-400 font-medium">
            {language === 'km' ? 'សមាជិកទាំងអស់ក្នុងផ្នែក' : 'Across all company units'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'km' ? 'មានវត្តមានថ្ងៃនេះ' : 'Present Today'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{totalPresentToday}</p>
          <p className="text-[11px] text-slate-400 font-medium">
            {language === 'km' ? 'កំពុងមានវត្តមានធ្វើការ' : 'Active checked-in staff'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'km' ? 'អត្រាវត្តមានរួម' : 'Attendance Rate'}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{overallRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(overallRate, 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* 3. Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
        <input
          id="input-department-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'km' ? 'ស្វែងរកតាមឈ្មោះផ្នែក លេខកូដ ឬប្រធានផ្នែក...' : 'Search by department name, code, or department lead...'}
          className="w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepartments.map((dept) => {
          const stats = departmentStats.get(dept.id) || { total: 0, present: 0 };
          const colorStyles = getColorStyles(dept.color);
          const deptRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

          return (
            <div 
              key={dept.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${colorStyles.badge}`}>
                      {dept.code}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {language === 'km' ? dept.nameKhmer : dept.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === 'km' ? dept.name : dept.nameKhmer}
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown / Quick Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      title={language === 'km' ? 'កែសម្រួល' : 'Edit'}
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title={language === 'km' ? 'លុប' : 'Delete'}
                      onClick={() => setDeleteConfirmDept(dept)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                  {language === 'km' 
                    ? (dept.descriptionKhmer || dept.description || 'គ្មានការពិពណ៌នា') 
                    : (dept.description || dept.descriptionKhmer || 'No description provided')}
                </p>

                {/* Department Lead */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {language === 'km' ? 'ប្រធានផ្នែក:' : 'Lead:'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {dept.managerNameKhmer && language === 'km' 
                      ? dept.managerNameKhmer 
                      : (dept.managerName || (language === 'km' ? 'មិនទាន់កំណត់' : 'Unassigned'))}
                  </span>
                </div>

                {/* Attendance Mini Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {language === 'km' ? 'វត្តមានថ្ងៃនេះ:' : 'Attendance Today:'}
                    </span>
                    <span className="font-bold text-slate-900">
                      <span className="text-emerald-600">{stats.present}</span> / {stats.total} ({deptRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(deptRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: View Members */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{stats.total} {language === 'km' ? 'នាក់' : 'members'}</span>
                </span>

                <button
                  id={`btn-view-dept-${dept.id}`}
                  onClick={() => setSelectedDeptMembers(dept)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>{language === 'km' ? 'មើលសមាជិក' : 'View Members'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-700 font-bold text-base">
            {language === 'km' ? 'រកមិនឃើញផ្នែកដែលអ្នកស្វែងរកទេ' : 'No departments match your query'}
          </p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {language === 'km' ? 'សូមសាកល្បងស្វែងរកដោយពាក្យគន្លឹះផ្សេង ឬបង្កើតផ្នែកថ្មី។' : 'Try adjusting your search keywords or add a new department.'}
          </p>
        </div>
      )}

      {/* 5. Add / Edit Department Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDept 
                    ? (language === 'km' ? 'កែសម្រួលផ្នែក' : 'Edit Department')
                    : (language === 'km' ? 'បង្កើតផ្នែកថ្មី' : 'Create New Department')}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Department Code & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'លេខកូដផ្នែក (Code) *' : 'Department Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT, HR, FIN"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'ពណ៌សម្គាល់' : 'Color Theme'}
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    <option value="indigo">Indigo / ពណ៌ស្វាយក្រម៉ៅ</option>
                    <option value="blue">Blue / ពណ៌ខៀវ</option>
                    <option value="emerald">Emerald / ពណ៌បៃតង</option>
                    <option value="rose">Rose / ពណ៌ផ្កាឈូក</option>
                    <option value="amber">Amber / ពណ៌ទឹកក្រូច</option>
                    <option value="purple">Purple / ពណ៌ស្វាយ</option>
                  </select>
                </div>
              </div>

              {/* Names: Khmer & English */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'ឈ្មោះផ្នែកជាភាសាខ្មែរ *' : 'Department Name (Khmer) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'km' ? 'ឧទាហរណ៍៖ វិស្វកម្ម & បច្ចេកវិទ្យា' : 'e.g. វិស្វកម្ម & បច្ចេកវិទ្យា'}
                    value={formData.nameKhmer}
                    onChange={(e) => setFormData({ ...formData, nameKhmer: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'ឈ្មោះផ្នែកជាភាសាអង់គ្លេស *' : 'Department Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering & IT"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Department Manager */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'ប្រធានផ្នែក (ខ្មែរ)' : 'Lead / Manager (Khmer)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ចិន សុខា"
                    value={formData.managerNameKhmer}
                    onChange={(e) => setFormData({ ...formData, managerNameKhmer: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'km' ? 'ប្រធានផ្នែក (EN)' : 'Lead / Manager (EN)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sokha Chen"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'km' ? 'ការពិពណ៌នាពីតួនាទីផ្នែក' : 'Department Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'km' ? 'ការទទួលខុសត្រូវ គោលបំណង ឬលំហូរការងារ...' : 'Key responsibilities and functions...'}
                  value={language === 'km' ? formData.descriptionKhmer : formData.description}
                  onChange={(e) => {
                    if (language === 'km') {
                      setFormData({ ...formData, descriptionKhmer: e.target.value });
                    } else {
                      setFormData({ ...formData, description: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
                >
                  {language === 'km' ? 'រក្សាទុក' : 'Save Department'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. View Members Drawer / Modal */}
      {selectedDeptMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl font-mono text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {selectedDeptMembers.code}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'km' ? selectedDeptMembers.nameKhmer : selectedDeptMembers.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'km' 
                      ? `បញ្ជីសមាជិកបុគ្គលិកក្នុងផ្នែក (${getEmployeesForDept(selectedDeptMembers).length} នាក់)` 
                      : `Staff members roster (${getEmployeesForDept(selectedDeptMembers).length} members)`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeptMembers(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Members List */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
              {getEmployeesForDept(selectedDeptMembers).length > 0 ? (
                getEmployeesForDept(selectedDeptMembers).map((emp) => {
                  const isPresent = checkedInTodayEmpIds.has(emp.id);

                  return (
                    <div key={emp.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.avatar}
                          alt={emp.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {language === 'km' ? emp.fullNameKhmer : emp.fullName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {emp.id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {language === 'km' ? emp.roleKhmer : emp.role}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-3">
                        {isPresent ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{language === 'km' ? 'មានវត្តមាន' : 'Present'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>{language === 'km' ? 'អវត្តមាន' : 'Absent'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-600 text-xs font-medium">
                    {language === 'km' ? 'មិនទាន់មានបុគ្គលិកក្នុងផ្នែកនេះនៅឡើយទេ' : 'No employees currently assigned to this department.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {language === 'km' ? 'ប្រើប្រាស់ម៉ាស៊ីនស្កេន QR ដើម្បីកត់ត្រាវត្តមាន' : 'Use QR Scanner for immediate check-in'}
              </span>
              {onOpenScanner && (
                <button
                  onClick={() => {
                    setSelectedDeptMembers(null);
                    onOpenScanner();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{t.openScanner}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'km' ? 'តើអ្នកប្រាកដជាចង់លុបផ្នែកនេះទេ?' : 'Delete Department?'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'km'
                  ? `ការលុបផ្នែក «${deleteConfirmDept.nameKhmer} (${deleteConfirmDept.code})» មិនអាចត្រឡប់ថយក្រោយវិញបានទេ។`
                  : `Are you sure you want to delete ${deleteConfirmDept.name} (${deleteConfirmDept.code})?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmDept(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {language === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteDepartment(deleteConfirmDept)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
              >
                {language === 'km' ? 'យល់ព្រមលុប' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
