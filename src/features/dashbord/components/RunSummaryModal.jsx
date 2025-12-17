import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip } from "recharts";
import {
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  Clock,
  PlayCircle,
  SkipForward,
  AlertOctagon,
  CheckCircle2,
  Smartphone,
  Cpu,
  Search,
  Filter
} from "lucide-react";
import { getScenarioTestDetail } from "../../../services/testAPI.js";
import { IconExternalLink } from '../../../shared/components/icons.jsx';

// ---------- Utils ----------
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtDT(value) {
  if (!value) return "-";
  return String(value).replace("T", " ");
}

function calcDurationMs(start, end) {
  if (!start || !end) return null;
  const s = Date.parse(String(start));
  const e = Date.parse(String(end));
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return Math.max(0, e - s);
}

function formatDuration(ms) {
  if (ms == null) return "-";
  const v = safeNum(ms, NaN);
  if (!Number.isFinite(v)) return "-";
  const min = Math.floor(v / 60000);
  const sec = Math.floor((v % 60000) / 1000);
  return `${min}분 ${sec}초`;
}

function normalizeRunResult(value) {
  if (value == null) return "N_A";
  const s = String(value).toUpperCase();
  if (s === "SUCCESS" || s === "OK") return "PASS";
  if (s === "FAILURE" || s === "ERROR") return "FAIL";
  return s;
}

// ---------- Constants & Theme ----------
const COLORS = {
  PASS: "#10b981", // Emerald 500
  FAIL: "#f43f5e", // Rose 500
  N_A: "#0ea5e9", // Sky 500
  SKIP: "#94a3b8", // Slate 400
  JUMP: "#f59e0b", // Amber 500
  UNKNOWN: "#cbd5e1" // Slate 300
};

const CHART_COLORS = {
  PASS: "#34d399", // Emerald 400
  FAIL: "#fb7185", // Rose 400
  N_A: "#38bdf8", // Sky 400
  SKIP: "#cbd5e1", // Slate 300
  JUMP: "#fbbf24", // Amber 400
};

// ---------- Sub Components ----------

function StatusBadge({ status, className = "" }) {
  const normalized = normalizeRunResult(status);
  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = null;
  let label = normalized;

  switch (normalized) {
    case "PASS":
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = <CheckCircle2 size={12} className="mr-1" />;
      label = "성공";
      break;
    case "FAIL":
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      icon = <AlertOctagon size={12} className="mr-1" />;
      label = "실패";
      break;
    case "SKIP":
      styles = "bg-slate-100 text-slate-500 border-slate-200";
      icon = <SkipForward size={12} className="mr-1" />;
      label = "건너뜀";
      break;
    case "N_A":
      styles = "bg-sky-50 text-sky-700 border-sky-200";
      icon = <AlertTriangle size={12} className="mr-1" />;
      label = "미실행";
      break;
    case "JUMP":
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      icon = <PlayCircle size={12} className="mr-1" />;
      label = "점프";
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${styles} ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, colorClass = "text-slate-800" }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
          <div className={`text-xl font-bold tracking-tight ${colorClass}`}>{value}</div>
          {!!sub && <div className="mt-1 text-[11px] font-medium text-slate-400">{sub}</div>}
        </div>
        {Icon && (
          <div className="p-2 bg-slate-50 rounded-lg">
            <Icon size={18} className="text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function RunSummaryModal({ open, onClose, runId }) {
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [detail, setDetail] = useState(null);
  const [selectedFailCode, setSelectedFailCode] = useState("ALL");

  useEffect(() => {
    if (!open || !runId) return;
    let alive = true;

    async function fetchDetail() {
      setLoading(true);
      setErrMsg("");
      try {
        const data = await getScenarioTestDetail(runId);
        if (!alive) return;
        setDetail(data);
      } catch (e) {
        if (!alive) return;
        setErrMsg(e?.response?.data?.error?.message || e?.message || "데이터를 불러오는데 실패했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchDetail();
    return () => { alive = false; };
  }, [open, runId]);

  // Data processing (Memoized)
  const testCaseResults = useMemo(() => {
    const list = detail?.testCaseResults;
    return Array.isArray(list) ? list : [];
  }, [detail]);

  const execInfo = useMemo(() => {
    const startTime = detail?.startTime ?? null;
    const endTime = detail?.endTime ?? null;

    const durationMs =
      calcDurationMs(startTime, endTime) ??
      (detail?.durationMs != null ? safeNum(detail.durationMs, null) : null);

    const sum = { PASS: 0, FAIL: 0, N_A: 0, SKIP: 0, JUMP: 0, total: 0 };

    for (const t of testCaseResults) {
      sum.PASS += safeNum(t?.passStepCount);
      sum.FAIL += safeNum(t?.failStepCount);
      sum.N_A += safeNum(t?.naStepCount);
      sum.SKIP += safeNum(t?.skipStepCount);
      sum.JUMP += safeNum(t?.jumpStepCount);
      sum.total += safeNum(t?.totalStepCount);
    }

    const totalStepsRepresentative = detail?.totalStepCount != null ? safeNum(detail.totalStepCount, sum.total) : sum.total;
    const effectiveSteps = Math.max(0, totalStepsRepresentative - sum.SKIP);

    return {
      startTime,
      endTime,
      durationMs,
      totalStepsRepresentative,
      effectiveSteps,
      jumpCount: sum.JUMP,
      stepSum: sum,
    };
  }, [detail, testCaseResults]);

  const donutData = useMemo(() => {
    const s = execInfo.stepSum;
    const labels = {
      PASS: "성공",
      FAIL: "실패",
      N_A: "미실행",
      SKIP: "건너뜀",
      JUMP: "점프"
    };
    return [
      { name: "PASS", label: labels.PASS, value: s.PASS },
      { name: "FAIL", label: labels.FAIL, value: s.FAIL },
      { name: "N_A", label: labels.N_A, value: s.N_A },
      { name: "SKIP", label: labels.SKIP, value: s.SKIP },
      { name: "JUMP", label: labels.JUMP, value: s.JUMP },
    ].filter(d => d.value > 0);
  }, [execInfo]);

  const donutTotal = useMemo(() => donutData.reduce((a, b) => a + safeNum(b.value), 0), [donutData]);

  // Fail Code Analysis
  const failCodeStats = useMemo(() => {
    const map = new Map();
    for (const t of testCaseResults) {
      const tr = normalizeRunResult(t?.result);
      const hasFailStep = safeNum(t?.failStepCount) > 0;
      const codeDto = t?.testFailCode;
      const codeKey = codeDto?.code ?? codeDto?.failCode ?? codeDto?.key;

      const isFail = tr === "FAIL" || hasFailStep || !!codeKey;
      if (!isFail) continue;

      const key = codeKey ?? "UNKNOWN";
      const prev = map.get(key);
      const item = {
        code: key,
        title: codeKey ? (codeDto?.name ?? codeDto?.title ?? "-") : "미분류 실패",
        desc: codeKey ? (codeDto?.description ?? codeDto?.desc ?? "-") : "특정 에러 코드가 없습니다.",
        count: (prev?.count ?? 0) + 1,
      };
      map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [testCaseResults]);

  const filteredFailDetails = useMemo(() => {
    const getCodeKey = (t) => t?.testFailCode?.code ?? t?.testFailCode?.failCode ?? "UNKNOWN";

    // Base filter for failed items
    const failedItems = testCaseResults.filter((t) => {
      const tr = normalizeRunResult(t?.result);
      return tr === "FAIL" || safeNum(t?.failStepCount) > 0 || !!getCodeKey(t) && getCodeKey(t) !== "UNKNOWN";
    });

    if (selectedFailCode === "ALL") return failedItems;
    return failedItems.filter((t) => getCodeKey(t) === selectedFailCode);
  }, [testCaseResults, selectedFailCode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">
                {detail?.scenarioTest?.testName ?? "테스트 실행 요약"}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                            {detail?.scenarioTest?.code ?? "Unknown Code"}
                        </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">실행 #{runId}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-50/50">

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
              <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
              <span className="text-sm font-medium">데이터 불러오는 중...</span>
            </div>
          )}

          {errMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700 mb-6">
              <AlertTriangle size={20} />
              <span className="font-medium">{errMsg}</span>
            </div>
          )}

          {!loading && !errMsg && detail && (
            <div className="space-y-6">

              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard
                  label="소요 시간"
                  value={formatDuration(execInfo.durationMs)}
                  sub={`${fmtDT(execInfo.startTime).split(' ')[1]} - ${fmtDT(execInfo.endTime).split(' ')[1]}`}
                  icon={Clock}
                />
                <StatCard
                  label="전체 단계"
                  value={`${execInfo.totalStepsRepresentative} 단계`}
                  sub={`유효 ${execInfo.effectiveSteps} 단계`}
                  icon={CheckCircle2}
                />
                <StatCard
                  label="성공률"
                  value={`${((execInfo.stepSum.PASS / (execInfo.effectiveSteps || 1)) * 100).toFixed(1)}%`}
                  colorClass="text-emerald-600"
                  icon={PlayCircle}
                />
                <StatCard
                  label="기기"
                  value={detail.deviceName || "Unknown"}
                  sub={detail.deviceOs}
                  icon={Smartphone}
                />
                <StatCard
                  label="환경"
                  value={detail.runTriggerType || "Manual"}
                  sub={detail.deviceUdid}
                  icon={Cpu}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Charts */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    결과 분포
                  </h3>
                  <div className="flex-1 min-h-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={CHART_COLORS[entry.name] || "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [value, props.payload.label]}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-slate-800 tracking-tight">{donutTotal}</span>
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">단계</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[d.name] }} />
                          <span className="text-xs font-semibold text-slate-600">{d.label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Analysis & Logs */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
                  <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-1 h-4 bg-rose-500 rounded-full"></span>
                      실패 분석
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedFailCode !== "ALL" && (
                        <button
                          onClick={() => setSelectedFailCode("ALL")}
                          className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm transition-all"
                        >
                          <Filter size={12} />
                          필터 초기화
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Changed Layout: Top Horizontal Scroll + Bottom Table */}
                  <div className="flex flex-col h-full overflow-hidden">

                    {/* Top: Failure Categories (Chips) */}
                    <div className="shrink-0 border-b border-slate-100 bg-slate-50/30 p-4 overflow-x-auto flex gap-3 snap-x">
                      {failCodeStats.length === 0 ? (
                        <div className="w-full flex items-center justify-center text-slate-400 py-2">
                          <CheckCircle2 size={16} className="mr-2 text-emerald-400" />
                          <span className="text-xs font-medium">실패 항목이 없습니다.</span>
                        </div>
                      ) : (
                        failCodeStats.map((fc) => (
                          <button
                            key={fc.code}
                            onClick={() => setSelectedFailCode(fc.code)}
                            className={`snap-start shrink-0 min-w-[240px] text-left p-3 rounded-xl border transition-all duration-200 group relative ${
                              selectedFailCode === fc.code
                                ? "bg-white border-rose-200 shadow-md ring-1 ring-rose-100"
                                : "bg-white border-transparent hover:border-slate-200 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${selectedFailCode === fc.code ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                                                        {fc.code}
                                                    </span>
                              <span className="text-xs font-extrabold text-slate-400 group-hover:text-slate-800 transition-colors">
                                                        {fc.count}건
                                                    </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-700 truncate mb-0.5">
                              {fc.title}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed h-[2.5em]">
                              {fc.desc}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Bottom: Detail Table */}
                    <div className="flex-1 overflow-auto bg-white relative">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12 text-center">#</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-24">코드</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-40">테스트 케이스</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">실패 상세</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-30">Jira</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {filteredFailDetails.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400">
                              <div className="flex flex-col items-center">
                                <Search size={24} className="mb-2 opacity-50" />
                                <span className="text-sm">조건에 맞는 실패 항목이 없습니다.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredFailDetails.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-4 py-3 text-xs text-slate-400 text-center font-mono">{t.order}</td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-xs font-medium text-slate-600">{t.testCaseCode}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                  {t.testCaseName}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  {t.testFailCode && (
                                    <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold">
                                      <AlertOctagon size={10} />
                                      {t.testFailCode.code}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-600 leading-snug break-all">
                                    {t.failComment || ""}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {t.jiraIssueKey ? (
                                  <a
                                    href={`https://skt-test-automation-temp.atlassian.net/browse/${t.jiraIssueKey}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:underline dark:bg-blue-900/20 dark:text-blue-300 transition-colors"
                                  >
                                    {t.jiraIssueKey}
                                    <IconExternalLink />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {detail.errorMessage && (
                <div className="mt-3 bg-red-50 border border-red-100 text-red-800 text-xs p-3 rounded-lg font-mono">
                  <span className="font-bold block mb-1">시스템 에러 메시지</span>
                  {detail.errorMessage}
                </div>
              )}
              {/* Footer / Comments */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 items-start">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                  <FileText size={18} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">실행 코멘트</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {detail.comment || "코멘트가 없습니다."}
                  </p>

                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}