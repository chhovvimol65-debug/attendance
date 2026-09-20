import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  FlipHorizontal, 
  Flashlight, 
  FlashlightOff, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Clock,
  MapPin,
  QrCode,
  Building2,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Language, AppSettings, AttendanceScanResult, UserAccount, AttendanceLocationData } from '../types';
import { translations } from '../i18n/translations';
import { submitAttendanceScan } from '../services/attendanceService';
import { playSuccessChime, playErrorBuzz } from '../utils/audio';
import { INITIAL_EMPLOYEES, findEmployeeById } from '../data/mockEmployees';
import { isStationQrCode, getCurrentPosition } from '../utils/geolocation';

interface ScannerPageProps {
  language: Language;
  settings: AppSettings;
  onScanComplete?: (result: AttendanceScanResult) => void;
  currentUser?: UserAccount;
  onOpenStationQrModal?: () => void;
  onClose?: () => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  language,
  settings,
  onScanComplete,
  currentUser,
  onOpenStationQrModal,
  onClose
}) => {
  const t = translations[language];

  // Camera & Stream states
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Scanning engine states
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Auto-close countdown state after successful scan
  const [autoCloseSeconds, setAutoCloseSeconds] = useState<number | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio feedback toggle
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);

  // Scan Result Modal / Banner
  const [scanResult, setScanResult] = useState<AttendanceScanResult | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isRequestInFlight = useRef(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mutable refs to decouple QR scan loop from rapid state changes (cooldown, scanning)
  const cooldownRemainingRef = useRef(cooldownRemaining);
  cooldownRemainingRef.current = cooldownRemaining;

  const isScanningRef = useRef(isScanning);
  isScanningRef.current = isScanning;

  const handleProcessCodeRef = useRef<(code: string) => void>(() => {});

  // Safe video playback handler preventing AbortError / interrupted play requests
  const playVideoSafely = async (video: HTMLVideoElement) => {
    try {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err: any) {
      // Harmless browser interruption when video stream is reloaded or unmounted
      if (err?.name !== 'AbortError' && !err?.message?.includes('interrupted')) {
        console.warn('Video playback warning:', err);
      }
    }
  };

  // Safely stop all hardware streams, animation loops, timers and invoke onClose
  const handleCloseSafely = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (autoCloseIntervalRef.current) {
      clearInterval(autoCloseIntervalRef.current);
      autoCloseIntervalRef.current = null;
    }
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // 1. Initialize camera devices
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
    } catch (err) {
      console.warn('Error enumerating cameras:', err);
    }
  }, []);

  // 2. Start Camera Stream
  const startCamera = useCallback(async () => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true'); // Required for iOS Safari
        video.onloadedmetadata = () => {
          playVideoSafely(video);
        };
        await playVideoSafely(video);
      }

      // Check for torch/flashlight capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
        setHasTorchSupport(Boolean(capabilities.torch));
      }

      // Refresh camera devices list quietly
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          setCameraDevices(videoInputs);
        }
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      console.warn('Primary camera init failed, attempting fallback constraints:', err);
      try {
        // Fallback without exact constraints
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.onloadedmetadata = () => {
            playVideoSafely(video);
          };
          await playVideoSafely(video);
        }
      } catch (fatalErr: any) {
        // Ignore harmless play interruptions
        if (fatalErr?.name === 'AbortError' || fatalErr?.message?.includes('interrupted')) {
          return;
        }
        console.error('Unable to access camera:', fatalErr);
        setHasCameraPermission(false);
      }
    }
  }, [facingMode, selectedDeviceId]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorchSupport) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setIsTorchOn(nextTorch);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  // Switch Front/Back Camera
  const switchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedDeviceId(''); // clear exact device id to allow facing mode switch
  };

  // 3. QR Detection Frame Loop (stable reference using mutable refs)
  const scanQrFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      scanLoopRef.current = requestAnimationFrame(scanQrFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Video must be ready with dimensions
    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Only scan if not in cooldown and no request in flight
      if (!isRequestInFlight.current && cooldownRemainingRef.current <= 0 && isScanningRef.current) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data && code.data.trim()) {
          // Detected a QR code!
          handleProcessCodeRef.current(code.data);
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(scanQrFrame);
  }, []);

  // 4. Main Attendance Processor
  const handleProcessCode = async (rawCode: string) => {
    // State guard: prevent concurrent requests
    if (isRequestInFlight.current || cooldownRemaining > 0) return;

    isRequestInFlight.current = true;
    setIsProcessing(true);

    try {
      // 1. Detect if the scanned code is a shared Station QR
      const isStation = isStationQrCode(rawCode);
      let targetEmployeeId = rawCode.trim();
      let targetFullName: string | undefined;

      if (isStation) {
        if (currentUser?.employeeId) {
          targetEmployeeId = currentUser.employeeId;
          targetFullName = currentUser.name;
        } else {
          // If no logged in employee, pick first or prompt
          const defaultEmp = INITIAL_EMPLOYEES[0];
          targetEmployeeId = defaultEmp.id;
          targetFullName = defaultEmp.fullName;
        }
      } else {
        const employee = findEmployeeById(rawCode);
        targetEmployeeId = employee ? employee.id : rawCode.trim();
        targetFullName = employee ? employee.fullName : undefined;
      }

      // 2. Read GPS coordinates if Geofencing is enabled or Station QR is scanned
      let locationData: AttendanceLocationData | undefined;
      if (settings.geofenceEnabled || isStation) {
        try {
          const pos = await getCurrentPosition({ timeout: 4500, enableHighAccuracy: true });
          locationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
        } catch (locErr: any) {
          console.warn('GPS reading failed for attendance check:', locErr);
        }
      }

      const result = await submitAttendanceScan({
        employeeId: targetEmployeeId,
        fullName: targetFullName,
        location: locationData
      });

      // Provide Audio & Visual feedback
      if (result.success) {
        if (soundEnabled) {
          playSuccessChime();
        }
      } else {
        if (soundEnabled) {
          playErrorBuzz();
        }
      }

      setScanResult(result);
      if (onScanComplete) {
        onScanComplete(result);
      }

      // Auto-close feature: When scan succeeds and onClose is provided, close automatically!
      if (result.success && onClose) {
        setIsScanning(false);
        setAutoCloseSeconds(2);

        if (autoCloseIntervalRef.current) clearInterval(autoCloseIntervalRef.current);
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);

        let countdown = 2;
        autoCloseIntervalRef.current = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            if (autoCloseIntervalRef.current) clearInterval(autoCloseIntervalRef.current);
            setAutoCloseSeconds(0);
          } else {
            setAutoCloseSeconds(countdown);
          }
        }, 1000);

        autoCloseTimerRef.current = setTimeout(() => {
          handleCloseSafely();
        }, 2000);
      } else {
        // Start cooldown countdown for retry
        const cooldownSec = settings.cooldownSeconds || 3;
        setCooldownRemaining(cooldownSec);

        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
        }

        cooldownTimerRef.current = setInterval(() => {
          setCooldownRemaining(prev => {
            if (prev <= 1) {
              if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

    } catch (err: any) {
      console.error('Scan submission error:', err);
      if (soundEnabled) {
        playErrorBuzz();
      }
      setScanResult({
        success: false,
        code: 'SERVER_ERROR',
        message: err.message || t.error_SERVER_ERROR,
        requestId: crypto.randomUUID(),
        employeeId: rawCode,
        fullName: rawCode,
        timestamp: new Date().toISOString()
      });
    } finally {
      isRequestInFlight.current = false;
      setIsProcessing(false);
    }
  };

  // Keep handleProcessCode reference synced
  useEffect(() => {
    handleProcessCodeRef.current = handleProcessCode;
  });

  // Lifecycle: Mount Camera & Scan Loop
  useEffect(() => {
    startCamera();
    scanLoopRef.current = requestAnimationFrame(scanQrFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      if (autoCloseIntervalRef.current) {
        clearInterval(autoCloseIntervalRef.current);
      }
    };
  }, [startCamera, scanQrFrame]);

  // Translate error message
  const getErrorMessage = (code: string, fallback: string): string => {
    const key = `error_${code}` as keyof typeof t;
    if (t[key]) {
      return t[key] as string;
    }
    return fallback || t.error_GENERIC;
  };

  // Cancel / Skip cooldown immediately
  const handleSkipCooldown = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setCooldownRemaining(0);
    isRequestInFlight.current = false;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Title & Guidance Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t.scannerTitle}
            </h1>
            {onClose && (
              <button
                type="button"
                id="btn-close-scanner-title"
                onClick={handleCloseSafely}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                title={language === 'km' ? 'បិទការស្កេន ត្រឡប់ក្រោយ' : 'Close scanner & go back'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'km' ? 'បិទ (មិនស្កេន)' : 'Close'}</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
            {t.scannerSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Geofence Status Badge */}
          {settings.geofenceEnabled && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs"
              title={`Office: ${settings.officeLocation?.nameKhmer || 'Head Office'} (Radius: ${settings.officeLocation?.radiusMeters || 100}m)`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {language === 'km' 
                  ? `Geofence សកម្ម (កាំ ${settings.officeLocation?.radiusMeters || 100}m)` 
                  : `Geofence Active (${settings.officeLocation?.radiusMeters || 100}m)`}
              </span>
            </div>
          )}

          {/* Prominent Header Close Button */}
          {onClose && (
            <button
              type="button"
              id="btn-close-scanner-header"
              onClick={handleCloseSafely}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
              title={language === 'km' ? 'បិទប្រសិនបើមិនចង់ Scan' : 'Close scanner if you do not want to scan'}
            >
              <X className="w-4 h-4" />
              <span>
                {language === 'km' ? 'បិទការស្កេន' : 'Close Scanner'}
              </span>
            </button>
          )}

          {/* Open Office Management / Station QR Button */}
          {onOpenStationQrModal && (
            <button
              type="button"
              id="btn-open-station-qr"
              onClick={onOpenStationQrModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {language === 'km' ? 'គ្រប់គ្រងការិយាល័យ' : 'Office Management'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scanner Card */}
      <div className="relative bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        
        {/* Top Control Bar over Camera */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          
          {/* Status Indicator */}
          <div 
            onClick={cooldownRemaining > 0 ? handleSkipCooldown : undefined}
            title={cooldownRemaining > 0 ? (language === 'km' ? 'ចុចដើម្បីរំលង និងស្កេនភ្លាមៗ' : 'Click to skip cooldown') : undefined}
            className={`flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-white transition-all ${
              cooldownRemaining > 0 ? 'cursor-pointer hover:bg-black/90 hover:border-amber-400/60' : ''
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              isProcessing 
                ? 'bg-amber-400 animate-pulse' 
                : cooldownRemaining > 0 
                  ? 'bg-orange-400' 
                  : 'bg-emerald-400 animate-ping'
            }`} />
            <span>
              {isProcessing 
                ? t.processing 
                : cooldownRemaining > 0 
                  ? `${t.scanCooldown} (${cooldownRemaining}s)` 
                  : t.readyToScan}
            </span>
            {cooldownRemaining > 0 && (
              <span className="text-[10px] bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 px-1.5 py-0.5 rounded-full font-bold ml-1">
                {language === 'km' ? 'រំលង ⚡' : 'Skip ⚡'}
              </span>
            )}
          </div>

          {/* Action Buttons: Sound, Torch, Camera Flip & Direct Close Button */}
          <div className="flex items-center gap-2">
            
            {/* Audio Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
              title={soundEnabled ? t.audioEnabled : t.audioDisabled}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Flashlight Torch Button */}
            {hasTorchSupport && (
              <button
                id="btn-toggle-torch"
                onClick={toggleTorch}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title={isTorchOn ? t.torchOff : t.torchOn}
              >
                {isTorchOn ? <Flashlight className="w-4 h-4 text-amber-300" /> : <FlashlightOff className="w-4 h-4 text-slate-300" />}
              </button>
            )}

            {/* Camera Switch Button */}
            <button
              id="btn-switch-camera"
              onClick={switchCamera}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
              title={facingMode === 'environment' ? t.frontCamera : t.backCamera}
            >
              <FlipHorizontal className="w-4 h-4 text-white" />
            </button>

            {/* Direct Close Button on Camera Viewfinder */}
            {onClose && (
              <button
                id="btn-close-camera-viewfinder"
                type="button"
                onClick={handleCloseSafely}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 backdrop-blur-md text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer border border-rose-400/40 ml-1"
                title={language === 'km' ? 'បិទប្រអប់ស្កេន' : 'Close Scan Box'}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">{language === 'km' ? 'បិទ' : 'Close'}</span>
              </button>
            )}

          </div>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-slate-900 flex items-center justify-center overflow-hidden">
          
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Hidden Canvas for QR Code Extraction */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Box Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-indigo-400/50 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              
              {/* Glowing Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              {isScanning && !cooldownRemaining && !isProcessing && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-laser pointer-events-none" />
              )}

              {/* Cooldown Overlay inside the box */}
              {cooldownRemaining > 0 && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-white gap-2 p-3 pointer-events-auto z-10">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <span className="text-sm font-bold tracking-wide text-amber-300 block">
                      {cooldownRemaining}s
                    </span>
                    <span className="text-[10px] text-slate-300 block">
                      {language === 'km' ? 'ផ្អាកការពារស្កេនជាន់គ្នា' : 'Anti-duplicate delay'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipCooldown}
                    className="mt-1 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-full shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {language === 'km' ? '⚡ ស្កេនភ្លាមៗ (Skip)' : '⚡ Scan Now (Skip)'}
                  </button>
                </div>
              )}

              {/* Processing Overlay inside the box */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-white gap-2">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="text-xs font-semibold text-indigo-200">
                    {t.processing}
                  </span>
                </div>
              )}

              {/* Auto-closing Celebration Overlay inside the reticle */}
              {scanResult?.success && autoCloseSeconds !== null && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white gap-2 p-3.5 pointer-events-auto z-20 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-bounce">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white block">
                      {scanResult.action === 'check_in' 
                        ? (language === 'km' ? 'កត់ត្រាវត្តមានចូលជោគជ័យ!' : 'Check-In Recorded!')
                        : (language === 'km' ? 'កត់ត្រាវត្តមានចេញជោគជ័យ!' : 'Check-Out Recorded!')}
                    </span>
                    <span className="text-xs text-emerald-200 font-semibold block">
                      {scanResult.fullName} ({scanResult.employeeId})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/90 border border-emerald-400/40 text-[11px] font-semibold text-emerald-200 mt-0.5">
                    <Clock className="w-3 h-3 animate-spin text-emerald-300" />
                    <span>
                      {language === 'km' 
                        ? `កំពុងបិទស្វ័យប្រវត្តិក្នង ${autoCloseSeconds}s...` 
                        : `Auto-closing in ${autoCloseSeconds}s...`}
                    </span>
                  </div>
                  {onClose && (
                    <button
                      type="button"
                      onClick={handleCloseSafely}
                      className="mt-1 px-3.5 py-1 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-full shadow transition-all cursor-pointer active:scale-95"
                    >
                      {language === 'km' ? 'បិទឥឡូវនេះ' : 'Close Now'}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Camera Permission Denied or Unavailable Banner */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 z-30 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-semibold text-base sm:text-lg text-white">
                  {t.cameraPermissionDenied}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'km' 
                    ? 'សូមបើកសិទ្ធិប្រើប្រាស់កាមេរ៉ាក្នុងកម្មវិធីរុករក (Browser) របស់អ្នកដើម្បីស្កេន QR កូដ។'
                    : 'Please grant camera permissions in your browser bar to scan QR codes.'}
                </p>
              </div>
              <button
                id="btn-retry-camera"
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all"
              >
                {t.requestCamera}
              </button>
            </div>
          )}

          {/* Bottom Viewfinder Hint */}
          <div className="absolute bottom-3 inset-x-0 z-10 text-center pointer-events-none">
            <span className="text-xs font-medium text-white/80 bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-white/10">
              {t.scanGuidance}
            </span>
          </div>

        </div>

        {/* Camera Selector Dropdown if multiple cameras available */}
        {cameraDevices.length > 1 && (
          <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{t.switchCamera}:</span>
            <select
              id="select-camera-device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Default ({facingMode})</option>
              {cameraDevices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

      </div>

      {/* Quick Cancel & Not Scanning Button */}
      {onClose && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            id="btn-cancel-scan-bottom"
            type="button"
            onClick={handleCloseSafely}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            title={language === 'km' ? 'បិទប្រសិនបើមិនចង់ Scan' : 'Close if you do not want to scan'}
          >
            <X className="w-4 h-4" />
            <span>
              {language === 'km' ? 'មិនចង់ Scan ទេ? ចុចទីនេះដើម្បីបិទ' : 'Do not want to scan? Click here to close'}
            </span>
          </button>
        </div>
      )}

      {/* Visual Feedback Result Banner (Success / Error) */}
      {scanResult && (
        <div 
          id="scan-result-banner"
          className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-lg animate-in fade-in slide-in-from-top duration-300 ${
            scanResult.success 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                scanResult.success 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-rose-600 text-white'
              }`}>
                {scanResult.success ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <AlertCircle className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold">
                    {scanResult.success ? (
                      scanResult.action === 'check_in' 
                        ? (language === 'km' ? t.checkInSuccessKhmer : t.checkInSuccess)
                        : (language === 'km' ? t.checkOutSuccessKhmer : t.checkOutSuccess)
                    ) : (
                      getErrorMessage(scanResult.code, scanResult.message)
                    )}
                  </h3>
                  
                  {scanResult.success && (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      scanResult.action === 'check_in' 
                        ? 'bg-emerald-200 text-emerald-800' 
                        : 'bg-indigo-200 text-indigo-800'
                    }`}>
                      {scanResult.action === 'check_in' ? t.checkIn : t.checkOut}
                    </span>
                  )}
                </div>

                {/* Employee Info Card when successful */}
                {scanResult.success && (
                  <div className="text-xs sm:text-sm text-emerald-800 space-y-0.5">
                    <p className="font-semibold text-emerald-900">
                      {scanResult.fullName} <span className="text-emerald-700 font-mono">({scanResult.employeeId})</span>
                    </p>
                    <p className="text-emerald-700">
                      {scanResult.department && `${t.department}: ${scanResult.department} • `}
                      {t.timeRecorded}: {new Date(scanResult.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-mono">
                      {t.requestId}: {scanResult.requestId.slice(0, 18)}...
                    </p>
                  </div>
                )}

                {/* Auto Close status badge */}
                {scanResult.success && autoCloseSeconds !== null && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                      <Clock className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>
                        {language === 'km' 
                          ? `ប្រអប់ Scan នឹងបិទវិញស្វ័យប្រវត្តិក្នង ${autoCloseSeconds} វិនាទី...` 
                          : `Scan box will close automatically in ${autoCloseSeconds}s...`}
                      </span>
                    </div>
                    {onClose && (
                      <button
                        type="button"
                        onClick={handleCloseSafely}
                        className="text-xs font-bold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                      >
                        {language === 'km' ? 'បិទឥឡូវនេះ' : 'Close Now'}
                      </button>
                    )}
                  </div>
                )}

                {/* Error Details */}
                {!scanResult.success && (
                  <div className="space-y-1.5">
                    <p className="text-xs sm:text-sm font-medium text-rose-800">
                      {scanResult.message || getErrorMessage(scanResult.code, '')}
                    </p>
                    {scanResult.code === 'GEOFENCE_VIOLATION' && (
                      <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300/80 text-xs text-rose-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-700" />
                          <span>{language === 'km' ? 'លក្ខខណ្ឌទីតាំង Geofencing' : 'Geofence Boundary Requirement'}</span>
                        </div>
                        <p className="text-[11px] text-rose-800">
                          {language === 'km'
                            ? `បុគ្គលិកត្រូវតែស្ថិតនៅក្នុងបរិវេណ ${settings.officeLocation?.nameKhmer || 'ការិយាល័យ'} (ចម្ងាយមិនលើសពី ${settings.officeLocation?.radiusMeters || 100} ម៉ែត្រ) ដើម្បីអាចស្កេនវត្តមានបាន។`
                            : `Employees must be within ${settings.officeLocation?.name || 'the office'} perimeter (under ${settings.officeLocation?.radiusMeters || 100}m) to scan attendance.`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              id="btn-dismiss-scan-result"
              onClick={() => {
                if (scanResult.success && onClose) {
                  handleCloseSafely();
                } else {
                  setScanResult(null);
                }
              }}
              className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0 cursor-pointer ${
                scanResult.success ? 'text-emerald-700' : 'text-rose-700'
              }`}
              title={scanResult.success ? (language === 'km' ? 'បិទ' : 'Close') : (language === 'km' ? 'បិទសារ' : 'Dismiss')}
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
