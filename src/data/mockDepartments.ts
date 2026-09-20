import { Department } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-eng',
    code: 'ENG',
    name: 'Engineering & IT',
    nameKhmer: 'វិស្វកម្ម & បច្ចេកវិទ្យា',
    description: 'Software development, cloud architecture, and technical maintenance',
    descriptionKhmer: 'ការអភិវឌ្ឍប្រព័ន្ធផ្នែកទន់ ហេដ្ឋារចនាសម្ព័ន្ធពពក និងការថែទាំបច្ចេកវិទ្យា',
    managerName: 'Sokha Chen',
    managerNameKhmer: 'ចិន សុខា',
    color: 'blue',
    createdAt: '2026-01-01'
  },
  {
    id: 'dept-hr',
    code: 'HR',
    name: 'Human Resources',
    nameKhmer: 'ធនធានមនុស្ស',
    description: 'Talent recruitment, employee relations, payroll, and company culture',
    descriptionKhmer: 'ការជ្រើសរើសបុគ្គលិក ទំនាក់ទំនងបុគ្គលិក ប្រាក់បៀវត្សរ៍ និងវប្បធម៌ស្ថាប័ន',
    managerName: 'Bopha Meas',
    managerNameKhmer: 'មាស បុប្ផា',
    color: 'rose',
    createdAt: '2026-01-01'
  },
  {
    id: 'dept-ops',
    code: 'OPS',
    name: 'Operations',
    nameKhmer: 'ប្រតិបត្តិការ',
    description: 'Office logistics, facility administration, and daily process workflow',
    descriptionKhmer: 'ភស្តុភារការិយាល័យ ការគ្រប់គ្រងទីតាំង និងលំហូរការងារប្រតិបត្តិការប្រចាំថ្ងៃ',
    managerName: 'Vireak Som',
    managerNameKhmer: 'សោម វីរៈ',
    color: 'amber',
    createdAt: '2026-01-01'
  },
  {
    id: 'dept-fin',
    code: 'FIN',
    name: 'Finance & Accounting',
    nameKhmer: 'ហិរញ្ញវត្ថុ & គណនេយ្យ',
    description: 'Corporate budgeting, financial audits, payroll processing, and expense control',
    descriptionKhmer: 'ការរៀបចំថវិកា របាយការណ៍ហិរញ្ញវត្ថុសវនកម្ម និងការទូទាត់ចំណាយ',
    managerName: 'Chanty Rath',
    managerNameKhmer: 'រ័ត្ន ចាន់ធី',
    color: 'emerald',
    createdAt: '2026-01-01'
  },
  {
    id: 'dept-dsg',
    code: 'DSG',
    name: 'Design & UX',
    nameKhmer: 'រចនា & UI/UX',
    description: 'Product UI/UX design, design system, and marketing creative assets',
    descriptionKhmer: 'ការរចនាបទពិសោធន៍អ្នកប្រើប្រាស់ UI/UX ប្រព័ន្ធរចនា និងរូបភាពផ្សព្វផ្សាយ',
    managerName: 'Dara Kim',
    managerNameKhmer: 'គីម ដារ៉ា',
    color: 'purple',
    createdAt: '2026-01-01'
  },
  {
    id: 'dept-mkt',
    code: 'MKT',
    name: 'Marketing & Sales',
    nameKhmer: 'ទីផ្សារ & ការលក់',
    description: 'Brand awareness, digital growth, social media, and customer acquisition',
    descriptionKhmer: 'ការលើកកម្ពស់ម៉ាកយីហោ យុទ្ធសាស្ត្រកំណើនឌីជីថល និងការពង្រីកទីផ្សារ',
    managerName: 'Sreynich Heng',
    managerNameKhmer: 'ហេង ស្រីនិច',
    color: 'indigo',
    createdAt: '2026-01-01'
  }
];

const DEPARTMENTS_STORAGE_KEY = 'attendance_departments_v1';

export function getStoredDepartments(): Department[] {
  const raw = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(INITIAL_DEPARTMENTS));
    return INITIAL_DEPARTMENTS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_DEPARTMENTS;
  } catch {
    return INITIAL_DEPARTMENTS;
  }
}

export function saveStoredDepartments(departments: Department[]): void {
  localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('departments-updated'));
  }
}

/**
 * Checks if an employee belongs to a given department configured in Department Management
 */
export function isEmployeeInDepartment(
  emp: { department: string; departmentKhmer?: string },
  dept: Department
): boolean {
  if (!emp) return false;
  const normalize = (s?: string) => (s || '').trim().toLowerCase();
  const empDept = normalize(emp.department);
  const empDeptKhmer = normalize(emp.departmentKhmer);
  const deptName = normalize(dept.name);
  const deptKhmer = normalize(dept.nameKhmer);
  const deptCode = normalize(dept.code);
  const deptId = normalize(dept.id);

  if (!empDept && !empDeptKhmer) return false;

  // Direct matches
  if (empDept === deptName || empDept === deptCode || empDept === deptId) return true;
  if (empDeptKhmer && deptKhmer && empDeptKhmer === deptKhmer) return true;

  // Substring matching (e.g. 'Engineering' in 'Engineering & IT', 'Finance' in 'Finance & Accounting')
  if (deptName.includes(empDept) || (empDept.length >= 3 && deptName.startsWith(empDept))) return true;
  if (empDept.includes(deptName) || (deptName.length >= 3 && empDept.startsWith(deptName))) return true;

  // Khmer substring matching (e.g. 'វិស្វកម្ម' in 'វិស្វកម្ម & បច្ចេកវិទ្យា', 'ហិរញ្ញវត្ថុ' in 'ហិរញ្ញវត្ថុ & គណនេយ្យ')
  if (deptKhmer && empDeptKhmer) {
    if (deptKhmer.includes(empDeptKhmer) || empDeptKhmer.includes(deptKhmer)) return true;
  }

  return false;
}
