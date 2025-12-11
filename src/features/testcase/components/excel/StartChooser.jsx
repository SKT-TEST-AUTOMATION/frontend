import React from "react";

export function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

export function FilePlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="13" x2="12" y2="19"/>
      <line x1="9" y1="16" x2="15" y2="16"/>
    </svg>
  );
}

export function StartChooser({ onPickUpload, onPickEmpty, disabled, onPickStepEditor }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 업로드 카드 */}
      <button
        type="button"
        disabled={disabled}
        onClick={onPickUpload}
        className="group h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur text-left p-5 transition-colors hover:border-sky-300/60 hover:bg-sky-50/40 dark:hover:bg-sky-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><UploadIcon /></span>
          <div>
            <div className="font-semibold">엑셀 파일 업로드</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">.xlsx를 끌어놓거나 파일 선택으로 불러옵니다.</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">기존 케이스 수정/병합 시 사용해요.</div>
      </button>

      {/* 빈 템플릿 카드 */}
      <button
        type="button"
        disabled={disabled}
        onClick={onPickStepEditor}
        className="group h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur text-left p-5 transition-colors hover:border-emerald-300/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"><FilePlusIcon /></span>
          <div>
            <div className="font-semibold">빈 템플릿으로 빠르게 시작</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">기본 시트를 생성합니다.</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500"></div>
      </button>
    </div>
  );
}