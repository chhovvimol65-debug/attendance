import { Employee, AttendanceRecord, UserAccount } from '../types';

export const USER_PROFILES: UserAccount[] = [
  {
    id: 'usr-admin',
    employeeId: 'EMP-1001',
    name: 'Sokha Chen',
    nameKhmer: 'ចិន សុខា',
    role: 'admin',
    department: 'Engineering & IT',
    departmentKhmer: 'វិស្វកម្ម & បច្ចេកវិទ្យា',
    title: 'System Administrator',
    titleKhmer: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-manager',
    employeeId: 'EMP-1002',
    name: 'Bopha Meas',
    nameKhmer: 'មាស បុប្ផា',
    role: 'manager',
    department: 'Human Resources',
    departmentKhmer: 'ធនធានមនុស្ស',
    title: 'HR Manager',
    titleKhmer: 'ប្រធានផ្នែកធនធានមនុស្ស (Manager)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-staff',
    employeeId: 'EMP-1005',
    name: 'Dara Kim',
    nameKhmer: 'គីម ដារ៉ា',
    role: 'staff',
    department: 'Design',
    departmentKhmer: 'រចនា',
    title: 'Product Designer',
    titleKhmer: 'បុគ្គលិកផ្នែករចនា (Staff)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-1001',
    fullName: 'Sokha Chen',
    fullNameKhmer: 'ចិន សុខា',
    department: 'Engineering',
    departmentKhmer: 'វិស្វកម្ម',
    role: 'Lead Software Architect',
    roleKhmer: 'ស្ថាបត្យករផ្នែកទន់ជាន់ខ្ពស់',
    roleType: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: 'sokha.chen@company.kh',
    phone: '+855 12 888 101',
    gender: 'female',
    genderKhmer: 'ស្រី',
    dateOfBirth: '1992-06-15',
    joinDate: '2021-03-01',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '010582914',
    address: 'ផ្ទះលេខ #24A, ផ្លូវ 289, សង្កាត់បឹងកក់២, ខណ្ឌទួលគោក, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'ចិន វិបុល (Vibol Chen)',
    emergencyContactPhone: '+855 12 777 901',
    emergencyContactRelation: 'បងប្រុស (Brother)',
    bankAccount: 'ABA Bank: 001 548 920',
    baseSalary: 1600,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 3.0
  },
  {
    id: 'EMP-1002',
    fullName: 'Bopha Meas',
    fullNameKhmer: 'មាស បុប្ផា',
    department: 'Human Resources',
    departmentKhmer: 'ធនធានមនុស្ស',
    role: 'HR Director',
    roleKhmer: 'នាយកផ្នែកធនធានមនុស្ស',
    roleType: 'manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    email: 'bopha.meas@company.kh',
    phone: '+855 12 888 102',
    gender: 'female',
    genderKhmer: 'ស្រី',
    dateOfBirth: '1989-11-22',
    joinDate: '2020-08-15',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '020491823',
    address: 'បុរីប៉េងហួត បឹងស្នោ, សង្កាត់និរោធ, ខណ្ឌច្បារអំពៅ, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'មាស សុវណ្ណ (Sovann Meas)',
    emergencyContactPhone: '+855 12 777 902',
    emergencyContactRelation: 'ស្វាមី (Spouse)',
    bankAccount: 'ABA Bank: 002 819 334',
    baseSalary: 1250,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.5
  },
  {
    id: 'EMP-1003',
    fullName: 'Vireak Som',
    fullNameKhmer: 'សោម វីរៈ',
    department: 'Operations',
    departmentKhmer: 'ប្រតិបត្តិការ',
    role: 'Operations Manager',
    roleKhmer: 'ប្រធានគ្រប់គ្រងប្រតិបត្តិការ',
    roleType: 'manager',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'vireak.som@company.kh',
    phone: '+855 12 888 103',
    gender: 'male',
    genderKhmer: 'ប្រុស',
    dateOfBirth: '1990-03-10',
    joinDate: '2021-11-01',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '010382951',
    address: 'ផ្លូវជាតិលេខ ៦A, សង្កាត់ជ្រោយចង្វារ, ខណ្ឌជ្រោយចង្វារ, រាជធានីភ្នំពេញ',
    workLocation: 'មណ្ឌលប្រតិបត្តិការ (Operations Hub)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សៅរ៍ កន្លះថ្ងៃ)',
    emergencyContactName: 'សោម គន្ធា (Kunthea Som)',
    emergencyContactPhone: '+855 12 777 903',
    emergencyContactRelation: 'ភរិយា (Spouse)',
    bankAccount: 'ACLEDA Bank: 0100 2345 6789',
    baseSalary: 950,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  },
  {
    id: 'EMP-1004',
    fullName: 'Chanty Rath',
    fullNameKhmer: 'រ័ត្ន ចាន់ធី',
    department: 'Finance',
    departmentKhmer: 'ហិរញ្ញវត្ថុ',
    role: 'Senior Accountant',
    roleKhmer: 'គណនេយ្យករជាន់ខ្ពស់',
    roleType: 'staff',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    email: 'chanty.rath@company.kh',
    phone: '+855 12 888 104',
    gender: 'female',
    genderKhmer: 'ស្រី',
    dateOfBirth: '1994-09-05',
    joinDate: '2022-04-18',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '030918274',
    address: 'សង្កាត់ទួលសង្កែ, ខណ្ឌឫស្សីកែវ, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'រ័ត្ន សម្បត្តិ (Sambath Rath)',
    emergencyContactPhone: '+855 12 777 904',
    emergencyContactRelation: 'ឪពុក (Father)',
    bankAccount: 'ABA Bank: 003 456 789',
    baseSalary: 850,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  },
  {
    id: 'EMP-1005',
    fullName: 'Dara Kim',
    fullNameKhmer: 'គីម ដារ៉ា',
    department: 'Design',
    departmentKhmer: 'រចនា',
    role: 'UI/UX Product Designer',
    roleKhmer: 'អ្នករចនា UI/UX',
    roleType: 'staff',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: 'dara.kim@company.kh',
    phone: '+855 12 888 105',
    gender: 'male',
    genderKhmer: 'ប្រុស',
    dateOfBirth: '1996-01-28',
    joinDate: '2023-02-15',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '010892019',
    address: 'សង្កាត់បឹងកក់១, ខណ្ឌទួលគោក, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'គីម ម៉ានី (Mani Kim)',
    emergencyContactPhone: '+855 12 777 905',
    emergencyContactRelation: 'ម្តាយ (Mother)',
    bankAccount: 'ABA Bank: 004 567 890',
    baseSalary: 750,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  },
  {
    id: 'EMP-1006',
    fullName: 'Sreynich Heng',
    fullNameKhmer: 'ហេង ស្រីនិច',
    department: 'Marketing',
    departmentKhmer: 'ទីផ្សារ',
    role: 'Content Strategist',
    roleKhmer: 'អ្នករៀបចំយុទ្ធសាស្ត្រមាតិកា',
    roleType: 'staff',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    email: 'sreynich.heng@company.kh',
    phone: '+855 12 888 106',
    gender: 'female',
    genderKhmer: 'ស្រី',
    dateOfBirth: '1997-08-14',
    joinDate: '2023-07-01',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '020781928',
    address: 'សង្កាត់ទឹកថ្លា, ខណ្ឌសែនសុខ, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'ហេង រ៉េត (Reth Heng)',
    emergencyContactPhone: '+855 12 777 906',
    emergencyContactRelation: 'បងស្រី (Sister)',
    bankAccount: 'Canadia Bank: 005 678 901',
    baseSalary: 680,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  },
  {
    id: 'EMP-1007',
    fullName: 'Kosal Vong',
    fullNameKhmer: 'វង្ស កុសល',
    department: 'Engineering',
    departmentKhmer: 'វិស្វកម្ម',
    role: 'Frontend Developer',
    roleKhmer: 'អ្នកអភិវឌ្ឍន៍ Frontend',
    roleType: 'staff',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    email: 'kosal.vong@company.kh',
    phone: '+855 12 888 107',
    gender: 'male',
    genderKhmer: 'ប្រុស',
    dateOfBirth: '1998-12-03',
    joinDate: '2023-10-15',
    employmentType: 'probation',
    employmentTypeKhmer: 'សាកល្បង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '010672819',
    address: 'សង្កាត់ភ្នំពេញថ្មី, ខណ្ឌសែនសុខ, រាជធានីភ្នំពេញ',
    workLocation: 'ការិយាល័យកណ្តាល (Phnom Penh HQ)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សុក្រ)',
    emergencyContactName: 'វង្ស សុផាត (Sophat Vong)',
    emergencyContactPhone: '+855 12 777 907',
    emergencyContactRelation: 'បងប្រុស (Brother)',
    bankAccount: 'ABA Bank: 006 789 012',
    baseSalary: 550,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 1.5
  },
  {
    id: 'EMP-1008',
    fullName: 'Pisey Prak',
    fullNameKhmer: 'ប្រាក់ ពិសី',
    department: 'Operations',
    departmentKhmer: 'ប្រតិបត្តិការ',
    role: 'Logistics Coordinator',
    roleKhmer: 'អ្នកសម្របសម្រួលភស្តុភារ',
    roleType: 'staff',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    email: 'pisey.prak@company.kh',
    phone: '+855 12 888 108',
    gender: 'female',
    genderKhmer: 'ស្រី',
    dateOfBirth: '1995-04-20',
    joinDate: '2022-09-01',
    employmentType: 'full_time',
    employmentTypeKhmer: 'ពេញម៉ោង',
    status: 'active',
    statusKhmer: 'សកម្ម',
    nationalId: '040891028',
    address: 'សង្កាត់ចោមចៅ, ខណ្ឌពោធិ៍សែនជ័យ, រាជធានីភ្នំពេញ',
    workLocation: 'ឃ្លាំងភស្តុភារ (Logistics Hub)',
    workSchedule: '08:00 - 17:00 (ចន្ទ - សៅរ៍)',
    emergencyContactName: 'ប្រាក់ វិសាល (Visal Prak)',
    emergencyContactPhone: '+855 12 777 908',
    emergencyContactRelation: 'បងប្រុស (Brother)',
    bankAccount: 'ABA Bank: 007 890 123',
    baseSalary: 600,
    workStartTime: '08:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateGracePeriodMinutes: 15,
    lateDeductionRate: 2.0
  }
];

const EMPLOYEES_STORAGE_KEY = 'attendance_employees_list';

export function getStoredEmployees(): Employee[] {
  const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    const parsed: Employee[] = JSON.parse(raw);
    // Enrich with initial full attributes if existing cache lacked new fields
    const enriched = parsed.map(emp => {
      const initialMatch = INITIAL_EMPLOYEES.find(i => i.id === emp.id);
      return {
        ...(initialMatch || {}),
        ...emp,
        baseSalary: emp.baseSalary !== undefined ? emp.baseSalary : (initialMatch?.baseSalary ?? 650),
        workStartTime: emp.workStartTime || initialMatch?.workStartTime || '08:00',
        workEndTime: emp.workEndTime || initialMatch?.workEndTime || '17:00',
        workingHoursPerDay: emp.workingHoursPerDay !== undefined ? emp.workingHoursPerDay : (initialMatch?.workingHoursPerDay ?? 8),
        lateGracePeriodMinutes: emp.lateGracePeriodMinutes !== undefined ? emp.lateGracePeriodMinutes : (initialMatch?.lateGracePeriodMinutes ?? 15),
        lateDeductionRate: emp.lateDeductionRate !== undefined ? emp.lateDeductionRate : (initialMatch?.lateDeductionRate ?? 2.0),
        gender: emp.gender || initialMatch?.gender,
        genderKhmer: emp.genderKhmer || initialMatch?.genderKhmer,
        dateOfBirth: emp.dateOfBirth || initialMatch?.dateOfBirth,
        joinDate: emp.joinDate || initialMatch?.joinDate,
        employmentType: emp.employmentType || initialMatch?.employmentType,
        employmentTypeKhmer: emp.employmentTypeKhmer || initialMatch?.employmentTypeKhmer,
        status: emp.status || initialMatch?.status,
        statusKhmer: emp.statusKhmer || initialMatch?.statusKhmer,
        resignedDate: emp.resignedDate || initialMatch?.resignedDate,
        resignationReason: emp.resignationReason || initialMatch?.resignationReason,
        nationalId: emp.nationalId || initialMatch?.nationalId,
        address: emp.address || initialMatch?.address,
        workLocation: emp.workLocation || initialMatch?.workLocation,
        workSchedule: emp.workSchedule || initialMatch?.workSchedule,
        emergencyContactName: emp.emergencyContactName || initialMatch?.emergencyContactName,
        emergencyContactPhone: emp.emergencyContactPhone || initialMatch?.emergencyContactPhone,
        emergencyContactRelation: emp.emergencyContactRelation || initialMatch?.emergencyContactRelation,
        bankAccount: emp.bankAccount || initialMatch?.bankAccount
      };
    });

    return enriched;
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveStoredEmployees(employees: Employee[]): void {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('employees-updated'));
  }
}

export function findEmployeeById(idOrText: string): Employee | undefined {
  if (!idOrText) return undefined;
  const list = getStoredEmployees();
  const clean = idOrText.trim();

  // Check direct exact match or normalized match
  const directMatch = list.find(e => 
    e.id.toLowerCase() === clean.toLowerCase() ||
    e.fullName.toLowerCase() === clean.toLowerCase() ||
    e.fullNameKhmer === clean
  );
  if (directMatch) return directMatch;

  // Try extracting ID from JSON payload (e.g. {"employeeId":"EMP-1001"})
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      const targetId = parsed.employeeId || parsed.id || parsed.empId;
      if (targetId) {
        return list.find(e => e.id.toLowerCase() === String(targetId).toLowerCase());
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  // Try extracting EMP-XXXX or number
  const empMatch = clean.match(/EMP-?\d+/i);
  if (empMatch) {
    const norm = empMatch[0].toUpperCase().replace('EMP', 'EMP-').replace('EMP--', 'EMP-');
    const found = list.find(e => e.id.toUpperCase() === norm);
    if (found) return found;
  }

  // Try matching numeric portion e.g. "1001"
  const numMatch = clean.match(/\d{4}/);
  if (numMatch) {
    const norm = `EMP-${numMatch[0]}`;
    return list.find(e => e.id === norm);
  }

  return undefined;
}

export function getInitialAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const employees = INITIAL_EMPLOYEES;

  // Generate 30 days of attendance (covering the month up to today)
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (offset === 0) {
      // Today: Partial day in progress
      records.push(
        {
          id: `att-${dateStr}-1`,
          requestId: `req-${dateStr}-1`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1001',
          fullName: 'Sokha Chen',
          department: 'Engineering',
          type: 'check_in',
          timestamp: `${dateStr}T08:14:22.000Z`,
          date: dateStr,
          time: '08:14:22',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-2`,
          requestId: `req-${dateStr}-2`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1002',
          fullName: 'Bopha Meas',
          department: 'Human Resources',
          type: 'check_in',
          timestamp: `${dateStr}T08:22:15.000Z`,
          date: dateStr,
          time: '08:22:15',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-3`,
          requestId: `req-${dateStr}-3`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1003',
          fullName: 'Vireak Som',
          department: 'Operations',
          type: 'check_in',
          timestamp: `${dateStr}T08:35:40.000Z`,
          date: dateStr,
          time: '08:35:40',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-4`,
          requestId: `req-${dateStr}-4`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1004',
          fullName: 'Chanty Rath',
          department: 'Finance',
          type: 'check_in',
          timestamp: `${dateStr}T08:42:08.000Z`,
          date: dateStr,
          time: '08:42:08',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-5`,
          requestId: `req-${dateStr}-5`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1003',
          fullName: 'Vireak Som',
          department: 'Operations',
          type: 'check_out',
          timestamp: `${dateStr}T12:05:12.000Z`,
          date: dateStr,
          time: '12:05:12',
          status: 'success',
          code: 'check_out',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-6`,
          requestId: `req-${dateStr}-6`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1005',
          fullName: 'Dara Kim',
          department: 'Design',
          type: 'check_in',
          timestamp: `${dateStr}T08:50:11.000Z`,
          date: dateStr,
          time: '08:50:11',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        },
        {
          id: `att-${dateStr}-7`,
          requestId: `req-${dateStr}-7`,
          clientId: 'device-terminal-01',
          employeeId: 'EMP-1006',
          fullName: 'Sreynich Heng',
          department: 'Marketing',
          type: 'check_in',
          timestamp: `${dateStr}T08:55:30.000Z`,
          date: dateStr,
          time: '08:55:30',
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        }
      );
    } else {
      // Past days: include staff across all departments
      const staffList = isWeekend 
        ? employees.slice(0, 3) 
        : employees.slice(0, Math.min(employees.length, 7 + (offset % 4)));

      staffList.forEach((emp, index) => {
        const inMinute = 5 + (index * 6) + (offset * 3) % 25;
        const outMinute = 15 + (index * 7) + (offset * 4) % 35;
        const inHour = 8;
        const outHour = 17;

        const timeIn = `0${inHour}:${inMinute < 10 ? '0' + inMinute : inMinute}:20`;
        const timeOut = `${outHour}:${outMinute < 10 ? '0' + outMinute : outMinute}:45`;

        // Check-in record
        records.push({
          id: `att-${dateStr}-in-${emp.id}`,
          requestId: `req-${dateStr}-in-${emp.id}`,
          clientId: 'device-terminal-01',
          employeeId: emp.id,
          fullName: emp.fullName,
          department: emp.department,
          type: 'check_in',
          timestamp: `${dateStr}T${timeIn}.000Z`,
          date: dateStr,
          time: timeIn,
          status: 'success',
          code: 'check_in',
          syncedToGoogleSheet: true
        });

        // Check-out record (for completed past days)
        records.push({
          id: `att-${dateStr}-out-${emp.id}`,
          requestId: `req-${dateStr}-out-${emp.id}`,
          clientId: 'device-terminal-01',
          employeeId: emp.id,
          fullName: emp.fullName,
          department: emp.department,
          type: 'check_out',
          timestamp: `${dateStr}T${timeOut}.000Z`,
          date: dateStr,
          time: timeOut,
          status: 'success',
          code: 'check_out',
          syncedToGoogleSheet: true
        });
      });
    }
  }

  return records;
}
