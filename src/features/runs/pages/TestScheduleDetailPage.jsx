// src/features/schedule/pages/TestScheduleDetailPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../../shared/components/PageHeader";
import { useToast } from "../../../shared/hooks/useToast";
import {
  getTestSchedule,
  updateScheduleStatus,
  deleteSchedule,
} from "../../../services/scheduleAPI";

const WEEKDAYS = [
  { label: "월", bit: 0 },
  { label: "화", bit: 1 },
  { label: "수", bit: 2 },
  { label: "목", bit: 3 },
  { label: "금", bit: 4 },
  { label: "토", bit: 5 },
  { label: "일", bit: 6 },
];

function cls(...xs) { return xs.filter(Boolean).join(" "); }
const fmtDate = (d) => (!d ? "-" : /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? String(d) : (new Date(d)).toISOString().slice(0,10));
const fmtTime = (t) => (!t ? "--:--" : (String(t).match(/^(\d{2}:\d{2})(:\d{2})?$/)?.[1] ?? String(t)));

function SoftBadge({ tone="slate", icon, children }) {
  const map = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    red:    "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    amber:  "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate:  "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700",
  };
  return (
    <span className={cls(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
      map[tone]
    )}>
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  const tone = status === "ACTIVE" ? "green" : status === "EXPIRED" ? "red" : "slate";
  return <SoftBadge tone={tone} icon="fiber_manual_record">{status ?? "-"}</SoftBadge>;
}

function KVP({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-300">{k}</span>
      <span className={cls("text-sm text-gray-900 dark:text-gray-100", mono && "font-mono")}>
        {typeof v === "undefined" || v === null ? "-" : v}
      </span>
    </div>
  );
}

function DayMask({ mask=0 }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map(({ label, bit }) => {
        const on = (mask & (1<<bit)) !== 0;
        return (
          <span
            key={bit}
            className={cls(
              "inline-flex px-2 py-1 rounded-full text-xs border transition-colors",
              on
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                : "bg-white border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function Section({ title, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <span className="material-symbols-outlined text-gray-500">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function SummaryStrip({ dto }) {
  const type = dto?.scheduleType;
  const humanType = type === "ONCE" ? "한 번" : type === "DAILY" ? "매일" : "매주";
  const time = fmtTime(dto?.executeTime);
  const range = type === "ONCE" ? fmtDate(dto?.startDate) : `${fmtDate(dto?.startDate)} ~ ${fmtDate(dto?.endDate)}`;
  const interval = (dto?.intervalMinutes && dto?.intervalTimes) ? `${dto.intervalMinutes}분 × ${dto.intervalTimes}회` : "없음";
  const weekdays = type === "WEEKLY" && dto?.weeklyDaysMask
    ? WEEKDAYS.filter(w => (dto.weeklyDaysMask & (1<<w.bit)) !== 0).map(w => w.label).join("·")
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SoftBadge tone="slate" icon="repeat">{humanType}</SoftBadge>
      <SoftBadge tone="blue" icon="schedule">{time}</SoftBadge>
      <SoftBadge tone="slate" icon="calendar_month">{range}</SoftBadge>
      {weekdays && <SoftBadge tone="slate" icon="event_repeat">{weekdays}</SoftBadge>}
      <SoftBadge tone="amber" icon="timelapse">인터벌: {interval}</SoftBadge>
    </div>
  );
}

function ActionBar({ dto, onRefresh, onError }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const isActive = dto?.scheduleStatus === "ACTIVE";
  const next = isActive ? "INACTIVE" : "ACTIVE";

  const onToggle = async () => {
    try {
      setBusy(true);
      await updateScheduleStatus(dto.id, next);
      showToast("success", `상태가 ${next}로 변경되었습니다.`);
      onRefresh && onRefresh();
    } catch (e) {
      onError?.(e?.message || "상태 변경 실패");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;
    try {
      setBusy(true);
      await deleteSchedule(dto.id);
      showToast("success", "스케줄이 삭제되었습니다.");
      window.history.back();
    } catch (e) {
      onError?.(e?.message || "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        disabled={busy}
        className={cls(
          "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white shadow-sm",
          busy ? "bg-slate-400 cursor-not-allowed"
            : isActive ? "bg-slate-700 hover:bg-slate-800"
              : "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        <span className="material-symbols-outlined text-base">{isActive ? "pause_circle" : "play_arrow"}</span>
        {isActive ? "비활성화" : "활성화"}
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        className={cls(
          "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border shadow-sm",
          busy ? "opacity-60 cursor-not-allowed"
            : "border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
        )}
      >
        <span className="material-symbols-outlined text-base">delete</span>
        삭제
      </button>
    </div>
  );
}

export default function TestScheduleDetailPage({ scheduleId: scheduleIdProp }) {
  const { showToast } = useToast();
  const params = useParams();
  const navigate = useNavigate();
  const scheduleId = scheduleIdProp ?? Number(params?.scheduleId);
  const [dto, setDto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchData = useCallback(async () => {
    if (!scheduleId) return;
    const controller = new AbortController();
    try {
      setLoading(true);
      setErr("");
      const data = await getTestSchedule(scheduleId, controller.signal);
      setDto(data);
    } catch (e) {
      setErr(e?.message || "스케줄 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [scheduleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lastRun = useMemo(() => {
    if (!dto) return null;
    return { id: dto.lastRunId, at: dto.lastRunAt ? new Date(dto.lastRunAt).toLocaleString() : null };
  }, [dto]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      {/* 헤더 영역: 더 넓게, 더 심플하게 */}
      <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/70 border-b border-gray-200/70 dark:border-gray-800">
        <div className="max-w-screen-xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                title="뒤로"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  {dto?.name || `스케줄 #${scheduleId ?? "-"}`}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">스케줄 상세 정보를 확인합니다.</p>
              </div>
            </div>
            {dto && <ActionBar dto={dto} onRefresh={fetchData} onError={(m)=>setErr(m)} />}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-5 py-6 space-y-6">
        {err && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm animate-pulse">
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-3 w-80 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ) : dto ? (
          <>
            {/* 요약 스트립 */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <SummaryStrip dto={dto} />
                <StatusPill status={dto.scheduleStatus} />
              </div>
            </div>

            {/* 기본 정보 카드 2열 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">기본 정보</div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <KVP k="스케줄 ID" v={dto.id} mono />
                  <KVP k="스케줄 이름" v={dto.name} />
                  <KVP k="반복 주기" v={dto.scheduleType} />
                  <KVP k="실행 시각" v={fmtTime(dto.executeTime)} />
                  <KVP k="타임존" v={dto.timezone} />
                  <KVP
                    k={dto.scheduleType === "ONCE" ? "예약 일자" : "유효 기간"}
                    v={dto.scheduleType === "ONCE" ? fmtDate(dto.startDate) : `${fmtDate(dto.startDate)} ~ ${fmtDate(dto.endDate)}`}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">실행/인터벌</div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  <KVP
                    k="인터벌"
                    v={(dto.intervalMinutes && dto.intervalTimes) ? `${dto.intervalMinutes}분 × ${dto.intervalTimes}회` : "없음"}
                  />
                  <KVP
                    k="최근 실행"
                    v={lastRun?.id ? `#${lastRun.id}${lastRun.at ? ` • ${lastRun.at}` : ""}` : "실행 이력 없음"}
                  />
                  <KVP k="상태" v={<StatusPill status={dto.scheduleStatus} />} />
                </div>
              </div>
            </div>

            {/* WEEKLY 전용 섹션 */}
            {dto.scheduleType === "WEEKLY" && (
              <Section title="요일 마스크" defaultOpen={true}>
                <DayMask mask={dto.weeklyDaysMask || 0} />
                {!dto.weeklyDaysMask && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">* 요일이 선택되지 않아 실행되지 않을 수 있습니다.</p>
                )}
              </Section>
            )}

            {/* 실행 이력 요약 (토글 섹션) */}
            <Section title="실행 이력 요약" defaultOpen={false}>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                최근 실행 ID: {lastRun?.id ? `#${lastRun.id}` : "-"}{lastRun?.at ? ` • ${lastRun.at}` : ""}
              </div>
              {lastRun?.id && (
                <div className="mt-2">
                  <button
                    onClick={() => navigate(`/runs/${lastRun.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    실행 상세 보기
                  </button>
                </div>
              )}
            </Section>
          </>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <p className="text-sm text-gray-700 dark:text-gray-300">스케줄 정보를 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}