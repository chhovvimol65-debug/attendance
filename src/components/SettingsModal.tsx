import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Link2, 
  Smartphone, 
  Volume2, 
  Clock, 
  Save, 
  RefreshCw, 
  Check, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  Code2, 
  FileCode,
  ExternalLink,
  ShieldCheck,
  Server,
  FileSpreadsheet,
  Download,
  Table,
  CheckCheck,
  MapPin,
  Compass,
  LocateFixed,
  QrCode
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';
import { 
  saveAppSettings, 
  regenerateClientId, 
  testAppsScriptConnection,
  getAttendanceRecords
} from '../services/attendanceService';
import { getCurrentPosition } from '../utils/geolocation';
import { getStoredEmployees } from '../data/mockEmployees';
import { getStoredDepartments } from '../data/mockDepartments';
import { downloadAttendanceExcelTemplate } from '../utils/excelExport';
import { ShieldAlert, Shield } from 'lucide-react';

interface SettingsModalProps {
  language: Language;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  currentUser?: UserAccount;
  onSwitchToAdmin?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  language,
  settings,
  onUpdateSettings,
  currentUser,
  onSwitchToAdmin
}) => {
  const t = translations[language];
  const isAdmin = currentUser?.role === 'admin';

  // Local form state
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl);
  const [attendanceApiKey, setAttendanceApiKey] = useState(settings.attendanceApiKey);
  const [clientId, setClientId] = useState(settings.clientId);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [cooldownSeconds, setCooldownSeconds] = useState(settings.cooldownSeconds);
  const [mockMode, setMockMode] = useState(settings.mockMode);

  // Geofencing & Station QR State
  const [geofenceEnabled, setGeofenceEnabled] = useState(settings.geofenceEnabled ?? true);
  const [officeName, setOfficeName] = useState(settings.officeLocation?.nameKhmer || settings.officeLocation?.name || 'ការិយាល័យកណ្តាល');
  const [latitude, setLatitude] = useState(settings.officeLocation?.latitude ?? 11.5564);
  const [longitude, setLongitude] = useState(settings.officeLocation?.longitude ?? 104.9282);
  const [radiusMeters, setRadiusMeters] = useState(settings.officeLocation?.radiusMeters ?? 100);
  const [stationCode, setStationCode] = useState(settings.stationCode || 'HQ_MAIN');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectMessage, setGpsDetectMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Status feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Download official template (.xlsx)
  const handleDownloadTemplate = () => {
    const employees = getStoredEmployees();
    const departments = getStoredDepartments();
    downloadAttendanceExcelTemplate(employees, departments);
    setDownloadSuccess('template');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Export current live records (.xlsx)
  const handleExportLiveExcel = () => {
    const employees = getStoredEmployees();
    const departments = getStoredDepartments();
    const records = getAttendanceRecords();
    downloadAttendanceExcelTemplate(employees, departments, records);
    setDownloadSuccess('live');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Sample Google Apps Script Template Code (Code.gs)
  const sampleGasCode = `/**
 * Google Apps Script - Employee Attendance Web App Backend (Code.gs)
 * Deploy as: Web app -> Execute as: Me -> Who has access: Anyone
 */

const ATTENDANCE_API_KEY = "secret-attendance-api-key"; // Set this in .env or match your frontend
const SHEET_NAME = "Attendance";
const COOLDOWN_SECONDS = 5;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", code: "INVALID_PAYLOAD", message: "Missing payload body" });
    }

    // Parse payload sent as text/plain to bypass CORS preflight
    const payload = JSON.parse(e.postData.contents);
    const { apiKey, clientId, requestId, employeeId, fullName, department, action } = payload;

    // 1. Authenticate with API Key
    if (ATTENDANCE_API_KEY && apiKey !== ATTENDANCE_API_KEY) {
      return jsonResponse({ status: "error", code: "UNAUTHORIZED", message: "Invalid API Key" });
    }

    // 2. Health check / Test connection ping
    if (action === "ping") {
      return jsonResponse({
        status: "success",
        code: "PONG",
        message: "Google Apps Script connection verified! Ready for attendance logging."
      });
    }

    // 3. Open Spreadsheet & Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp (ISO)",
        "Date",
        "Time",
        "Employee ID",
        "Full Name",
        "Department",
        "Action",
        "Status",
        "Client ID",
        "Request ID"
      ]);
      sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#EEF2FF");
      sheet.setFrozenRows(1);
    }

    // 4. Replay Protection: Check if requestId was already processed
    const cache = CacheService.getScriptCache();
    if (cache.get("req_" + requestId)) {
      return jsonResponse({ status: "error", code: "REPLAY_DETECTED", message: "Duplicate scan request detected" });
    }

    // 5. Cooldown Check per employee
    if (cache.get("emp_" + employeeId)) {
      return jsonResponse({ status: "error", code: "SCAN_COOLDOWN", message: "Scan cooldown active. Please wait." });
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
    const determinedAction = action || "check_in";

    // 6. Append Attendance Row matching the Excel Template columns
    sheet.appendRow([
      now.toISOString(),
      dateStr,
      timeStr,
      employeeId,
      fullName || employeeId,
      department || "General",
      determinedAction,
      "success",
      clientId || "unknown",
      requestId || ("req-" + now.getTime())
    ]);

    // Save requestId in cache for 1 hour & cooldown for COOLDOWN_SECONDS
    cache.put("req_" + requestId, "processed", 3600);
    cache.put("emp_" + employeeId, "active", COOLDOWN_SECONDS);

    return jsonResponse({
      status: "success",
      code: determinedAction,
      action: determinedAction,
      message: determinedAction === "check_in" ? "Check-in recorded to Google Sheet!" : "Check-out recorded to Google Sheet!",
      recordId: "gs-" + now.getTime(),
      timestamp: now.toISOString()
    });

  } catch (err) {
    return jsonResponse({ status: "error", code: "SERVER_ERROR", message: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ status: "success", message: "Attendance Web App Endpoint is live!" });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  // Auto-Detect Current GPS coordinates
  const handleDetectCurrentGps = async () => {
    setIsDetectingGps(true);
    setGpsDetectMessage(null);
    try {
      const pos = await getCurrentPosition();
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lon = Number(pos.coords.longitude.toFixed(6));
      setLatitude(lat);
      setLongitude(lon);
      setGpsDetectMessage({
        success: true,
        text: language === 'km' 
          ? `ចាប់យកទីតាំង GPS បានជោគជ័យ! (ភាពសុក្រឹត ±${Math.round(pos.coords.accuracy)}m)`
          : `GPS acquired successfully! (Accuracy ±${Math.round(pos.coords.accuracy)}m)`
      });
      setTimeout(() => setGpsDetectMessage(null), 4000);
    } catch (err: any) {
      setGpsDetectMessage({
        success: false,
        text: language === 'km' 
          ? `មិនអាចចាប់យក GPS បានឡើយ៖ ${err.message || 'សូមពិនិត្យសិទ្ធិកាមេរ៉ា និងទីតាំង'}`
          : `Could not acquire GPS: ${err.message || 'Check location permissions'}`
      });
      setTimeout(() => setGpsDetectMessage(null), 5000);
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveAppSettings({
      appsScriptUrl: appsScriptUrl.trim(),
      attendanceApiKey: attendanceApiKey.trim(),
      clientId,
      soundEnabled,
      cooldownSeconds: Number(cooldownSeconds) || 3,
      mockMode,
      geofenceEnabled,
      officeLocation: {
        name: officeName.trim() || 'Headquarters Office',
        nameKhmer: officeName.trim() || 'ការិយាល័យកណ្តាល',
        latitude: Number(latitude) || 11.5564,
        longitude: Number(longitude) || 104.9282,
        radiusMeters: Number(radiusMeters) || 100
      },
      stationCode: stationCode.trim() || 'HQ_MAIN'
    });
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Regenerate Client ID
  const handleRegenerateId = () => {
    const newId = regenerateClientId();
    setClientId(newId);
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testAppsScriptConnection(appsScriptUrl.trim(), attendanceApiKey.trim());
    setTestResult(res);
    setIsTesting(false);
  };

  // Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleGasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {t.settingsTitle}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {t.settingsSubtitle}
        </p>
      </div>

      {/* Admin Privilege Restriction Alert */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {t.adminOnlySettings}
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Current account: <span className="font-semibold">{currentUser?.name}</span> ({currentUser?.role.toUpperCase()}). Settings are read-only.
              </p>
            </div>
          </div>

          {onSwitchToAdmin && (
            <button
              type="button"
              id="btn-switch-to-admin"
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Switch to Admin</span>
            </button>
          )}
        </div>
      )}

      {/* Google Sheets & Excel Database Template Card */}
      <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl p-6 sm:p-8 border border-emerald-200/90 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {t.excelTemplateTitle}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  .XLSX Ready
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Google Drive / Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.excelTemplateSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Static File Direct Link */}
          <a
            href="/QR_Attendance_Google_Sheet_Template.xlsx"
            download="QR_Attendance_Google_Sheet_Template.xlsx"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:text-emerald-800 underline underline-offset-4 shrink-0"
          >
            <span>Direct file link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* 4 Sheets Included Overview Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              10 columns (Date, Time, ID, Name, Dept, Action, Status)
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Table className="w-3.5 h-3.5 text-blue-600" />
              <span>Employees</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              14 columns (Staff ID, Khmer & EN names, Role, Shift, Phone)
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Table className="w-3.5 h-3.5 text-purple-600" />
              <span>Departments</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              7 columns (Dept ID, Code, Manager, Color, Description)
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-emerald-100/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Table className="w-3.5 h-3.5 text-amber-600" />
              <span>Instructions</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Khmer & English step-by-step setup walkthrough
            </p>
          </div>
        </div>

        {/* Action Buttons: Download Official Template or Live System Data */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-200 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.downloadExcelTemplate}</span>
          </button>

          <button
            type="button"
            onClick={handleExportLiveExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{t.downloadWithCurrentData}</span>
          </button>

          {downloadSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-100/70 px-3 py-1 rounded-xl animate-in fade-in">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Downloaded .xlsx successfully!</span>
            </span>
          )}
        </div>

        {/* 3-Step Setup Instructions */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{language === 'km' ? 'វិធី Upload ចូល Google Sheets (៣ ជំហានងាយៗ)' : 'How to Upload to Google Sheets (3 Simple Steps)'}:</span>
          </p>
          <div className="space-y-1.5 pl-3 border-l-2 border-emerald-200 text-slate-600">
            <p><strong>{t.excelStep1}</strong></p>
            <p><strong>{t.excelStep2}</strong></p>
            <p><strong>{t.excelStep3}</strong></p>
          </div>
        </div>

      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {t.generalConfig}
              </h2>
              <p className="text-xs text-slate-500">
                Connect your Google Sheets via Google Apps Script Web App
              </p>
            </div>
          </div>

          {/* Mock Mode Toggle */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                <span>Mock Engine</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  mockMode 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {mockMode 
                    ? (language === 'km' ? 'ON (សាកល្បង)' : 'ON (Simulated)') 
                    : (language === 'km' ? 'OFF (Google Sheet ពិត)' : 'OFF (Live Google Sheet)')}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {mockMode 
                  ? (language === 'km' ? 'ចុចបិទដើម្បីបញ្ជូនទៅ Google Sheet' : 'Turn OFF to send to live Sheet') 
                  : (language === 'km' ? 'កំពុងភ្ជាប់ Google Sheet ពិត' : 'Logging to live Google Sheet')}
              </p>
            </div>

            <button
              id="toggle-mock-engine"
              type="button"
              role="switch"
              aria-checked={mockMode}
              onClick={() => setMockMode(!mockMode)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                mockMode ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              title={mockMode ? 'Click to turn OFF and use live Google Sheet' : 'Click to enable offline simulation'}
            >
              <span className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition-transform ${
                mockMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Apps Script URL Input */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {t.appsScriptUrlLabel}
          </label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-apps-script-url"
              type="url"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycby.../exec"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs sm:text-sm"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {t.appsScriptUrlHelp}
          </p>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {t.apiKeyLabel}
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-api-key"
              type="text"
              value={attendanceApiKey}
              onChange={(e) => setAttendanceApiKey(e.target.value)}
              placeholder="e.g. secret-attendance-api-key"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs sm:text-sm"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {t.apiKeyHelp}
          </p>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            id="btn-test-cloud-connection"
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !appsScriptUrl.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
            <span>{isTesting ? t.testingConnection : (language === 'km' ? '⚡ សាកល្បងការតភ្ជាប់ (Test Connection)' : '⚡ Test Connection')}</span>
          </button>

          {testResult && (
            <div className={`space-y-1.5 p-3.5 rounded-xl text-xs ${
              testResult.success 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              <div className="flex items-start gap-2 font-medium">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
              
              {!testResult.success && (
                <div className="pl-6 pt-1 text-[11px] text-rose-700 space-y-1 border-t border-rose-200/60 mt-2">
                  <p className="font-semibold">
                    {language === 'km' ? '🛠️ របៀបដោះស្រាយ "Failed to fetch" ក្នុង Google Apps Script៖' : '🛠️ How to fix "Failed to fetch" in Google Apps Script:'}
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-rose-800">
                    <li>
                      {language === 'km' 
                        ? 'ចូលទៅ Apps Script ចុច Deploy > Manage deployments' 
                        : 'Open Apps Script and click Deploy > Manage deployments'}
                    </li>
                    <li>
                      {language === 'km' 
                        ? 'ចុច Edit (រូបខ្មៅដៃ) ហើយពិនិត្យត្រង់ "Who has access"' 
                        : 'Click Edit (Pencil icon) and check "Who has access"'}
                    </li>
                    <li>
                      {language === 'km' 
                        ? 'ប្តូរទៅជា "Anyone" (ដាច់ខាតមិនមែន "Only myself" ទេ)' 
                        : 'Change to "Anyone" (MUST be "Anyone", not "Only myself")'}
                    </li>
                    <li>
                      {language === 'km' 
                        ? 'ជ្រើសរើស Version: "New version" រួចចុច Deploy ម្តងទៀត' 
                        : 'Select Version: "New version" and click Deploy'}
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Device Client ID & Hardware Audit Identifier */}
        <div className="pt-4 border-t border-slate-100 space-y-1.5">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700">
            {t.deviceIdLabel}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-client-id"
                type="text"
                readOnly
                value={clientId}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-mono text-slate-700 select-all"
              />
            </div>
            <button
              id="btn-regenerate-client-id"
              type="button"
              onClick={handleRegenerateId}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.regenerateId}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {t.deviceIdHelp}
          </p>
        </div>

        {/* Preferences: Sound Feedback & Scanner Cooldown */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Audio Chime Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 block">
                {t.soundEffectsLabel}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Audio chime & buzz via Web Audio API
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span className={`w-4 h-4 rounded-full bg-white block shadow-sm transform transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Cooldown Seconds */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 block">
                {t.cooldownLabel}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Prevents accidental double scans
              </span>
            </div>
            <select
              id="select-cooldown-seconds"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>1 second (Very fast)</option>
              <option value={2}>2 seconds (Fast)</option>
              <option value={3}>3 seconds (Recommended)</option>
              <option value={4}>4 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={8}>8 seconds</option>
              <option value={10}>10 seconds</option>
            </select>
          </div>

        </div>

        {/* Geofencing & Station Unified QR Code Configuration */}
        <div className="pt-6 border-t border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {language === 'km' ? 'ការកំណត់ទីតាំង Geofencing & QR Code រួម' : 'GPS Geofencing & Shared Station QR'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'km' ? 'កំណត់កូអរដោនេការិយាល័យ និងកម្រិតចម្ងាយអនុញ្ញាតសម្រាប់បុគ្គលិកស្កេន' : 'Set office GPS coordinates and boundary radius for employee mobile scans'}
                </p>
              </div>
            </div>

            {/* Geofence Enable / Disable Switch */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">
                {geofenceEnabled 
                  ? (language === 'km' ? 'បើកដំណើរការ Geofence' : 'Geofence Active') 
                  : (language === 'km' ? 'បិទ Geofence' : 'Geofence Disabled')}
              </span>
              <button
                type="button"
                onClick={() => setGeofenceEnabled(!geofenceEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  geofenceEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full bg-white block shadow-sm transform transition-transform ${
                  geofenceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Office Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {language === 'km' ? 'ឈ្មោះទីតាំងការិយាល័យ' : 'Office Location Name'}
              </label>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="ការិយាល័យកណ្តាល (Head Office)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Allowed Radius (meters) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {language === 'km' ? 'កម្រិតចម្ងាយអនុញ្ញាត (ម៉ែត្រ)' : 'Allowed Radius (Meters)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  step={10}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">ម៉ែត្រ (m)</span>
              </div>
            </div>

            {/* Latitude */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Latitude (រយៈទទឹង GPS)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Longitude */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Longitude (រយៈបណ្តោយ GPS)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Auto-detect GPS button and Map link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDetectCurrentGps}
                disabled={isDetectingGps}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>
                  {isDetectingGps 
                    ? (language === 'km' ? 'កំពុងចាប់យក GPS...' : 'Detecting GPS...') 
                    : (language === 'km' ? '📍 ចាប់យកទីតាំងបច្ចុប្បន្ន (Get Current GPS)' : '📍 Auto-Detect Office GPS')}
                </span>
              </button>

              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </a>
            </div>

            <div className="text-[11px] text-slate-500">
              Station Token: <span className="font-mono font-bold text-slate-700">{stationCode}</span>
            </div>
          </div>

          {/* GPS Message */}
          {gpsDetectMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              gpsDetectMessage.success 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              {gpsDetectMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{gpsDetectMessage.text}</span>
            </div>
          )}
        </div>

        {/* Save Settings Button */}
        <div className="pt-4 flex items-center gap-3">
          <button
            id="btn-save-settings"
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveSettings}</span>
          </button>

          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {t.settingsSaved}
            </span>
          )}
        </div>

      </form>

      {/* Production Guide (.env instructions) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {t.envGuideTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Securely inject URLs and Secrets into the build without committing them
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-slate-700">
          <p>{t.envGuideStep1}</p>
          <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner">
            <span className="text-slate-400"># Google Apps Script Web App URL</span><br />
            <span className="text-indigo-400">VITE_APPS_SCRIPT_URL</span>=&quot;https://script.google.com/macros/s/AKfycby.../exec&quot;<br /><br />
            <span className="text-slate-400"># Shared Attendance Secret API Key</span><br />
            <span className="text-indigo-400">VITE_ATTENDANCE_API_KEY</span>=&quot;secret-attendance-api-key&quot;
          </div>
          <p className="text-xs text-slate-500">{t.envGuideStep3}</p>
        </div>
      </div>

      {/* Copyable Google Apps Script Template */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {t.gasTemplateTitle}
              </h2>
              <p className="text-xs text-slate-500">
                Full Google Sheets attendance recording endpoint with CORS text/plain support
              </p>
            </div>
          </div>

          <button
            id="btn-copy-gas-code"
            type="button"
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? t.copied : t.copyScriptCode}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
          {t.howToDeployGAS}
        </p>

        <div className="relative">
          <pre className="bg-slate-950 text-emerald-300 p-4 rounded-2xl text-xs font-mono max-h-80 overflow-y-auto overflow-x-auto shadow-inner">
            <code>{sampleGasCode}</code>
          </pre>
        </div>

      </div>

    </div>
  );
};
