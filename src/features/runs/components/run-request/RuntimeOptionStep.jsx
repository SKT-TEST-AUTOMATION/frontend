// src/features/runs/components/wizard/RuntimeOptionStep.jsx
import React from "react";

export default function RuntimeOptionStep({ value, onChange }) {
  const v = value ?? {};

  const set = (patch) => onChange?.({ ...v, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
        <h3 className="text-sm font-bold text-slate-800">Runtime 옵션</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          실행 환경/증거 수집/재시도 등의 옵션을 선택합니다.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Evidence Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { key: "NONE", label: "증거 없음" },
            { key: "ON_ERROR", label: "에러 시만" },
            { key: "ALL", label: "전체 수집" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => set({ evidenceMode: o.key })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold transition ${
                v.evidenceMode === o.key
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Retry */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div>
            <div className="text-xs font-bold text-slate-700">재시도 횟수</div>
            <div className="text-[11px] text-slate-500">실패 시 동일 케이스 재시도</div>
          </div>
          <input
            type="number"
            min={0}
            max={5}
            value={Number.isFinite(Number(v.retryCount)) ? v.retryCount : 0}
            onChange={(e) => set({ retryCount: Number(e.target.value) })}
            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>


      </div>
    </div>
  );
}