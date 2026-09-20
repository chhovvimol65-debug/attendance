import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  MapPin, 
  Download, 
  Printer, 
  ShieldCheck, 
  Compass, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  ExternalLink,
  Sparkles,
  Maximize2,
  Info
} from 'lucide-react';
import { Language, AppSettings } from '../types';
import { 
  getStationQrValue, 
  getCurrentPosition, 
  evaluateGeofence, 
  formatDistance 
} from '../utils/geolocation';

interface StationQrModalProps {
  language: Language;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const StationQrModal: React.FC<StationQrModalProps> = ({
  language,
  settings,
  isOpen,
  onClose,
  onOpenScanner
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [testingLocation, setTestingLocation] = useState(false);
  const [locationResult, setLocationResult] = useState<{
    tested: boolean;
    success: boolean;
    distance?: number;
    message: string;
  } | null>(null);

  const qrValue = getStationQrValue(settings.stationCode);
  const office = settings.officeLocation;

  // Generate High-Res QR Code for Station
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(qrValue, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating station QR:', err));
  }, [isOpen, qrValue]);

  if (!isOpen) return null;

  // Test current device GPS against office geofence
  const handleTestGps = async () => {
    setTestingLocation(true);
    setLocationResult(null);
    try {
      const pos = await getCurrentPosition();
      const res = evaluateGeofence(
        pos.coords.latitude,
        pos.coords.longitude,
        office.latitude,
        office.longitude,
        office.radiusMeters,
        pos.coords.accuracy
      );

      setLocationResult({
        tested: true,
        success: res.inGeofence,
        distance: res.distanceMeters,
        message: res.inGeofence
          ? (language === 'km' 
              ? `អ្នកស្ថិតនៅក្នុងតំបន់អនុញ្ញាត! ចម្ងាយ ${formatDistance(res.distanceMeters)} ពីការិយាល័យ (អនុញ្ញាត ${office.radiusMeters}m)`
              : `Inside geofence! You are ${formatDistance(res.distanceMeters)} from office (allowed ${office.radiusMeters}m).`)
          : (language === 'km'
              ? `ក្រៅតំបន់កំណត់! អ្នកនៅចម្ងាយ ${formatDistance(res.distanceMeters)} ពីការិយាល័យ (អនុញ្ញាតត្រឹម ${office.radiusMeters}m)`
              : `Outside geofence! You are ${formatDistance(res.distanceMeters)} away (allowed: ${office.radiusMeters}m).`)
      });
    } catch (err: any) {
      setLocationResult({
        tested: true,
        success: false,
        message: err.message || (language === 'km' ? 'មិនអាចទាញយក GPS បានឡើយ' : 'Unable to acquire GPS signal')
      });
    } finally {
      setTestingLocation(false);
    }
  };

  // Download Printable Poster
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

    // Header Card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(80, 80, 1040, 1440, 48);
    ctx.fill();

    // Top Header Banner
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.roundRect(80, 80, 1040, 220, [48, 48, 0, 0]);
    ctx.fill();

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ស្ថានីយស្កេនវត្តមានរួម (SHARED STATION)', 600, 170);

    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText('Check-In (ចូល) & Check-Out (ចេញ) ក្នុង QR តែមួយ', 600, 230);

    // Office Location Info
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(office.nameKhmer || office.name, 600, 370);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`GPS Geofence Protected • Allowed Radius: ${office.radiusMeters} Meters`, 600, 420);

    // Draw QR Code
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 325, 480, 550, 550);

      // Border around QR
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(310, 465, 580, 580);

      // Footer Instructions
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('របៀបស្កេនវត្តមានដោយប្រើទូរស័ព្ទ៖', 600, 1140);

      ctx.fillStyle = '#334155';
      ctx.font = '24px sans-serif';
      ctx.fillText('១. បើកកម្មវិធីវត្តមានលើទូរស័ព្ទរបស់អ្នក (Staff Portal)', 600, 1200);
      ctx.fillText('២. ស្កេន QR Code នេះដើម្បី Check-In ឬ Check-Out', 600, 1250);
      ctx.fillText(`៣. ប្រព័ន្ធទាមទារឱ្យស្ថិតនៅចម្ងាយក្រោម ${office.radiusMeters} ម៉ែត្រពីការិយាល័យ`, 600, 1300);

      // Save as PNG
      const link = document.createElement('a');
      link.download = `Company_Station_QR_Poster_${office.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImg.src = qrDataUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{language === 'km' ? 'ស្ថានីយរួមមានសុវត្ថិភាព GPS' : 'GPS-Enforced Station'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'km' ? 'QR Code រួមរបស់ក្រុមហ៊ុន (Single Station QR)' : 'Company Station Shared QR Code'}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            {language === 'km' 
              ? 'បុគ្គលិកទាំងអស់អាចស្កេនចូល (Check-In) និងស្កេនចេញ (Check-Out) ក្នុង QR តែមួយនេះ' 
              : 'All employees check in and check out using this single unified QR code'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Location & Geofence Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {language === 'km' ? office.nameKhmer : office.name}
                </p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Lat: {office.latitude.toFixed(5)}, Lon: {office.longitude.toFixed(5)}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {language === 'km' 
                      ? `កម្រិតបរិវេណអនុញ្ញាត៖ ត្រឹម ${office.radiusMeters} ម៉ែត្រ` 
                      : `Allowed Radius: ${office.radiusMeters} Meters`}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestGps}
              disabled={testingLocation}
              className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs cursor-pointer shrink-0"
            >
              <Compass className={`w-3.5 h-3.5 ${testingLocation ? 'animate-spin' : ''}`} />
              <span>{testingLocation ? (language === 'km' ? 'កំពុងឆែក GPS...' : 'Checking GPS...') : (language === 'km' ? 'តេស្តទីតាំងបច្ចុប្បន្ន' : 'Test My GPS')}</span>
            </button>
          </div>

          {/* Location Test Alert Result */}
          {locationResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              locationResult.success 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {locationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">{locationResult.message}</span>
              </div>
            </div>
          )}

          {/* Big QR Code Card */}
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white rounded-3xl border-2 border-dashed border-indigo-200 space-y-4 shadow-inner">
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img 
                  src={qrDataUrl} 
                  alt="Company Station QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <span className="animate-pulse">{language === 'km' ? 'កំពុងបង្កើត QR...' : 'Generating QR...'}</span>
              </div>
            )}

            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                {language === 'km' ? 'ស្កេនចូល & ស្កេនចេញ រួមក្នុង QR តែមួយ' : 'Universal Check-In & Check-Out QR'}
              </span>
              <p className="text-[11px] text-slate-500">
                Token: <span className="font-mono font-semibold text-slate-700">{settings.stationCode}</span> • {language === 'km' ? 'ការពារការស្កេនក្រៅការិយាល័យ' : 'Strict GPS Perimeter Enabled'}
              </p>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <p className="font-bold">
                {language === 'km' ? '📌 របៀបប្រើប្រាស់ជាក់ស្តែង៖' : '📌 How to use in practice:'}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>
                  {language === 'km' 
                    ? 'ចុចប៊ូតុង "ទាញយករូប Poster" ខាងក្រោម ដើម្បី Print បិទនៅមាត់ទ្វារការិយាល័យ' 
                    : 'Click "Download Poster" below to print and place near the office entrance.'}
                </li>
                <li>
                  {language === 'km' 
                    ? `បុគ្គលិកអាចស្កេនតាមទូរស័ព្ទរបស់ខ្លួនបាន ដរាបណាស្ថិតក្នុងចម្ងាយក្រោម ${office.radiusMeters}m ពីការិយាល័យ` 
                    : `Staff can scan using their own smartphone as long as they are within ${office.radiusMeters}m of the office.`}
                </li>
                <li>
                  {language === 'km' 
                    ? 'ស្កេនលើកទី១ = Check-In (ចូល), ស្កេនលើកទី២ = Check-Out (ចេញ) ដោយស្វ័យប្រវត្តិ!' 
                    : 'First scan = Check-In, Second scan = Check-Out automatically!'}
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadPoster}
              className="w-full sm:flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'km' ? 'ទាញយករូប Poster សម្រាប់ Print' : 'Download Printable Poster'}</span>
            </button>

            {onOpenScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>{language === 'km' ? 'បើកម៉ាស៊ីនស្កេន' : 'Open Scanner'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
