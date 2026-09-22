import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
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
import { Language, AppSettings, AttendanceRecord, AttendanceScanResult, UserAccount } from './types';
import { 
  getAppSettings, 
  getAttendanceRecords, 
  clearAttendanceRecords, 
  clearAllSystemData,
  submitAttendanceScan 
} from './services/attendanceService';
import { USER_PROFILES } from './data/mockEmployees';
import { playSuccessChime, playErrorBuzz } from './utils/audio';
import { 
  CheckCircle2, 
  AlertCircle, 
  X 
} from 'lucide-react';
import { translations } from './i18n/translations';
import { KhmerAlertBanner } from './components/KhmerAlertBanner';
import { showKhmerDeleteAlert } from './utils/alertNotification';

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

  // 3. Navigation Tab state
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    return currentUser.role === 'staff' ? 'portal' : 'dashboard';
  });
  const [previousTab, setPreviousTab] = useState<NavigationTab>(() => {
    return currentUser.role === 'staff' ? 'portal' : 'dashboard';
  });

  const handleSelectTab = (tab: NavigationTab) => {
    if (tab !== 'scanner') {
      setPreviousTab(tab);
    } else if (currentTab !== 'scanner') {
      setPreviousTab(currentTab);
    }
    setCurrentTab(tab);
  };

  const handleOpenScanner = () => {
    if (currentTab !== 'scanner') {
      setPreviousTab(currentTab);
    }
    setCurrentTab('scanner');
  };

  const handleCloseScanner = () => {
    const fallbackTab = currentUser.role === 'staff' ? 'portal' : 'dashboard';
    const targetTab = (previousTab && previousTab !== 'scanner') ? previousTab : fallbackTab;
    setCurrentTab(targetTab);
  };

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

  // Sync records when window receives storage or update event
  useEffect(() => {
    // If not yet cleared per user's clear data instruction, ensure clean state
    if (!localStorage.getItem('attendance_data_cleared_by_user_request')) {
      clearAllSystemData();
      localStorage.setItem('attendance_data_cleared_by_user_request', 'true');
      setRecords([]);
    }

    const handleSync = () => {
      setRecords(getAttendanceRecords());
      setSettings(getAppSettings());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('attendance-records-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('attendance-records-updated', handleSync);
    };
  }, []);

  // Login handler
  const handleLogin = (user: UserAccount, rememberMe: boolean) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    localStorage.setItem('attendance_active_user_id', user.id);
    localStorage.setItem('attendance_is_authenticated', 'true');

    if (user.role === 'staff' && (currentTab === 'dashboard' || currentTab === 'settings')) {
      setCurrentTab('portal');
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
    if (user.role === 'staff' && (currentTab === 'dashboard' || currentTab === 'settings')) {
      setCurrentTab('portal');
    } else if (user.role !== 'staff' && currentTab === 'portal') {
      setCurrentTab('dashboard');
    }
  };

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
    showKhmerDeleteAlert(
      language === 'km' 
        ? 'បានលុបប្រវត្តិកត់ត្រាវត្តមានទាំងអស់ចេញពីប្រព័ន្ធដោយជោគជ័យ!' 
        : 'All attendance records have been cleared successfully!',
      language === 'km' ? 'លុបបានជោគជ័យ' : 'Cleared Successfully'
    );
  };

  // Handler for clearing all system data (Admin only)
  const handleClearAllSystemData = () => {
    clearAllSystemData();
    setRecords([]);
    showKhmerDeleteAlert(
      language === 'km'
        ? 'បានសម្អាតទិន្នន័យវត្តមាន និងប្រវត្តិប្រព័ន្ធទាំងអស់ដោយជោគជ័យ!'
        : 'All attendance records and payroll data have been cleared successfully!',
      language === 'km' ? 'សម្អាតជោគជ័យ' : 'Cleared All Data'
    );
  };

  // If user is logged out, show the dedicated Log In screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        {/* Khmer System Alert Banner */}
        <KhmerAlertBanner />

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
      {/* Floating Global Khmer Alert Banner */}
      <KhmerAlertBanner />
      
      {/* 1. Left-Side Navigation Bar (Desktop Persistent + Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSelectTab}
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
        onOpenStationQr={() => handleSelectTab('office')}
      />

      {/* 2. Main Content Container (Padded left for desktop sidebar) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">

        {/* Top Header Bar with Top-Right User Profile, Cloud Status, and Language Controls */}
        <TopBar
          currentTab={currentTab}
          language={language}
          setLanguage={setLanguage}
          settings={settings}
          currentUser={currentUser}
          isAuthenticated={isAuthenticated}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onCloseScanner={handleCloseScanner}
        />

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
          {currentTab === 'portal' && (
            <StaffPortal
              language={language}
              currentUser={currentUser}
              records={records}
              onScanNow={handleSimulateScan}
              onOpenScanner={handleOpenScanner}
              settings={settings}
              onOpenStationQrModal={() => handleSelectTab('office')}
            />
          )}

          {currentTab === 'dashboard' && (
            <Dashboard
              language={language}
              settings={settings}
              records={records}
              currentUser={currentUser}
              onOpenScanner={handleOpenScanner}
              onOpenHistory={() => handleSelectTab('history')}
            />
          )}

          {currentTab === 'scanner' && (
            <ScannerPage
              language={language}
              settings={settings}
              currentUser={currentUser}
              onScanComplete={handleScanComplete}
              onOpenStationQrModal={() => handleSelectTab('office')}
              onClose={handleCloseScanner}
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
              onOpenScanner={handleOpenScanner}
            />
          )}

          {currentTab === 'office' && (
            <OfficeManagement
              language={language}
              settings={settings}
              currentUser={currentUser}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              onOpenScanner={handleOpenScanner}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsModal
              language={language}
              settings={settings}
              currentUser={currentUser}
              onSwitchToAdmin={() => handleSwitchUser(USER_PROFILES[0])}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              onClearRecords={handleClearRecords}
              onClearAllData={handleClearAllSystemData}
            />
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
