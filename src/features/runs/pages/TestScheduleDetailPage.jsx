// src/features/schedule/pages/TestScheduleDetailPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../../../shared/hooks/useToast";
import {
  getTestSchedule,
  updateScheduleStatus,
  deleteSchedule,
} from "../../../services/scheduleAPI";
import PageHeader from "../../../shared/components/PageHeader.jsx";

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
const WEEKDAYS = [
  { label: "월", bit: 0 },
  { label: "화", bit: 1 },
  { label: "수", bit: 2 },
  { label: "목", bit: 3 },
  { label: "금", bit: 4 },
  { label: "토", bit: 5 },
  { label: "일", bit: 6 },
];

function cls(...xs) {
  return xs.filter(Boolean).join(" ");
}

const fmtDate = (d) =>
  !d
    ? "-"
    : /^\d{4}-\d{2}-\d{2}$/.test(String(d))
      ? String(d)
      : new Date(d).toISOString().slice(0, 10);

const fmtTime = (t) =>
  !t
    ? "--:--"
    : String(t).match(/^(\d{2}:\d{2})(:\d{2})?$/)?.[1] ?? String(t);

// ──────────────────────────────────────────────
// 상태 배지
// ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const v = String(status || "").toUpperCase();
  let text = v || "UNKNOWN";
  let tone =
    v === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : v === "EXPIRED"
        ? "bg-rose-50 text-rose-700 border-rose-100"
        : "bg-gray-50 text-gray-600 border-gray-200";
  let icon =
    v === "ACTIVE"
      ? "play_circle"
      : v === "EXPIRED"
        ? "cancel"
        : "pause_circle";

  return (
    <span
      className={cls(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
        tone
      )}
    >
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      {text}
    </span>
  );
};

// ──────────────────────────────────────────────
// 요일 마스크
// ──────────────────────────────────────────────
const DayMask = ({ mask = 0 }) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map(({ label, bit }) => {
        const on = (mask & (1 << bit)) !== 0;
        return (
          <span
            key={bit}
            className={cls(
              "inline-flex px-2.5 py-1 rounded-full text-xs border transition-colors",
              on
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 text-gray-500"
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};

// ──────────────────────────────────────────────
// InfoCard (ScenarioTestDetailPage 패턴 재사용)
// ──────────────────────────────────────────────
const InfoCard = ({ label, value, icon, subValue }) => (
  <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
    {icon && (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 border border-gray-100">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
        {value ?? "-"}
      </div>
      {subValue && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{subValue}</p>
      )}
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Key-Value Pair
// ──────────────────────────────────────────────
const KVP = ({ k, v, mono }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-gray-600">{k}</span>
    <span
      className={cls(
        "text-sm text-gray-900",
        mono && "font-mono text-[13px]"
      )}
    >
      {v ?? "-"}
    </span>
  </div>
);

// ──────────────────────────────────────────────
// 상단 액션 바 (상태 토글 / 삭제)
// ──────────────────────────────────────────────
const ActionBar = ({ dto, onRefresh }) => {
  const { showSuccess, showError } = useToast();
  const [busy, setBusy] = useState(false);
  const isActive = dto?.scheduleStatus === "ACTIVE";
  const nextStatus = isActive ? "INACTIVE" : "ACTIVE";

  const handleToggle = async () => {
    if (!dto) return;
    try {
      setBusy(true);
      await updateScheduleStatus(dto.id, nextStatus);
      showSuccess(`상태가 ${nextStatus}로 변경되었습니다.`);
      onRefresh?.();
    } catch (e) {
      showError("상태 변경 실패", e?.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!dto) return;
    if (!window.confirm("이 스케줄을 삭제하시겠습니까?")) return;
    try {
      setBusy(true);
      await deleteSchedule(dto.id);
      showSuccess("스케줄이 삭제되었습니다.");
      window.history.back();
    } catch (e) {
      showError("삭제 실패", e?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={cls(
          "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm",
          busy
            ? "bg-gray-400 cursor-not-allowed"
            : isActive
              ? "bg-gray-800 hover:bg-gray-900"
              : "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        <span className="material-symbols-outlined text-base">
          {isActive ? "pause_circle" : "play_arrow"}
        </span>
        {isActive ? "비활성화" : "활성화"}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className={cls(
          "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border shadow-sm",
          busy
            ? "opacity-60 cursor-not-allowed"
            : "border-rose-300 text-rose-600 hover:bg-rose-50"
        )}
      >
        <span className="material-symbols-outlined text-base">delete</span>
        삭제
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────
// 메인 페이지
// ──────────────────────────────────────────────
export default function TestScheduleDetailPage({ scheduleId: scheduleIdProp }) {
  const { showError } = useToast();
  const params = useParams();
  const navigate = useNavigate();

  const scheduleId = scheduleIdProp ?? Number(params?.scheduleId);
  const [dto, setDto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchData = useCallback(
    async (signal) => {
      if (!scheduleId) return;
      setLoading(true);
      setErr("");
      try {
        const data = await getTestSchedule(scheduleId, signal);
        setDto(data);
      } catch (e) {
        if (e?.message === "Aborted") return;
        const msg = e?.message || "스케줄 정보를 불러오지 못했습니다.";
        setErr(msg);
        showError("조회 실패", msg);
      } finally {
        setLoading(false);
      }
    },
    [scheduleId, showError]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const lastRun = useMemo(() => {
    if (!dto) return null;
    return {
      id: dto.lastRunId,
      at: dto.lastRunAt ? new Date(dto.lastRunAt).toLocaleString() : null,
    };
  }, [dto]);

  const nextRunInfo = useMemo(() => {
    if (!dto?.nextRunAt) return { label: "-", relative: "" };
    const d = new Date(dto.nextRunAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const label = `${fmtDate(d)} ${hh}:${mm}`;

    const today = new Date();
    const baseToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const baseTarget = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    );
    const diffDays = Math.round(
      (baseTarget - baseToday) / (1000 * 60 * 60 * 24)
    );

    let relative = "";
    if (diffDays === 0) relative = "오늘";
    else if (diffDays === 1) relative = "내일";
    else if (diffDays > 1) relative = `${diffDays}일 후`;
    else relative = `${Math.abs(diffDays)}일 전`;

    return { label, relative };
  }, [dto]);

  // 로딩 스켈레톤
  if (loading && !dto) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 h-40 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 에러 화면
  if (!loading && err && !dto) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
          error_outline
        </span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          스케줄 정보를 불러오지 못했습니다
        </h2>
        <p className="text-gray-500 mb-6">{err}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
        >
          재시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 bg-gray-50 min-h-screen">
      <PageHeader
        title="테스트 스케줄 상세"
        subtitle="자동 실행 스케줄의 설정과 상태를 확인합니다."
        breadcrumbs={[
          { label: "홈", to: "/" },
          { label: "테스트 스케줄", to: "/schedules" },
          { label: dto?.name || `스케줄 #${scheduleId ?? "-"}` },
        ]}
        actions={dto && <ActionBar dto={dto} onRefresh={() => fetchData()} />}
      />

      {dto && (
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {/* 상단 요약 카드 (ScenarioTestDetailPage 스타일) */}
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* 왼쪽: 기본 정보 */}
              <div className="flex items-start gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 shrink-0"
                  title="뒤로"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                      {dto.scheduleType || "TYPE"}
                    </span>
                    <StatusBadge status={dto.scheduleStatus} />
                    <span className="text-[11px] text-gray-500">
                      ID: <span className="font-mono">{dto.id}</span>
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                    {dto.name || `스케줄 #${dto.id}`}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {fmtDate(dto.startDate)} ~ {fmtDate(dto.endDate)} 기준으로{" "}
                    <span className="font-medium">{dto.timezone || "기본 타임존"}</span>
                    에 맞춰 실행됩니다.
                  </p>
                </div>
              </div>

              {/* 오른쪽: 다음 실행 / 실행 시간 */}
              <div className="flex items-stretch gap-8 lg:pl-6 lg:border-l lg:border-gray-200">
                <div className="text-right">
                  <div className="text-[11px] text-gray-500 font-medium">
                    다음 실행 예정
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                    {nextRunInfo.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    {nextRunInfo.relative || "스케줄 설정에 따라 달라집니다"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-gray-500 font-medium">
                    기본 실행 시간
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {fmtTime(dto.executeTime)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    {dto.intervalMinutes && dto.intervalTimes
                      ? `${dto.intervalMinutes}분 간격 / 최대 ${dto.intervalTimes}회`
                      : "고정 시간 실행"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 중간 InfoCard 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              label="스케줄 ID"
              value={dto.id}
              icon="tag"
              subValue={dto.scheduleStatus}
            />
            <InfoCard
              label="생성일"
              value={fmtDate(dto.createdAt)}
              icon="calendar_today"
              subValue={dto.timezone || "-"}
            />
            <InfoCard
              label="기간"
              value={`${fmtDate(dto.startDate)} ~ ${fmtDate(dto.endDate)}`}
              icon="date_range"
              subValue="시작일 / 종료일"
            />
            <InfoCard
              label="인터벌"
              value={
                dto.intervalMinutes && dto.intervalTimes
                  ? `${dto.intervalMinutes}분 / ${dto.intervalTimes}회`
                  : "설정 없음"
              }
              icon="timelapse"
              subValue={
                dto.scheduleType === "INTERVAL"
                  ? "INTERVAL 스케줄"
                  : "고정 시간 스케줄"
              }
            />
          </div>

          {/* 상세 정보 카드 + (추가 정보 영역) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 기본 정보 */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  info
                </span>
                <span>기본 정보</span>
              </div>
              <div className="divide-y divide-gray-100">
                <KVP k="스케줄 ID" v={dto.id} mono />
                <KVP
                  k="생성일 / 타임존"
                  v={`${fmtDate(dto.createdAt)} / ${
                    dto.timezone || "-"
                  }`}
                />
                <KVP k="시작일" v={fmtDate(dto.startDate)} />
                <KVP k="종료일" v={fmtDate(dto.endDate)} />
                <KVP k="실행 타입" v={dto.scheduleType || "-"} />
                <KVP k="실행 시간" v={fmtTime(dto.executeTime)} />
                <KVP
                  k="인터벌 설정"
                  v={
                    dto.intervalMinutes && dto.intervalTimes
                      ? `${dto.intervalMinutes}분 / ${dto.intervalTimes}회`
                      : "없음"
                  }
                />
                <KVP k="설명" v={dto.description || "-"} />
              </div>
            </div>

            {/* 오른쪽 사이드: 마지막 실행 결과 + WEEKLY 요일 마스크 */}
            <div className="space-y-4">
              {/* 마지막 실행 결과 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    history
                  </span>
                  <span>마지막 실행 결과</span>
                </div>
                <div className="space-y-2 text-sm">
                  <KVP
                    k="Run ID"
                    v={lastRun?.id ? `#${lastRun.id}` : "-"}
                    mono
                  />
                  <KVP
                    k="실행 시간"
                    v={lastRun?.at || "-"}
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={!lastRun?.id}
                    onClick={() =>
                      lastRun?.id && navigate(`/runs/${lastRun.id}`)
                    }
                    className={cls(
                      "inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-sm border shadow-sm",
                      lastRun?.id
                        ? "border-gray-300 text-gray-900 hover:bg-gray-50"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                    )}
                  >
                    <span className="material-symbols-outlined text-base">
                      receipt_long
                    </span>
                    <span>상세 리포트 보기</span>
                  </button>
                </div>
              </div>

              {/* WEEKLY 스케줄일 경우 요일 마스크 */}
              {dto.scheduleType === "WEEKLY" && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      calendar_view_week
                    </span>
                    <span>요일 마스크</span>
                  </div>
                  <DayMask mask={dto.weeklyDaysMask || 0} />
                  {!dto.weeklyDaysMask && (
                    <p className="mt-2 text-xs text-amber-600">
                      * 요일이 선택되지 않아 실행되지 않을 수 있습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}