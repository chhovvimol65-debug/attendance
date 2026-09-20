import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Building2, 
  MapPin, 
  QrCode, 
  Download, 
  Printer, 
  LocateFixed, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  Compass, 
  Camera, 
  Save, 
  Sparkles, 
  Clock, 
  Radio, 
  Navigation
} from 'lucide-react';
import { Language, AppSettings, UserAccount } from '../types';
import { translations } from '../i18n/translations';
import { 
  getStationQrValue, 
  getCurrentPosition, 
  calculateDistanceMeters, 
  evaluateGeofence, 
  formatDistance 
} from '../utils/geolocation';

interface OfficeManagementProps {
  language: Language;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  currentUser: UserAccount;
  onOpenScanner: () => void;
}

export const OfficeManagement: React.FC<OfficeManagementProps> = ({
  language,
  settings,
  onUpdateSettings,
  currentUser,
  onOpenScanner
}) => {
  const t = translations[language];
  const office = settings.officeLocation;

  // Local form state for office geofencing configuration
  const [geofenceEnabled, setGeofenceEnabled] = useState(settings.geofenceEnabled ?? true);
  const [officeNameKhmer, setOfficeNameKhmer] = useState(office?.nameKhmer || 'ការិយាល័យកណ្តាល');
  const [officeNameEn, setOfficeNameEn] = useState(office?.name || 'Headquarters Office');
  const [latitude, setLatitude] = useState(office?.latitude ?? 11.5564);
  const [longitude, setLongitude] = useState(office?.longitude ?? 104.9282);
  const [radiusMeters, setRadiusMeters] = useState(office?.radiusMeters ?? 100);
  const [stationCode, setStationCode] = useState(settings.stationCode || 'HQ_MAIN');

  // Operational states
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectMessage, setGpsDetectMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Live GPS Distance Tester state
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [gpsTestResult, setGpsTestResult] = useState<{
    tested: boolean;
    success: boolean;
    distance?: number;
    accuracy?: number;
    message: string;
  } | null>(null);

  const qrValue = getStationQrValue(stationCode);

  // Live Clock (Phnom Penh time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(language === 'km' ? 'km-KH' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  // Generate High-Res QR Code for Station
  useEffect(() => {
    QRCode.toDataURL(qrValue, {
      width: 520,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating office station QR:', err));
  }, [qrValue]);

  // Auto-detect current device GPS
  const handleDetectCurrentGps = async () => {
    setIsDetectingGps(true);
    setGpsDetectMessage(null);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 6000 });
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lon = Number(pos.coords.longitude.toFixed(6));
      setLatitude(lat);
      setLongitude(lon);
      setGpsDetectMessage({
        success: true,
        text: language === 'km' 
          ? `ចាប់យកទីតាំង GPS បានជោគជ័យ! (ភាពសុក្រឹត ±${Math.round(pos.coords.accuracy)}m)`
          : `Office GPS acquired successfully! (Accuracy ±${Math.round(pos.coords.accuracy)}m)`
      });
      setTimeout(() => setGpsDetectMessage(null), 5000);
    } catch (err: any) {
      setGpsDetectMessage({
        success: false,
        text: language === 'km' 
          ? `មិនអាចចាប់យក GPS បានឡើយ៖ ${err.message || 'សូមពិនិត្យសិទ្ធិកាមេរ៉ា និងទីតាំង'}`
          : `Could not acquire GPS: ${err.message || 'Check location permissions'}`
      });
      setTimeout(() => setGpsDetectMessage(null), 6000);
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Test live GPS against geofence
  const handleTestLiveGps = async () => {
    setIsTestingGps(true);
    setGpsTestResult(null);
    try {
      const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      const res = evaluateGeofence(
        pos.coords.latitude,
        pos.coords.longitude,
        latitude,
        longitude,
        radiusMeters,
        pos.coords.accuracy
      );

      setGpsTestResult({
        tested: true,
        success: res.inGeofence,
        distance: res.distanceMeters,
        accuracy: pos.coords.accuracy,
        message: res.inGeofence
          ? (language === 'km' 
              ? `✅ ស្ថិតក្នុងតំបន់អនុញ្ញាត! ចម្ងាយ ${formatDistance(res.distanceMeters)} ពីការិយាល័យ (កម្រិតអនុញ្ញាត ${radiusMeters} ម៉ែត្រ)`
              : `✅ Inside Allowed Zone! You are ${formatDistance(res.distanceMeters)} from office (radius limit ${radiusMeters}m).`)
          : (language === 'km'
              ? `⚠️ ក្រៅតំបន់ការិយាល័យ! ចម្ងាយ ${formatDistance(res.distanceMeters)} (លើសកម្រិតកំណត់ ${radiusMeters} ម៉ែត្រ)`
              : `⚠️ Outside Office Zone! You are ${formatDistance(res.distanceMeters)} away (exceeds ${radiusMeters}m limit).`)
      });
    } catch (err: any) {
      setGpsTestResult({
        tested: true,
        success: false,
        message: err.message || (language === 'km' ? 'មិនអាចទាញយក GPS បានឡើយ' : 'Unable to acquire GPS signal')
      });
    } finally {
      setIsTestingGps(false);
    }
  };

  // Save Office Location Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      geofenceEnabled,
      officeLocation: {
        name: officeNameEn.trim() || 'Headquarters Office',
        nameKhmer: officeNameKhmer.trim() || 'ការិយាល័យកណ្តាល',
        latitude: Number(latitude) || 11.5564,
        longitude: Number(longitude) || 104.9282,
        radiusMeters: Number(radiusMeters) || 100
      },
      stationCode: stationCode.trim() || 'HQ_MAIN'
    };

    onUpdateSettings(updated);
    setSaveSuccessMessage(
      language === 'km' 
        ? 'បានរក្សាទុកការកំណត់ការិយាល័យ និង Geofence ដោយជោគជ័យ!' 
        : 'Office location and geofence settings saved successfully!'
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Download High-Resolution Poster
  const handleDownloadPoster = () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1600);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Header Badge Card
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.roundRect(100, 80, 1000, 140, 24);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px "Kantumruy Pro", "Battambang", sans-serif';
    ctx.fillText('ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក', 600, 140);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#e0e7ff';
    ctx.fillText('SMART QR ATTENDANCE TERMINAL', 600, 185);

    // Office Location Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Kantumruy Pro", sans-serif';
    ctx.fillText(officeNameKhmer || 'ការិយាល័យកណ្តាល', 600, 290);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`GPS GEOFENCE ZONE (RADIUS: ${radiusMeters}M)`, 600, 330);

    // QR Card Background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(220, 380, 760, 760, 36);
    ctx.fill();

    // Draw QR Code
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 260, 420, 680, 680);

      // Footer Box
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.roundRect(100, 1180, 1000, 340, 24);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "Kantumruy Pro", sans-serif';
      ctx.fillText('ស្កេនចូល (Check-In) / ស្កេនចេញ (Check-Out)', 600, 1250);

      ctx.font = '24px "Kantumruy Pro", sans-serif';
      ctx.fillStyle = '#c7d2fe';
      ctx.fillText('សូមបើកកាមេរ៉ាស្កេនទូរស័ព្ទដៃរបស់លោកអ្នក ដើម្បីកត់ត្រាវត្តមាន', 600, 1310);
      ctx.fillText('Scan this QR code with your mobile camera to register attendance', 600, 1355);

      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#818cf8';
      ctx.fillText(`STATION TOKEN: ${stationCode} • LAT: ${latitude} • LON: ${longitude}`, 600, 1440);

      // Trigger download
      const link = document.createElement('a');
      link.download = `office-qr-station-${stationCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management'}
              </h1>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                geofenceEnabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {geofenceEnabled 
                  ? (language === 'km' ? 'Geofence សកម្ម' : 'Geofence Active') 
                  : (language === 'km' ? 'Geofence បិទ' : 'Geofence Disabled')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {language === 'km' 
                ? 'កំណត់ទីតាំង GPS ការិយាល័យ, គ្រប់គ្រងកម្រិតចម្ងាយអនុញ្ញាត និងផ្ទាំង QR ស្ថានីយរួម' 
                : 'Configure office GPS geofence, boundary radius, and shared station QR poster'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-office-open-scanner"
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>{language === 'km' ? 'សាកល្បងស្កេន' : 'Test Scanner'}</span>
          </button>

          <button
            type="button"
            id="btn-office-print-poster"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'km' ? 'បោះពុម្ពផ្ទាំង (Print)' : 'Print Poster'}</span>
          </button>

          <button
            type="button"
            id="btn-office-download-png"
            onClick={handleDownloadPoster}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'km' ? 'ទាញយក PNG' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{saveSuccessMessage}</span>
        </div>
      )}

      {/* 2. Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: The Official Shared Station QR Poster (Desktop: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
            
            {/* Ambient background glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>{language === 'km' ? 'QR ស្ថានីយរួមការិយាល័យ' : 'Shared Office Station'}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
              {officeNameKhmer || 'ការិយាល័យកណ្តាល'}
            </h2>
            <p className="text-xs text-indigo-200/80 mb-5">
              {officeNameEn || 'Headquarters Office'} • {radiusMeters}m Geofence
            </p>

            {/* Printable QR Container */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-indigo-400/20 max-w-[280px] sm:max-w-[320px] w-full aspect-square flex items-center justify-center mb-5">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Office Station QR Code" 
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl text-slate-400">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
              )}
            </div>

            {/* Single QR Dual Action Info */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-xs space-y-1.5 mb-4">
              <div className="flex items-center justify-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{language === 'km' ? 'ស្កេនចូល (Check-In) / ចេញ (Check-Out)' : 'Check-In & Check-Out Supported'}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {language === 'km' 
                  ? 'បុគ្គលិកទាំងអស់អាចស្កេនលើ QR តែមួយនេះដោយប្រើទូរស័ព្ទដៃរបស់ខ្លួន' 
                  : 'All employees scan this single poster to automatically log attendance'}
              </p>
            </div>

            {/* Phnom Penh Clock */}
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'ម៉ោងកម្ពុជា៖' : 'Cambodia Time:'} {currentTime}</span>
            </div>

            {/* Security Token identifier */}
            <div className="mt-3 text-[10px] font-mono text-slate-400">
              TOKEN: {stationCode} • ACCURACY GEOFENCE
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Configuration & Distance Verifier (Desktop: 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* A. Geofence Configuration Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'km' ? 'ការកំណត់ទីតាំង GPS & Geofence' : 'GPS Coordinates & Geofencing'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'km' ? 'កំណត់ព្រំប្រទល់ការិយាល័យ និងកម្រិតអនុញ្ញាតឱ្យស្កេន' : 'Define office coordinates and maximum scanning distance'}
                  </p>
                </div>
              </div>

              {/* Geofence Toggle Switch */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {geofenceEnabled 
                    ? (language === 'km' ? 'បើកដំណើរការ' : 'Active') 
                    : (language === 'km' ? 'បិទដំណើរការ' : 'Disabled')}
                </span>
                <button
                  type="button"
                  id="toggle-geofence-switch"
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

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Office Name (Khmer) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'km' ? 'ឈ្មោះការិយាល័យ (ភាសាខ្មែរ)' : 'Office Name (Khmer)'}
                  </label>
                  <input
                    type="text"
                    value={officeNameKhmer}
                    onChange={(e) => setOfficeNameKhmer(e.target.value)}
                    placeholder="ការិយាល័យកណ្តាល (Headquarters)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Office Name (English) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'km' ? 'ឈ្មោះការិយាល័យ (អង់គ្លេស)' : 'Office Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={officeNameEn}
                    onChange={(e) => setOfficeNameEn(e.target.value)}
                    placeholder="Headquarters Office"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Latitude */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Latitude (រយៈទទឹង GPS)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Longitude */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Longitude (រយៈបណ្តោយ GPS)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Radius in Meters */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      {language === 'km' ? 'កម្រិតចម្ងាយអនុញ្ញាត (Radius)' : 'Allowed Radius (Radius)'}
                    </label>
                    <span className="text-xs font-bold text-indigo-600">{radiusMeters} ម៉ែត្រ (m)</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={1000}
                    step={10}
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>20m (ក្នុងបន្ទប់)</span>
                    <span>100m (ស្តង់ដារ)</span>
                    <span>500m (បរិវេណធំ)</span>
                    <span>1000m</span>
                  </div>
                </div>

                {/* Station Token */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'km' ? 'កូដសម្ងាត់ស្ថានីយ (Station Token)' : 'Station Token'}
                  </label>
                  <input
                    type="text"
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value)}
                    placeholder="HQ_MAIN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* GPS Auto-detection & Map link */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="btn-detect-current-office-gps"
                    onClick={handleDetectCurrentGps}
                    disabled={isDetectingGps}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <LocateFixed className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>
                      {isDetectingGps 
                        ? (language === 'km' ? 'កំពុងចាប់យក GPS...' : 'Detecting GPS...') 
                        : (language === 'km' ? '📍 ចាប់យកទីតាំងបច្ចុប្បន្ន (Auto-Detect GPS)' : '📍 Auto-Detect Office GPS')}
                    </span>
                  </button>

                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </a>
                </div>

                <button
                  type="submit"
                  id="btn-save-office-settings"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer justify-center"
                >
                  <Save className="w-4 h-4" />
                  <span>{language === 'km' ? 'រក្សាទុកការកំណត់ការិយាល័យ' : 'Save Office Settings'}</span>
                </button>
              </div>

              {/* Feedback Message */}
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
            </form>
          </div>

          {/* B. Live GPS Distance Verification Tool */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'km' ? 'ឧបករណ៍តេស្តចម្ងាយ GPS ជាក់ស្តែង' : 'Live Geofence Distance Tester'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'km' 
                      ? 'សាកល្បងពិនិត្យមើលថាតើឧបករណ៍របស់អ្នកស្ថិតក្នុងរង្វង់អនុញ្ញាតស្កេនដែរឬទេ' 
                      : 'Test if your current device location would pass or fail attendance geofence'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-test-live-geofence"
                onClick={handleTestLiveGps}
                disabled={isTestingGps}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <LocateFixed className={`w-4 h-4 ${isTestingGps ? 'animate-spin' : ''}`} />
                <span>{isTestingGps ? (language === 'km' ? 'កំពុងគណនា...' : 'Testing...') : (language === 'km' ? 'តេស្តចម្ងាយឥឡូវនេះ' : 'Test My Distance')}</span>
              </button>
            </div>

            {/* Test Result Display */}
            {gpsTestResult ? (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
                gpsTestResult.success
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                  : 'bg-rose-50 text-rose-950 border-rose-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {gpsTestResult.success ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{gpsTestResult.message}</span>
                </div>

                {gpsTestResult.distance !== undefined && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                    <div>
                      <span className="text-slate-500">ចម្ងាយជាក់ស្តែង (Distance):</span>{' '}
                      <span className="font-bold font-mono text-slate-800">{formatDistance(gpsTestResult.distance)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">កម្រិតកំណត់ (Limit):</span>{' '}
                      <span className="font-bold font-mono text-slate-800">{radiusMeters} ម៉ែត្រ (m)</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Radio className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {language === 'km' 
                    ? `ចុចប៊ូតុង "តេស្តចម្ងាយឥឡូវនេះ" ដើម្បីផ្ទៀងផ្ទាត់ GPS របស់អ្នកធៀបនឹងកូអរដោនេការិយាល័យ (${latitude}, ${longitude})។`
                    : `Click "Test My Distance" to verify your device location against office coordinates (${latitude}, ${longitude}).`}
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
