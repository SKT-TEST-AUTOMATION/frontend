import {useMemo, useState } from "react";
import DeviceSelectModal from "./DeviceSelectModal";
import { createSchedule } from "../../../services/scheduleAPI";
import IntervalSettings from './IntervalSettings.jsx';


const WEEKDAYS = [
  { label: "월", bit: 0 },
  { label: "화", bit: 1 },
  { label: "수", bit: 2 },
  { label: "목", bit: 3 },
  { label: "금", bit: 4 },
  { label: "토", bit: 5 },
  { label: "일", bit: 6 },
];

function countBits(n) { let x = n >>> 0, c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }

// bit0=MON..bit6=SUN 매핑용
const DAY_OF_WEEK_ENUMS = [
  "MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"
];

function maskToDayOfWeekList(mask) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    if ((mask & (1 << i)) !== 0) out.push(DAY_OF_WEEK_ENUMS[i]);
  }
  return out;
}

// 로그인 사용자 id 확보 
function getCurrentUserIdOrNull() {
  // 로컬스토리지 사용 예시
  // const s1 = window.localStorage?.getItem?.("userId");
  return 1;
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
            <span>실행 주기: <b>{summaryParts.humanCycle}</b></span>
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
            <span>반복: <b>{summaryParts.interval}</b></span>
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

export function ReserveScheduleModal({ testId, onClose, onSuccess, onError }) {
  const [open, setOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // --- 새로 추가된 상태들 ---
  const [name, setName] = useState(() => `스케줄-${testId}-${new Date().toISOString().slice(0,10)}`);
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceUdidText, setDeviceUdidText] = useState("");

  // schedule state
  const [repeatCycle, setRepeatCycle] = useState("WEEKLY"); // ONCE | DAILY | WEEKLY
  const [execTime, setExecTime] = useState(() => {
    const d = new Date(); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0'); return `${hh}:${mm}`;
  });
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [weeklyDaysMask, setWeeklyDaysMask] = useState(0); // bit0=MON..bit6=SUN

  // 반복 설정
  const [intervalEnabled, setIntervalEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(null); // null = 미설정
  const [intervalTimes, setIntervalTimes] = useState(null);     // null = 미설정

  function onToggleInterval(enabled) {
    setIntervalEnabled(enabled);
    if (enabled) {
      // 체크 시 기본값 자동 세팅
      setIntervalMinutes((prev) => (prev == null ? 10 : prev));
      setIntervalTimes((prev)   => (prev == null ? 1  : prev));
    } else {
      // 해제 시 null로 되돌림
      setIntervalMinutes(null);
      setIntervalTimes(null);
    }
  }
  function onChangeIntervalMinutes(v) {
    // 숫자/공백 방어는 validate에서 수행, 여기선 값만 반영
    setIntervalMinutes(v === "" ? null : parseInt(v, 10));
  }
  function onChangeIntervalTimes(v) {
    setIntervalTimes(v === "" ? null : parseInt(v, 10));
  }

  function todayISODate() { return new Date().toISOString().slice(0,10); }

  const summaryParts = useMemo(() => {
    const humanCycle = repeatCycle === "ONCE" ? "한 번" : (repeatCycle === "DAILY" ? "매일" : "매주");
    const days = WEEKDAYS.filter(w => (weeklyDaysMask & (1<<w.bit)) !== 0).map(w => w.label).join("·");
    const range = repeatCycle === "ONCE" ? startDate : `${startDate}${endDate ? ` ~ ${endDate}` : ""}`;
    const interval = intervalEnabled? `${intervalMinutes}분 간격으로 ${intervalTimes}회 추가 실행`: '';
    return { humanCycle, time: execTime || "--:--", range, weekdays: repeatCycle === "WEEKLY" ? (days || "(요일 미선택)") : null, interval };
  }, [repeatCycle, weeklyDaysMask, startDate, endDate, execTime, intervalTimes, intervalMinutes, intervalEnabled]);

  function onCreateClick() {
    if (!validate()) return;
    setConfirming(true);
  }

  function resolveDeviceUdid() {
    // 우선순위: 모달에서 고른 디바이스 → 직접 입력 값
    return (selectedDevice?.udid || deviceUdidText || "").trim();
  }

  // validation
  function validate() {
    if (!name?.trim()) { onError && onError("예약 이름을 입력하세요."); return false; }
    if (!execTime) { onError && onError("실행 시간을 선택하세요."); return false; }
    if (!startDate) { onError && onError("실행 시작일을 선택하세요."); return false; }
    if (repeatCycle !== "ONCE" && !endDate) { onError && onError("실행 종료일을 선택하세요."); return false; }
    if (repeatCycle !== "ONCE" && endDate < startDate) { onError && onError("종료일은 시작일 이후여야 합니다."); return false; }
    if (repeatCycle === "WEEKLY") {
      const cnt = countBits(weeklyDaysMask);
      if (cnt === 0) { onError && onError("주간 반복 시 최소 하나의 요일을 선택해야 합니다."); return false; }
      if (cnt > 6)   { onError && onError("요일은 최대 6일까지 선택할 수 있습니다."); return false; }
    }

    // 인터벌 규칙
    if (intervalEnabled) {
      if (!(Number.isInteger(intervalMinutes) && intervalMinutes >= 1)) {
        onError && onError("인터벌 분(min)은 1 이상이어야 합니다.");
        return false;
      }
      if (!(Number.isInteger(intervalTimes) && intervalTimes >= 1)) {
        onError && onError("인터벌 횟수(times)는 1 이상이어야 합니다.");
        return false;
      }
    } else {
      // 미사용일 때는 둘 다 null 유지
      if (intervalMinutes != null || intervalTimes != null) {
        onError && onError("반복 실행을 사용하지 않으면 인터벌 필드는 비워 두세요.");
        return false;
      }
    }

    const udid = resolveDeviceUdid();
    if (!udid) { onError && onError("예약에 사용할 디바이스(UDID)를 선택하거나 직접 입력하세요."); return false; }
    const uid = getCurrentUserIdOrNull();
    if (!uid) { onError && onError("로그인 정보에서 userId를 찾을 수 없습니다."); return false; }
    return true;
  }

  async function submit() {
    if (!validate()) return;
    try {
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        startDate,
        endDate: (repeatCycle === "ONCE") ? startDate : endDate, // ONCE의 경우에 endDate는 startDate와 동일 처리
        executeTime: execTime,                 // "HH:mm"
        timezone: "Asia/Seoul",
        scheduleType: repeatCycle,             // "ONCE" | "DAILY" | "WEEKLY"
        ...(intervalEnabled ? { intervalMinutes, intervalTimes } : {}), // 둘 다 있을 때만 포함
        weeklyDays: (repeatCycle === "WEEKLY") ? maskToDayOfWeekList(weeklyDaysMask) : [], // List<DayOfWeek>
        deviceUdid: resolveDeviceUdid()
      };

      const data = await createSchedule(testId, payload);
      console.log(data);
      // 성공
      onSuccess && onSuccess();
      setOpen(false);
      onClose && onClose();
    } catch (e) {
      onError && onError(e.message || "예약 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">테스트 실행 예약</h3>

        {/* 스케줄 설정 */}
        <div className="space-y-5">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
              예약 이름
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                placeholder="예) 매주 회귀 테스트"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
              실행 주기
              <select
                value={repeatCycle}
                onChange={(e) => setRepeatCycle(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              >
                <option value="ONCE">한 번</option>
                <option value="DAILY">매일</option>
                <option value="WEEKLY">매주</option>
              </select>
            </label>

            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
              실행 시작일
              <input
                type="date"
                value={startDate}
                min={todayISODate()}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </label>
            {repeatCycle !== "ONCE" && (
              <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                실행 종료일
                <input
                  type="date"
                  value={endDate}
                  min={startDate || todayISODate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                />
              </label>
            )}
            <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
              실행 시간
              <input
                type="time"
                value={execTime}
                onChange={(e) => setExecTime(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </label>
          </div>

          {/*  반복 설정 섹션 */}
          <IntervalSettings
            enabled={intervalEnabled}
            minutes={intervalMinutes}
            times={intervalTimes}
            onToggle={onToggleInterval}
            onChangeMinutes={onChangeIntervalMinutes}
            onChangeTimes={onChangeIntervalTimes}
          />

          {/* WEEKLY 전용 */}
          {repeatCycle === "WEEKLY" && (
            <WeekdayChipsSelector
              mask={weeklyDaysMask}
              onChange={setWeeklyDaysMask}
              onError={onError}
              max={6}
            />
          )}

          {/* 디바이스 선택/입력 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="md:col-span-2 flex flex-col text-sm text-gray-700 dark:text-gray-300">
              사용할 디바이스 UDID
              <input
                type="text"
                value={selectedDevice?.udid || deviceUdidText}
                onChange={(e) => { setSelectedDevice(null); setDeviceUdidText(e.target.value); }}
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                placeholder="직접 입력하거나 오른쪽 버튼으로 선택"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setDevicePickerOpen(true)}
                className="w-full md:w-auto rounded-md px-4 py-2 text-sm border border-gray-300 dark:border-gray-600"
              >
                디바이스 선택
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm border border-gray-300 dark:border-gray-600">취소</button>
          <button
            onClick={onCreateClick}
            disabled={submitting}
            className={`rounded-xl px-5 py-2 text-sm text-white transition-colors ${submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {submitting ? "예약 중..." : "생성"}
          </button>
        </div>

        {/* 최종 확인 모달 */}
        <ReserveConfirmModal
          open={confirming}
          onCancel={() => setConfirming(false)}
          onConfirm={submit}
          submitting={submitting}
          summaryParts={summaryParts}
          repeatCycle={repeatCycle}
        />

        {/* 디바이스 선택 모달 (재사용) */}
        {devicePickerOpen && (
          <DeviceSelectModal
            onClose={() => setDevicePickerOpen(false)}
            onConfirm={(dev) => {
              setSelectedDevice(dev);
              setDeviceUdidText("");
              setDevicePickerOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}