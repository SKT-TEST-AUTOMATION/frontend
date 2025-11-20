
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FixedSizeList as List} from "react-window";

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
        className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition text-[10px]"
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
            <div className="font-bold mb-1 text-indigo-300">{help.title}</div>
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

/* ───────────── Row Help ───────────── */
const HELP_MAP = {
  click: { title: "click", job: "클릭", required: "action, by, value" },
  input: { title: "input", job: "입력", required: "action, by, value, input_text" },
  tap: { title: "tap", job: "탭(좌표)", required: "action, by, value" },
  image: { title: "image", job: "이미지 매칭", required: "action, value" },
  key: { title: "key", job: "키 입력", required: "action, input_text" },
  back: { title: "back", job: "뒤로가기", required: "action" },
  swipe: { title: "swipe", job: "스와이프", required: "action, value" },
  app_start: { title: "app_start", job: "앱 실행", required: "action, value" },
  app_close: { title: "app_close", job: "앱 종료", required: "action, value" },
  scan_find: { title: "scan_find", job: "스크롤하여 요소 찾기", required: "action, value" },
};

function getRowHelp(previewAOA, ri) {
  try {
    const header = previewAOA?.[0] || [];
    const row = previewAOA?.[ri] || [];
    const lower = (v) => String(v || "").trim().toLowerCase();
    const colIndex = (name) => header.findIndex((h) => lower(h) === lower(name));
    const actionIdx = ["action", "type"].map(colIndex).find((x) => x >= 0);
    const action = lower(row[actionIdx] || "");
    return HELP_MAP[action] || null;
  } catch {
    return null;
  }
}

function RowHelpButton({ help }) {
  if (!help) return null;
  return (
    <div className="group relative flex items-center">
      <span className="ml-1 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[9px] flex items-center justify-center font-bold cursor-help">
        i
      </span>
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max max-w-[200px] bg-slate-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        <div className="font-bold text-emerald-300 mb-0.5">{help.title}</div>
        <div className="text-[10px] opacity-80">{help.job}</div>
        <div className="mt-0.5 text-[10px] opacity-60">
          <span className="text-slate-400">필수:</span> {help.required}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Styled Inputs ───────────── */
const YES_NO = ["Y", "N"];
const ACTION_OPTIONS = ["click", "input", "tap", "image", "key", "back", "swipe", "app_start", "app_close", "scan_find"];
const BY_OPTIONS = ["xpath", "id", "accessibility id", "class name", "android uiautomator", "coord", "abs", "found"];

// 포커스 시에만 강조되도록 최소한의 border (XSS 위험 없이 value만 출력)
const baseInputClass =
  "w-full h-full px-2 bg-transparent text-sm text-slate-700 placeholder-slate-300 " +
  "border-2 border-transparent rounded " +
  "focus:bg-white focus:border-indigo-500 focus:shadow-sm " +
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
      className={`${baseInputClass}`}
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

/* ───────────── Column Widths ───────────── */
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

function widthClassForHeader(h) {
  const k = lc(h);
  if (isCol(k, "no") || isCol(k, "wait") || isCol(k, "true_jump_no") || isCol(k, "false_jump_no")) return "min-w-[70px] w-[80px]";
  if (isCol(k, "mandatory") || isCol(k, "skip_on_error") || isCol(k, "action") || isCol(k, "by")) return "min-w-[120px] w-[130px]";
  if (isCol(k, "input_text")) return "min-w-[200px] w-[220px]";
  if (isCol(k, "name")) return "min-w-[220px] w-[240px]";
  if (isCol(k, "value") || isCol(k, "memo")) return "min-w-[320px] w-[360px]";
  return "min-w-[160px] w-[180px]";
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

/* ───────────── react-window Row Renderer ───────────── */
const ROW_HEIGHT = 44; // 고정 행 높이

const RowRenderer = ({ index, style, data }) => {
  const { previewAOA, headers, onChangeCell, onInsertRow, onDeleteRow, readOnly } = data;

  const ri = index + 1; // 0행이 header라서 +1
  const row = previewAOA[ri] || [];
  const rowHelp = getRowHelp(previewAOA, ri);

  return (
    <div
      style={{
        ...style, // react-window가 제공하는 position/transform 등
        display: "flex",
        borderBottom: "1px solid rgba(226,232,240,0.8)",
        backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
      }}
      className="group"
    >
      {/* 왼쪽 컨트롤 영역 */}
      <div
        className="flex items-center justify-between px-2 border-r border-slate-200 bg-white"
        style={{
          width: 70,
          flexShrink: 0,
        }}
      >
        <span className="text-xs font-mono text-slate-400 w-5 text-center">{ri}</span>
        {!readOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onInsertRow?.(ri)}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
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
        <div className="w-4 flex justify-center">
          <RowHelpButton help={rowHelp} />
        </div>
      </div>

      {/* 실제 셀들 */}
      {headers.map((h, ci) => (
        <div
          key={ci}
          className={`border-r border-slate-100 last:border-r-0 flex items-center px-0.5 ${widthClassForHeader(h)}`}
        >
          <EditorFor
            headerName={h}
            value={row?.[ci] ?? ""}
            disabled={readOnly}
            onChange={(v) => onChangeCell?.(ri, ci, v)}
          />
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT: ExcelPreviewEditor (react-window 통합 버전)
 * ──────────────────────────────────────────────────────────────────────────────
 */
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

  const visibleSheets = useMemo(() => {
    if (!meta?.sheets) return [];
    const preview = meta.previewBySheet || {};
    return meta.sheets.filter((name) => Array.isArray(preview[name]) && preview[name].length > 0);
  }, [meta]);

  const headers = useMemo(
    () => (previewAOA?.[0] || []).map((h) => String(h ?? "")),
    [previewAOA]
  );
  const dataRows = useMemo(() => previewAOA?.slice(1) || [], [previewAOA]);

  // react-window height 계산용 (부모 컨테이너 높이를 측정)
  const listContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      if (listContainerRef.current) {
        const h = listContainerRef.current.clientHeight;
        if (h > 0) setListHeight(h);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-[96vw] h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between z-30">
          <div className="flex items-center gap-6 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 shrink-0 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-500 rounded-full block"></span>
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
                      ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            <span className="text-xs text-slate-400 font-mono">TOTAL: {dataRows.length} ROWS</span>
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all ${
                  uploading
                    ? "bg-slate-400 cursor-wait"
                    : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
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

        {/* Body: Header Row + Virtualized Rows */}
        <div className="flex-1 flex flex-col bg-white">
          {/* 컬럼 헤더 라인 */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur sticky top-0 z-20">
            <div
              className="w-[70px] flex-shrink-0 border-r border-slate-200 text-[10px] text-slate-400 font-normal flex items-center justify-center">
              NO
            </div>
            {headers.map((h, ci) => (
              <div
                key={ci}
                className={`border-r border-slate-200 last:border-r-0 px-3 py-2 flex items-center justify-between ${widthClassForHeader(
                  h
                )}`}
              >
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate">{h}</span>
                <HeaderHelp help={getColHelp(h)} />
              </div>
            ))}
          </div>

          {/* react-window 리스트 컨테이너 */}
          <div ref={listContainerRef} className="flex-1">
            {dataRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <List
                height={listHeight}
                width="100%"
                itemCount={dataRows.length}
                itemSize={ROW_HEIGHT}
                itemKey={(index) => index} // index 기반 (행 추가/삭제 시 성능/일관성 목적)
                itemData={{
                  previewAOA,
                  headers,
                  onChangeCell,
                  onInsertRow,
                  onDeleteRow,
                  readOnly,
                }}
              >
                {RowRenderer}
              </List>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}