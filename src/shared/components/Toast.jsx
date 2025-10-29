// src/shared/components/Toast.jsx
import { useEffect, useState } from "react";

/**
 * Props
 * - toast: { id, type: 'info'|'success'|'warning'|'warn'|'error', message, detailMessage?, autoHideMs? }
 * - onClose: () => void
 * - autoHideMs: number (fallback if toast.autoHideMs is undefined)
 */
export default function Toast({ toast, onClose, autoHideMs = 2500 }) {
  const [leaving, setLeaving] = useState(false);

  const key = (toast?.type === 'warn' ? 'warning' : toast?.type) || 'info';

  const variant = {
    info:    { border: "border-emerald-500/45 dark:border-emerald-400/40", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700" },
    success: { border: "border-sky-500/45 dark:border-sky-400/40",       badgeBg: "bg-sky-50",     badgeText: "text-sky-700" },
    warning: { border: "border-amber-500/50 dark:border-amber-400/40",    badgeBg: "bg-amber-50",   badgeText: "text-amber-800" },
    error:   { border: "border-rose-500/50 dark:border-rose-400/40",      badgeBg: "bg-rose-50",    badgeText: "text-rose-700" },
  }[key] || { border: "border-slate-400/40", badgeBg: "bg-slate-50", badgeText: "text-slate-700" };

  const effectiveAutoHide = typeof toast?.autoHideMs === 'number' ? toast.autoHideMs : autoHideMs;

  useEffect(() => {
    if (!toast) return;
    setLeaving(false);

    if (effectiveAutoHide > 0) {
      const leaveTimer = setTimeout(() => setLeaving(true), effectiveAutoHide);
      const removeTimer = setTimeout(() => onClose?.(), effectiveAutoHide + 220);
      return () => { clearTimeout(leaveTimer); clearTimeout(removeTimer); };
    }
  }, [toast, effectiveAutoHide, onClose]);

  if (!toast) return null;

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);
  };

  const ariaLive = toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <div className="fixed top-6 inset-x-0 px-4 md:px-6 z-[120] flex justify-center pointer-events-none">
      <div
        role="status"
        aria-live={ariaLive}
        className={[
          "pointer-events-auto w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl",
          "relative rounded-xl shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]",
          // Neutral glass surface
          "supports-[backdrop-filter]:backdrop-blur-xl bg-white/90 dark:bg-slate-900/80",
          // Subtle colored border + neutral ring
          "border", variant.border, "ring-1 ring-black/5",
          leaving ? "animate-toastOut" : "animate-toastIn",
        ].join(' ')}
      >
        <div className="px-4 py-3 pr-12 text-left">
          <div className="flex items-start gap-3">
            {/* Left check in a white circle (no emoji) */}
            <span className={["mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full", variant.badgeBg, variant.badgeText, "ring-1 ring-black/5"].join(' ')}>
              {/* inline SVG check */}
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4A1 1 0 014.707 9.293L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-[0.96rem] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                {toast.message}
              </p>
              {toast.detailMessage && (
                <p className="mt-1 text-[0.9rem] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {toast.detailMessage}
                </p>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="알림 닫기"
              className="absolute right-2.5 top-2.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <span className="sr-only">닫기</span>
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
