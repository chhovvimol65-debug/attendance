import React from 'react';
import { 
  QrCode, 
  LayoutDashboard, 
  History, 
  Users, 
  Settings, 
  UserCheck, 
  X, 
  Building2, 
  MapPin, 
  CircleDollarSign 
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';

export type NavigationTab = 'dashboard' | 'scanner' | 'history' | 'employees' | 'payroll' | 'departments' | 'office' | 'settings' | 'portal';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  settings: AppSettings;
  currentUser: UserAccount;
  onSwitchUser?: (user: UserAccount) => void;
  onOpenLogin?: () => void;
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
  currentUser,
  mobileOpen,
  setMobileOpen
}) => {
  const t = translations[language];

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
      id: 'portal', 
      label: t.myPortal, 
      description: language === 'km' ? 'កាតសម្គាល់ខ្លួន & វត្តមាន' : 'Digital Badge & Status',
      icon: UserCheck, 
      highlight: true 
    });
    navItems.push({ 
      id: 'scanner', 
      label: t.scanner, 
      description: language === 'km' ? 'ស្កេនកាមេរ៉ា' : 'Camera QR Scan',
      icon: QrCode 
    });
    navItems.push({ 
      id: 'history', 
      label: language === 'km' ? 'កំណត់ត្រាផ្ទាល់ខ្លួន' : 'My Attendance', 
      description: language === 'km' ? 'ប្រវត្តិនៃការស្កេន' : 'Personal Scan Logs',
      icon: History 
    });
    navItems.push({ 
      id: 'office', 
      label: language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management', 
      description: language === 'km' ? 'ទីតាំង Geofence & QR រួម' : 'Geofence & Station QR',
      icon: MapPin 
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

  const handleNavClick = (id: NavigationTab) => {
    setCurrentTab(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      
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
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {language === 'km' ? 'ប្រព័ន្ធស្កេន QR វត្តមានឆ្លាតវៃ' : 'Smart Attendance System'}
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          aria-label="Close navigation menu"
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
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  {item.label}
                </div>
                {item.description && (
                  <div className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {item.description}
                  </div>
                )}
              </div>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar (w-72) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-30">
        {sidebarContent}
      </aside>

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
