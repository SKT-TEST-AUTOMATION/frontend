// src/features/testresult/components/ResultBadge.jsx
import React from "react";

const RESULT_STYLES = {
  PASS: {
    label: "PASS",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  FAIL: {
    label: "FAIL",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  },
  "N/A": {
    label: "N/A",
    className:
      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  },
};

export default function ResultBadge({ result }) {
  const key = result && RESULT_STYLES[result] ? result : "N/A";
  const config = RESULT_STYLES[key];

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}