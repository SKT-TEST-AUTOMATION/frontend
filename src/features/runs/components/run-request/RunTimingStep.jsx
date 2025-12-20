// src/features/runs/components/run-request/RunTimingStep.jsx
import React, { useMemo } from "react";
import IntervalSettings from "../IntervalSettings.jsx";

const WEEKDAYS = [
  { label: "월", bit: 0 }, { label: "화", bit: 1 }, { label: "수", bit: 2 },
  { label: "목", bit: 3 }, { label: "금", bit: 4 }, { label: "토", bit: 5 }, { label: "일", bit: 6 },
];

function pad2(n) { return String(n).padStart(2, "0"); }
function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function countBits(n) { let x = n >>> 0, c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }

function WeekdayChipsSelector({ mask, onChange, max = 6 }) {
  const selectedDayCount = useMemo(() => countBits(mask), [mask]);

  function toggle(bit) {
    const bitMask = 1 << bit;
    const checked = (mask & bitMask) !== 0;

    if (!checked) {
      if (selectedDayCount >= max) return;
      onChange(mask | bitMask);
    } else {
      onChange(mask & ~bitMask);
    }
  }

  const presetWeekdays = () => onChange((1<<0)|(1<<1)|(1<<2)|(1<<3)|(1<<4));
  const presetWeekend  = () => onChange((1<<5)|(1<<6));
  const presetClear    = () => onChange(0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-slate-700">요일 선택</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={presetWeekdays} className="text-xs px-2 py-1 rounded-full border border-slate-300">평일</button>
          <button type="button" onClick={presetWeekend}  className="text-xs px-2 py-1 rounded-full border border-slate-300">주말</button>
          <button type="button" onClick={presetClear}    className="text-xs px-2 py-1 rounded-full border border-slate-300">초기화</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map(({ label, bit }) => {
          const checked = (mask & (1 << bit)) !== 0;
          const disabled = (!checked && selectedDayCount >= max);

          return (
            <button
              key={bit}
              type="button"
              aria-pressed={checked}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}  // 포커스로 인한 스크롤 점프 방지
              onClick={() => toggle(bit)}
              className={[
                "inline-flex items-center justify-center select-none px-3 py-1.5 rounded-full border text-sm transition",
                checked ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              title={disabled ? `최대 ${max}일까지 선택 가능` : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-500">* 최대 {max}일까지 선택 가능합니다.</p>
    </div>
  );
}

export default function RunTimingStep({ value, onChange, device }) {
  const mode = value?.mode ?? "MANUAL";
  const schedule = value?.schedule ?? {};

  //  핵심: stale value 덮어쓰기 방지(함수형 업데이트)
  const setMode = (m) => onChange?.((prev) => ({ ...(prev ?? {}), mode: m }));
  const setSchedule = (patch) =>
    onChange?.((prev) => {
      const v = prev ?? {};
      const sch = v.schedule ?? {};
      return { ...v, schedule: { ...sch, ...patch } };
    });

  function onToggleInterval(enabled) {
    setSchedule({
      intervalEnabled: enabled,
      intervalMinutes: enabled ? (schedule.intervalMinutes ?? 10) : null,
      intervalTimes: enabled ? (schedule.intervalTimes ?? 1) : null,
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("MANUAL")}
          className={`text-left rounded-2xl border p-4 transition ${
            mode === "MANUAL" ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">bolt</span>
            <div className="font-semibold text-slate-900">직접 실행</div>
          </div>
          <div className="mt-1 text-sm text-slate-600">지금 테스트를 실행합니다.</div>
        </button>

        <button
          type="button"
          onClick={() => {
            console.log("[RunTimingStep] schedule card clicked");
            const today = todayLocalISO();

            // mode + schedule 한 번에 안전하게 갱신
            onChange?.((prev) => {
              const v = prev ?? {};
              const sch = v.schedule ?? {};
              return {
                ...v,
                mode: "SCHEDULE",
                schedule: {
                  ...sch,
                  startDate: sch.startDate ?? today,
                  endDate: sch.endDate ?? today,
                  execTime: sch.execTime ?? "09:00",
                  repeatCycle: sch.repeatCycle ?? "WEEKLY",
                  weeklyDaysMask: sch.weeklyDaysMask ?? 0,
                  intervalEnabled: sch.intervalEnabled ?? false,
                  intervalMinutes: sch.intervalMinutes ?? null,
                  intervalTimes: sch.intervalTimes ?? null,
                },
              };
            });
          }}
          className={`text-left rounded-2xl border p-4 transition ${
            mode === "SCHEDULE" ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">calendar_add_on</span>
            <div className="font-semibold text-slate-900">스케줄 실행</div>
          </div>
          <div className="mt-1 text-sm text-slate-600">예약 조건을 설정하고 스케줄을 생성합니다.</div>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">선택된 디바이스</div>
        <div className="mt-1 text-sm text-slate-600">
          {device ? (
            <>
              <b className="text-slate-800">{device.name ?? "Device"}</b>
              <span className="text-slate-400"> · </span>
              <span className="font-mono">{device.udid}</span>
            </>
          ) : (
            <span className="text-slate-400">디바이스를 먼저 선택해 주세요.</span>
          )}
        </div>
      </div>

      {mode === "SCHEDULE" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="text-sm font-semibold text-slate-900">스케줄 설정</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm text-slate-700">
              예약 이름
              <input
                type="text"
                value={schedule.name ?? ""}
                onChange={(e) => setSchedule({ name: e.target.value })}
                maxLength={100}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
                placeholder="예) 매주 회귀 테스트"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              실행 주기
              <select
                value={schedule.repeatCycle ?? "WEEKLY"}
                onChange={(e) => setSchedule({ repeatCycle: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="ONCE">한 번</option>
                <option value="DAILY">매일</option>
                <option value="WEEKLY">매주</option>
              </select>
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              실행 시작일
              <input
                type="date"
                value={schedule.startDate ?? todayLocalISO()}
                min={todayLocalISO()}
                onChange={(e) => setSchedule({ startDate: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
              />
            </label>

            {schedule.repeatCycle !== "ONCE" && (
              <label className="flex flex-col text-sm text-slate-700">
                실행 종료일
                <input
                  type="date"
                  value={schedule.endDate ?? todayLocalISO()}
                  min={schedule.startDate ?? todayLocalISO()}
                  onChange={(e) => setSchedule({ endDate: e.target.value })}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
            )}

            <label className="flex flex-col text-sm text-slate-700">
              실행 시간
              <input
                type="time"
                value={schedule.execTime ?? "09:00"}
                onChange={(e) => setSchedule({ execTime: e.target.value })}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              타임존
              <input
                type="text"
                value={"Asia/Seoul"}
                readOnly
                className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
            </label>
          </div>

          <IntervalSettings
            enabled={!!schedule.intervalEnabled}
            minutes={schedule.intervalMinutes}
            times={schedule.intervalTimes}
            onToggle={onToggleInterval}
            onChangeMinutes={(v) => setSchedule({ intervalMinutes: v === "" ? null : parseInt(v, 10) })}
            onChangeTimes={(v) => setSchedule({ intervalTimes: v === "" ? null : parseInt(v, 10) })}
          />

          {schedule.repeatCycle === "WEEKLY" && (
            <WeekdayChipsSelector
              mask={schedule.weeklyDaysMask ?? 0}
              onChange={(mask) => setSchedule({ weeklyDaysMask: mask })}
              max={6}
            />
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            스케줄은 현재 선택된 디바이스(<span className="font-mono">{device?.udid ?? "UDID"}</span>)로 생성됩니다.
          </div>
        </div>
      )}
    </div>
  );
}