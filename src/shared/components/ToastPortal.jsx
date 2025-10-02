import * as React from "react";
import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { toastState } from "../state/toastState";

const STYLE = {
  info:    { classes: "border-blue-200 bg-blue-50 text-blue-800",   emoji: "💡" },
    success: { classes: "border-emerald-200 bg-emerald-50 text-emerald-800", emoji: "✅" },
    warning: { classes: "border-amber-200 bg-amber-50 text-amber-800", emoji: "⚠️" },
    error:   { classes: "border-rose-200 bg-rose-50 text-rose-700",    emoji: "❌" },
};

export default function ToastPortal({ autoHideMs = 2500 }) {
  const [toast, setToast] = useRecoilState(toastState);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setLeaving(false);

    const t1 = setTimeout(() => setLeaving(true), autoHideMs);
    const t2 = setTimeout(() => setToast(null), autoHideMs + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast, autoHideMs, setToast]);

  if (!toast) return null;
  const sty = STYLE[toast.type] ?? STYLE.info;

  const close = () => {
    setLeaving(true);
    setTimeout(() => setToast(null), 220);
  };

  return (
    <div className="fixed top-5 inset-x-0 px-4 z-50 flex justify-center pointer-events-none">
      <div
        role="status" aria-live="polite"
        className={[
          "pointer-events-auto max-w-md w-full rounded-2xl border px-4 py-3 shadow-2xl",
          "backdrop-blur-lg bg-white/60",
          sty.classes,
          leaving ? "animate-toastOutCute" : "animate-toastInCute",
        ].join(" ")}
      >
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-xl leading-none">{sty.emoji}</span>
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={close}
            className="ml-2 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white/50"
            aria-label="알림 닫기"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
