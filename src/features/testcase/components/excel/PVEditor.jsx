import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ──────────────────────────────────────────────────────────────────────────────
// 1. 유틸리티 및 상수 정의
// ──────────────────────────────────────────────────────────────────────────────
export const previewLc = (s) => String(s || "").trim().toLowerCase();

export const PV_COLS = {
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

export const pvIs = (name, key) => PV_COLS[key]?.includes(previewLc(name));

export const pvWidth = (h) => {
  const k = previewLc(h);
  if (pvIs(k, "no") || pvIs(k, "wait") || pvIs(k, "true_jump_no") || pvIs(k, "false_jump_no")) return "min-w-[64px] w-[72px]";
  if (pvIs(k, "mandatory") || pvIs(k, "skip_on_error") || pvIs(k, "action") || pvIs(k, "by") || pvIs(k, "visible_if_type") || pvIs(k, "jump_if_visible_type"))
    return "min-w-[110px] w-[120px]";
  if (pvIs(k, "input_text")) return "min-w-[180px] w-[200px]";
  if (pvIs(k, "name") || pvIs(k, "jump_if_visible")) return "min-w-[200px] w-[220px]";
  if (pvIs(k, "visible_if")) return "min-w-[260px] w-[280px]";
  if (pvIs(k, "value") || pvIs(k, "memo")) return "min-w-[300px] w-[340px]";
  return "min-w-[160px] w-[180px]";
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. 헤더 도움말 (Tooltip)
// ──────────────────────────────────────────────────────────────────────────────
const PREVIEW_COLUMN_HELP = {
  no: { title: "no", desc: "스텝 번호(가급적 숫자).", example: "1,2,3…" },
  action: { title: "action", desc: "수행할 동작.", example: "click / input / tap / image …" },
  by: { title: "by", desc: "대상 찾는 방법.", example: "XPATH / ID / ACCESSIBILITY_ID / CLASS_NAME / ANDROID_UIAUTOMATOR / coord / abs" },
  value: { title: "value", desc: "선택자/좌표/이미지 경로 등(액션에 따라 다름)." },
  input_text: { title: "input_text", desc: "입력할 텍스트/특수키." },
  skip_on_error: { title: "skip_on_error", desc: "에러 무시 여부.", example: "Y / N (기본 N)" },
  mandatory: { title: "mandatory", desc: "필수 스텝 여부.", example: "Y / N" },
  wait: { title: "wait", desc: "실행 전 대기 시간(초/ms).", example: "2 / 500ms" },
};

const PREVIEW_HELP_ALIAS = {
  step: "no", seq: "no", order: "no",
  sleep: "wait", delay: "wait",
  text: "input_text", input: "input_text",
  strategy: "by", locator_by: "by",
  locator: "value", selector: "value", target: "value",
};

const getPreviewColHelp = (name) =>
  PREVIEW_COLUMN_HELP[previewLc(name)] || PREVIEW_COLUMN_HELP[PREVIEW_HELP_ALIAS[previewLc(name)]] || null;

export function PreviewHeaderHelp({ help }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const onOpen = () => {
    if (!help) return;
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

  if (!help) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
        className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full border border-slate-300/70 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 hover:bg-amber-50/70 dark:hover:bg-amber-900/20 transition"
        aria-label="컬럼 도움말"
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="fixed w-[340px] bg-slate-900 text-slate-100 border border-slate-700 rounded-md text-left p-3"
            style={{ top: pos.top, left: pos.left, zIndex: 2147483657 }}
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
          >
            <div className="text-xs font-semibold mb-1">{help.title}</div>
            <div className="text-[11px] leading-5">
              <div>{help.desc}</div>
              {help.example && (
                <div className="mt-1 text-slate-400">
                  예시: <code className="break-all">{help.example}</code>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. 입력 컴포넌트 (Memoized)
// ──────────────────────────────────────────────────────────────────────────────
const PVInputBase = "w-full h-9 rounded-xl border border-slate-200/70 dark:border-slate-700/50 \
bg-slate-50/70 dark:bg-slate-800/50 px-3 text-[13px] \
placeholder:text-slate-400 dark:placeholder:text-slate-500 \
transition-colors focus:outline-none focus:bg-white dark:focus:bg-slate-900 \
focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70 dark:focus:ring-sky-800/40";

const PVSelectBase =
  `${PVInputBase} appearance-none pr-12 bg-no-repeat \
bg-[length:14px_14px] bg-[right_14px_center] \
bg-[url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23667' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")]`;

const MemoizedSelect = React.memo(({ value, onChange, options, disabled, className = PVSelectBase }) => {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);
  return (
    <select className={className} value={value ?? ""} onChange={handleChange} disabled={disabled}>
      <option value=""></option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
});

const MemoizedText = React.memo(({ value, onChange, disabled, className = PVInputBase }) => {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);
  return (
    <input className={className} value={value ?? ""} onChange={handleChange} disabled={disabled} />
  );
});

const MemoizedNumberText = React.memo(({ value, onChange, disabled, className = PVInputBase }) => {
  const handleChange = useCallback((e) => {
    const v = e.target.value;
    if (/^\d*(\.\d*)?$/.test(v) || v === "") onChange(v);
  }, [onChange]);
  return (
    <input
      className={className}
      value={value ?? ""}
      onChange={handleChange}
      disabled={disabled}
      inputMode="numeric"
    />
  );
});

export const PVEditor = React.memo(function PVEditor({ headerName, value, onChange, disabled }) {
  const name = previewLc(headerName);

  if (pvIs(name, "action")) {
    const options = ["click", "input", "tap", "image", "key", "back", "swipe", "app_start", "app_close", "scan_find"];
    return <MemoizedSelect value={value} onChange={onChange} options={options} disabled={disabled} />;
  }
  if (pvIs(name, "by")) {
    const options = ["xpath", "id", "accessibility id", "class name", "android uiautomator", "coord", "abs", "found"];
    return <MemoizedSelect value={value} onChange={onChange} options={options} disabled={disabled} />;
  }
  if (pvIs(name, "mandatory") || pvIs(name, "skip_on_error")) {
    const options = ["Y", "N"];
    return <MemoizedSelect value={value} onChange={onChange} options={options} disabled={disabled} />;
  }
  if (pvIs(name, "wait") || pvIs(name, "no") || pvIs(name, "true_jump_no") || pvIs(name, "false_jump_no")) {
    return <MemoizedNumberText value={value} onChange={onChange} disabled={disabled} />;
  }
  return <MemoizedText value={value} onChange={onChange} disabled={disabled} />;
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. 테이블 구성 요소 (HeaderCell, Row)
// ──────────────────────────────────────────────────────────────────────────────
export const PreviewHeaderCell = React.memo(function PreviewHeaderCell({ h }) {
  const help = getPreviewColHelp(h);
  return (
    <th className={`px-2 py-1 text-left whitespace-nowrap ${pvWidth(h)}`}>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {String(h ?? "")}
        </span>
        <PreviewHeaderHelp help={help} />
      </div>
    </th>
  );
});

export const PreviewRow = React.memo(function PreviewRow({ row, i, headers, previewAOA, updateCell, blocked }) {
  return (
    <tr className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-900/60">
      {headers.map((h, ci) => (
        <td
          key={ci}
          className={`px-2.5 py-2 align-top ${pvWidth(h)} rounded-md
                      focus-within:bg-white focus-within:dark:bg-slate-900
                      transition`}
        >
          <PVEditor
            headerName={h}
            value={row?.[ci] ?? ""}
            disabled={blocked}
            onChange={(v) => updateCell(i + 1, ci, v)}
          />
        </td>
      ))}
    </tr>
  );
});