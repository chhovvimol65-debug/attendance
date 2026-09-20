import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ScannerPage } from './components/ScannerPage';
import { HistoryTable } from './components/HistoryTable';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { DepartmentManagement } from './components/DepartmentManagement';
import { StaffPortal } from './components/StaffPortal';
import { SettingsModal } from './components/SettingsModal';
import { StationQrModal } from './components/StationQrModal';
import { OfficeManagement } from './components/OfficeManagement';
import { PayrollManagement } from './components/PayrollManagement';
import { LoginForm } from './components/LoginForm';
import { Language, AppSettings, AttendanceRecord, AttendanceScanResult, UserAccount, UserRole } from './types';
import { 
  getAppSettings, 
  getAttendanceRecords, 
  clearAttendanceRecords, 
  submitAttendanceScan 
} from './services/attendanceService';
import { USER_PROFILES } from './data/mockEmployees';
import { playSuccessChime, playErrorBuzz } from './utils/audio';
import { 
  CheckCircle2, 
  AlertCircle, 
  X,
  ShieldAlert,
  Lock,
  UserCheck,
  QrCode,
  History,
  ArrowRight,
  CircleDollarSign
} from 'lucide-react';
import { translations } from './i18n/translations';

// Strict Role-Based Access Control (RBAC) Mapping
export const ROLE_ALLOWED_TABS: Record<UserRole, NavigationTab[]> = {
  admin: ['dashboard', 'scanner', 'history', 'employees', 'payroll', 'departments', 'office', 'settings', 'portal'],
  manager: ['dashboard', 'scanner', 'history', 'employees', 'payroll', 'departments', 'office', 'portal'],
  staff: ['scanner', 'history', 'portal']
};

export default function App() {
  // 1. Language state
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('attendance_lang');
    return (saved === 'km' || saved === 'en') ? saved : 'en';
  });

  const t = translations[language];

  // 2. Current User & RBAC state
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const savedId = localStorage.getItem('attendance_active_user_id');
    const found = USER_PROFILES.find(u => u.id === savedId);
    return found || USER_PROFILES[0]; // Defaults to Admin: Sokha Chen
  });

  // Authentication State & Login Modal
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('attendance_is_authenticated') !== 'false';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // 3. Navigation Tab state - staff defaults directly to QR scanner
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    return currentUser.role === 'staff' ? 'scanner' : 'dashboard';
  });

  // 4. Mobile sidebar toggle state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 5. Office Station QR Poster Modal state
  const [isStationQrOpen, setIsStationQrOpen] = useState(false);

  // 6. Settings state
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  // 7. Attendance Records state
  const [records, setRecords] = useState<AttendanceRecord[]>(() => getAttendanceRecords());

  // 8. Global Toast Notification for Quick Scans
  const [globalToast, setGlobalToast] = useState<{
    show: boolean;
    success: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Sync records when window receives storage event
  useEffect(() => {
    const handleStorage = () => {
      setRecords(getAttendanceRecords());
      setSettings(getAppSettings());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Login handler
  const handleLogin = (user: UserAccount, rememberMe: boolean) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    localStorage.setItem('attendance_active_user_id', user.id);
    localStorage.setItem('attendance_is_authenticated', 'true');

    if (user.role === 'staff' && !ROLE_ALLOWED_TABS.staff.includes(currentTab)) {
      setCurrentTab('scanner');
    } else if (user.role !== 'staff' && currentTab === 'portal') {
      setCurrentTab('dashboard');
    }

    if (settings.soundEnabled) playSuccessChime();
    setGlobalToast({
      show: true,
      success: true,
      title: language === 'km' ? 'ចូលប្រើប្រព័ន្ធបានជោគជ័យ' : 'Login Successful',
      message: `${language === 'km' ? 'សូមស្វាគមន៍' : 'Welcome'}, ${language === 'km' ? user.nameKhmer : user.name} (${user.role.toUpperCase()})`
    });
    setTimeout(() => setGlobalToast(null), 4000);
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsLoginModalOpen(true);
    localStorage.setItem('attendance_is_authenticated', 'false');
    if (settings.soundEnabled) playErrorBuzz();
    setGlobalToast({
      show: true,
      success: true,
      title: language === 'km' ? 'បានចាកចេញ' : 'Signed Out',
      message: language === 'km' ? 'អ្នកបានចាកចេញពីគណនីដោយជោគជ័យ' : 'You have successfully signed out.'
    });
    setTimeout(() => setGlobalToast(null), 3000);
  };

  // Switch User Profile (Admin / Manager / Staff)
  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('attendance_active_user_id', user.id);
    const allowed = ROLE_ALLOWED_TABS[user.role];
    if (!allowed.includes(currentTab)) {
      setCurrentTab(user.role === 'staff' ? 'scanner' : 'dashboard');
    }
  };

  // Continuous RBAC Guard: If active user role changes or doesn't have access to current tab, redirect
  useEffect(() => {
    const allowed = ROLE_ALLOWED_TABS[currentUser.role];
    if (!allowed.includes(currentTab)) {
      setCurrentTab(currentUser.role === 'staff' ? 'scanner' : 'dashboard');
    }
  }, [currentUser.role, currentTab]);

  // Handler for scan completed on ScannerPage
  const handleScanComplete = (result: AttendanceScanResult) => {
    const updated = getAttendanceRecords();
    setRecords([...updated]);
  };

  // Handler for simulating scan from anywhere
  const handleSimulateScan = async (empId: string) => {
    try {
      const result = await submitAttendanceScan({ employeeId: empId });
      
      if (result.success) {
        if (settings.soundEnabled) playSuccessChime();
        setGlobalToast({
          show: true,
          success: true,
          title: result.action === 'check_in' ? 'Check-In Recorded' : 'Check-Out Recorded',
          message: `${result.fullName} (${result.employeeId}) • ${result.message}`
        });
      } else {
        if (settings.soundEnabled) playErrorBuzz();
        setGlobalToast({
          show: true,
          success: false,
          title: 'Scan Error',
          message: result.message
        });
      }

      setRecords(getAttendanceRecords());
      setTimeout(() => setGlobalToast(null), 4000);
    } catch (err: any) {
      if (settings.soundEnabled) playErrorBuzz();
      setGlobalToast({
        show: true,
        success: false,
        title: 'Error',
        message: err.message || 'Failed to submit scan'
      });
      setTimeout(() => setGlobalToast(null), 4000);
    }
  };

  // Handler for clearing records (Admin only)
  const handleClearRecords = () => {
    clearAttendanceRecords();
    setRecords([]);
  };

  // If user is logged out, show the dedicated Log In screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        {/* Global Toast */}
        {globalToast && (
          <div className="fixed top-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-5 duration-300">
            <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
              globalToast.success 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className={`p-1 rounded-lg shrink-0 ${
                globalToast.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {globalToast.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-sm">{globalToast.title}</p>
                <p className="mt-0.5 opacity-90">{globalToast.message}</p>
              </div>
            </div>
          </div>
        )}

        <LoginForm
          isModal={false}
          language={language}
          setLanguage={setLanguage}
          onLogin={handleLogin}
          currentUser={currentUser}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Left-Side Navigation Bar (Desktop Persistent + Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        language={language}
        setLanguage={setLanguage}
        settings={settings}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        onOpenStationQr={() => setCurrentTab('office')}
      />

      {/* 2. Main Content Container (Padded left for desktop sidebar) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">

        {/* Global Toast Notification */}
        {globalToast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
              globalToast.success 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className={`p-1 rounded-lg shrink-0 ${
                globalToast.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {globalToast.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-sm">{globalToast.title}</p>
                <p className="mt-0.5 opacity-90">{globalToast.message}</p>
              </div>
              <button 
                onClick={() => setGlobalToast(null)}
                className="p-1 hover:bg-black/5 rounded-lg text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Active Tab View based on role & selected tab */}
        <main className="flex-1">
          {/* If the current user's role does not have permission for the current tab, show Access Denied */}
          {!ROLE_ALLOWED_TABS[currentUser.role].includes(currentTab) ? (
            <div className="max-w-2xl mx-auto py-12 px-4 text-center">
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8 text-amber-600" />
                </div>
                
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wide">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'សិទ្ធិកម្រិតបុគ្គលិក (Staff Restricted)' : 'Staff Restricted Access'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {language === 'km' ? 'គ្មានសិទ្ធិចូលមើលមុខងារនេះទេ' : 'Access Restricted for Staff Role'}
                  </h2>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    {language === 'km' 
                      ? 'មុខងារគ្រប់គ្រងនេះត្រូវបានកំណត់សិទ្ធិសម្រាប់តែ Admin និង Manager ប៉ុណ្ណោះ។ ក្នុងនាមជាបុគ្គលិក (Staff) លោកអ្នកមិនអាចមើល ឬកែប្រែទិន្នន័យក្រុមហ៊ុនឡើយ។' 
                      : 'This management module is restricted to Administrators and Department Managers. As a staff employee, you do not have permission to access company-wide administrative data.'}
                  </p>
                </div>

                {/* Permitted modules for staff */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-700">
                    {language === 'km' ? 'មុខងារដែលបុគ្គលិកអាចប្រើប្រាស់បាន (មើលឃើញតែ ៣ មុខងារនេះ)៖' : 'Modules authorized for your staff account (Only these 3):'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrentTab('scanner')}
                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 flex items-center gap-2 font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{language === 'km' ? 'ម៉ាស៊ីនស្កេន QR' : 'QR Scanner'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('history')}
                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 flex items-center gap-2 font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <History className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{language === 'km' ? 'ប្រវត្តិវត្តមាន' : 'Attendance History'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('portal')}
                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 flex items-center gap-2 font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <CircleDollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{language === 'km' ? 'ចំនួនប្រាក់ខែរបស់ខ្លួន' : 'My Salary & Payslip'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('scanner')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{language === 'km' ? 'ត្រឡប់ទៅ ម៉ាស៊ីនស្កេន QR' : 'Go to QR Scanner'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                  >
                    {language === 'km' ? 'ប្តូរគណនី (Switch Account)' : 'Switch Account'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'portal' && (
                <StaffPortal
                  language={language}
                  currentUser={currentUser}
                  records={records}
                  onScanNow={handleSimulateScan}
                  onOpenScanner={() => setCurrentTab('scanner')}
                  settings={settings}
                  onOpenStationQrModal={() => setIsStationQrOpen(true)}
                />
              )}

              {currentTab === 'dashboard' && (
                <Dashboard
                  language={language}
                  settings={settings}
                  records={records}
                  currentUser={currentUser}
                  onOpenScanner={() => setCurrentTab('scanner')}
                  onOpenHistory={() => setCurrentTab('history')}
                />
              )}

              {currentTab === 'scanner' && (
                <ScannerPage
                  language={language}
                  settings={settings}
                  currentUser={currentUser}
                  onScanComplete={handleScanComplete}
                  onOpenStationQrModal={() => setIsStationQrOpen(true)}
                />
              )}

              {currentTab === 'history' && (
                <HistoryTable
                  language={language}
                  records={records}
                  onClearRecords={handleClearRecords}
                  currentUser={currentUser}
                />
              )}

              {currentTab === 'employees' && (
                <EmployeeDirectory
                  language={language}
                  currentUser={currentUser}
                  records={records}
                  onSimulateScan={handleSimulateScan}
                />
              )}

              {currentTab === 'payroll' && (
                <PayrollManagement
                  language={language}
                  currentUser={currentUser}
                  records={records}
                />
              )}

              {currentTab === 'departments' && (
                <DepartmentManagement
                  language={language}
                  currentUser={currentUser}
                  records={records}
                  onOpenScanner={() => setCurrentTab('scanner')}
                />
              )}

              {currentTab === 'office' && (
                <OfficeManagement
                  language={language}
                  settings={settings}
                  currentUser={currentUser}
                  onUpdateSettings={(newSettings) => setSettings(newSettings)}
                  onOpenScanner={() => setCurrentTab('scanner')}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsModal
                  language={language}
                  settings={settings}
                  currentUser={currentUser}
                  onSwitchToAdmin={() => handleSwitchUser(USER_PROFILES[0])}
                  onUpdateSettings={(newSettings) => setSettings(newSettings)}
                />
              )}
            </>
          )}
        </main>

        {/* Subtle Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              {language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកឆ្លាតវៃ' : 'Smart Employee Attendance Management System'}
            </span>
            <span className="text-slate-400">
              Active Role: <span className="font-semibold text-slate-700 capitalize">{currentUser.role}</span> ({currentUser.name})
              {currentUser.role === 'manager' && ` • Dept: ${currentUser.department}`}
            </span>
          </div>
        </footer>

      </div>

      {/* Office Station QR Poster & Geofence Modal */}
      <StationQrModal
        isOpen={isStationQrOpen}
        onClose={() => setIsStationQrOpen(false)}
        language={language}
        settings={settings}
      />

      {/* Log In & Switch Account Form Modal */}
      {isLoginModalOpen && (
        <LoginForm
          isOpen={isLoginModalOpen}
          isModal={true}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
          language={language}
          setLanguage={setLanguage}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
