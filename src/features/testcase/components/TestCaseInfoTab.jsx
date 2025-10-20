import React from "react";

function FieldCard({ label, children, className = "" }) {
  return (
    <div className={`bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/60 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{label}</label>}
      {children}
    </div>
  );
}

function StepsEditor({
  value = [""],
  onChange,
  addLabel = "+ 추가",
  readOnly = false,
  enterAddsStep = true,
}) {
  if (readOnly) {
    const items = (value?.length ? value : [""]).filter(Boolean);
    return (
      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-gray-500 dark:text-gray-400">-</li>
        )}
        {items.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="flex-none inline-flex items-center justify-center w-6 h-6 rounded-md
                      bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
                      text-xs font-semibold"
            >
              {i + 1}
            </span>
            <p className="flex-1 text-sm leading-6 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words m-0">
              {s}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  const inputRefs = React.useRef([]);

  const setInputRef = (idx) => (el) => {
    inputRefs.current[idx] = el;
  };

  const focusIndex = (idx) => {
    const el = inputRefs.current[idx];
    if (el) el.focus();
  };

  const update = (idx, v) => {
    const next = [...(value || [])];
    next[idx] = v;
    onChange?.(next);
  };

  const add = (focus = false) => {
    const next = [...(value || []), ""];
    onChange?.(next);
    if (focus) {
      requestAnimationFrame(() => focusIndex(next.length - 1));
    }
  };

  const remove = (idx) => {
    const filtered = (value || []).filter((_, i) => i !== idx);
    const next = filtered.length ? filtered : [""];
    onChange?.(next);
    requestAnimationFrame(() => {
      const target = Math.min(idx, next.length - 1);
      focusIndex(target);
    });
  };

  const handleKeyDown = (e) => {
    if (!enterAddsStep) return;
    const composing = e.nativeEvent?.isComposing || e.isComposing || e.nativeEvent?.keyCode === 229;
    if (composing) return;

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      add(true);
    }
  };

  return (
    <div className="space-y-2">
      {(value?.length ? value : [""]).map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{i + 1}</div>
          <input
            ref={setInputRef(i)}
            value={s}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100"
            placeholder={`단계 ${i + 1} 입력`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-2 py-1 text-sm rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => add(true)}
        className="w-full text-center py-2 px-4 border-2 border-dashed rounded-md text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10"
      >
        {addLabel}
      </button>
    </div>
  );
}

/**
 * TestCaseInfoTab
 * props:
 *  - form, set
 *  - procedureSteps, setProcedureSteps
 *  - expectedSteps, setExpectedSteps
 *  - readOnly
 *  - enterAddsStep
 *  - footerActions
 */
export default function TestCaseInfoTab({
  form, set,
  procedureSteps, setProcedureSteps,
  expectedSteps, setExpectedSteps,
  readOnly = false,
  enterAddsStep = true,
  footerActions = null,
}) {
  const inputCls = [
    "w-full px-3 py-2 rounded-md text-sm",
    readOnly
      ? "bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400"
      : "bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700 text-gray-800 dark:text-gray-100",
  ].join(" ");

  const textAreaProps = (v, key) => ({
    rows: 4,
    value: v,
    onChange: (e) => !readOnly && set({ [key]: e.target.value }),
    placeholder: readOnly ? undefined : (key === "precondition" ? "선행조건 입력" : key === "navigation" ? "경로 입력" : "입력"),
    className: inputCls + " resize-none",
    readOnly,
    disabled: readOnly,
  });

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <FieldCard label="식별자">
        <input
          value={form.code}
          onChange={(e) => !readOnly && set({ code: e.target.value })}
          placeholder={readOnly ? undefined : "예: TC-001"}
          className={inputCls}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </FieldCard>

      <FieldCard label="명칭">
        <input
          value={form.name}
          onChange={(e) => !readOnly && set({ name: e.target.value })}
          placeholder={readOnly ? undefined : "테스트 케이스 명칭을 입력하세요"}
          required={!readOnly}
          className={inputCls}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </FieldCard>

      <FieldCard label="선행 조건">
        <textarea {...textAreaProps(form.precondition, "precondition")} />
      </FieldCard>

      <FieldCard label="경로">
        <textarea {...textAreaProps(form.navigation, "navigation")} />
      </FieldCard>

      <FieldCard label="테스트 절차" className="sm:col-span-2">
        <StepsEditor
          value={procedureSteps}
          onChange={setProcedureSteps}
          addLabel="+ 단계 추가"
          readOnly={readOnly}
          enterAddsStep={enterAddsStep}
        />
      </FieldCard>

      <FieldCard label="예상 결과" className="sm:col-span-2">
        <StepsEditor
          value={expectedSteps}
          onChange={setExpectedSteps}
          addLabel="+ 항목 추가"
          readOnly={readOnly}
          enterAddsStep={enterAddsStep}
        />
      </FieldCard>

      <FieldCard label="비고(내부용)" className="sm:col-span-2">
        <textarea
          rows={3}
          value={form.comment}
          onChange={(e) => !readOnly && set({ comment: e.target.value })}
          placeholder={readOnly ? undefined : "추가 메모를 입력하세요"}
          className={inputCls + " resize-none"}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </FieldCard>

      {footerActions && (
        <div className="sm:col-span-2 flex items-center justify-end">
          {footerActions}
        </div>
      )}
    </div>
  );
}