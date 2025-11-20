import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { toErrorMessage } from "../../../services/axios";
import { ScenarioTestCaseSection } from "../components/ScenarioTestCaseSection";
import { SkeletonScenarioDetail } from "../components/Commons";
import { useToast } from "../../../shared/hooks/useToast";
import PageHeader from "../../../shared/components/PageHeader";
import Toast from "../../../shared/components/Toast";
import { getScenario } from "../../../services/scenarioAPI";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import ScenarioTestFormModal from "../components/ScenarioTestFormModal";


export default function ScenarioDetailPage() {
  const { scenarioId } = useParams();

  // 데이터 상태
  const [scenario, setScenario] = useState({
    id: null,
    code: null,
    name: null,
    description: null,
    creatorName: null,
    creatorId: null,
    updatedAt: null,
    createdAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // 토스트 (공통 훅)
  const { toast, showToast, clearToast } = useToast(3000);

  // 테스트 케이스 섹션 열림/닫힘
  const [openCases, setOpenCases] = useState(true);

  // 데이터 패치
  const fetchScenario = useCallback(async (signal) => {
      if (!scenarioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getScenario(scenarioId, signal);
      setScenario((prev) => ({ ...prev, ...data }));
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchScenario(controller.signal);
    return () => controller.abort();
  }, [fetchScenario]);

  // 메타 포맷
  const prettyMeta = useMemo(() => {
    const fmt = (v) => (v ? new Date(v).toLocaleString() : "-");
    return {
      created: fmt(scenario?.createdAt),
      updated: fmt(scenario?.updatedAt),
    };
  }, [scenario?.createdAt, scenario?.updatedAt]);

  return (
    <>
      {/* 토스트 */}
      <Toast toast={toast} onClose={clearToast} />

      <div className="flex flex-col gap-8 p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* 헤더 + 브레드크럼/액션 */}
        <PageHeader
          title="테스트 시나리오"
          subtitle="시나리오 메타 정보, 테스트 케이스, 실행을 한 화면에서 관리합니다."
          breadcrumbs={[
            { label: "테스트 시나리오", to: "/scenarios" },
            { label: "상세" },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ScenarioTestFormModal
                scenarioId={scenarioId}
                onSuccess={() => showToast("success", "시나리오 테스트 실행을 시작했습니다.")}
                onError={(msg) => showToast("error", msg || "시나리오 실행에 실패했습니다.")}
              />
              <ReserveTestCreateModal
                scenarioId={scenarioId}
                onSuccess={() => showToast("success", "예약 테스트를 생성했습니다.")}
                onError={(msg) => showToast("error", msg || "예약 테스트 생성에 실패했습니다.")}
              />
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => fetchScenario(undefined)}
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                새로고침
              </button>
            </div>
          }
        />

        {/* 콘텐츠 카드: 로딩/에러/데이터 */}
        {loading && <SkeletonScenarioDetail />}

        {!loading && error && (
          <ErrorAlert title="불러오기 실패" message={error} className="rounded-2xl" />
        )}

        {!loading && !error && scenario && (
          <>
            {/* 기본 정보 카드 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded-full">
                      {scenario?.code || "CODE-N/A"}
                    </span>
                    {/* 복사 버튼 제거됨 */}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
                    {scenario?.name || "이름 없음"}
                  </h2>
                </div>
                {/* 우측 메타 */}
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div>생성: <span className="text-gray-700 dark:text-gray-300">{prettyMeta.created}</span></div>
                  <div className="mt-0.5">최종 수정: <span className="text-gray-700 dark:text-gray-300">{prettyMeta.updated}</span></div>
                </div>
              </div>

              <div className="px-6 py-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">등록자</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                          {getInitials(scenario?.creatorName)}
                        </span>
                        {scenario?.creatorName ?? "-"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">시나리오 코드</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {scenario?.code ?? "-"}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">설명</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                      {scenario?.description ?? "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* 테스트 케이스 섹션: 항상 보이되 내부를 접기/펼치기 */}
            <ScenarioTestCaseSection
              scenarioId={scenarioId}
              collapsible
              open={openCases}
              onToggle={() => setOpenCases((v) => !v)}
            />

            {/* 원본 JSON (디버깅용) */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">data_object</span>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">원본 JSON</h3>
              </div>
              <div className="px-6 py-4">
                <pre className="overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(scenario, null, 2)}
                </pre>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function getInitials(name) {
  if (!name) return "?" ;
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** WEEKLY 요일 선택 (칩 스타일 + 프리셋 + 최대 6일 가드) */
function WeekdayChipsSelector({ mask, onChange, onError, max = 6 }) {
  const selectedDayCount = useMemo(() => countBits(mask), [mask]);

  function toggle(bit) {
    const bitMask = 1 << bit;
    const isChecked = (mask & bitMask) !== 0;
    if (!isChecked) {
      if (selectedDayCount >= max) {
        onError && onError(`요일은 최대 ${max}일까지 선택할 수 있습니다.`);
        return;
      }
      onChange(mask | bitMask);
    } else {
      onChange(mask & ~bitMask);
    }
  }

  const presetWeekdays = () => onChange((1<<0)|(1<<1)|(1<<2)|(1<<3)|(1<<4)); // 월~금
  const presetWeekend  = () => onChange((1<<5)|(1<<6));                      // 토·일
  const presetClear    = () => onChange(0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">요일 선택</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={presetWeekdays} className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600">평일</button>
          <button type="button" onClick={presetWeekend} className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600">주말</button>
          <button type="button" onClick={presetClear} className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600">초기화</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map(({ label, bit }) => {
          const checked = (mask & (1 << bit)) !== 0;
          return (
            <label
              key={bit}
              data-checked={checked ? "true" : "false"}
              className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 data-[checked=true]:bg-blue-50 dark:data-[checked=true]:bg-blue-900/30"
              title={(!checked && selectedDayCount >= max) ? `최대 ${max}일까지 선택 가능` : undefined}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(bit)}
                disabled={(!checked && selectedDayCount >= max)}
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400"> * 최대 {max}일까지 선택 가능합니다.</p>
    </div>
  );
}

/** 요약 칩 카드 */
function ScheduleSummaryChips({ repeatCycle, execTime, startDate, endDate, repeatCount, weeklyDaysMask }) {
  const summaryParts = useMemo(() => {
    const humanCycle = repeatCycle === "ONCE" ? "한 번" : (repeatCycle === "DAILY" ? "매일" : "매주");
    const days = WEEKDAYS.filter(w => (weeklyDaysMask & (1<<w.bit)) !== 0).map(w => w.label).join("·");
    const range = repeatCycle === "ONCE" ? startDate : `${startDate}${endDate ? ` ~ ${endDate}` : ""}`;
    const repeats = `${repeatCount}회/회차`;
    return {
      humanCycle,
      time: execTime || "--:--",
      range,
      weekdays: repeatCycle === "WEEKLY" ? (days || "(요일 미선택)") : null,
      repeats
    };
  }, [repeatCycle, weeklyDaysMask, startDate, endDate, execTime, repeatCount]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">요약</div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="material-symbols-outlined text-sm">repeat</span>
          {summaryParts.humanCycle}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="material-symbols-outlined text-sm">schedule</span>
          {summaryParts.time}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="material-symbols-outlined text-sm">calendar_month</span>
          {summaryParts.range}
        </span>
        {summaryParts.weekdays && (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-sm">event_repeat</span>
            {summaryParts.weekdays}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span className="material-symbols-outlined text-sm">looks_one</span>
          회차당 {summaryParts.repeats}
        </span>
      </div>
    </div>
  );
}


/** 생성 전 최종 확인 모달 */
function ReserveConfirmModal({ open, onCancel, onConfirm, submitting, summaryParts, repeatCycle }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-5">
        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">예약 내용을 확인하세요</h4>
        <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">repeat</span>
            <span>반복 주기: <b>{summaryParts.humanCycle}</b></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">schedule</span>
            <span>실행 시간: <b>{summaryParts.time}</b></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">calendar_month</span>
            {repeatCycle === "ONCE"
              ? <span>예약 일시: <b>{summaryParts.range} {summaryParts.time}</b></span>
              : <span>기간: <b>{summaryParts.range}</b></span>}
          </li>
          {summaryParts.weekdays && (
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">event_repeat</span>
              <span>요일: <b>{summaryParts.weekdays}</b></span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">looks_one</span>
            <span>회차당 반복 횟수: <b>{summaryParts.repeats}</b></span>
          </li>
        </ul>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm border border-gray-300 dark:border-gray-600">수정</button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className={`rounded-xl px-5 py-2 text-sm text-white transition-colors ${submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {submitting ? "생성 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ReserveTestCreateModal({ scenarioId, onSuccess, onError }) {
  const [open, setOpen] = useState(false);

  // Form state
  const [testCode, setTestCode] = useState("");
  const [testName, setTestName] = useState("");
  const platform = "MOBILE APP";
  const testApp = "T 멤버십";
  const [deviceOS, setDeviceOS] = useState("");
  const userId = 1; // hidden fixed

  // Schedule state
  const [repeatCycle, setRepeatCycle] = useState("ONCE"); // ONCE, DAILY, WEEKLY
  const [execTime, setExecTime] = useState(""); // HH:mm
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [repeatCount, setRepeatCount] = useState(1);
  // weeklyDaysMask bit0=월 .. bit6=일
  const [weeklyDaysMask, setWeeklyDaysMask] = useState(0);

  // Helpers
  function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function countBits(n) {
    let x = n >>> 0;
    let c = 0;
    while (x) { c += x & 1; x >>>= 1; }
    return c;
  }

  function toggleWeekdayBit(bit) {
    const mask = weeklyDaysMask;
    const bitMask = 1 << bit;
    const isChecked = (mask & bitMask) !== 0;

    if (!isChecked) {
      const selected = countBits(mask);
      if (selected >= 6) {
        onError && onError("요일은 최대 6일까지 선택할 수 있습니다.");
        return;
      }
      setWeeklyDaysMask(mask | bitMask);
    } else {
      setWeeklyDaysMask(mask & ~bitMask);
    }
  }

  // Validation
  function validate() {
    if (!testCode.trim()) {
      onError && onError("테스트 코드를 입력하세요.");
      return false;
    }
    if (!testName.trim()) {
      onError && onError("테스트명을 입력하세요.");
      return false;
    }
    if (!deviceOS) {
      onError && onError("디바이스 OS를 선택하세요.");
      return false;
    }
    if (!execTime) {
      onError && onError("실행 시간을 선택하세요.");
      return false;
    }
    if (!startDate) {
      onError && onError("시작일을 선택하세요.");
      return false;
    }
    if (repeatCycle === "ONCE") {
      // endDate forced to startDate
    } else {
      if (!endDate) {
        onError && onError("종료일을 선택하세요.");
        return false;
      }
      if (startDate > endDate) {
        onError && onError("종료일은 시작일 이후여야 합니다.");
        return false;
      }
    }
    if (repeatCount < 1 || repeatCount > 10) {
      onError && onError("반복 횟수는 1에서 10 사이여야 합니다.");
      return false;
    }
    if (repeatCycle === "WEEKLY") {
      const cnt = countBits(weeklyDaysMask);
      if (cnt === 0) {
        onError && onError("주간 반복 시 최소 하나의 요일을 선택해야 합니다.");
        return false;
      }
      if (cnt > 6) {
        onError && onError("요일은 최대 6일까지 선택할 수 있습니다.");
        return false;
      }
    }
    return true;
  }

  // API calls (dummy implementations)
  async function createScenarioTest(payload) {
    const res = await fetch("/api/v1/scenario-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`시나리오 테스트 생성 실패: ${text || res.statusText}`);
    }
    return await res.json();
  }

  async function createTestSchedule(payload) {
    const res = await fetch("/api/v1/test-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`스케줄 생성 실패: ${text || res.statusText}`);
    }
    return await res.json();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    // Prepare scenario test payload
    const scenarioTestPayload = {
      scenarioId,
      testCode: testCode.trim(),
      testName: testName.trim(),
      platform,
      testApp,
      deviceOS,
      userId,
    };

    // Prepare schedule payload
    const schedulePayload = {
      scenarioTestCode: testCode.trim(),
      repeatCycle,
      execTime,
      startDate,
      endDate: repeatCycle === "ONCE" ? startDate : endDate,
      repeatCount,
      weeklyDaysMask,
    };

    try {
      await createScenarioTest(scenarioTestPayload);
      await createTestSchedule(schedulePayload);
      onSuccess && onSuccess();
      setOpen(false);
      // Reset form
      setTestCode("");
      setTestName("");
      setDeviceOS("");
      setRepeatCycle("ONCE");
      setExecTime("");
      setStartDate("");
      setEndDate("");
      setRepeatCount(1);
      setWeeklyDaysMask(0);
    } catch (err) {
      onError && onError(err.message || "예약 테스트 생성 중 오류가 발생했습니다.");
    }
  }

  // Effect to enforce endDate = startDate on ONCE
  useEffect(() => {
    if (repeatCycle === "ONCE" && startDate) {
      setEndDate(startDate);
    }
  }, [repeatCycle, startDate]);

  // Weekday labels and bits (bit0=월 .. bit6=일)
  const weekdays = [
    { label: "월", bit: 0 },
    { label: "화", bit: 1 },
    { label: "수", bit: 2 },
    { label: "목", bit: 3 },
    { label: "금", bit: 4 },
    { label: "토", bit: 5 },
    { label: "일", bit: 6 },
  ];

  const selectedDayCount = useMemo(() => countBits(weeklyDaysMask), [weeklyDaysMask]);

  return (
    <>
      {/* <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        type="button"
      >
        예약 테스트 생성
      </button> */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 dark:bg-opacity-70 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">예약 테스트 생성</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 테스트 정보 */}
              <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">테스트 정보</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    테스트 코드
                    <input
                      type="text"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    테스트명
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    플랫폼
                    <input
                      type="text"
                      value={platform}
                      readOnly
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-2 cursor-not-allowed"
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    테스트 앱
                    <input
                      type="text"
                      value={testApp}
                      readOnly
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-2 cursor-not-allowed"
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    디바이스 OS
                    <select
                      value={deviceOS}
                      onChange={(e) => setDeviceOS(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" disabled>선택하세요</option>
                      <option value="Android">Android</option>
                      <option value="iOS">iOS</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  {/* userId hidden */}
                  <input type="hidden" value={userId} />
                </div>
              </fieldset>

              {/* 스케줄 설정 */}
              <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">스케줄 설정</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    반복 주기
                    <select
                      value={repeatCycle}
                      onChange={(e) => setRepeatCycle(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ONCE">한 번</option>
                      <option value="DAILY">매일</option>
                      <option value="WEEKLY">매주</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    실행 시간
                    <input
                      type="time"
                      value={execTime}
                      onChange={(e) => setExecTime(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    실행 시작일
                    <input
                      type="date"
                      min={todayISODate()}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    실행 종료일
                    <input
                      type="date"
                      min={startDate || todayISODate()}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${repeatCycle === "ONCE" ? "cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : ""}`}
                      disabled={repeatCycle === "ONCE"}
                      required={repeatCycle !== "ONCE"}
                    />
                  </label>
                  <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                    반복 횟수
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Number(e.target.value))}
                      className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                </div>
                {repeatCycle === "WEEKLY" && (
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold mb-1 block">요일 선택</span>
                    {weekdays.map(({ label, bit }) => (
                      <label key={bit} className="inline-flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={(weeklyDaysMask & (1 << bit)) !== 0}
                          onChange={() => toggleWeekdayBit(bit)}
                          disabled={((weeklyDaysMask & (1 << bit)) === 0) && selectedDayCount >= 6}
                          title={(((weeklyDaysMask & (1 << bit)) === 0) && selectedDayCount >= 6) ? "최대 6일까지 선택 가능" : undefined}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
                {repeatCycle === "WEEKLY" && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">최대 6일까지 선택 가능합니다.</p>
                )}
              </fieldset>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm transition-colors"
                >
                  생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
