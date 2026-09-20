import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  User, 
  QrCode, 
  Download, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  Sparkles, 
  Camera,
  History,
  ShieldAlert,
  MapPin,
  LocateFixed,
  AlertCircle,
  Building2
} from 'lucide-react';
import { Language, UserAccount, AttendanceRecord, Employee, AppSettings } from '../types';
import { translations } from '../i18n/translations';
import { findEmployeeById } from '../data/mockEmployees';
import { getCurrentPosition, calculateDistanceMeters } from '../utils/geolocation';

interface StaffPortalProps {
  language: Language;
  currentUser: UserAccount;
  records: AttendanceRecord[];
  onScanNow: (empId: string) => void;
  onOpenScanner: () => void;
  settings: AppSettings;
  onOpenStationQrModal?: () => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({
  language,
  currentUser,
  records,
  onScanNow,
  onOpenScanner,
  settings,
  onOpenStationQrModal
}) => {
  const t = translations[language];

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const employee = findEmployeeById(currentUser.employeeId);

  // GPS Distance Check state for the employee
  const [isCheckingGps, setIsCheckingGps] = useState(false);
  const [gpsCheckResult, setGpsCheckResult] = useState<{
    success: boolean;
    distanceMeters?: number;
    isInside?: boolean;
    message: string;
  } | null>(null);

  // Check employee's distance to office
  const handleCheckMyGps = async () => {
    setIsCheckingGps(true);
    setGpsCheckResult(null);
    try {
      const pos = await getCurrentPosition();
      const office = settings.officeLocation || {
        latitude: 11.5564,
        longitude: 104.9282,
        radiusMeters: 100
      };
      const distance = calculateDistanceMeters(
        pos.coords.latitude,
        pos.coords.longitude,
        office.latitude,
        office.longitude
      );
      const isInside = distance <= office.radiusMeters;
      setGpsCheckResult({
        success: true,
        distanceMeters: Math.round(distance),
        isInside,
        message: isInside
          ? (language === 'km' 
              ? `✅ អ្នកនៅចម្ងាយ ${Math.round(distance)} ម៉ែត្រ — ស្ថិតក្នុងតំបន់អនុញ្ញាត (ក្រោម ${office.radiusMeters}m)!` 
              : `✅ You are ${Math.round(distance)}m away — Inside allowed zone (under ${office.radiusMeters}m)!`)
          : (language === 'km'
              ? `⚠️ អ្នកនៅចម្ងាយ ${Math.round(distance)} ម៉ែត្រ — ក្រៅតំបន់ការិយាល័យ (កម្រិតអនុញ្ញាតត្រឹម ${office.radiusMeters}m)!`
              : `⚠️ You are ${Math.round(distance)}m away — Outside office perimeter (allowed limit ${office.radiusMeters}m)!`)
      });
    } catch (err: any) {
      setGpsCheckResult({
        success: false,
        message: language === 'km' 
          ? `មិនអាចចាប់យក GPS បានឡើយ៖ ${err.message || 'សូមពិនិត្យសិទ្ធិទីតាំង'}` 
          : `Could not acquire GPS: ${err.message || 'Check location permissions'}`
      });
    } finally {
      setIsCheckingGps(false);
    }
  };

  // Generate QR Code for this staff's badge
  useEffect(() => {
    QRCode.toDataURL(currentUser.employeeId, {
      width: 340,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating personal QR:', err));
  }, [currentUser.employeeId]);

  // Today's attendance records for this employee
  const today = new Date().toISOString().split('T')[0];
  const myTodayRecords = records.filter(
    r => r.employeeId === currentUser.employeeId && r.date === today && r.status === 'success'
  );

  const hasCheckIn = myTodayRecords.some(r => r.type === 'check_in');
  const hasCheckOut = myTodayRecords.some(r => r.type === 'check_out');

  let currentStatus: 'not_in' | 'checked_in' | 'completed' = 'not_in';
  if (hasCheckIn && hasCheckOut) {
    currentStatus = 'completed';
  } else if (hasCheckIn && !hasCheckOut) {
    currentStatus = 'checked_in';
  }

  // All attendance records for this employee
  const myAllRecords = records.filter(r => r.employeeId === currentUser.employeeId);

  const downloadQrBadge = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Badge_${currentUser.employeeId}_${currentUser.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-4 z-10">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-300 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                {currentUser.role.toUpperCase()}
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                {currentUser.employeeId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {language === 'km' ? currentUser.nameKhmer : currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200">
              {language === 'km' ? currentUser.titleKhmer : currentUser.title} • {language === 'km' ? currentUser.departmentKhmer : currentUser.department}
            </p>
          </div>
        </div>

        {/* Quick Action Button for Camera Scanner */}
        <div className="z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            id="btn-staff-camera-scanner"
            onClick={onOpenScanner}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-sm cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>{language === 'km' ? '📷 ស្កេន QR ស្ថានីយការិយាល័យ' : '📷 Scan Office Station QR'}</span>
          </button>
        </div>

      </div>

      {/* Office Station & GPS Geofence Info Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {language === 'km' ? 'ស្ថានីយស្កេនរួម & Geofencing ការិយាល័យ' : 'Office Station QR & Geofence Verification'}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {settings.officeLocation?.nameKhmer || settings.officeLocation?.name || 'ការិយាល័យកណ្តាល'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'km' 
                  ? `បុគ្គលិកត្រូវស្កេនលើ QR ស្ថានីយរួម ក្នុងកម្រិតចម្ងាយក្រោម ${settings.officeLocation?.radiusMeters || 100} ម៉ែត្រពីការិយាល័យ`
                  : `Employees scan the shared office QR poster while within ${settings.officeLocation?.radiusMeters || 100}m of the office`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* GPS Distance Checker Button */}
            <button
              type="button"
              id="btn-check-my-gps"
              onClick={handleCheckMyGps}
              disabled={isCheckingGps}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isCheckingGps ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isCheckingGps ? (language === 'km' ? 'កំពុងពិនិត្យ GPS...' : 'Checking GPS...') : (language === 'km' ? '📍 ពិនិត្យចម្ងាយ GPS ខ្ញុំ' : '📍 Check My Distance')}</span>
            </button>

            {/* View Office Management Button */}
            {onOpenStationQrModal && (
              <button
                type="button"
                id="btn-portal-view-station-qr"
                onClick={onOpenStationQrModal}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management'}</span>
              </button>
            )}
          </div>
        </div>

        {/* GPS Check Result Feedback */}
        {gpsCheckResult && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
            !gpsCheckResult.success 
              ? 'bg-rose-50 text-rose-900 border border-rose-200' 
              : gpsCheckResult.isInside 
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' 
                : 'bg-amber-50 text-amber-950 border border-amber-200'
          }`}>
            {!gpsCheckResult.success ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : gpsCheckResult.isInside ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{gpsCheckResult.message}</p>
              {gpsCheckResult.isInside !== undefined && (
                <p className="text-[11px] opacity-80">
                  {gpsCheckResult.isInside
                    ? (language === 'km' ? 'អ្នកអាចបើកកាមេរ៉ាស្កេន QR ស្ថានីយដើម្បី Check-In ឬ Check-Out បានឥឡូវនេះ!' : 'You can scan the station QR now to register attendance!')
                    : (language === 'km' ? 'ប្រព័ន្ធនឹងបដិសេធការស្កេន ប្រសិនបើអ្នកនៅក្រៅបរិវេណការិយាល័យដែលបានកំណត់។' : 'System will block scans if you are beyond the office boundary.')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Digital QR Badge */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-between space-y-5">
          <div className="text-center space-y-1 w-full">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {t.myBadgeTitle}
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {language === 'km' ? currentUser.nameKhmer : currentUser.name}
            </h2>
            <p className="text-xs text-slate-500">
              Show this QR code at any terminal or camera to register attendance
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Personal QR Badge" 
                className="w-56 h-56 rounded-xl bg-white p-2 shadow-sm" 
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
            <p className="font-mono text-base font-bold text-slate-800 tracking-wider mt-3">
              {currentUser.employeeId}
            </p>
          </div>

          {/* Badge Actions */}
          <div className="w-full flex items-center gap-2">
            <button
              id="btn-download-my-badge"
              onClick={downloadQrBadge}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t.downloadBadge}</span>
            </button>

            <button
              id="btn-test-scan-myself"
              onClick={() => onScanNow(currentUser.employeeId)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
              title="Instant attendance check-in/out"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{t.testScanBadge}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Today's Status & Personal History */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Today's Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {t.todayMyStatus}
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {today}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  currentStatus === 'checked_in' 
                    ? 'bg-emerald-600 text-white' 
                    : currentStatus === 'completed'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentStatus === 'checked_in' ? (
                    <LogIn className="w-6 h-6" />
                  ) : currentStatus === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {currentStatus === 'checked_in' 
                      ? (language === 'km' ? 'កំពុងមានវត្តមាន (Checked In)' : 'Currently Checked In')
                      : currentStatus === 'completed'
                        ? (language === 'km' ? 'បានបញ្ចប់វេនថ្ងៃនេះ (Shift Completed)' : 'Daily Attendance Completed')
                        : (language === 'km' ? 'មិនទាន់ស្កេនចូលនៅឡើយ (Not Checked In)' : 'Not Checked In Yet')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {myTodayRecords.length > 0 
                      ? `Last scan at ${myTodayRecords[0].time}`
                      : 'Scan your badge or tap the button to check in'}
                  </p>
                </div>
              </div>

              {/* 1-Click Action Button */}
              {currentStatus !== 'completed' && (
                <button
                  id="btn-portal-record-attendance"
                  onClick={() => onScanNow(currentUser.employeeId)}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs text-white shadow-sm transition-all active:scale-95 ${
                    currentStatus === 'not_in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {currentStatus === 'not_in' ? t.checkIn : t.checkOut}
                </button>
              )}
            </div>
          </div>

          {/* Personal History Logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'km' ? 'ប្រវត្តិនៃការស្កេនផ្ទាល់ខ្លួន' : 'My Recent Attendance Records'}
              </h3>
              <span className="text-xs text-slate-500 font-semibold">
                {myAllRecords.length} records
              </span>
            </div>

            {myAllRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No attendance scans recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {myAllRecords.slice(0, 8).map(r => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.type === 'check_in' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {r.type === 'check_in' ? t.checkIn : t.checkOut}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        {r.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-700">
                        {r.time}
                      </span>
                      {r.syncedToGoogleSheet ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Synced" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Local" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
