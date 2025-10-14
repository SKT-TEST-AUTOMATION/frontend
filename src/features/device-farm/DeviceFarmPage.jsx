// src/features/devices/pages/DeviceFarmPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRecoilValue } from "recoil";

import PageHeader from "../../shared/components/PageHeader";
import { deviceFarmState } from "./state/deviceFarmState";
import { useDeviceFarmPolling } from "./hooks/useDeviceFarm";
import { api, normalizePage, toErrorMessage } from "../../services/axios";
import { getDevices } from "../../services/deviceAPI";
import { REQUEST_CANCELED_CODE } from "../../constants/errors";

// ──────────────────────────────────────────────────────────
// 간단한 상태/뱃지
// ──────────────────────────────────────────────────────────
function AvailabilityBadge({ available, offline, busy }) {
  let text = "UNAVAILABLE";
  let klass = "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200";
  if (available) {
    text = "AVAILABLE";
    klass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
  } else if (offline) {
    text = "OFFLINE";
    klass = "bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300";
  } else if (busy) {
    text = "BUSY";
    klass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${klass}`}>{text}</span>;
}

// ──────────────────────────────────────────────────────────
function DeviceCard({ d, right }) {
  // d: {udid, name, platform, available, offline, busy, appiumHost...}
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-start justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-400">smartphone</span>
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{d.name || d.udid}</span>
        </div>
        {(d.connectedIp || d.appiumHost) && (
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {d.connectedIp || d.appiumHost}:{d.appiumPort}{d.basePath || ""}
          </div>
        )}
        <div className="mt-2">
          {"available" in d && <AvailabilityBadge available={d.available} offline={d.offline} busy={d.busy} />}
        </div>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 등록 모달: 이름 입력 → POST /api/v1/devices
// ──────────────────────────────────────────────────────────
function RegisterModal({ open, onClose, initial, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/v1/devices", {
        udid: initial.udid,
        name: name?.trim() || initial.udid,
        platform: (initial.platform || "").toUpperCase() === "IOS" ? "IOS" : "ANDROID",
        systemPort: initial.systemPort ?? null,
        appiumPort: initial.appiumPort ?? 4723,
        connectedIp: initial.connectedIp ?? initial.appiumHost ?? "127.0.0.1",
        basePath: initial.basePath ?? "",
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">디바이스 등록</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">{initial?.platform} · {initial?.udid}</div>
          <label className="block text-sm text-gray-700 dark:text-gray-200">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="예: Galaxy A12 #1"
          />
          {error && <div className="text-sm text-rose-600 dark:text-rose-300">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-5 py-3">
          <button onClick={onClose} className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// 페이지
// ──────────────────────────────────────────────────────────
export default function DeviceFarmPage() {
  // Appium 폴링 (탭이 비활성화되면 자동 스킵됨)
  const { refresh } = useDeviceFarmPolling({
    url: "http://127.0.0.1:4723/device-farm/api/device",
    intervalMs: 4000,
    appiumHost: "127.0.0.1",
    appiumPort: 4723,
    basePath: "/",
  });
  const { loading: dfLoading, error: dfError, items: dfItems = [], lastUpdatedAt } = useRecoilValue(deviceFarmState);

  // 백엔드 등록 목록
  const [beLoading, setBeLoading] = useState(true);
  const [beError, setBeError] = useState(null);
  const [beItems, setBeItems] = useState([]); // [{udid, name, platform, ...}]

  const fetchBackend = useCallback(async (signal) => {
    setBeLoading(true);
    setBeError(null);
    try {
      // 예: /api/v1/devices?size=1000
      const res = await getDevices(
        { page: 0, size: 100, sort:"udid,desc"},
        signal
      );
      const data = normalizePage(res);
      setBeItems(data.content);
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      setBeError(toErrorMessage(err));
    } finally {
      setBeLoading(false);
    }
  }, []);

  useEffect(() => { 
    const controller = new AbortController();
    fetchBackend(controller.signal); 
  }, [fetchBackend]);

  // 매칭 맵 생성 (udid 기준)
  const dfByUdid = useMemo(() => {
    const m = new Map();
    for (const d of dfItems) m.set(d.udid, d);
    return m;
  }, [dfItems]);

  // 등록된 기기(백엔드 기준) 배열: df 상태 덧씌움
  const registered = useMemo(() => {
    return beItems.map((b) => {
      const live = dfByUdid.get(b.udid);
      return {
        udid: b.udid,
        name: b.name || live?.name || b.udid,
        platform: (b.platform || live?.platform || "").toUpperCase().includes("IOS") ? "IOS" : "ANDROID",
        available: !!live?.available,
        offline: !!live?.offline,
        busy: !!live?.busy,
        // 표시용
        appiumHost: live?.appiumHost,
        appiumPort: live?.appiumPort,
        basePath: live?.basePath,
      };
    });
  }, [beItems, dfByUdid]);

  // 미등록 기기(폴링엔 있지만 백엔드엔 없음)
  const unregistered = useMemo(() => {
    const setBE = new Set(beItems.map((b) => b.udid));
    return dfItems
      .filter((d) => !setBE.has(d.udid))
      .map((d) => ({
        ...d,
        name: d.name || d.udid,
        _unregistered: true,
      }));
  }, [beItems, dfItems]);

  // 등록 모달
  const [regOpen, setRegOpen] = useState(false);
  const [regInitial, setRegInitial] = useState(null);
  const openRegister = (d) => { setRegInitial(d); setRegOpen(true); };
  const onSaved = async () => { await fetchBackend(); };

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        <PageHeader
          title="디바이스 관리"
          subtitle={lastUpdatedAt ? `Appium 동기화: ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Appium 동기화 대기"}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={fetchBackend} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                등록 목록 새로고침
              </button>
              <button onClick={refresh} className="rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">
                Appium 새로고침
              </button>
            </div>
          }
        />

        {/* 에러 알림 */}
        {(dfError || beError) && (
          <div className="mb-2 text-sm rounded-lg p-3 border"
               style={{borderColor: 'rgb(254 202 202)', background: 'rgb(254 242 242)', color: 'rgb(185 28 28)'}}>
            {dfError && <div>Appium 불러오기 실패: {dfError}</div>}
            {beError && <div>등록 목록 불러오기 실패: {beError}</div>}
          </div>
        )}

        {/* 등록된 기기 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">등록된 기기</h2>
          {beLoading ? (
            <div className="text-gray-500 dark:text-gray-400">불러오는 중…</div>
          ) : registered.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">등록된 기기가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {registered.map((d) => (
                <DeviceCard key={d.udid} d={d} />
              ))}
            </div>
          )}
        </section>

        {/* 미등록 기기 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">미등록 기기</h2>
          {dfLoading ? (
            <div className="text-gray-500 dark:text-gray-400">Appium에서 불러오는 중…</div>
          ) : unregistered.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">미등록 상태의 기기가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {unregistered.map((d) => (
                <DeviceCard
                  key={d.udid}
                  d={d}
                  right={
                    <button
                      onClick={() => openRegister(d)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> 등록
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 등록 모달 */}
      <RegisterModal open={regOpen} onClose={() => setRegOpen(false)} initial={regInitial} onSaved={onSaved} />
    </>
  );
}
