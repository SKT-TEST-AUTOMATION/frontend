import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = {
  PASS: "#34d399", // Emerald 400
  FAIL: "#fb7185", // Rose 400
  N_A: "#38bdf8",  // Sky 400
  SKIP: "#cbd5e1", // Slate 300
  JUMP: "#fbbf24", // Amber 400
};

const SLICE_CONFIG = [
  { key: "PASS", label: "성공", field: "pass", color: CHART_COLORS.PASS },
  { key: "FAIL", label: "실패", field: "fail", color: CHART_COLORS.FAIL },
  { key: "N_A",  label: "미실행", field: "na",  color: CHART_COLORS.N_A },
  { key: "SKIP", label: "건너뜀", field: "skip", color: CHART_COLORS.SKIP },
  { key: "JUMP", label: "점프", field: "jump", color: CHART_COLORS.JUMP },
];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function TestResultChart({ stats }) {
  const {
    data,
    totalSteps,
    successRate,
    counts,
  } = useMemo(() => {
    if (!stats) {
      return { data: [], totalSteps: 0, successRate: 0, counts: null };
    }

    const pass = safeNum(stats.pass);
    const fail = safeNum(stats.fail);
    const skip = safeNum(stats.skip);
    const na = safeNum(stats.na);
    const jump = safeNum(stats.jump);

    // total이 없으면 합산으로 보정
    const computedTotal = pass + fail + skip + na + jump;
    const total = stats.total != null ? safeNum(stats.total) : computedTotal;

    const chartData = SLICE_CONFIG
      .map((cfg) => {
        const value = safeNum(stats[cfg.field]);
        return {
          key: cfg.key,
          name: cfg.key,       // recharts용
          label: cfg.label,    // tooltip/아래 박스용
          value,
          color: cfg.color,
        };
      })
      .filter((d) => d.value > 0);

    const rate = total > 0 ? Math.round((pass / total) * 100) : 0;

    // 전부 0이면 회색 도넛 하나
    const normalizedData =
      chartData.length === 0
        ? [{ key: "EMPTY", name: "EMPTY", label: "No Data", value: 1, color: "#E2E8F0", isEmpty: true }]
        : chartData;

    return {
      data: normalizedData,
      totalSteps: total,
      successRate: rate,
      counts: { PASS: pass, FAIL: fail, SKIP: skip, N_A: na, JUMP: jump, TOTAL: total },
    };
  }, [stats]);

  if (!stats) return null;

  const bottomItems = [
    { key: "PASS", label: "성공", value: counts?.PASS ?? 0, dot: CHART_COLORS.PASS },
    { key: "FAIL", label: "실패", value: counts?.FAIL ?? 0, dot: CHART_COLORS.FAIL },
    { key: "SKIP", label: "건너뜀", value: counts?.SKIP ?? 0, dot: CHART_COLORS.SKIP },
    { key: "N_A", label: "미실행", value: counts?.N_A ?? 0, dot: CHART_COLORS.N_A },
    { key: "JUMP", label: "점프", value: counts?.JUMP ?? 0, dot: CHART_COLORS.JUMP },
    // Total은 점 없이(혹은 slate 점으로) 처리 — RunSummaryModal 톤을 유지
    { key: "TOTAL", label: "Total", value: counts?.TOTAL ?? totalSteps, dot: "#94a3b8" },
  ];

  return (
    <div className="w-full">
      {/* 도넛 */}
      <div className="relative w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value, name, props) => [value, props?.payload?.label ?? name]}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{
                fontSize: "12px",
                fontWeight: 600,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 가운데 중심 텍스트 */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            성공률
          </span>
          <span className="text-2xl font-semibold text-slate-900">
            {successRate}%
          </span>
          <span className="mt-1 text-[11px] text-slate-500">
            총 {totalSteps} step
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {bottomItems.map((d) => (
          <div
            key={d.key}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: d.dot }}
              />
              <span className="text-xs font-semibold text-slate-600">
                {d.label}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-800">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}