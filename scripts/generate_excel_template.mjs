import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// 1. Attendance Sheet Headers & Sample Data
const attendanceHeaders = [
  'Timestamp (ISO)',
  'Date (កាលបរិច្ឆេទ)',
  'Time (ម៉ោង)',
  'Employee ID (អត្តលេខ)',
  'Full Name (ឈ្មោះបុគ្គលិក)',
  'Department (ផ្នែក)',
  'Action (check_in / check_out)',
  'Status',
  'Device / Client ID',
  'Request ID'
];

const attendanceRows = [
  attendanceHeaders,
  [
    new Date().toISOString(),
    new Date().toISOString().split('T')[0],
    '08:15:30',
    'EMP-1001',
    'Sokha Chen (ចិន សុខា)',
    'Engineering & IT',
    'check_in',
    'success',
    'device-terminal-01',
    'req-sample-001'
  ],
  [
    new Date().toISOString(),
    new Date().toISOString().split('T')[0],
    '08:22:15',
    'EMP-1002',
    'Bopha Meas (មាស បុប្ផា)',
    'Human Resources',
    'check_in',
    'success',
    'device-terminal-01',
    'req-sample-002'
  ],
  [
    new Date().toISOString(),
    new Date().toISOString().split('T')[0],
    '08:35:10',
    'EMP-1003',
    'Vireak Som (សោម វីរៈ)',
    'Operations',
    'check_in',
    'success',
    'device-terminal-01',
    'req-sample-003'
  ]
];

// 2. Employees Sheet Headers & Sample Data
const employeeHeaders = [
  'Employee ID (អត្តលេខ)',
  'Full Name (ឈ្មោះឡាតាំង)',
  'Khmer Name (ឈ្មោះខ្មែរ)',
  'Department (ផ្នែក)',
  'Department Code',
  'Job Title (មុខតំណែង)',
  'Job Title Khmer (មុខតំណែងខ្មែរ)',
  'Role (admin / manager / staff)',
  'Work Shift (ម៉ោងការងារ)',
  'Email (អ៊ីមែល)',
  'Phone Number (លេខទូរស័ព្ទ)',
  'National ID / Passport (អត្តសញ្ញាណប័ណ្ណ)',
  'Employment Status (active / resigned)',
  'Work Location (ទីតាំងការិយាល័យ)'
];

const employeeRows = [
  employeeHeaders,
  ['EMP-1001', 'Sokha Chen', 'ចិន សុខា', 'Engineering & IT', 'ENG', 'Lead Software Architect', 'ស្ថាបត្យករផ្នែកទន់ជាន់ខ្ពស់', 'admin', '08:00 - 17:00', 'sokha.chen@company.kh', '+855 12 888 101', '010203040', 'active', 'Headquarters - Building A'],
  ['EMP-1002', 'Bopha Meas', 'មាស បុប្ផា', 'Human Resources', 'HR', 'HR Director', 'ប្រធានចាត់ការទូទៅធនធានមនុស្ស', 'manager', '08:00 - 17:00', 'bopha.meas@company.kh', '+855 12 888 102', '010203041', 'active', 'Headquarters - Building A'],
  ['EMP-1003', 'Vireak Som', 'សោម វីរៈ', 'Operations', 'OPS', 'Operations Manager', 'អ្នកគ្រប់គ្រងប្រតិបត្តិការ', 'manager', '08:00 - 17:00', 'vireak.som@company.kh', '+855 12 888 103', '010203042', 'active', 'Logistics Center - Warehouse 1'],
  ['EMP-1004', 'Kalyan Chan', 'ចាន់ កល្យាណ', 'Finance & Accounting', 'FIN', 'Senior Financial Analyst', 'អ្នកវិភាគហិរញ្ញវត្ថុជាន់ខ្ពស់', 'staff', '08:00 - 17:00', 'kalyan.chan@company.kh', '+855 12 888 104', '010203043', 'active', 'Headquarters - Building B'],
  ['EMP-1005', 'Dara Kim', 'គីម ដារ៉ា', 'Design', 'DSG', 'Senior UI/UX Designer', 'អ្នករចនាបទពិសោធន៍អ្នកប្រើប្រាស់', 'staff', '09:00 - 18:00', 'dara.kim@company.kh', '+855 12 888 105', '010203044', 'active', 'Innovation Lab - Creative Studio'],
  ['EMP-1006', 'Sreynich Heng', 'ហេង ស្រីនិច', 'Marketing', 'MKT', 'Marketing Strategist', 'អ្នកឯកទេសយុទ្ធសាស្ត្រទីផ្សារ', 'staff', '08:00 - 17:00', 'sreynich.heng@company.kh', '+855 12 888 106', '010203045', 'active', 'Headquarters - Floor 3'],
  ['EMP-1007', 'Rithy Seng', 'សេង រិទ្ធី', 'Engineering & IT', 'ENG', 'Full Stack Developer', 'អ្នកអភិវឌ្ឍន៍កម្មវិធី', 'staff', '08:00 - 17:00', 'rithy.seng@company.kh', '+855 12 888 107', '010203046', 'active', 'Headquarters - Building A'],
  ['EMP-1008', 'Channary Touch', 'ទូច ចាន់ណារី', 'Customer Success', 'CS', 'Support Team Lead', 'ប្រធានក្រុមសេវាកម្មអតិថិជន', 'staff', '08:30 - 17:30', 'channary.touch@company.kh', '+855 12 888 108', '010203047', 'active', 'Support Hub - Floor 2']
];

// 3. Departments Sheet Headers & Sample Data
const departmentHeaders = [
  'Department ID',
  'Code (កូដ)',
  'Name (ឈ្មោះផ្នែក)',
  'Khmer Name (ឈ្មោះខ្មែរ)',
  'Manager Name (ប្រធានផ្នែក)',
  'Color Code',
  'Description (ការពិពណ៌នា)'
];

const departmentRows = [
  departmentHeaders,
  ['dept-eng', 'ENG', 'Engineering & IT', 'វិស្វកម្ម & បច្ចេកវិទ្យា', 'Sokha Chen (ចិន សុខា)', 'blue', 'Software development, cloud architecture, and IT operations'],
  ['dept-hr', 'HR', 'Human Resources', 'ធនធានមនុស្ស', 'Bopha Meas (មាស បុប្ផា)', 'rose', 'Talent recruitment, employee relations, payroll, and culture'],
  ['dept-ops', 'OPS', 'Operations', 'ប្រតិបត្តិការ', 'Vireak Som (សោម វីរៈ)', 'amber', 'Office logistics, facility administration, and workflow'],
  ['dept-fin', 'FIN', 'Finance & Accounting', 'ហិរញ្ញវត្ថុ & គណនេយ្យ', 'Kalyan Chan (ចាន់ កល្យាណ)', 'emerald', 'Corporate budgeting, financial audits, and payroll'],
  ['dept-des', 'DSG', 'Design', 'រចនា', 'Dara Kim (គីម ដារ៉ា)', 'purple', 'User experience, product design, brand identity, and media assets'],
  ['dept-mkt', 'MKT', 'Marketing', 'ទីផ្សារ', 'Sreynich Heng (ហេង ស្រីនិច)', 'indigo', 'Brand growth, digital campaigns, events, and public relations']
];

// 4. Instructions Sheet
const instructionRows = [
  ['របៀបប្រើប្រាស់ឯកសារនេះជាមួយ Google Sheets និង Google Apps Script', 'How to use this file with Google Sheets & Apps Script'],
  ['', ''],
  ['ជំហានទី ១ (Step 1): Upload ចូល Google Drive', 'Upload this .xlsx file directly to Google Drive (drive.google.com).'],
  ['ជំហានទី ២ (Step 2): បើកជា Google Sheets', 'Right click the uploaded file and choose: Open with > Google Sheets (បើកជាមួយ Google Sheets)'],
  ['ជំហានទី ៣ (Step 3): Apps Script', 'On Google Sheets, click menu "Extensions" > "Apps Script" (ផ្នែកបន្ថែម > Apps Script)'],
  ['ជំហានទី ៤ (Step 4): Paste Code', 'Paste the Apps Script backend code (Code.gs) into the editor.'],
  ['ជំហានទី ៥ (Step 5): Deploy Web App', 'Click Deploy > New deployment > Web app > Set "Who has access" to "Anyone" > Deploy.'],
  ['ជំហានទី ៦ (Step 6): Connect to Web App', 'Copy the Web App URL and paste into this Attendance Web App > Settings > Google Apps Script URL. Done!']
];

const wb = XLSX.utils.book_new();

// Add sheets
const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceRows);
const wsEmployees = XLSX.utils.aoa_to_sheet(employeeRows);
const wsDepartments = XLSX.utils.aoa_to_sheet(departmentRows);
const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);

// Set column widths for clean readability
wsAttendance['!cols'] = [
  { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 25 },
  { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 22 }
];

wsEmployees['!cols'] = [
  { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 10 },
  { wch: 26 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 25 },
  { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
];

wsDepartments['!cols'] = [
  { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 22 },
  { wch: 12 }, { wch: 45 }
];

wsInstructions['!cols'] = [
  { wch: 45 }, { wch: 60 }
];

XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');
XLSX.utils.book_append_sheet(wb, wsEmployees, 'Employees');
XLSX.utils.book_append_sheet(wb, wsDepartments, 'Departments');
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Ensure public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'QR_Attendance_Google_Sheet_Template.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('Successfully generated Excel template at:', outputPath);
