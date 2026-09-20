import React, { useState, useRef, useEffect } from 'react';
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
  Shield,
  Briefcase,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';
import { USER_PROFILES } from '../data/mockEmployees';

export type NavigationTab = 'dashboard' | 'scanner' | 'history' | 'employees' | 'settings' | 'portal';

interface HeaderProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  settings: AppSettings;
  currentUser: UserAccount;
  onSwitchUser: (user: UserAccount) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  language,
  setLanguage,
  settings,
  currentUser,
  onSwitchUser
}) => {
  const t = translations[language];
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'km' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('attendance_lang', nextLang);
  };

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }

  // Dynamic navigation items based on User Role
  const navItems: NavItem[] = [];

  if (currentUser.role === 'staff') {
    navItems.push({ id: 'portal', label: t.myPortal, icon: UserCheck, highlight: true });
    navItems.push({ id: 'scanner', label: t.scanner, icon: QrCode });
    navItems.push({ id: 'history', label: t.history, icon: History });
  } else if (currentUser.role === 'manager') {
    navItems.push({ id: 'dashboard', label: t.dashboard, icon: LayoutDashboard });
    navItems.push({ id: 'scanner', label: t.scanner, icon: QrCode, highlight: true });
    navItems.push({ id: 'history', label: t.history, icon: History });
    navItems.push({ id: 'employees', label: t.employees, icon: Users });
  } else {
    // Admin
    navItems.push({ id: 'dashboard', label: t.dashboard, icon: LayoutDashboard });
    navItems.push({ id: 'scanner', label: t.scanner, icon: QrCode, highlight: true });
    navItems.push({ id: 'history', label: t.history, icon: History });
    navItems.push({ id: 'employees', label: t.employees, icon: Users });
    navItems.push({ id: 'settings', label: t.settings, icon: Settings });
  }

  const isCloudConnected = !!settings.appsScriptUrl && !settings.mockMode;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          text: t.role_admin,
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: Shield
        };
      case 'manager':
        return {
          text: t.role_manager,
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: Briefcase
        };
      case 'staff':
      default:
        return {
          text: t.role_staff,
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: UserCheck
        };
    }
  };

  const currentRoleBadge = getRoleBadge(currentUser.role);
  const RoleIcon = currentRoleBadge.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setCurrentTab(currentUser.role === 'staff' ? 'portal' : 'dashboard')}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 cursor-pointer hover:scale-105 transition-transform"
            >
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  {t.appName}
                </span>
                {/* Cloud Connection Status Pill */}
                <div 
                  className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isCloudConnected 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title={isCloudConnected ? t.cloudConnected : t.cloudMissing}
                >
                  {isCloudConnected ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Cloud Live</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3 text-slate-400" />
                      <span>Local Mode</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden xs:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? item.highlight 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white text-slate-900 shadow-sm'
                      : item.highlight
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive && item.highlight ? 'text-white' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action: Language Switcher & User Profile Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher */}
            <button
              id="btn-toggle-language"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors"
              title="Switch Language / ប្តូរភាសា"
            >
              <Languages className="w-4 h-4 text-indigo-600" />
              <span>{language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
            </button>

            {/* User Role Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                id="btn-user-role-dropdown"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl transition-all shadow-2xs"
                title={t.switchUserRole}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden md:block leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {language === 'km' ? currentUser.nameKhmer : currentUser.name}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${currentRoleBadge.bg}`}>
                      {currentRoleBadge.text}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {language === 'km' ? currentUser.titleKhmer : currentUser.title}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              {/* Role Selection Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.switchUserRole}
                    </p>
                    <p className="text-xs text-slate-500">
                      Select a role to test role-based access & permissions
                    </p>
                  </div>

                  <div className="divide-y divide-slate-50 mt-1">
                    {USER_PROFILES.map((profile) => {
                      const isSelected = profile.id === currentUser.id;
                      const badge = getRoleBadge(profile.role);
                      const Icon = badge.icon;
                      
                      return (
                        <button
                          key={profile.id}
                          id={`select-role-${profile.role}`}
                          onClick={() => {
                            onSwitchUser(profile);
                            setIsRoleDropdownOpen(false);
                            // Auto navigate to relevant home
                            if (profile.role === 'staff') {
                              setCurrentTab('portal');
                            } else if (currentTab === 'portal') {
                              setCurrentTab('dashboard');
                            }
                          }}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors ${
                            isSelected 
                              ? 'bg-indigo-50/70 border border-indigo-200/60' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {language === 'km' ? profile.nameKhmer : profile.name}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                                {badge.text}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {language === 'km' ? profile.titleKhmer : profile.title}
                            </p>
                            <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                              {profile.role === 'admin' 
                                ? t.roleDesc_admin 
                                : profile.role === 'manager' 
                                  ? t.roleDesc_manager 
                                  : t.roleDesc_staff}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Scanner Button */}
            {currentTab !== 'scanner' && (
              <button
                id="btn-header-scanner"
                onClick={() => setCurrentTab('scanner')}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-95 shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden md:inline">{t.openScanner}</span>
                <span className="md:hidden">Scan</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors ${
                  isActive 
                    ? 'text-indigo-600 font-semibold' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 stroke-[2.2]' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
