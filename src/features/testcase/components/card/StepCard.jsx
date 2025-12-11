import React, { useState } from "react";
import {
  Copy,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import {
  STEP_HEADERS,
  STEP_FIELD_CONFIG,
  ACTION_OPTIONS_LABELS, VERIFICATION_BY_OPTIONS,
} from '../../constants/stepConstants.js';

export default function StepCard({
                                   step,
                                   labels,
                                   fieldConfig,
                                   onFieldChange,
                                   onDuplicate,
                                   onDelete,
                                   dragHandleProps,
                                   readOnly
                                 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (field, value) => {
    onFieldChange(step.id, field, value);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // action 코드 → 한글 라벨로 바꿔주는 헬퍼
  const getActionLabel = (value) =>
  {
    const lowercaseValue = value.toLowerCase();
    return (lowercaseValue && ACTION_OPTIONS_LABELS?.[lowercaseValue]) || value || "";
  }

  // Helper to get a summary text for collapsed view
  const getSummary = () => {
    const parts = [];
    if (step.action) {
      const actionLabel = getActionLabel(step.action); // ★ 요기
      const actionByValue = step.value || "";
      parts.push(`${actionByValue} ${actionLabel}`);
    } else if (step.visible_if) {
      const visibleIfValue = step.visible_if;
      parts.push(`${visibleIfValue}가 있는지 검증`);
    }

    return parts.join("") || "No action";
  };

  const renderField = (key) => {
    const config = fieldConfig[key] || { type: "text" };
    const label = labels[key] ?? key;
    const colSpan = config.colSpan ?? 1;

    // Use col-span logic for grid
    const spanClass =
      colSpan === 3
        ? "col-span-1 sm:col-span-3"
        : colSpan === 2
          ? "col-span-1 sm:col-span-2"
          : "col-span-1";

    const baseInputClass =
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-gray-100";

    let inputNode;
    switch (config.type) {
      case "readonly":
        inputNode = (
          <div className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md border border-gray-200">
            {step[key]}
          </div>
        );
        break;
      case "select":
        inputNode = (
          <div className="relative">
            <select
              className={`${baseInputClass} appearance-none`}
              value={step[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
            >
              <option value="">선택해주세요.</option>
              {config.options?.map((opt) => {
                // ★ action일 때만 라벨을 ACTION_OPTIONS_LABELS에서 가져오고,
                //   그 외에는 기존 opt.label / opt.value 그대로 사용
                const optionValue = opt.value;
                const optionLabel =
                  key === "action"
                    ? getActionLabel(optionValue) || opt.label || optionValue
                    : opt.label ?? optionValue;

                return (
                  <option key={optionValue} value={optionValue}>
                    {optionLabel}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        );
        break;
      case "number":
        inputNode = (
          <input
            type="number"
            className={baseInputClass}
            value={step[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
        break;
      case "textarea":
        inputNode = (
          <textarea
            rows={2}
            className={baseInputClass}
            value={step[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
        break;
      case "yn-toggle": {
        const checked = step[key] === "Y";
        inputNode = (
          <button
            type="button"
            onClick={() => handleChange(key, checked ? "N" : "Y")}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${checked ? "bg-blue-600" : "bg-gray-200"}
            `}
            role="switch"
            aria-checked={checked}
          >
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${checked ? "translate-x-5" : "translate-x-0"}
              `}
            />
          </button>
        );
        break;
      }
      default: // text
        inputNode = (
          <input
            type="text"
            className={baseInputClass}
            value={step[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
    }

    return (
      <div key={key} className={`flex flex-col gap-1.5 ${spanClass}`}>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        {inputNode}
      </div>
    );
  };

  return (
    <div
      className={`
      group rounded-xl border bg-white transition-all duration-200
      ${
        isExpanded
          ? "border-blue-200 shadow-md ring-1 ring-blue-100"
          : "border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md"
      }
    `}
    >
      {/* Header - Clickable for toggle */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={toggleExpand}
      >
        {/* Drag Handle */}
        <div
          className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing p-1"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Step Number */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
          {step.no}
        </div>

        {/* Main Info */}
        <div className="flex flex-1 flex-col justify-center overflow-hidden">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {step.name || (
              <span className="text-gray-400 italic">Untitled Step</span>
            )}
          </h3>
          {!isExpanded && (
            <p className="truncate text-xs text-gray-500 mt-0.5">
              {getSummary()}
            </p>
          )}
        </div>

        {/* Actions */}
        {
          !readOnly && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(step.id);
                }}
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(step.id);
                }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        }

        {/* Chevron */}
        <div className="ml-2 text-gray-400">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Body - Inputs */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <div className="flex flex-col gap-6">
            {/* Core Info Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {renderField("name")}
              </div>
            </div>

            {/* Configuration Section */}
            <div className="space-y-4 rounded-lg bg-white p-4 border border-gray-100 shadow-sm">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                <AlertCircle className="w-3 h-3" />
                Conditions & Settings
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex gap-8 items-end sm:col-span-3">
                  {renderField("mandatory")}
                  {renderField("skip_on_error")}
                  {renderField("sleep")}
                </div>
                {renderField("visible_if")}
                {renderField("visible_if_type")}
              </div>
            </div>

            {/* Action Section */}
            <div className="space-y-4 rounded-lg bg-blue-50/30 p-4 border border-blue-100/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Action
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {renderField("action")}
                {renderField("by")}
                {renderField("input_text")}
                {renderField("value")}
              </div>
            </div>

            {/* Logic & Memo Section */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderField("true_jump_no")}
              {renderField("false_jump_no")}
              {renderField("memo")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}