import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MultiGrid } from "react-virtualized";
import "react-virtualized/styles.css";

/* ───────────── Icons ───────────── */
const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SaveIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

/* ───────────── Column Help ───────────── */
const COLUMN_HELP = {
  no: { title: "no", desc: "스텝 번호(가급적 숫자로 입력하세요).", example: "1, 2, 3 …" },
  action: { title: "action", desc: "수행할 동작.", example: "click / input / tap / image / key / back / swipe" },
  by: { title: "by", desc: "대상을 찾는 방법 또는 좌표 타입.", example: "XPATH, ID, ACCESSIBILITY_ID, CLASS_NAME, ANDROID_UIAUTOMATOR, coord, abs" },
  value: { title: "value", desc: "선택자/좌표/이미지 경로 등." },
  input_text: { title: "input_text", desc: "입력할 텍스트/특수키.", example: "myid123 / \\n (엔터)" },
  visible_if: { title: "visible_if", desc: "이 요소가 보이면 실행. visible_if_type과 함께 사용합니다." },
  skip_on_error: { title: "skip_on_error", desc: "에러 무시 여부.", example: "Y / N (기본 N)" },
  true_jump_no: {title: "true_jump_no", desc: "이 스텝 성공 시 이동할 스텝 번호"},
  false_jump_no: {title: "true_jump_no", desc: "이 스텝 실패 시 이동할 스텝 번호"},
  mandatory: { title: "mandatory", desc: "필수 스텝 여부.", example: "Y / N" },
  wait: { title: "wait", desc: "실행 전 대기 시간(초).", example: "2(2초) / 0.5(0.5초)" },
};

const HELP_ALIAS = {
  step: "no",
  seq: "no",
  order: "no",
  sleep: "wait",
  delay: "wait",
  text: "input_text",
  input: "input_text",
  strategy: "by",
  locator_by: "by",
  locator: "value",
  selector: "value",
  target: "value",
};

const lc = (s) => String(s || "").trim().toLowerCase();

const normHelpKey = (name) => {
  const k = lc(name);
  return COLUMN_HELP[k] ? k : HELP_ALIAS[k] || k;
};

const getColHelp = (name) => COLUMN_HELP[normHelpKey(name)] || null;

function HeaderHelp({ help }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const hasHelp = !!help;

  const onOpen = () => {
    if (!hasHelp) return;
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: Math.min(window.innerWidth - 360, Math.max(8, r.right - 320)),
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

  if (!hasHelp) {
    return (
      <span className="ml-1 w-4 h-4 inline-flex items-center justify-center text-[10px] opacity-0 pointer-events-none">
        ?
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
        className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition text-[10px]"
      >
        ?
      </button>
      {open &&
        hasHelp &&
        createPortal(
          <div
            className="fixed w-[320px] bg-slate-800 text-white shadow-xl rounded-lg text-left p-4 text-sm leading-relaxed z-[9999]"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="font-bold mb-1 text-blue-300">{help.title}</div>
            <div className="opacity-90">{help.desc}</div>
            {help.example && (
              <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-700/50 font-mono break-all">
                예시: {help.example}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/* ───────────── Styled Inputs ───────────── */
const YES_NO = ["Y", "N"];
const ACTION_OPTIONS = ["click", "input", "tap", "image", "key", "back", "swipe", "app_start", "app_close", "scan_find"];
const BY_OPTIONS = ["xpath", "id", "accessibility id", "class name", "android uiautomator", "coord", "abs", "found"];

const baseInputClass =
  "w-full h-full px-2 bg-transparent text-sm text-slate-700 placeholder-slate-300 " +
  "border-2 border-transparent rounded " +
  "focus:bg-white focus:border-blue-500 focus:shadow-sm " +
  "hover:bg-slate-50 outline-none transition-all";

const Select = React.memo(function Select({ value, onChange, options, disabled }) {
  return (
    <div className="relative w-full h-full">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${baseInputClass} appearance-none cursor-pointer`}
      >
        <option value=""></option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]">
        ▼
      </div>
    </div>
  );
});

const Text = React.memo(function Text({ value, onChange, disabled }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={baseInputClass}
      autoComplete="off"
    />
  );
});

const NumberText = React.memo(function NumberText({ value, onChange, disabled }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (/^\d*(\.\d*)?$/.test(v) || v === "") onChange(v);
      }}
      disabled={disabled}
      className={`${baseInputClass} text-right`}
      inputMode="numeric"
      autoComplete="off"
    />
  );
});

/* ───────────── Column Widths (px로만 사용) ───────────── */
const COL_ALIASES = {
  no: ["no", "step", "seq", "order"],
  wait: ["wait", "sleep", "delay"],
  mandatory: ["mandatory", "required", "must"],
  skip_on_error: ["skip_on_error", "skiponerror", "skip"],
  action: ["action", "type"],
  by: ["by", "locator_by", "strategy"],
  input_text: ["input_text", "text", "input"],
  value: ["value", "locator", "selector", "target"],
  visible_if: ["visible_if"],
  visible_if_type: ["visible_if_type"],
  jump_if_visible: ["jump_if_visible"],
  jump_if_visible_type: ["jump_if_visible_type"],
  true_jump_no: ["true_jump_no"],
  false_jump_no: ["false_jump_no"],
  name: ["name", "title"],
  memo: ["memo", "note", "comment"],
};

const isCol = (name, key) => COL_ALIASES[key]?.includes(lc(name)) || false;

function widthPxForHeader(h) {
  const baseWidth = (() => {
    const k = lc(h);
    if (isCol(k, "no")) return 80;
    // if (isCol(k, "wait")) return 100;
    // if (isCol(k, "false_jump_no") || (isCol(k, "true_jump_no")))return 160;
    // if (isCol(k, "mandatory") || isCol(k, "skip_on_error") || isCol(k, "action") || isCol(k, "by")) return 130;
    // if (isCol(k, "input_text")) return 220;
    if (isCol(k, "name")) return 240;
    if (isCol(k, "value") || isCol(k, "memo")) return 360;
    return 150;
  })();

  // ✨ 동적 확장 로직 추가 (문자 수 기반)
  const dynamic = h.length * 10; // 10px per char (적당한 값)
  return Math.max(baseWidth, dynamic);
}

const EditorFor = React.memo(function EditorFor({ headerName, value, onChange, disabled }) {
  if (isCol(headerName, "action")) return <Select value={value} onChange={onChange} options={ACTION_OPTIONS} disabled={disabled} />;
  if (isCol(headerName, "by")) return <Select value={value} onChange={onChange} options={BY_OPTIONS} disabled={disabled} />;
  if (isCol(headerName, "mandatory") || isCol(headerName, "skip_on_error"))
    return <Select value={value} onChange={onChange} options={YES_NO} disabled={disabled} />;
  if (isCol(headerName, "wait") || isCol(headerName, "no") || isCol(headerName, "true_jump_no") || isCol(headerName, "false_jump_no"))
    return <NumberText value={value} onChange={onChange} disabled={disabled} />;
  return <Text value={value} onChange={onChange} disabled={disabled} />;
});

/* ───────────── MultiGrid 설정 ───────────── */
const ROW_HEIGHT = 44; // header 포함

export default function ExcelPreviewEditor({
  open,
  onClose,
  meta,
  selectedSheet,
  onChangeSelectedSheet,
  previewAOA,
  onChangeCell,
  onInsertRow,
  onDeleteRow,
  onUpload,
  uploading = false,
  readOnly = false,
}) {
  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const headers = useMemo(
    () => (previewAOA?.[0] || []).map((h) => String(h ?? "")),
    [previewAOA]
  );
  const dataRows = useMemo(() => (previewAOA?.length || 0) > 1 ? previewAOA.slice(1) : [], [previewAOA]);

  const visibleSheets = useMemo(() => {
    if (!meta?.sheets) return [];
    const preview = meta.previewBySheet || {};
    return meta.sheets.filter((name) => Array.isArray(preview[name]) && preview[name].length > 0);
  }, [meta]);

  const gridContainerRef = useRef(null);
  const [gridSize, setGridSize] = useState({ width: 1000, height: 400 });

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        // 약간의 padding 고려해서 조정
        setGridSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  if (!open) return null;

  const rowCount = previewAOA?.length || 0; // 0행: header, 이후 data
  const columnCount = headers.length + 1; // 0열: control column

  const columnWidth = ({ index }) => {
    if (index === 0) return 70; // control column
    const header = headers[index - 1];
    return widthPxForHeader(header);
  };

  const rowHeight = () => ROW_HEIGHT;

  const cellRenderer = ({ columnIndex, rowIndex, key, style }) => {
    const isHeaderRow = rowIndex === 0;
    const isFirstCol = columnIndex === 0;

    // previewAOA: rowIndex 그대로 사용 (0 = header)
    const row = previewAOA?.[rowIndex] || [];
    const headerName = !isFirstCol ? headers[columnIndex - 1] : null;

    // 공통 wrapper style
    const baseStyle = {
      ...style,
      display: "flex",
      alignItems: "stretch",
      boxSizing: "border-box",
      borderRight: "1px solid rgba(226,232,240,0.8)",
      borderBottom: "1px solid rgba(226,232,240,0.8)",
      backgroundColor: isHeaderRow ? "#F9FAFB" : "#FFFFFF",
    };

    // ─── (0,0) : 좌상단 빈 셀 ───
    if (isHeaderRow && isFirstCol) {
      return (
        <div key={key} style={baseStyle} className="flex items-center justify-center text-[10px] text-slate-400 bg-slate-50">
          {/* "no" 헤더를 넣고 싶으면 여기에 텍스트 추가 */}
        </div>
      );
    }

    // ─── 헤더 행 (rowIndex === 0, col >=1) ───
    if (isHeaderRow && !isFirstCol) {
      return (
        <div
          key={key}
          style={baseStyle}
          className="px-3 py-2 flex items-center justify-between bg-slate-50/80 backdrop-blur"
        >
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate">
            {headerName}
          </span>
          <HeaderHelp help={getColHelp(headerName)} />
        </div>
      );
    }

    // ─── 첫 번째 열 (control column, rowIndex >=1) ───
    if (!isHeaderRow && isFirstCol) {
      const ri = rowIndex; // 1-based data row index (헤더 제외)
      return (
        <div
          key={key}
          style={{ ...baseStyle, backgroundColor: "#FFFFFF", zIndex: 3 }}
          className="group px-2 flex items-center justify-between bg-white"
        >
          {!readOnly && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onInsertRow?.(ri)}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                title="행 추가"
                type="button"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteRow?.(ri)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                title="행 삭제"
                type="button"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // ─── 일반 데이터 셀 (row >=1, col >=1) ───
    const ri = rowIndex; // previewAOA index
    const ci = columnIndex - 1; // header index
    const value = row?.[ci] ?? "";

    return (
      <div
        key={key}
        style={baseStyle}
        className="px-0.5 flex items-center bg-white"
      >
        <EditorFor
          headerName={headerName}
          value={value}
          disabled={readOnly}
          onChange={(v) => onChangeCell?.(ri, ci, v)}
        />
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-[96vw] h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex-none px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between z-30">
          <div className="flex items-center gap-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 shrink-0 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full block"></span>
              엑셀 편집기
            </h2>

            {/* Sheet Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1 py-1">
              {visibleSheets.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChangeSelectedSheet?.(name)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                    selectedSheet === name
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-2" />
            <span className="text-xs text-slate-400 font-mono">
              TOTAL {dataRows.length} 행
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="닫기"
            >
              <XIcon className="w-5 h-5" />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all ${
                  uploading
                    ? "bg-slate-400 cursor-wait"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                {uploading ? (
                  <span className="animate-pulse">저장 중...</span>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4" />
                    저장 및 업로드
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body: MultiGrid */}
        <div className="flex-1 flex flex-col bg-white">
          {rowCount === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              표시할 데이터가 없습니다.
            </div>
          ) : (
            <div ref={gridContainerRef} className="flex-1">
            <MultiGrid
              cellRenderer={cellRenderer}
              columnCount={columnCount}
              rowCount={rowCount}
              fixedRowCount={1}
              fixedColumnCount={1}
              columnWidth={columnWidth}
              rowHeight={rowHeight}
              width={gridSize.width}
              height={gridSize.height}
              overscanColumnCount={2}
              overscanRowCount={5}
              enableFixedRowScroll
              enableFixedColumnScroll

              style={{ outline: "none" }}
              containerStyle={{ overflow: "hidden" }}

              styleTopLeftGrid={{
                outline: "none",
                overflow: "hidden",
              }}
              styleTopRightGrid={{
                outline: "none",
                overflow: "hidden",
              }}
              styleBottomLeftGrid={{
                outline: "none",
                overflow: "hidden",
              }}
              styleBottomRightGrid={{
                outline: "none",
                overflow: "auto",   // 오직 이 Grid에서만 스크롤 허용
              }}
            />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
