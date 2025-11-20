// TodaySummaryRow.jsx

import React from "react";

const BADGE_VARIANTS = {
  primary: "bg-indigo-50 text-indigo-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-600",
  neutral: "bg-slate-100 text-slate-600",
};

function TodaySummaryRow({ items = [] }) {
  // items: [{ key, title, value, badgeLabel, badgeVariant, onClick }]
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const {
          key,
          title,
          value,
          badgeLabel,
          badgeVariant = "neutral",
          onClick,
        } = item;

        const badgeClass =
          BADGE_VARIANTS[badgeVariant] ?? BADGE_VARIANTS.neutral;

        const CardTag = onClick ? "button" : "div";

        return (
          <CardTag
            key={key}
            type={onClick ? "button" : undefined}
            onClick={onClick}
            className={[
              "w-full text-left rounded-2xl border border-slate-100",
              "bg-white shadow-sm px-6 py-4",
              "flex justify-between",          // 좌: 텍스트, 우: 배지
              "transition hover:shadow-md hover:border-slate-200",
              onClick ? "cursor-pointer" : "",
            ].join(" ")}
          >
            {/* 왼쪽: 타이틀 + 숫자 */}
            <div className="flex flex-col justify-between">
              <span className="text-xs font-medium text-slate-500">
                {title}
              </span>
              <span className="mt-4 text-3xl font-semibold text-slate-900">
                {value}
              </span>
            </div>

            {/* 오른쪽: 아래쪽으로 내린 배지 */}
            {badgeLabel && (
              <div className="flex flex-col justify-end">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
          </CardTag>
        );
      })}
    </div>
  );
}

export default TodaySummaryRow;