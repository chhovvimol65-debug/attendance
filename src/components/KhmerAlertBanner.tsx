import React, { useEffect, useState } from 'react';
import { KhmerAlertDetail } from '../utils/alertNotification';
import { CheckCircle2, Trash2, AlertCircle, Check, X, Save } from 'lucide-react';

export const KhmerAlertBanner: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<KhmerAlertDetail[]>([]);

  useEffect(() => {
    const handleAlertEvent = (e: Event) => {
      const customEvent = e as CustomEvent<KhmerAlertDetail>;
      if (!customEvent.detail) return;

      const newAlert = customEvent.detail;
      setActiveAlerts(prev => [newAlert, ...prev.slice(0, 3)]); // Keep up to 4 recent alerts

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        setActiveAlerts(current => current.filter(a => a.id !== newAlert.id));
      }, newAlert.duration || 4000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('khmer-system-alert', handleAlertEvent);
    return () => window.removeEventListener('khmer-system-alert', handleAlertEvent);
  }, []);

  const dismissAlert = (id: string) => {
    setActiveAlerts(current => current.filter(a => a.id !== id));
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div 
      id="khmer-system-alert-container"
      className="fixed top-5 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] pointer-events-none select-none"
    >
      {activeAlerts.map(alert => {
        const isSave = alert.type === 'save';
        const isDelete = alert.type === 'delete';
        const isError = alert.type === 'error';

        return (
          <div
            key={alert.id}
            id={`alert-item-${alert.id}`}
            className={`pointer-events-auto transform transition-all duration-300 animate-in fade-in slide-in-from-top-4 rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-md ${
              isSave
                ? 'bg-emerald-900/95 border-emerald-500/50 text-white ring-2 ring-emerald-500/20'
                : isDelete
                  ? 'bg-rose-950/95 border-rose-500/50 text-white ring-2 ring-rose-500/20'
                  : isError
                    ? 'bg-red-950/95 border-red-500/50 text-white ring-2 ring-red-500/20'
                    : 'bg-indigo-950/95 border-indigo-500/50 text-white ring-2 ring-indigo-500/20'
            }`}
          >
            <div className="p-4 flex items-start gap-3.5">
              {/* Icon badge */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                  isSave
                    ? 'bg-emerald-500 text-white'
                    : isDelete
                      ? 'bg-rose-600 text-white'
                      : isError
                        ? 'bg-red-600 text-white'
                        : 'bg-indigo-500 text-white'
                }`}
              >
                {isSave && <Save className="w-5 h-5 animate-bounce-subtle" />}
                {isDelete && <Trash2 className="w-5 h-5 animate-pulse" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {!isSave && !isDelete && !isError && <Check className="w-5 h-5" />}
              </div>

              {/* Text info in Khmer */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isSave
                        ? 'bg-emerald-800 text-emerald-200 border border-emerald-600/60'
                        : isDelete
                          ? 'bg-rose-900 text-rose-200 border border-rose-600/60'
                          : 'bg-white/10 text-white/90 border border-white/20'
                    }`}
                  >
                    {isSave ? 'រក្សាទុក (Saved)' : isDelete ? 'បានលុប (Deleted)' : 'ដំណឹង (Alert)'}
                  </span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {alert.title}
                  </span>
                </div>

                <p className="text-xs text-white/90 font-medium leading-relaxed break-words">
                  {alert.message}
                </p>
              </div>

              {/* Close button */}
              <button
                type="button"
                id={`btn-dismiss-${alert.id}`}
                onClick={() => dismissAlert(alert.id)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="បិទ (Close)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle Progress Bar */}
            <div className="h-1 w-full bg-white/10 overflow-hidden">
              <div 
                className={`h-full animate-shrink ${
                  isSave ? 'bg-emerald-400' : isDelete ? 'bg-rose-400' : 'bg-indigo-400'
                }`} 
                style={{ animationDuration: `${alert.duration || 4000}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
