// src/components/common/ToastCute.jsx
import { useEffect, useState } from "react";

/**
 * - type: "info" | "success" | "warning" | "error"
 * - autoHideMs: 자동 숨김(입-퇴장 애니메이션 포함). 0이면 자동숨김 비활성화
 */

export default function Toast({ toast, onClose, autoHideMs = 2500 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setLeaving(false);

    if (autoHideMs > 0) {
      const leaveTimer = setTimeout(() => setLeaving(true), autoHideMs);      
      const removeTimer = setTimeout(() => onClose?.(), autoHideMs + 350);   
      return () => {
        clearTimeout(leaveTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [toast, autoHideMs, onClose]);

  if (!toast) return null;

  const styleMap = {
    info:    { classes: "border-blue-200 bg-blue-50 text-blue-800",   emoji: "💡" },
    success: { classes: "border-emerald-200 bg-emerald-50 text-emerald-800", emoji: "✅" },
    warning: { classes: "border-amber-200 bg-amber-50 text-amber-800", emoji: "⚠️" },
    error:   { classes: "border-rose-200 bg-rose-50 text-rose-700",    emoji: "❌" },
  };
  const s = styleMap[toast.type] ?? styleMap.info;

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onClose?.(), 250);
  };

  return (
    <div className="fixed top-5 inset-x-0 px-4 z-50 flex justify-center pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={[
          "pointer-events-auto max-w-md w-full toast-motion",
          "rounded-2xl border px-4 py-3 shadow-2xl",
          "backdrop-blur-lg bg-white/60",
          s.classes,
          leaving ? "animate-toastOut" : "animate-toastIn",
        ].join(" ")}
      >
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-xl leading-none">{s.emoji}</span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="알림 닫기"
            className="ml-2 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white/50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
