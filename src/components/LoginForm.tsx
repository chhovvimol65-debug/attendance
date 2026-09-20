import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import jsQR from 'jsqr';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  QrCode, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Building2, 
  HelpCircle, 
  RefreshCw, 
  Languages, 
  Shield, 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Upload, 
  Flashlight, 
  FlashlightOff,
  Sparkles,
  Info
} from 'lucide-react';
import { Language, UserAccount, UserRole } from '../types';
import { translations } from '../i18n/translations';
import { USER_PROFILES, getStoredEmployees } from '../data/mockEmployees';
import { playSuccessChime, playErrorBuzz } from '../utils/audio';

interface LoginFormProps {
  isOpen?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onLogin: (user: UserAccount, rememberMe: boolean) => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  currentUser?: UserAccount;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  isOpen = true,
  isModal = false,
  onClose,
  onLogin,
  language,
  setLanguage,
  currentUser
}) => {
  const t = translations[language];

  // Tab: 'qr' (Scan HR QR Badge) is primary as requested; 'credentials' for password
  const [activeTab, setActiveTab] = useState<'qr' | 'credentials'>('qr');

  // Form states for password authentication
  const [identifier, setIdentifier] = useState<string>('EMP-1001');
  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('attendance_remember_me') !== 'false';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // QR Camera Scanner states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [manualBadgeId, setManualBadgeId] = useState<string>('');
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form IDs for accessibility
  const identifierId = useId();
  const passwordId = useId();
  const rememberMeId = useId();
  const manualBadgeIdField = useId();

  // Switch Language
  const toggleLanguage = () => {
    if (!setLanguage) return;
    const nextLang: Language = language === 'en' ? 'km' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('attendance_lang', nextLang);
  };

  // Find user by identifier or scanned code (Employee ID, email, or name)
  const authenticateUser = useCallback((ident: string): UserAccount | null => {
    const cleanIdent = ident.trim().toLowerCase();
    if (!cleanIdent) return null;

    // 1. Check predefined USER_PROFILES
    const matchedProfile = USER_PROFILES.find(u => 
      u.employeeId.toLowerCase() === cleanIdent ||
      u.name.toLowerCase().includes(cleanIdent) ||
      u.id.toLowerCase() === cleanIdent ||
      cleanIdent === u.employeeId.toLowerCase()
    );
    if (matchedProfile) return matchedProfile;

    // 2. Check stored employee database (HR issued employees)
    const allEmployees = getStoredEmployees();
    const matchedEmp = allEmployees.find(e => 
      e.id.toLowerCase() === cleanIdent ||
      (e.email && e.email.toLowerCase() === cleanIdent) ||
      e.fullName.toLowerCase() === cleanIdent ||
      (e.fullNameKhmer && e.fullNameKhmer.toLowerCase() === cleanIdent)
    );

    if (matchedEmp) {
      return {
        id: `usr-${matchedEmp.id.toLowerCase()}`,
        employeeId: matchedEmp.id,
        name: matchedEmp.fullName,
        nameKhmer: matchedEmp.fullNameKhmer,
        role: (matchedEmp.roleType as UserRole) || 'staff',
        department: matchedEmp.department,
        departmentKhmer: matchedEmp.departmentKhmer,
        title: matchedEmp.role,
        titleKhmer: matchedEmp.roleKhmer,
        avatar: matchedEmp.avatar
      };
    }

    return null;
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    isScanningActiveRef.current = false;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Handle scanned code (from camera stream, image upload, or manual badge ID)
  const handleScannedBadge = useCallback((rawCode: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    setErrorMsg(null);
    setCameraError(null);

    let targetId = rawCode.trim();

    // Check if JSON formatted
    if (targetId.startsWith('{') && targetId.endsWith('}')) {
      try {
        const parsed = JSON.parse(targetId);
        if (parsed.id) targetId = parsed.id;
        else if (parsed.employeeId) targetId = parsed.employeeId;
      } catch {
        // use raw string
      }
    }

    const user = authenticateUser(targetId);

    if (user) {
      playSuccessChime();
      stopCamera();
      setSuccessMsg(`${t.badgeVerified} (${language === 'km' ? user.nameKhmer : user.name})`);

      // Save preference
      localStorage.setItem('attendance_remember_me', rememberMe ? 'true' : 'false');
      if (rememberMe) {
        localStorage.setItem('attendance_saved_identifier', user.employeeId);
      }

      setTimeout(() => {
        onLogin(user, rememberMe);
        if (onClose) onClose();
      }, 550);
    } else {
      playErrorBuzz();
      setErrorMsg(t.invalidQrBadge);
      // Allow re-scanning after short interval
      setTimeout(() => {
        setIsProcessingScan(false);
      }, 1800);
    }
  }, [authenticateUser, isProcessingScan, language, onClose, onLogin, rememberMe, stopCamera, t]);

  // Frame scanning loop using requestAnimationFrame and jsQR
  const scanQrFrame = useCallback(() => {
    if (!isScanningActiveRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (!isProcessingScan) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data && code.data.trim()) {
          handleScannedBadge(code.data.trim());
          return; // Stop current frame loop while handling
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(scanQrFrame);
  }, [handleScannedBadge, isProcessingScan]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setErrorMsg(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraActive(true);
      isScanningActiveRef.current = true;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          scanLoopRef.current = requestAnimationFrame(scanQrFrame);
        };
        await video.play().catch(() => {});
      }

      // Check for torch/flashlight capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
        setHasTorchSupport(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCameraActive(false);
      isScanningActiveRef.current = false;
      setCameraError(t.cameraAccessDenied);
    }
  }, [facingMode, scanQrFrame, stopCamera, t.cameraAccessDenied]);

  // Switch Facing Mode
  const switchCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Flashlight/Torch
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

  // Upload and decode QR badge image file
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data && code.data.trim()) {
            handleScannedBadge(code.data.trim());
          } else {
            playErrorBuzz();
            setErrorMsg(
              language === 'km' 
                ? 'មិនអាចអានកូដ QR ពីរូបភាពនេះបានទេ។ សូមជ្រើសរើសរូបថតកាតដែលមានគុណភាពច្បាស់ជាងនេះ។' 
                : 'Could not detect QR code in this image. Please upload a clear photo of your HR badge.'
            );
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Manual Badge Input Submit
  const handleManualBadgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBadgeId.trim()) return;
    handleScannedBadge(manualBadgeId.trim());
  };

  // Auto-start camera when switching to 'qr' tab
  useEffect(() => {
    if (activeTab === 'qr') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode, startCamera, stopCamera]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle Credentials (Password) Form Submission
  const handlePasswordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanIdent = identifier.trim();
    if (!cleanIdent) {
      setErrorMsg(language === 'km' ? 'សូមបញ្ចូលអត្តលេខ ឬអ៊ីមែលរបស់អ្នក' : 'Please enter your Employee ID or email');
      return;
    }

    if (!password.trim()) {
      setErrorMsg(language === 'km' ? 'សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នក' : 'Please enter your password');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = authenticateUser(cleanIdent);

      if (!user) {
        setIsLoading(false);
        playErrorBuzz();
        setErrorMsg(t.accountNotFound);
        return;
      }

      if (password.trim().length < 4) {
        setIsLoading(false);
        playErrorBuzz();
        setErrorMsg(language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៤ តួអក្សរ' : 'Password must be at least 4 characters');
        return;
      }

      setIsLoading(false);
      playSuccessChime();
      setSuccessMsg(t.loginSuccess);

      localStorage.setItem('attendance_remember_me', rememberMe ? 'true' : 'false');
      if (rememberMe) {
        localStorage.setItem('attendance_saved_identifier', cleanIdent);
      } else {
        localStorage.removeItem('attendance_saved_identifier');
      }

      setTimeout(() => {
        onLogin(user, rememberMe);
        if (onClose) onClose();
      }, 500);
    }, 400);
  };

  if (!isOpen && isModal) return null;

  const formBody = (
    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col transition-all">
      
      {/* 1. Header Banner */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-7">
        
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -mb-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/90 border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-950/40 shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {t.loginTitle}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/90 mt-0.5">
                {t.loginSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language toggle */}
            {setLanguage && (
              <button
                type="button"
                id="btn-login-lang-toggle"
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
                title="Switch Language"
              >
                <Languages className="w-3.5 h-3.5 text-indigo-300" />
                <span>{language === 'km' ? 'English' : 'ខ្មែរ'}</span>
              </button>
            )}

            {/* Modal Close Button */}
            {isModal && onClose && (
              <button
                type="button"
                id="btn-login-close"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher: HR QR Badge Scan vs Password Login */}
        <div className="mt-6 flex bg-slate-900/50 p-1 rounded-2xl border border-white/10 text-xs font-semibold backdrop-blur-xs">
          <button
            type="button"
            id="tab-login-qr"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{t.qrBadgeLoginTab}</span>
          </button>

          <button
            type="button"
            id="tab-login-credentials"
            onClick={() => setActiveTab('credentials')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'credentials'
                ? 'bg-indigo-600 text-white shadow-md font-bold'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{t.credentialLoginTab}</span>
          </button>
        </div>

      </div>

      {/* 2. Content Area */}
      <div className="p-6 sm:p-7 space-y-5">

        {/* Success Alert */}
        {successMsg && (
          <div 
            id="login-alert-success"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="flex-1 font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div 
            id="login-alert-error"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium animate-in fade-in duration-200"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1 font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Scan QR Badge provided by HR */}
        {activeTab === 'qr' ? (
          <div className="space-y-4">
            
            {/* Header info badge */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-indigo-950">
                  {t.scanHrQrTitle}
                </p>
                <p className="text-[11px] text-indigo-800/85 mt-0.5 leading-relaxed">
                  {t.scanHrQrSubtitle}
                </p>
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px] sm:min-h-[290px]">
              
              {/* Video Stream Element */}
              <video
                ref={videoRef}
                className={`w-full h-[260px] sm:h-[290px] object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                playsInline
                muted
              />

              {/* Hidden Canvas for QR frame processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay: Active Camera View */}
              {isCameraActive ? (
                <>
                  {/* Darkened viewport with center cutout */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-2xl border-2 border-dashed border-white/60">
                      
                      {/* Corner Target Markers */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

                      {/* Animated Scanning Laser Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Frame Guide Instruction Text */}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none px-4">
                    <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{t.alignQrWithinFrame}</span>
                    </div>
                  </div>

                  {/* Camera Controls Bar (Top Right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    {hasTorchSupport && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                          isTorchOn 
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md' 
                            : 'bg-slate-900/70 text-white border-white/15 hover:bg-slate-800'
                        }`}
                        title="Toggle Flashlight"
                      >
                        {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
                      title={t.switchCamera}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/40 backdrop-blur-md transition-all cursor-pointer"
                      title={t.closeCamera}
                    >
                      <CameraOff className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                /* Inactive Camera / Permission Denied State */
                <div className="p-6 text-center space-y-3 flex flex-col items-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      {cameraError ? (language === 'km' ? 'កាមេរ៉ាមិនទាន់បើក' : 'Camera Inactive') : (language === 'km' ? 'ចុចដើម្បីបើកកាមេរ៉ាស្កេន' : 'Ready to scan HR badge')}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cameraError || (language === 'km' ? 'បើកកាមេរ៉ាដើម្បីស្កេនកាតសម្គាល់បុគ្គលិកផ្លូវការ' : 'Start camera to scan your official HR employee card')}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-login-start-camera"
                    onClick={startCamera}
                    className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t.openCamera}</span>
                  </button>
                </div>
              )}
            </div>

            {/* QR Actions: Upload Photo & Manual Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* 1. Upload QR Badge Image */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileSelected}
              />
              <button
                type="button"
                id="btn-login-upload-qr-image"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>{t.uploadQrImage}</span>
              </button>

              {/* 2. Toggle Camera Start/Stop */}
              {isCameraActive ? (
                <button
                  type="button"
                  id="btn-toggle-camera-off"
                  onClick={stopCamera}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/60 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  <CameraOff className="w-4 h-4 text-rose-600" />
                  <span>{t.closeCamera}</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-toggle-camera-on"
                  onClick={startCamera}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>{t.openCamera}</span>
                </button>
              )}
            </div>

            {/* Manual Badge ID Input fallback */}
            <form onSubmit={handleManualBadgeSubmit} className="pt-2 border-t border-slate-100">
              <label 
                htmlFor={manualBadgeIdField} 
                className="block text-[11px] font-bold text-slate-600 mb-1.5"
              >
                {t.manualBadgeIdPrompt}
              </label>
              <div className="flex gap-2">
                <input
                  id={manualBadgeIdField}
                  type="text"
                  value={manualBadgeId}
                  onChange={(e) => setManualBadgeId(e.target.value)}
                  placeholder={t.enterBadgeId}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:border-indigo-600 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!manualBadgeId.trim() || isProcessingScan}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  {t.verifyBadge}
                </button>
              </div>
            </form>

            {/* Helpful HR Badge Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {language === 'km' 
                  ? 'កាត QR ត្រូវបានចេញជូនដោយមន្ត្រី HR ក្នុងបញ្ជីបុគ្គលិក (Employee Directory) ឬកាតសម្គាល់ខ្លួន (Digital ID Badge)។' 
                  : 'Official QR badges are issued by HR officers through the Employee Directory or Digital ID Badge system.'}
              </p>
            </div>

          </div>
        ) : (
          /* TAB 2: Credentials (Password) Form */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label 
                htmlFor={identifierId} 
                className="block text-xs font-bold text-slate-700 tracking-wide"
              >
                {t.loginIdentifier} <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id={identifierId}
                  name="identifier"
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.loginIdentifierPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 text-sm rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-hidden font-medium transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor={passwordId} 
                  className="block text-xs font-bold text-slate-700 tracking-wide"
                >
                  {t.password} <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  id="btn-login-forgot-pass"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  {t.forgotPassword}
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 text-sm rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-hidden font-mono transition-all"
                />
                <button
                  type="button"
                  id="btn-login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label 
                htmlFor={rememberMeId} 
                className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none"
              >
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span>{t.rememberMe}</span>
              </label>

              <span className="text-[11px] text-slate-400">
                {language === 'km' ? 'សុវត្ថិភាព 256-bit' : '256-bit Encryption'}
              </span>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{t.signingIn}</span>
                </>
              ) : (
                <>
                  <span>{t.signInButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. Active Session info if currently logged in */}
        {currentUser && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.loggedInAs}:</span>
              <strong className="text-slate-900">{language === 'km' ? currentUser.nameKhmer : currentUser.name}</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                {currentUser.role}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentUser.employeeId}
            </span>
          </div>
        )}

      </div>

      {/* 4. Footer info */}
      <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>{language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងសិទ្ធិបុគ្គលិក RBAC' : 'Enterprise Role-Based Access Control'}</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400">Secure v2.5</span>
      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {t.forgotPasswordModalTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.forgotPasswordModalDesc}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">HR Support:</span>
                <span className="font-semibold text-slate-900">hr@company.kh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">IT Helpdesk:</span>
                <span className="font-semibold text-slate-900">+855 12 888 101</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Default Pass:</span>
                <span className="font-mono font-bold text-indigo-700">password123</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPassword('password123');
                setShowForgotModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'km' ? 'ប្រើពាក្យសម្ងាត់គំរូ (password123)' : 'Use Default Password (password123)'}
            </button>
          </div>
        </div>
      )}

    </div>
  );

  if (isModal) {
    return (
      <div 
        id="modal-login-form"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      >
        <div 
          className="fixed inset-0" 
          onClick={onClose} 
        />
        <div className="relative z-10 w-full max-w-lg my-8">
          {formBody}
        </div>
      </div>
    );
  }

  // Standalone screen view
  return (
    <div 
      id="screen-login-form"
      className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6"
    >
      {formBody}
    </div>
  );
};
