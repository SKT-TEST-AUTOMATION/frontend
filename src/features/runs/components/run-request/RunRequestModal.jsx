// src/features/runs/components/run-request/RunRequestModal.jsx
import React, { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import DeviceSelectStep from "./DeviceSelectStep.jsx";
import RuntimeOptionStep from "./RuntimeOptionStep.jsx";
import RunTimingStep from "./RunTimingStep.jsx";

function pad2(n) { return String(n).padStart(2, "0"); }
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function countBits(n) { let x = n >>> 0, c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }
const DAY_OF_WEEK_ENUMS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
function maskToDayOfWeekList(mask) {
  const out = [];
  for (let i = 0; i < 7; i++) if ((mask & (1 << i)) !== 0) out.push(DAY_OF_WEEK_ENUMS[i]);
  return out;
}

function validateSchedule(plan) {
  if (!plan?.name?.trim()) return "예약 이름을 입력하세요.";
  if (!plan?.execTime) return "실행 시간을 선택하세요.";
  if (!plan?.startDate) return "실행 시작일을 선택하세요.";

  if (plan.repeatCycle !== "ONCE") {
    if (!plan?.endDate) return "실행 종료일을 선택하세요.";
    if (plan.endDate < plan.startDate) return "종료일은 시작일 이후여야 합니다.";
  }

  if (plan.repeatCycle === "WEEKLY") {
    const cnt = countBits(plan.weeklyDaysMask || 0);
    if (cnt === 0) return "주간 반복 시 최소 하나의 요일을 선택해야 합니다.";
    if (cnt > 6) return "요일은 최대 6일까지 선택할 수 있습니다.";
  }

  if (plan.intervalEnabled) {
    if (!(Number.isInteger(plan.intervalMinutes) && plan.intervalMinutes >= 10 && plan.intervalMinutes <= 1440)) {
      return "인터벌 분(min)은 10~1440 사이여야 합니다.";
    }
    if (!(Number.isInteger(plan.intervalMinutes) && plan.intervalMinutes >= 1)) return "인터벌 분(min)은 1 이상이어야 합니다.";
    if (!(Number.isInteger(plan.intervalTimes) && plan.intervalTimes >= 1)) return "인터벌 횟수(times)는 1 이상이어야 합니다.";
  } else {
    if (plan.intervalMinutes != null || plan.intervalTimes != null) return "반복 실행을 사용하지 않으면 인터벌 필드는 비워 두세요.";
  }

  return null;
}

function toIntOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RunRequestModal({
                                          open,
                                          onClose,

                                          // ✅ 상위에서 실제 API 호출 담당
                                          onSubmit,            // (evt) => void
                                          onCreateSchedule,    // (scenarioTestId, payload) => void (옵션)

                                          scenarioTestId,      // ✅ 반드시 필요 (runScenarioTest에 들어감)
                                          initialStep = 0,
                                          initialValues = null,
                                        }) {
  const steps = useMemo(
    () => [
      { key: "device", label: "디바이스 선택" },
      { key: "runtime", label: "런타임 옵션" },
      { key: "timing", label: "실행 방식 선택" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(initialStep);

  const [device, setDevice] = useState(initialValues?.device ?? null);
  const [runtimeOptions, setRuntimeOptions] = useState(
    initialValues?.runtimeOptions ?? {
      evidenceMode: "ON_ERROR", // ✅ TestEvidenceMode와 문자열 매칭 필요
      retryCount: 0,
      locale: "ko-KR",
      headless: false,
    }
  );

  const [timing, setTiming] = useState(() => ({
    mode: initialValues?.timing?.mode ?? "MANUAL", // MANUAL | SCHEDULE
    schedule: initialValues?.timing?.schedule ?? {
      name: `스케줄-${scenarioTestId ?? "test"}-${todayLocalISO()}`,
      repeatCycle: "WEEKLY",
      execTime: (() => {
        const d = new Date();
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      })(),
      startDate: todayLocalISO(),
      endDate: todayLocalISO(),
      weeklyDaysMask: 0,
      intervalEnabled: false,
      intervalMinutes: null,
      intervalTimes: null,
    },
  }));

  const currentKey = steps[stepIndex]?.key;
  const canGoPrev = stepIndex > 0;

  const canGoNext = useMemo(() => {
    if (currentKey === "device") return !!device;
    if (currentKey === "runtime") return true;
    if (currentKey === "timing") {
      if (timing.mode === "MANUAL") return true;
      return !validateSchedule(timing.schedule);
    }
    return false;
  }, [currentKey, device, timing]);

  const isLast = stepIndex === steps.length - 1;

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setStepIndex((v) => Math.max(0, v - 1));
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setStepIndex((v) => Math.min(steps.length - 1, v + 1));
  }, [canGoNext, steps.length]);

  const handleFinalSubmit = useCallback(async () => {
    try {
      if (!device) return;

      // ✅ 1) MANUAL 실행 payload (RunScenarioTestDto.Request)
      if (timing.mode === "MANUAL") {
        if (!scenarioTestId) return;

        const req = {
          deviceUdid: String(device.udid ?? ""),
          connectedIp: String(device.connectedIp ?? "127.0.0.1"),
          appiumPort: toIntOrNull(device.appiumPort) ?? 4723,
          systemPort: toIntOrNull(device.systemPort),
          evidenceMode: runtimeOptions?.evidenceMode ?? "ON_ERROR",
        };

        await onSubmit?.({
          type: "RUN_NOW",
          scenarioTestId,
          payload: req,
        });
        return;
      }

      // ✅ 2) SCHEDULE (기존 로직 유지)
      const msg = validateSchedule(timing.schedule);
      if (msg) return;

      if (!scenarioTestId) return;

      const s = timing.schedule;
      const schedulePayload = {
        name: s.name.trim(),
        startDate: s.startDate,
        endDate: (s.repeatCycle === "ONCE") ? s.startDate : s.endDate,
        executeTime: s.execTime,
        timezone: "Asia/Seoul",
        scheduleType: s.repeatCycle,
        ...(s.intervalEnabled ? { intervalMinutes: s.intervalMinutes, intervalTimes: s.intervalTimes } : {}),
        weeklyDays: (s.repeatCycle === "WEEKLY") ? maskToDayOfWeekList(s.weeklyDaysMask) : [],
        deviceUdid: String(device.udid ?? ""),
        evidenceMode: runtimeOptions?.evidenceMode ?? "ON_ERROR"
      };

      if (onCreateSchedule) {
        await onCreateSchedule(scenarioTestId, schedulePayload);
      } else {
        await onSubmit?.({
          type: "SCHEDULE",
          scenarioTestId,
          payload: schedulePayload,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }, [device, timing, scenarioTestId, runtimeOptions, onSubmit, onCreateSchedule]);

  const title = useMemo(() => steps[stepIndex]?.label ?? "실행 옵션 선택", [steps, stepIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[20] flex items-center justify-center p-4 sm:p-6">
      {/* backdrop가 content 위로 덮지 않도록 z 분리 */}
      <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-1 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <span className="material-symbols-outlined text-blue-600">play_circle</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">실행 옵션 설정</h2>
              <div className="mt-1 text-xs text-slate-500 font-medium">{title}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            aria-label="닫기"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="shrink-0 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <Stepper steps={steps} current={stepIndex} />
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/40">
          {currentKey === "device" && <DeviceSelectStep value={device} onChange={setDevice} />}
          {currentKey === "runtime" && <RuntimeOptionStep value={runtimeOptions} onChange={setRuntimeOptions} />}
          {currentKey === "timing" && (
            <RunTimingStep value={timing} onChange={setTiming} device={device} />
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            취소
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>

            {!isLast ? (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={!canGoNext}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {timing.mode === "MANUAL" ? "실행 요청" : "예약 생성"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ steps, current }) {
  const n = Math.max(steps?.length ?? 0, 1);
  const denom = Math.max(n - 1, 1);
  const clamped = Math.min(Math.max(current ?? 0, 0), n - 1);
  const progressPct = (clamped / denom) * 100;
  const sidePadPct = 50 / n;

  return (
    <div className="w-full">
      <div className="relative w-full">
        <div className="absolute top-4 h-[3px] rounded-full bg-slate-200/70" style={{ left: `${sidePadPct}%`, right: `${sidePadPct}%` }} />
        <div
          className="absolute top-4 h-[3px] rounded-full origin-left bg-gradient-to-r from-sky-400 via-blue-500 to-blue-700"
          style={{ left: `${sidePadPct}%`, right: `${sidePadPct}%`, transform: `scaleX(${progressPct / 100})` }}
        />
        <div className="relative z-1 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {steps.map((s, idx) => {
            const done = idx < clamped;
            const active = idx === clamped;
            const circleCls = done
              ? "bg-blue-600 text-white shadow-sm"
              : active
                ? "bg-white text-blue-700 border border-blue-200 shadow-sm ring-4 ring-blue-100"
                : "bg-white text-slate-500 border border-slate-200";
            const labelCls = done ? "text-blue-700" : active ? "text-slate-900 font-semibold" : "text-slate-400";
            return (
              <div key={s.key} className="flex flex-col items-center min-w-0 text-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${circleCls}`}>{idx + 1}</div>
                <div className={`mt-2 text-sm ${labelCls} w-full truncate`} title={s.label}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}