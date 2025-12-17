import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  PlayCircle,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";

// ✅ RunSummaryModal 추가 (경로는 프로젝트에 맞게 조정)
import RunSummaryModal from "./RunSummaryModal.jsx";

function formatDuration(ms) {
  if (ms == null) return "-";
  const v = Number(ms);
  if (!Number.isFinite(v)) return "-";
  const min = Math.floor(v / 60000);
  const sec = Math.floor((v % 60000) / 1000);
  return `${min}분 ${sec}초`;
}

function normalizeResult(value) {
  if (value == null) return "N_A";
  const s = String(value).toUpperCase();
  // 서버가 다양한 이름을 쓸 수 있어 방어적으로 처리
  if (s === "SUCCESS" || s === "OK") return "PASS";
  if (s === "FAILURE" || s === "ERROR") return "FAIL";
  return s;
}

function statusTextClass(status) {
  if (status === "REGRESSION") return "text-amber-600";
  if (status === "FAIL") return "text-rose-600";
  if (status === "PASS") return "text-emerald-600";
  return "text-slate-500";
}

function StatusIcon({ status }) {
  if (status === "REGRESSION") return <AlertTriangle size={18} className="text-amber-600" />;
  if (status === "FAIL") return <XCircle size={18} className="text-rose-600" />;
  if (status === "PASS") return <CheckCircle2 size={18} className="text-emerald-600" />;
  return <AlertTriangle size={18} className="text-slate-400" />;
}

function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(920px,92vw)] max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="font-bold text-slate-800">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function HeatmapDetailPanel({
                                             selectedCell,
                                             loading = false,
                                             errorMessage = "",
                                             runs = [],
                                             onReload,
                                           }) {
  const navigate = useNavigate();

  // ✅ 결과요약: runId로 RunSummaryModal을 여는 로직만 추가
  const [summaryRunId, setSummaryRunId] = useState(null);

  const { runCount, avgDurationMs, totalStepsRepresentative, passCount, failCount } = useMemo(() => {
    const list = Array.isArray(runs) ? runs : [];
    const n = list.length;

    const durations = list.map((r) => r?.durationMs).filter((x) => x != null);
    const avg = durations.length ? durations.reduce((a, b) => a + Number(b), 0) / durations.length : null;

    const totalSteps =
      list.map((r) => r?.totalSteps).find((x) => x != null) ?? null;

    let pass = 0;
    let fail = 0;
    for (const r of list) {
      const rr = normalizeResult(r?.result);
      if (rr === "PASS") pass += 1;
      else if (rr === "FAIL") fail += 1;
    }

    return { runCount: n, avgDurationMs: avg, totalStepsRepresentative: totalSteps, passCount: pass, failCount: fail };
  }, [runs]);

  if (!selectedCell) {
    return <div></div>;
  }

  const title = selectedCell.testCode
    ? `${selectedCell.testCode} · ${selectedCell.testName}`
    : selectedCell.testName;

  const displayStatus = selectedCell.status; // Heatmap 셀 상태(REGRESSION/FAIL/PASS)

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
            <span className="text-slate-300 font-light">|</span>
            <span className="text-slate-500 font-medium">{selectedCell.date}</span>

            {/* 간단 요약 배지(선택) */}
            {(runCount > 0) && (
              <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                PASS {passCount} / FAIL {failCount}
              </span>
            )}
          </div>

          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50 border-b border-slate-200">
          <div className="p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase mb-1">상태</span>
            <div className={`flex items-center gap-2 font-bold ${statusTextClass(displayStatus)}`}>
              <StatusIcon status={displayStatus} />
              <span>{displayStatus}</span>
            </div>
          </div>

          <div className="p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <PlayCircle size={12} /> 총 실행
            </span>
            <span className="text-lg font-bold text-slate-700">{runCount}번</span>
          </div>

          <div className="p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <ListChecks size={12} /> 총 스텝 수
            </span>
            <span className="text-lg font-bold text-slate-700">
              {totalStepsRepresentative ?? "-"}
            </span>
          </div>

          <div className="p-4 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Clock size={12} /> 평균 실행 시간
            </span>
            <span className="text-lg font-bold text-slate-700">{formatDuration(avgDurationMs)}</span>
          </div>
        </div>

        {/* Error */}
        {!!errorMessage && (
          <div className="p-4 border-b border-slate-100">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-fixed">
            {/* 컬럼 폭 고정 */}
            <colgroup>
              <col className="w-24" />          {/* 차수 */}
              <col className="w-32" />          {/* 실행 시각 */}
              <col className="w-40" />          {/* 소요 시간 */}
              <col className="w-[260px]" />     {/* 결과 */}
              <col className="w-[240px]" />     {/* 기능 */}
            </colgroup>

            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 font-medium">차수</th>
              <th className="px-6 py-3 font-medium text-center">실행 시각</th>
              <th className="px-6 py-3 font-medium text-center">소요 시간</th>
              <th className="px-6 py-3 font-medium">결과</th>
              <th className="px-6 py-3 font-medium text-center">기능</th>
            </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
            {/* 로딩 중 + 아직 데이터 없음 */}
            {loading && (runs?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  데이터를 불러오는 중입니다…
                </td>
              </tr>
            )}

            {/* 로딩 아님 + 데이터 없음 */}
            {!loading && (runs?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  데이터가 없습니다.
                </td>
              </tr>
            )}

            {(runs ?? []).map((run, index) => {
              const rr = normalizeResult(run?.result);
              const isPass = rr === "PASS";
              const isFail = rr === "FAIL";

              return (
                <tr key={`${run?.id ?? "run"}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-600">{index + 1}차</td>

                  <td className="px-6 py-4 font-mono text-slate-500 text-center whitespace-nowrap">
                    {run?.timestamp ?? "-"}
                  </td>

                  <td className="px-6 py-4 font-medium text-slate-700 text-center whitespace-nowrap">
                    {formatDuration(run?.durationMs)}
                  </td>

                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 font-bold ${
                      isPass ? "text-emerald-600" : isFail ? "text-rose-600" : "text-slate-600"
                    }`}>
                      {isPass ? <CheckCircle2 size={16} /> : isFail ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                      <span className="whitespace-nowrap">{rr}</span>
                    </div>

                    {run?.totalSteps != null && (
                      <div className="mt-1 text-xs text-slate-400">
                        총 {run.totalSteps} Steps
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSummaryRunId(run?.id)}  // ✅ 로직만 변경
                        className="text-xs border border-slate-300 rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400 transition-colors font-medium flex items-center gap-1"
                      >
                        <FileText size={12} /> 결과요약
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/results/${run.id}/detail`)}
                        className="text-xs border border-slate-300 rounded px-3 py-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors font-medium"
                      >
                        상세보기
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* 하단 미세 로딩 */}
        {(runs?.length ?? 0) > 0 && loading && (
          <div className="p-4 text-[11px] text-slate-400 flex items-center gap-2 border-t border-slate-100">
            <RefreshCw size={12} className="animate-spin" />
            데이터를 새로 불러오는 중입니다…
          </div>
        )}
      </div>

      {/* 결과요약: runId 기반 리포트 모달 */}
      <RunSummaryModal
        open={!!summaryRunId}
        onClose={() => setSummaryRunId(null)}
        runId={summaryRunId}
      />

      {/* 결과요약 모달(단순 버전) */}
      {/*<Modal title="실행 결과 요약" open={!!summaryRun} onClose={() => setSummaryRun(null)}>*/}
      {/*  <div className="text-sm text-slate-700 space-y-2">*/}
      {/*    <div className="flex items-center justify-between">*/}
      {/*      <span className="text-slate-500">Run ID</span>*/}
      {/*      <span className="font-mono">{summaryRun?.id ?? "-"}</span>*/}
      {/*    </div>*/}

      {/*    <div className="flex items-center justify-between">*/}
      {/*      <span className="text-slate-500">Start</span>*/}
      {/*      <span className="font-mono">{summaryRun?.startedAt ?? "-"}</span>*/}
      {/*    </div>*/}

      {/*    <div className="flex items-center justify-between">*/}
      {/*      <span className="text-slate-500">End</span>*/}
      {/*      <span className="font-mono">{summaryRun?.endedAt ?? "-"}</span>*/}
      {/*    </div>*/}

      {/*    <div className="flex items-center justify-between">*/}
      {/*      <span className="text-slate-500">Duration</span>*/}
      {/*      <span className="font-mono">{formatDuration(summaryRun?.durationMs)}</span>*/}
      {/*    </div>*/}

      {/*    <div className="flex items-center justify-between">*/}
      {/*      <span className="text-slate-500">Result</span>*/}
      {/*      <span className="font-mono">{normalizeResult(summaryRun?.result)}</span>*/}
      {/*    </div>*/}

      {/*    <div className="mt-4 text-xs text-slate-400">*/}
      {/*      ※ 추후 “FailCode 요약”, “실패 테스트케이스 목록” 등*/}
      {/*    </div>*/}
      {/*  </div>*/}

      {/*  <div className="mt-4">*/}
      {/*    <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">*/}
      {/*      {JSON.stringify(summaryRun?.raw ?? {}, null, 2)}*/}
      {/*    </pre>*/}
      {/*  </div>*/}
      {/*</Modal>*/}
    </>
  );
}