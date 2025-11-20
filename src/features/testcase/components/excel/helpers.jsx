import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

/* ---------------- Icons ---------------- */
export const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const SaveIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

/* ---------------- Column Help ---------------- */
const COLUMN_HELP = {
  no: { title: "no", desc: "스텝 번호(가급적 숫자).", example: "1,2,3…" },
  action: { title: "action", desc: "수행할 동작.", example: "click / input / tap / image / key / back / swipe" },
  by: { title: "by", desc: "대상을 찾는 방법 또는 좌표 타입.", example: "XPATH / ID / coord / abs..." },
  value: { title: "value", desc: "선택자/좌표/이미지 경로 등." },
};

export function HeaderHelp({ help }) {
  if (!help) return <span className="opacity-0 pointer-events-none">?</span>;

  const btn = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    const el = btn.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8 + window.scrollY,
      left: rect.left + window.scrollX - 100,
    });
    setOpen(true);
  };

  const hide = () => setOpen(false);

  return (
    <>
      <button
        ref={btn}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="ml-1 text-xs text-slate-400 hover:text-indigo-500"
      >
        ?
      </button>

      {open &&
        createPortal(
          <div
            style={{
              top: pos.top,
              left: pos.left,
            }}
            className="fixed z-[999999] bg-slate-800 text-white rounded p-3 text-xs max-w-[250px]"
          >
            <div className="font-bold text-indigo-300 mb-1">{help.title}</div>
            <div>{help.desc}</div>
            {help.example && (
              <div className="text-slate-400 mt-1 text-[10px]">예: {help.example}</div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/* ---------------- Row Help (Portal) ---------------- */
export function RowHelpButton({ help }) {
  if (!help) return null;

  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setPos({
      top: rect.top + rect.height / 2 + window.scrollY,
      left: rect.right + 10 + window.scrollX,
    });
    setOpen(true);
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full
                   flex items-center justify-center text-[9px] cursor-help"
      >
        i
      </span>

      {open &&
        createPortal(
          <div
            className="fixed z-[999999] bg-slate-900 text-white text-xs p-2 rounded shadow"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <div className="font-bold text-emerald-300">{help.title}</div>
            <div className="text-[10px] opacity-80">{help.job}</div>
            <div className="text-[10px] opacity-60">필수: {help.required}</div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ---------------- Inputs ---------------- */
export const baseInputClass =
  "w-full h-full px-2 bg-transparent text-sm border-2 border-transparent " +
  "focus:border-indigo-500 focus:bg-white rounded outline-none";

export const TextInput = React.memo(({ value, onChange, disabled }) => (
  <input
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={baseInputClass}
  />
));

export const NumberInput = React.memo(({ value, onChange, disabled }) => (
  <input
    value={value ?? ""}
    onChange={(e) => {
      const v = e.target.value;
      if (/^\d*(\.\d*)?$/.test(v) || v === "") onChange(v);
    }}
    disabled={disabled}
    className={baseInputClass + " text-right"}
  />
));

export const SelectInput = React.memo(({ value, onChange, options, disabled }) => (
  <select
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={baseInputClass + " cursor-pointer"}
  >
    <option value=""></option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
));

/* ---------------- Column Widths ---------------- */
export function colWidth(h) {
  const key = h?.toLowerCase?.() || "";
  if (key === "no") return "min-w-[70px] w-[80px]";
  if (key === "name") return "min-w-[220px] w-[260px]";
  if (key.includes("value")) return "min-w-[300px] w-[360px]";
  return "min-w-[160px] w-[200px]";
}
