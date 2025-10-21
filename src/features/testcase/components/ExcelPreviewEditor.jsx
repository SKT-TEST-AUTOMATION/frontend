// src/features/testcase/components/ExcelPreviewEditor.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// NOTE: using `no-scrollbar` utility via Tailwind plugin is optional. If not available, remove `no-scrollbar` class.

/**
 * ExcelPreviewEditor
 * - 풀스크린 편집 전용 모달
 * - 시트 탭 전환, 인라인 편집, 업로드 트리거
 */
export default function ExcelPreviewEditor({
  open,
  onClose,
  meta,                 // { sheets, previewBySheet }
  selectedSheet,
  onChangeSelectedSheet, // (unused in editor) 단일 시트 편집 모드
  previewAOA,           // [][]
  onChangeCell,         // (ri, ci, val) => void
  onInsertRow,          // (ri) => void  (해당 행 아래에 새 행 추가)
  onDeleteRow,          // (ri) => void  (해당 행 삭제)
  onUpload,             // () => Promise<void>
  uploading = false,
  readOnly = false,
}) {
  const panelRef = useRef(null);
  const [colWidths, setColWidths] = useState([]); // px widths per column (excluding control column)
  const dragRef = useRef({ active: false, idx: -1, startX: 0, startW: 0 });

  // initialize widths when sheet changes
  useEffect(() => {
    const cols = (previewAOA?.[0]?.length) || 0;
    if (cols <= 0) { setColWidths([]); return; }
    setColWidths((prev) => {
      if (prev?.length === cols) return prev;
      // default width 160px per column
      return Array.from({ length: cols }, () => 160);
    });
  }, [selectedSheet, previewAOA]);

  const startDrag = useCallback((e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    const w = colWidths[idx] ?? 160;
    dragRef.current = { active: true, idx, startX: e.clientX, startW: w };
    document.body.classList.add("select-none");
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", endDrag);
  }, [colWidths]);

  const onDrag = useCallback((e) => {
    const s = dragRef.current;
    if (!s.active) return;
    const dx = e.clientX - s.startX;
    const nextW = Math.max(80, s.startW + dx); // min 80px
    setColWidths((prev) => prev.map((w, i) => (i === s.idx ? nextW : w)));
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current.active = false;
    document.body.classList.remove("select-none");
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", endDrag);
  }, [onDrag]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", endDrag);
      document.body.classList.remove("select-none");
    };
  }, [onDrag, endDrag]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleBgClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose?.();
  }, [onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={handleBgClick}
    >
      <div className="flex-1 flex items-center justify-center p-4" onClick={handleBgClick}>
        <div
          ref={panelRef}
          className="w-[95vw] max-w-[1400px] h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">편집 중인 시트</span>
                <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium">
                  {selectedSheet || "-"}
                </span>
              </div>
            </div>
            <div className="flex items-center shrink-0 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                닫기
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={uploading}
                  className={[
                    "px-4 py-2 rounded-md text-sm font-semibold",
                    uploading
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white",
                  ].join(" ")}
                >
                  {uploading ? "업로드 중…" : "저장 및 업로드"}
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4">
            <div className="border rounded-lg overflow-auto border-slate-200 dark:border-slate-700">
              <div className="min-w-full overflow-auto">
                <table className="text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-2 py-2 text-left sticky left-0 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur w-12 border-r border-slate-300 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:right-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_-6px_0_6px_-6px_rgba(0,0,0,0.12)]"></th>
                      {(previewAOA?.[0] || []).map((cell, ci) => (
                        <th key={ci} className="px-0 py-0 text-left font-semibold align-top">
                          <div className="relative flex items-stretch border-r border-slate-200 dark:border-slate-700" style={{ width: colWidths[ci] ?? 160, minWidth: colWidths[ci] ?? 160 }}>
                            <input
                              value={cell ?? ""}
                              onChange={(e) => onChangeCell?.(0, ci, e.target.value)}
                              className="w-full bg-transparent outline-none font-semibold px-3 py-2"
                              disabled={readOnly}
                            />
                            {/* resize handle */}
                            {!readOnly && (
                              <span
                                className={[
                                  "absolute top-0 right-0 h-full cursor-col-resize",
                                  dragRef.current.active && dragRef.current.idx === ci
                                    ? "w-3 bg-blue-500/10"
                                    : "w-2 hover:w-3 hover:bg-blue-500/10",
                                ].join(" ")}
                                onMouseDown={(e) => startDrag(e, ci)}
                                title="열 너비 조절"
                                aria-label="열 너비 조절"
                                role="separator"
                                aria-orientation="vertical"
                              />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewAOA || []).slice(1).map((row, idx) => {
                      const ri = idx + 1;
                      return (
                    <tr key={ri} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                      <td className="px-1 py-1 sticky left-0 bg-white dark:bg-slate-900 w-12 border-t border-r border-slate-200 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:right-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_-6px_0_6px_-6px_rgba(0,0,0,0.12)]">
                            {!readOnly && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onInsertRow?.(ri)}
                                  className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  title="이 행 아래에 행 추가"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRow?.(ri)}
                                  className="px-2 py-1 text-xs rounded border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                  title="이 행 삭제"
                                >
                                  -
                                </button>
                              </div>
                            )}
                          </td> 
                          {(row || []).map((cell, ci) => (
                            <td key={ci} className="px-0 py-0 align-top">
                              <div className="px-3 py-2 border-t border-r border-slate-200 dark:border-slate-700" style={{ width: colWidths[ci] ?? 160, minWidth: colWidths[ci] ?? 160 }}>
                                <input
                                  value={cell ?? ""}
                                  onChange={(e) => onChangeCell?.(ri, ci, e.target.value)}
                                  className="w-full bg-transparent outline-none"
                                  disabled={readOnly}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {!previewAOA?.length && (
                      <tr><td className="px-3 py-6 text-center text-slate-400">표시할 데이터가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}