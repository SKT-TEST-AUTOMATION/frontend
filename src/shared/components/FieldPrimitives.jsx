import React, { forwardRef, useId, useMemo, useRef, useEffect, useState } from "react";

// 간단한 className 병합 유틸
function cx(...args) {
  return args.filter(Boolean).join(" ");
}

/**
 * FieldCard
 * 구역(섹션) 컨테이너. 라벨(섹션 타이틀)과 슬롯(children)만 가짐.
 */
export function FieldCard({ label, children, className = "", right = null, footer = null }) {
  return (
    <section
      className={cx(
        "bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60",
        className
      )}
    >
      {(label || right) && (
        <header className="flex items-center justify-between mb-3">
          {label && (
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</h3>
          )}
          {right}
        </header>
      )}
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}

/**
 * 공통: 라벨/헬퍼/에러 블록
 */
function LabelRow({ htmlFor, label, required, hint, hintId }) {
  if (!label && !hint) return null;
  return (
    <div className="flex items-end justify-between mb-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-800 dark:text-gray-100">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </label>
      )}
      {hint && (
        <span id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      )}
    </div>
  );
}

function ErrorText({ error, errorId }) {
  if (!error) return null;
  return (
    <p id={errorId} className="mt-1 text-xs text-rose-600">
      {error}
    </p>
  );
}

/**
 * FieldInput
 * 텍스트 인풋. prefix/suffix 슬롯, maxLength 카운터, 숫자 제한 등 최소 기능 포함.
 */
export const FieldInput = forwardRef(function FieldInput(
  {
    label,
    name,
    id,
    value,
    onChange,
    onBlur,
    placeholder,
    type = "text",
    required = false,
    disabled = false,
    readOnly = false,
    maxLength,
    hint,
    error,
    className = "",
    inputClassName = "",
    prefix = null,
    suffix = null,
    autoComplete,
    autoFocus = false,
    spellCheck = false,
  },
  ref
) {
  const reactId = useId();
  const inputId = id || `${name || "fi"}-${reactId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const describedBy = useMemo(
    () => [hintId, errorId].filter(Boolean).join(" ") || undefined,
    [hintId, errorId]
  );

  const [len, setLen] = useState(value?.length || 0);
  useEffect(() => setLen(value?.length || 0), [value]);

  return (
    <div className={cx("w-full", className)}>
      <LabelRow htmlFor={inputId} label={label} required={required} hint={hint} hintId={hintId} />

      <div
        className={cx(
          "flex items-stretch rounded-lg border bg-white dark:bg-slate-900",
          error
            ? "border-rose-300 focus-within:border-rose-400"
            : "border-gray-300 focus-within:border-blue-400 dark:border-slate-700",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {prefix && (
          <div className="px-3 flex items-center text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-slate-700">
            {prefix}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value, e)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          spellCheck={spellCheck}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cx(
            "flex-1 px-3 py-2 rounded-lg outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100",
            inputClassName
          )}
        />

        {suffix && (
          <div className="px-3 flex items-center text-sm text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-slate-700">
            {suffix}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <ErrorText error={error} errorId={errorId} />
        {maxLength ? (
          <span className="ml-auto mt-1 text-[11px] text-gray-400">{len}/{maxLength}</span>
        ) : null}
      </div>
    </div>
  );
});

/**
 * FieldTextarea
 * 자동 높이 조절(옵션) + 글자수 카운트 + 같은 접근성 패턴.
 */
export const FieldTextarea = forwardRef(function FieldTextarea(
  {
    label,
    name,
    id,
    value,
    onChange,
    onBlur,
    placeholder,
    required = false,
    disabled = false,
    readOnly = false,
    rows = 3,
    maxLength,
    hint,
    error,
    className = "",
    textareaClassName = "",
    autoResize = true,
  },
  ref
) {
  const reactId = useId();
  const textareaId = id || `${name || "fta"}-${reactId}`;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;

  const describedBy = useMemo(
    () => [hintId, errorId].filter(Boolean).join(" ") || undefined,
    [hintId, errorId]
  );

  const innerRef = useRef(null);
  const mergedRef = (node) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const [len, setLen] = useState(value?.length || 0);
  useEffect(() => setLen(value?.length || 0), [value]);

  useEffect(() => {
    if (!autoResize) return;
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autoResize]);

  return (
    <div className={cx("w-full", className)}>
      <LabelRow htmlFor={textareaId} label={label} required={required} hint={hint} hintId={hintId} />

      <div
        className={cx(
          "rounded-lg border bg-white dark:bg-slate-900",
          error ? "border-rose-300" : "border-gray-300 dark:border-slate-700",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <textarea
          ref={mergedRef}
          id={textareaId}
          name={name}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value, e)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cx(
            "w-full resize-none px-3 py-2 rounded-lg outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100",
            textareaClassName
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <ErrorText error={error} errorId={errorId} />
        {maxLength ? (
          <span className="ml-auto mt-1 text-[11px] text-gray-400">{len}/{maxLength}</span>
        ) : null}
      </div>
    </div>
  );
});

// 사용 예시
// <FieldInput label="이름" value={name} onChange={setName} required maxLength={100} />
// <FieldTextarea label="설명" value={desc} onChange={setDesc} rows={4} maxLength={1000} hint="1000자 이내" />
// <FieldCard label="기본 정보"> ... </FieldCard>
