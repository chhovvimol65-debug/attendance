import React from 'react';
import { 
  QrCode, 
  LayoutDashboard, 
  History, 
  Users, 
  Settings, 
  Languages, 
  CheckCircle2, 
  CloudOff,
  UserCheck,
  X,
  Menu,
  Camera,
  Building2,
  MapPin,
  LogIn,
  LogOut,
  Shield,
  KeyRound,
  CircleDollarSign
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';

export type NavigationTab = 'dashboard' | 'scanner' | 'history' | 'employees' | 'payroll' | 'departments' | 'office' | 'settings' | 'portal';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  settings: AppSettings;
  currentUser: UserAccount;
  onSwitchUser?: (user: UserAccount) => void;
  onOpenLogin: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenStationQr?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  language,
  setLanguage,
  settings,
  currentUser,
  onSwitchUser,
  onOpenLogin,
  onLogout,
  isAuthenticated = true,
  mobileOpen,
  setMobileOpen,
  onOpenStationQr
}) => {
  const t = translations[language];

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'km' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('attendance_lang', nextLang);
  };

  interface NavItem {
    id: NavigationTab;
    label: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
  }

  // Dynamic navigation items based on User Role & Manager Department scope
  const navItems: NavItem[] = [];

  if (currentUser.role === 'staff') {
    navItems.push({ 
      id: 'scanner', 
      label: language === 'km' ? 'ម៉ាស៊ីនស្កេន QR' : 'QR Scanner', 
      description: language === 'km' ? 'ស្កេនវត្តមានចូល/ចេញ' : 'Camera QR Attendance Scanner',
      icon: QrCode, 
      highlight: true 
    });
    navItems.push({ 
      id: 'history', 
      label: language === 'km' ? 'ប្រវត្តិវត្តមាន' : 'Attendance History', 
      description: language === 'km' ? 'កំណត់ត្រាវត្តមានផ្ទាល់ខ្លួន' : 'Personal Scan Logs Only',
      icon: History 
    });
    navItems.push({ 
      id: 'portal', 
      label: language === 'km' ? 'ចំនួនប្រាក់ខែរបស់ខ្លួន' : 'My Salary & Payslip', 
      description: language === 'km' ? 'ប្រាក់ខែសុទ្ធ & ប័ណ្ណបើកប្រាក់' : 'Net Salary & Payslip Slip',
      icon: CircleDollarSign 
    });
  } else if (currentUser.role === 'manager') {
    navItems.push({ 
      id: 'dashboard', 
      label: language === 'km' ? 'ផ្ទាំងគ្រប់គ្រងផ្នែក' : 'Dept. Dashboard', 
      description: language === 'km' ? currentUser.departmentKhmer : currentUser.department,
      icon: LayoutDashboard 
    });
    navItems.push({ 
      id: 'scanner', 
      label: t.scanner, 
      description: language === 'km' ? 'ស្កេនកាមេរ៉ា' : 'Terminal Scanner',
      icon: QrCode, 
      highlight: true 
    });
    navItems.push({ 
      id: 'history', 
      label: language === 'km' ? 'កំណត់ត្រាវត្តមាន' : 'Dept. Attendance', 
      description: language === 'km' ? 'ទិន្នន័យក្នុងផ្នែក' : 'Department Logs',
      icon: History 
    });
    navItems.push({ 
      id: 'employees', 
      label: language === 'km' ? 'ការគ្រប់គ្រងបុគ្គលិក' : 'Employee Management', 
      description: language === 'km' ? 'ព័ត៌មានបុគ្គលិកក្នុងផ្នែក' : 'Dept. Staff Details',
      icon: Users 
    });
    navItems.push({ 
      id: 'payroll', 
      label: t.payrollNav, 
      description: language === 'km' ? 'គណនាប្រាក់ខែ & កាត់យឺត' : 'Salaries & Late Deductions',
      icon: CircleDollarSign 
    });
    navItems.push({ 
      id: 'departments', 
      label: language === 'km' ? 'ការគ្រប់គ្រងផ្នែក' : 'Departments', 
      description: language === 'km' ? 'រចនាសម្ព័ន្ធផ្នែក & ក្រុម' : 'Department Structure',
      icon: Building2 
    });
    navItems.push({ 
      id: 'office', 
      label: language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management', 
      description: language === 'km' ? 'ទីតាំង Geofence & QR រួម' : 'Geofence & Station QR',
      icon: MapPin 
    });
  } else {
    // Admin
    navItems.push({ 
      id: 'dashboard', 
      label: language === 'km' ? 'ផ្ទាំងគ្រប់គ្រងរួម' : 'Company Dashboard', 
      description: language === 'km' ? 'គ្រប់ផ្នែកទាំងអស់' : 'All Departments',
      icon: LayoutDashboard 
    });
    navItems.push({ 
      id: 'scanner', 
      label: t.scanner, 
      description: language === 'km' ? 'ស្កេនកាមេរ៉ា' : 'Terminal Scanner',
      icon: QrCode, 
      highlight: true 
    });
    navItems.push({ 
      id: 'history', 
      label: t.history, 
      description: language === 'km' ? 'កំណត់ត្រាសវនកម្ម' : 'Company Attendance',
      icon: History 
    });
    navItems.push({ 
      id: 'employees', 
      label: t.employees, 
      description: language === 'km' ? 'ព័ត៌មានបុគ្គលិក & កាត QR' : 'Staff Details & Badges',
      icon: Users 
    });
    navItems.push({ 
      id: 'payroll', 
      label: t.payrollNav, 
      description: language === 'km' ? 'គណនាប្រាក់ខែ & កាត់យឺត' : 'Salaries & Late Deductions',
      icon: CircleDollarSign,
      highlight: true
    });
    navItems.push({ 
      id: 'departments', 
      label: language === 'km' ? 'ការគ្រប់គ្រងផ្នែក' : 'Departments', 
      description: language === 'km' ? 'រចនាសម្ព័ន្ធស្ថាប័ន & ក្រុម' : 'Organization & Teams',
      icon: Building2 
    });
    navItems.push({ 
      id: 'office', 
      label: language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management', 
      description: language === 'km' ? 'ទីតាំង Geofence & QR រួម' : 'Geofence & Station QR',
      icon: MapPin 
    });
    navItems.push({ 
      id: 'settings', 
      label: t.settings, 
      description: language === 'km' ? 'ការកំណត់ Cloud API' : 'Google Apps Script API',
      icon: Settings 
    });
  }

  const isCloudConnected = !!settings.appsScriptUrl && !settings.mockMode;

  const handleNavClick = (id: NavigationTab) => {
    setCurrentTab(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      
      {/* 1. Brand Logo & Title */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-base tracking-tight truncate">
              {t.appName}
            </h1>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Navigation Links (Vertical Left List) */}
      <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="flex-1 min-w-0 text-sm truncate">
                {item.label}
              </span>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3.5 User Account & Login / Switch Button */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isAuthenticated ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {language === 'km' ? currentUser.nameKhmer : currentUser.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-100 text-rose-800'
                    : currentUser.role === 'manager'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.role.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {currentUser.employeeId}
                </span>
              </div>
            </div>
          </div>

          {/* Role Access Scope Info Note */}
          <div className="pt-2 border-t border-slate-200/60">
            {currentUser.role === 'staff' ? (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold">
                    {language === 'km' ? 'សិទ្ធិកម្រិតបុគ្គលិក' : 'Staff Restricted Access'}
                  </span>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {language === 'km' 
                      ? 'ប្រើប្រាស់បានតែ Portal, ស្កេន QR & កំណត់ត្រាផ្ទាល់ខ្លួន' 
                      : 'Access limited to Portal, Terminal Scan & Personal Logs'}
                  </p>
                </div>
              </div>
            ) : currentUser.role === 'manager' ? (
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[11px] text-indigo-900 flex items-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold">
                    {language === 'km' ? 'សិទ្ធិប្រធានផ្នែក' : 'Dept. Manager Scope'}
                  </span>
                  <p className="text-[10px] text-indigo-700 mt-0.5">
                    {language === 'km' 
                      ? `ផ្នែក៖ ${currentUser.departmentKhmer || currentUser.department}` 
                      : `Dept: ${currentUser.department}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-800 flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <span className="font-bold">
                    {language === 'km' ? 'សិទ្ធិគ្រប់គ្រងពេញលេញ' : 'Full Administrator'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'km' ? 'ចូលដំណើរការគ្រប់មុខងារ' : 'Unrestricted system access'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
            <button
              id="btn-sidebar-open-login"
              type="button"
              onClick={onOpenLogin}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title={language === 'km' ? 'ចូលប្រើ ឬប្តូរគណនី' : 'Login / Switch Account'}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'ចូលប្រើ / ប្តូរគណនី' : 'Log In / Switch'}</span>
            </button>
            {onLogout && (
              <button
                id="btn-sidebar-logout"
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 transition-colors cursor-pointer"
                title={language === 'km' ? 'ចាកចេញ (Sign Out)' : 'Sign Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer: Cloud Status & Language Switcher */}
      <div className="p-3.5 border-t border-slate-100 space-y-2.5 bg-slate-50/60">
        {/* Cloud Sync Status */}
        <div 
          className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
            isCloudConnected 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCloudConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] font-semibold truncate">
              {isCloudConnected ? 'Google Cloud Sync' : 'Local Storage'}
            </span>
          </div>
          <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </div>

        {/* Language Switcher */}
        <button
          id="btn-sidebar-language"
          onClick={toggleLanguage}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-indigo-600" />
            <span>{language === 'en' ? 'ភាសាខ្មែរ (Khmer)' : 'English (EN)'}</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {language === 'en' ? 'ខ្មែរ' : 'EN'}
          </span>
        </button>

      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar (w-64 or w-72) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="btn-mobile-menu"
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[140px] sm:max-w-xs">
              {t.appName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Log In / User Account Avatar Button */}
          <button
            id="btn-mobile-login-open"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer"
            title={language === 'km' ? 'ចូលប្រើ / ប្តូរគណនី' : 'Login / Switch Account'}
          >
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-6 h-6 rounded-full object-cover" 
            />
            <span className="hidden sm:inline font-bold text-xs">{language === 'km' ? 'ចូល/ប្តូរ' : 'Login'}</span>
          </button>

          {/* Mobile Office Management Button (Hidden for staff) */}
          {currentUser.role !== 'staff' && currentTab !== 'office' && (
            <button
              id="btn-mobile-office-nav"
              onClick={() => setCurrentTab('office')}
              className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              title={language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management'}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office'}</span>
            </button>
          )}

          {/* Direct Scanner Button */}
          {currentTab !== 'scanner' && (
            <button
              id="btn-mobile-scanner-quick"
              onClick={() => setCurrentTab('scanner')}
              className="flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
