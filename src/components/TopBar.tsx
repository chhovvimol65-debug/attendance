import React from 'react';
import { 
  Menu, 
  QrCode, 
  CheckCircle2, 
  CloudOff, 
  Languages, 
  LogIn, 
  LogOut,
  LayoutDashboard,
  History,
  Users,
  CircleDollarSign,
  Building2,
  MapPin,
  Settings,
  UserCheck,
  X
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';
import { NavigationTab } from './Sidebar';

interface TopBarProps {
  currentTab: NavigationTab;
  language: Language;
  setLanguage: (lang: Language) => void;
  settings: AppSettings;
  currentUser: UserAccount;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenMobileMenu: () => void;
  onCloseScanner?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  language,
  setLanguage,
  settings,
  currentUser,
  isAuthenticated,
  onOpenLogin,
  onLogout,
  onOpenMobileMenu,
  onCloseScanner
}) => {
  const t = translations[language];

  const isCloudConnected = !!settings.appsScriptUrl && !settings.mockMode;

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'km' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('attendance_lang', nextLang);
  };

  // Tab titles and icons for desktop left side breadcrumb
  const getTabInfo = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: language === 'km' ? 'ផ្ទាំងគ្រប់គ្រង' : 'Dashboard',
          icon: LayoutDashboard
        };
      case 'scanner':
        return {
          title: language === 'km' ? 'ស្កេនកាមេរ៉ា' : 'QR Scanner',
          icon: QrCode
        };
      case 'history':
        return {
          title: language === 'km' ? 'កំណត់ត្រាវត្តមាន' : 'Attendance History',
          icon: History
        };
      case 'employees':
        return {
          title: language === 'km' ? 'ការគ្រប់គ្រងបុគ្គលិក' : 'Employee Directory',
          icon: Users
        };
      case 'payroll':
        return {
          title: language === 'km' ? 'គណនាប្រាក់ខែ & កាត់យឺត' : 'Payroll Management',
          icon: CircleDollarSign
        };
      case 'departments':
        return {
          title: language === 'km' ? 'ការគ្រប់គ្រងផ្នែក' : 'Departments',
          icon: Building2
        };
      case 'office':
        return {
          title: language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management',
          icon: MapPin
        };
      case 'settings':
        return {
          title: language === 'km' ? 'ការកំណត់ប្រព័ន្ធ' : 'Settings',
          icon: Settings
        };
      case 'portal':
        return {
          title: language === 'km' ? 'កាតសម្គាល់ខ្លួន & វត្តមាន' : 'Staff Portal',
          icon: UserCheck
        };
      default:
        return {
          title: t.appName,
          icon: QrCode
        };
    }
  };

  const tabInfo = getTabInfo(currentTab);
  const TabIcon = tabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
      
      {/* Left side: Mobile menu toggle + Branding on mobile, Active Tab Breadcrumb on desktop */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu button */}
        <button
          id="btn-mobile-menu-open"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo & App Title */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate max-w-[130px] sm:max-w-none">
            {t.appName}
          </span>
        </div>

        {/* Desktop Active View Title Indicator */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-indigo-600 border border-slate-200/80 flex items-center justify-center shrink-0">
            <TabIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              {tabInfo.title}
            </h2>
          </div>
        </div>
      </div>

      {/* Right side (ផ្នែកខាងស្តាំខាងលើ): Google Cloud Sync + Language Switcher + User Profile Card */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Close Scanner Button when in Scanner View */}
        {currentTab === 'scanner' && onCloseScanner && (
          <button
            id="btn-topbar-close-scanner"
            onClick={onCloseScanner}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            title={language === 'km' ? 'បិទការស្កេន ត្រឡប់ក្រោយ' : 'Close scanner & go back'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">
              {language === 'km' ? 'បិទការស្កេន' : 'Close Scanner'}
            </span>
            <span className="sm:hidden">
              {language === 'km' ? 'បិទ' : 'Close'}
            </span>
          </button>
        )}

        {/* 1. Google Cloud Sync Pill */}
        <div 
          className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isCloudConnected 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' 
              : 'bg-slate-50 text-slate-600 border-slate-200 shadow-2xs'
          }`}
          title={isCloudConnected ? 'Connected to Google Sheets & Apps Script' : 'Running in Local Storage Mode'}
        >
          {isCloudConnected ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="hidden md:inline text-xs font-semibold">
            {isCloudConnected ? 'Google Cloud Sync' : 'Local Storage'}
          </span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </div>

        {/* 2. Language Switcher Button */}
        <button
          id="btn-topbar-language"
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
          title={language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ (Khmer)' : 'Switch to English (EN)'}
        >
          <Languages className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="hidden sm:inline">
            {language === 'en' ? 'ភាសាខ្មែរ (Khmer)' : 'English (EN)'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {language === 'en' ? 'ខ្មែរ' : 'EN'}
          </span>
        </button>

        {/* 3. User Profile Card & Login/Switch + Logout Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl p-1 sm:p-1.5 sm:pl-2.5 shadow-2xs">
          {/* Avatar and Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isAuthenticated ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>

            <div className="hidden xl:block text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 leading-none truncate max-w-[120px]">
                  {language === 'km' ? currentUser.nameKhmer : currentUser.name}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase leading-none ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-100 text-rose-800'
                    : currentUser.role === 'manager'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {currentUser.employeeId}
              </div>
            </div>
          </div>

          {/* Login / Switch User Account Button */}
          <button
            id="btn-topbar-open-login"
            type="button"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title={language === 'km' ? 'ចូលប្រើ ឬប្តូរគណនី' : 'Login / Switch Account'}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {language === 'km' ? 'ចូលប្រើ / ប្ដូរគណនី' : 'Log In / Switch'}
            </span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              id="btn-topbar-logout"
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

    </header>
  );
};
