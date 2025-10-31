// src/features/testcase/components/ExcelPreviewEditor.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// --- Column help tooltips (header based) ---
const COLUMN_HELP = {
  no: {
    title: "no",
    desc: "스텝 번호(가급적 숫자). 실행/점프 기준으로 사용.",
    example: "1, 2, 3 …",
  },
  action: {
    title: "action",
    desc: "수행할 동작. click/input/tap/image/key/back/swipe 등.",
    example: "click / input / tap / image …",
  },
  by: {
    title: "by",
    desc: "대상 찾는 방법 또는 tap 좌표 타입.",
    example: "XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR, coord, abs",
  },
  value: {
    title: "value",
    desc: "선택자/좌표/이미지 경로 등. 액션에 따라 형식이 달라짐.",
    example: `//... 또는 0.9,0.1 또는 images/x.png; thr=0.8; scales=1.0,0.97,1.03`,
  },
  input_text: {
    title: "input_text",
    desc: "입력할 텍스트 또는 특수키.",
    example: "myid123 / \\n (엔터) / ABC123",
  },
  visible_if: {
    title: "visible_if",
    desc: "보이면 실행. *_type 과 함께 사용(text/xpath/id 등).",
    example: `text + "로그인" / xpath + //android...`,
  },
  skip_on_error: {
    title: "skip_on_error",
    desc: "에러 무시 여부.",
    example: "Y / N (기본 N)",
  },
  mandatory: {
    title: "mandatory",
    desc: "필수 스텝 여부. 실패 시 테스트 중단을 결정.",
    example: "Y / N (기본 Y 권장)",
  },
  wait: {
    title: "wait",
    desc: "스텝 실행 전 기다리는 시간(초 또는 ms).",
    example: "2 / 500ms",
  },
};
const getColHelp = (name) => {
  const key = String(name || "").trim().toLowerCase();
  return COLUMN_HELP[key] || null;
};
function HeaderHelp({ help }) {
  const data = help;
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  if (!data) return null;

  const onOpen = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Position below and aligned to the right edge of the icon
    setPos({
      top: r.bottom + 8, // 8px gap
      left: Math.min(window.innerWidth - 360, Math.max(8, r.right - 320)), // keep within viewport (tooltip width ~340)
    });
    setOpen(true);
  };
  const onClose = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
        className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 hover:bg-amber-50 dark:hover:bg-amber-900/30"
        aria-label="컬럼 도움말"
      >
        ?
      </button>
      {open &&
        createPortal(
          // z-index and positioning for above modal overlay + viewport safety
          <div
            role="tooltip"
            className="fixed w-[340px] bg-slate-900 text-slate-100 border border-slate-700 rounded-md shadow-xl text-left p-3"
            style={{ top: pos.top, left: pos.left, zIndex: 2147483657 }}
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
          >
            <div className="text-xs font-semibold mb-1">{data.title}</div>
            <div className="text-[11px] leading-5 space-y-1">
              <div>{data.desc}</div>
              {data.example ? (
                <div className="mt-1">
                  <span className="text-slate-400">예시:</span>{" "}
                  <code className="break-all">{data.example}</code>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
// --- end column help ---
// --- Inline help: action-based tooltips for Excel authoring ---
const HELP_MAP = {
  click: {
    title: "click",
    job: "버튼/요소 누르기",
    required: "action, by, value",
    by: "XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR",
    value: "버튼·요소 선택자",
    inputText: "-",
    note: "가장 기본 액션",
    examples: [
      { k: "XPATH", v: `//android.widget.TextView[@text="로그인"]` },
      { k: "ID", v: "com.app:id/btn_ok" }
    ],
  },
  input: {
    title: "input",
    job: "글자 입력하기",
    required: "action, by, value, input_text",
    by: "XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR",
    value: "value=입력창 선택자",
    inputText: "입력할 값",
    note: "value는 선택자, 입력은 input_text",
    examples: [
      { k: "ID", v: "com.app:id/et_id + input_text=myid123" }
    ],
  },
  tap: {
    title: "tap",
    job: "화면 좌표 탭",
    required: "action, by, value",
    by: "coord, abs",
    value: "coord=0.90,0.10 또는 abs=540,1760",
    inputText: "-",
    note: "coord=해상도 독립(추천)",
    examples: [
      { k: "coord", v: "0.90,0.10" },
      { k: "abs", v: "540,1760" }
    ],
  },
  image: {
    title: "image",
    job: "그림으로 찾아 탭",
    required: "action, value",
    by: "-",
    value: "이미지 경로; thr=0.8; scales=1.0,0.97,1.03; tap=no",
    inputText: "-",
    note: "그림 비교 후 탭, tap=no면 감지만",
    examples: [
      { k: "경로", v: "images/x_button.png; thr=0.82; scales=1.0,0.97,1.03" }
    ],
    imageOpts: "thr, retries, interval_ms, scales, roi, tap_offset, tap"
  },
  key: {
    title: "key",
    job: "키 입력",
    required: "action, input_text",
    by: "-",
    value: "-",
    inputText: `\\n, ABC123 등`,
    note: "특수키/문자 입력",
  },
  back: {
    title: "back",
    job: "뒤로가기",
    required: "action",
    by: "-",
    value: "(비움)",
    inputText: "-",
    note: "휴대폰 뒤로가기 버튼",
  },
  swipe: {
    title: "swipe",
    job: "화면 스크롤",
    required: "action, value",
    by: "-",
    value: "x1,y1,x2,y2[,시간ms] 예: 500,1600,500,600(아래→위)",
    inputText: "-",
    note: "드래그/스크롤",
  },
};

const GENERAL_HELP = {
  title: "도움말",
  job: "행 단위 작성 가이드",
  required: "action, by, value (필수) · input_text(일부 액션) · 기타 옵션",
  by: "XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR, coord/abs(image 제외)",
  value: "액션에 따라 선택자/좌표/이미지 경로 등",
  inputText: "input/ key 등에서 사용",
  note: "action을 선택하면 해당 액션 전용 설명이 표시됩니다.",
  examples: [
    { k: "click", v: "XPATH → //android.widget.TextView[@text=\"로그인\"]" },
    { k: "input", v: "ID → com.app:id/et_id + input_text=myid123" },
    { k: "tap", v: "coord → 0.90,0.10 / abs → 540,1760" },
    { k: "image", v: "images/x_button.png; thr=0.82; scales=1.0,0.97,1.03" },
    { k: "key", v: "input_text=\\n (엔터)" },
    { k: "swipe", v: "500,1600,500,600 (아래→위)" },
  ],
};

function getRowHelp(previewAOA, ri) {
  try {
    const header = previewAOA?.[0] || [];
    const row = previewAOA?.[ri] || [];
    const lower = (v) => (String(v || "").trim().toLowerCase());
    const colIndex = (name) =>
      header.findIndex((h) => lower(h) === lower(name));
    const actionIdx = colIndex("action");
    const action = lower(row[actionIdx] || "");
    const help = HELP_MAP[action];
    if (!help) return null;

    // Extract some dynamic values if present
    const byIdx = colIndex("by");
    const valueIdx = colIndex("value");
    const inputIdx = colIndex("input_text");

    return {
      ...help,
      byValue: row?.[byIdx],
      valueValue: row?.[valueIdx],
      inputValue: row?.[inputIdx],
    };
  } catch {
    return null;
  }
}

function HelpCell({ help }) {
  const data = help || GENERAL_HELP;
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const onOpen = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Place to the left of the icon (since it's at sticky right), vertically centered
    const width = 340;
    const heightGap = 8;
    const top = Math.min(
      window.innerHeight - 16,
      Math.max(8, r.top + r.height / 2)
    );
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left - width - 12));
    setPos({ top, left });
    setOpen(true);
  };
  const onClose = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
        className="w-6 h-6 inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 hover:bg-amber-50 dark:hover:bg-amber-900/30"
        aria-label="행 도움말"
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="fixed w-[340px] bg-slate-900 text-slate-100 border border-slate-700 rounded-md shadow-xl text-left p-3"
            style={{ top: pos.top, left: pos.left, zIndex: 2147483657, transform: 'translateY(-50%)' }}
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
          >
            <div className="text-xs font-semibold mb-1">
              {data.title} · {data.job}
            </div>
            {!help && (
              <div className="mb-1 text-[11px] text-amber-300">
                action을 입력하면 해당 액션 전용 설명이 표시됩니다.
              </div>
            )}
            <div className="text-[11px] leading-5 space-y-1">
              <div><span className="text-slate-400">필수 컬럼:</span> {data.required}</div>
              <div><span className="text-slate-400">by:</span> {data.by}</div>
              <div><span className="text-slate-400">value:</span> {data.value}</div>
              <div><span className="text-slate-400">input_text:</span> {data.inputText}</div>
              {data.imageOpts ? (
                <div><span className="text-slate-400">이미지 옵션:</span> {data.imageOpts}</div>
              ) : null}
              <div><span className="text-slate-400">비고:</span> {data.note}</div>
              {Array.isArray(data.examples) && data.examples.length > 0 ? (
                <div className="mt-1">
                  <div className="text-slate-400">예시</div>
                  <ul className="list-disc list-inside">
                    {data.examples.map((ex, i) => (
                      <li key={i} className="break-all">{ex.k} → <code>{ex.v}</code></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {help && (help.byValue || help.valueValue || help.inputValue) ? (
                <div className="mt-1 border-t border-slate-700 pt-1">
                  <div className="text-slate-400">현재 행 값</div>
                  <ul className="list-disc list-inside">
                    {help.byValue ? <li>by: <code>{String(help.byValue)}</code></li> : null}
                    {help.valueValue ? <li>value: <code>{String(help.valueValue)}</code></li> : null}
                    {help.inputValue ? <li>input_text: <code>{String(help.inputValue)}</code></li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
// --- end of inline help ---

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
                {(!meta?.sourceFile) && (
                  <span className="ml-2 text-xs text-slate-500">(템플릿 작성)</span>
                )}
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
                      <th className="px-2 py-2 text-left sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 bg-clip-padding transform-gpu w-12 border-r border-slate-300 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:right-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_-6px_0_6px_-6px_rgba(0,0,0,0.12)]"></th>
                      {(previewAOA?.[0] || []).map((cell, ci) => (
                        <th key={ci} className="px-0 py-0 text-left font-semibold align-top">
                          <div className="relative flex items-stretch border-r border-slate-200 dark:border-slate-700" style={{ width: colWidths[ci] ?? 160, minWidth: colWidths[ci] ?? 160 }}>
                            <input
                              value={cell ?? ""}
                              onChange={(e) => onChangeCell?.(0, ci, e.target.value)}
                              className="w-full bg-transparent outline-none font-semibold px-3 py-2 pr-8"
                              disabled={readOnly}
                            />
                            <div className="absolute top-1/2 -translate-y-1/2 right-6">
                              <HeaderHelp help={getColHelp(cell)} />
                            </div>
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
                      <th className="px-2 py-2 text-center sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 bg-clip-padding transform-gpu w-14 border-l border-slate-200 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:left-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_6px_0_6px_-6px_rgba(0,0,0,0.12)]">
                        *
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewAOA || []).slice(1).map((row, idx) => {
                      const ri = idx + 1;
                      return (
                    <tr key={ri} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                      <td className="px-1 py-1 sticky left-0 z-10 bg-white dark:bg-slate-900 bg-clip-padding transform-gpu w-12 border-t border-r border-slate-200 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:right-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_-6px_0_6px_-6px_rgba(0,0,0,0.12)]">
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
                          <td className="px-2 py-1 sticky right-0 z-10 bg-white dark:bg-slate-900 bg-clip-padding transform-gpu w-14 border-t border-l border-slate-200 dark:border-slate-700 relative after:content-[''] after:absolute after:top-0 after:left-[-1px] after:h-full after:w-[6px] after:pointer-events-none after:shadow-[inset_6px_0_6px_-6px_rgba(0,0,0,0.12)]">
                            <HelpCell help={getRowHelp(previewAOA, ri)} />
                          </td>
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