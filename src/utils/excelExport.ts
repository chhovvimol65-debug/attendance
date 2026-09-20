import * as XLSX from 'xlsx';
import { Employee, Department, AttendanceRecord } from '../types';

export function downloadAttendanceExcelTemplate(
  employees: Employee[],
  departments: Department[],
  records?: AttendanceRecord[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Attendance Sheet
  const attendanceHeaders = [
    'Timestamp (ISO)',
    'កាលបរិច្ឆេទ (Date)',
    'ម៉ោង (Time)',
    'អត្តលេខ (Emp ID)',
    'ឈ្មោះបុគ្គលិក (Full Name)',
    'ផ្នែក (Department)',
    'សកម្មភាព (Action)',
    'ស្ថានភាព (Status)',
    'ស្ថានីយស្កេន (Client ID)',
    'Request ID'
  ];

  let attendanceRows: any[][] = [attendanceHeaders];

  if (records && records.length > 0) {
    records.slice(0, 50).forEach(r => {
      attendanceRows.push([
        r.timestamp,
        r.date,
        r.time,
        r.employeeId,
        r.fullName,
        r.department || 'N/A',
        r.type,
        r.status,
        r.clientId || 'device-terminal-01',
        r.requestId || r.id
      ]);
    });
  } else {
    // Sample rows
    const today = new Date().toISOString().split('T')[0];
    attendanceRows.push([
      new Date().toISOString(),
      today,
      '08:15:20',
      'EMP-1001',
      'Sokha Chen (ចិន សុខា)',
      'Engineering & IT',
      'check_in',
      'success',
      'device-terminal-01',
      'req-sample-01'
    ]);
    attendanceRows.push([
      new Date().toISOString(),
      today,
      '08:22:45',
      'EMP-1002',
      'Bopha Meas (មាស បុប្ផា)',
      'Human Resources',
      'check_in',
      'success',
      'device-terminal-01',
      'req-sample-02'
    ]);
  }

  const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceRows);
  wsAttendance['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 25 },
    { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 22 }
  ];

  // 2. Employees Sheet
  const employeeHeaders = [
    'Employee ID (អត្តលេខ)',
    'Full Name (ឈ្មោះឡាតាំង)',
    'Khmer Name (ឈ្មោះខ្មែរ)',
    'Department (ផ្នែក)',
    'Department Khmer (ផ្នែកជាភាសាខ្មែរ)',
    'Job Title (មុខតំណែង)',
    'Job Title Khmer (មុខតំណែងខ្មែរ)',
    'Role (admin / manager / staff)',
    'Work Shift (ម៉ោងការងារ)',
    'Email (អ៊ីមែល)',
    'Phone Number (លេខទូរស័ព្ទ)',
    'National ID (អត្តសញ្ញាណប័ណ្ណ)',
    'Employment Status (active / resigned)',
    'Work Location (ទីតាំងការិយាល័យ)'
  ];

  const employeeRows: any[][] = [employeeHeaders];
  employees.forEach(emp => {
    employeeRows.push([
      emp.id,
      emp.fullName,
      emp.fullNameKhmer || '',
      emp.department,
      emp.departmentKhmer || '',
      emp.role,
      emp.roleKhmer || '',
      emp.roleType || 'staff',
      emp.workSchedule || '08:00 - 17:00',
      emp.email || '',
      emp.phone || '',
      emp.nationalId || '',
      emp.status || 'active',
      emp.workLocation || 'Headquarters'
    ]);
  });

  const wsEmployees = XLSX.utils.aoa_to_sheet(employeeRows);
  wsEmployees['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 12 },
    { wch: 26 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 25 },
    { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 28 }
  ];

  // 3. Departments Sheet
  const departmentHeaders = [
    'Department ID',
    'Code (កូដ)',
    'Name (ឈ្មោះផ្នែក)',
    'Khmer Name (ឈ្មោះខ្មែរ)',
    'Manager Name (ប្រធានផ្នែក)',
    'Color',
    'Description (ការពិពណ៌នា)'
  ];

  const departmentRows: any[][] = [departmentHeaders];
  departments.forEach(dept => {
    departmentRows.push([
      dept.id,
      dept.code,
      dept.name,
      dept.nameKhmer || '',
      dept.managerName || '',
      dept.color || 'blue',
      dept.description || ''
    ]);
  });

  const wsDepartments = XLSX.utils.aoa_to_sheet(departmentRows);
  wsDepartments['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 22 },
    { wch: 12 }, { wch: 45 }
  ];

  // 4. Instructions Sheet
  const instructionRows = [
    ['សេចក្តីណែនាំសម្រាប់ការភ្ជាប់ជាមួយ Google Sheets & Google Apps Script', 'Setup Instructions'],
    ['', ''],
    ['១. Upload File', 'Upload ឯកសារ Excel (.xlsx) នេះទៅកាន់ Google Drive (drive.google.com)'],
    ['២. បើកជាមួយ Google Sheets', 'Right Click លើឯកសារក្នុង Google Drive > ជ្រើសរើស "Open with > Google Sheets"'],
    ['៣. បើក Apps Script', 'នៅលើ Google Sheets ចុច Menu "Extensions" > ជ្រើសរើស "Apps Script"'],
    ['៤. ដាក់កូដ Backend', 'Copy កូដ Google Apps Script (Code.gs) យកទៅបិទភ្ជាប់ក្នុងផ្ទាំង Apps Script'],
    ['៥. Deploy ជា Web App', 'ចុចប៊ូតុង Deploy > New deployment > Web app > កំណត់ "Who has access" ទៅជា "Anyone" > ចុច Deploy'],
    ['៦. ភ្ជាប់ជាមួយកម្មវិធី', 'ចម្លង Web app URL យកមកដាក់ក្នុងផ្ទាំង Settings នៃកម្មវិធីនេះ > ចុច Test Connection > រួចរាល់!']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
  wsInstructions['!cols'] = [{ wch: 50 }, { wch: 60 }];

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');
  XLSX.utils.book_append_sheet(wb, wsEmployees, 'Employees');
  XLSX.utils.book_append_sheet(wb, wsDepartments, 'Departments');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Trigger browser download
  XLSX.writeFile(wb, 'QR_Attendance_Google_Sheet_Template.xlsx');
}
