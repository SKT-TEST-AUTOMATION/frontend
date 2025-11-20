import React from "react";

/**
 * props:
 *   value: string (YYYY-MM-DD)
 *   onChange: (newValue: string) => void
 *   placeholder?: string
 */
export default function DateWithTodayClear({ value, onChange, placeholder }) {
  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="relative w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full h-10 px-3.5 pr-14
          bg-white dark:bg-gray-700
          border border-gray-300 dark:border-gray-600
          rounded-lg text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        "
      />

      {/* 우측 토글 버튼 */}
      {value ? (
        // 지우기 버튼
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute top-1/2 -translate-y-1/2 right-2
            text-[11px] px-2 py-0.5
            rounded border border-gray-300 dark:border-gray-500
            text-gray-600 dark:text-gray-300
            bg-white dark:bg-gray-700
            hover:bg-gray-50 dark:hover:bg-gray-600
          "
        >
          지우기
        </button>
      ) : (
        // 오늘 버튼
        <button
          type="button"
          onClick={handleToday}
          className="
            absolute top-1/2 -translate-y-1/2 right-2
            text-[11px] px-2 py-0.5
            rounded border border-blue-300 text-blue-600 dark:text-blue-300
            bg-white dark:bg-gray-700
            hover:bg-blue-50 dark:hover:bg-blue-900/20
          "
        >
          오늘
        </button>
      )}
    </div>
  );
}