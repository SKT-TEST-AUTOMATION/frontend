// src/features/testresult/components/TestResultChart.jsx
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * props.stats 예시:
 * {
 *   total: number,
 *   pass: number,
 *   fail: number,
 *   skip: number,
 *   na: number,
 *   jump: number,
 * }
 */
const SLICE_CONFIG = [
  { key: "PASS", label: "PASS", field: "pass", color: "#10B981" }, // emerald-500
  { key: "FAIL", label: "FAIL", field: "fail", color: "#EF4444" }, // red-500
  { key: "SKIP", label: "SKIP", field: "skip", color: "#F59E0B" }, // amber-500
  { key: "NA",   label: "N/A",  field: "na",   color: "#6B7280" }, // gray-500
  { key: "JUMP", label: "JUMP", field: "jump", color: "#3B82F6" }, // blue-500
];

export default function TestResultChart({ stats }) {
  const { data, totalSteps, successRate } = useMemo(() => {
    if (!stats) {
      return {
        data: [],
        totalSteps: 0,
        successRate: 0,
      };
    }

    const total = stats.total ?? 0;

    const chartData = SLICE_CONFIG.map((cfg) => {
      const value = stats[cfg.field] ?? 0;
      return {
        key: cfg.key,
        name: cfg.label,
        value,
        color: cfg.color,
      };
    }).filter((d) => d.value > 0);

    const successBase = stats.pass ?? 0;
    const rate =
      total > 0 ? Math.round((successBase / total) * 100) : 0;

    // 전부 0이면 회색 도넛 하나
    if (chartData.length === 0) {
      return {
        data: [
          {
            key: "EMPTY",
            name: "No Data",
            value: 1,
            color: "#E5E7EB",
            isEmpty: true,
          },
        ],
        totalSteps: 0,
        successRate: 0,
      };
    }

    return {
      data: chartData,
      totalSteps: total,
      successRate: rate,
    };
  }, [stats]);

  if (!stats) return null;

  return (
    <div className="relative w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)",
              fontSize: 12,
            }}
            itemStyle={{
              fontSize: 12,
              fontWeight: 600,
            }}
            formatter={(value, name) => [`${value} step`, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 가운데 중심 텍스트 */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
          성공률
        </span>
        <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {successRate}%
        </span>
        <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          총 {totalSteps} step
        </span>
      </div>
    </div>
  );
}