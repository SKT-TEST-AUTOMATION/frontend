

import { useEffect, useState } from "react";
import PageHeader from "../../shared/components/PageHeader";

// ──────────────────────────────────────────────────────────
// 간단한 상태/뱃지 (원본과 동일)
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
        {d.systemPort != null && (
          <div className ="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
            system port: {d.systemPort}
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
// 등록 모달 (더미: API 호출 없이 onSaved 콜백만 실행)
// ──────────────────────────────────────────────────────────
function RegisterModal({ open, onClose, initial, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
    }
  }, [open, initial]);

  if (!open) return null;

  const displayAppiumPort = initial?.appiumPort ?? 4723; // UI 표시용
  const displaySystemPort = initial?.systemPort ?? null; // null이면 미지정

  const submit = async () => {
    setSaving(true);
    // 실제 API 호출 대신 더미 저장: 부모로 데이터 전달
    const payload = {
      ...initial,
      name: name?.trim() || initial.udid,
      platform: (initial.platform || "").toUpperCase().includes("IOS") ? "IOS" : "ANDROID",
    };
    onSaved?.(payload);
    setSaving(false);
    onClose?.();
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
          <div className="text-xs text-gray-500 dark:text-gray-400">* {initial?.platform} DEVICE </div>
          <label className="block text-sm text-gray-700 dark:text-gray-200">UDID</label>
          <input
            value={initial?.udid}
            readOnly
            className="h-10 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-3 text-sm text-gray-700 dark:text-gray-300 outline-none"
          />
          <label className="block text-sm text-gray-700 dark:text-gray-200">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="예: Galaxy A12 #1"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">Appium Port</label>
              <input
                value={String(displayAppiumPort)}
                readOnly
                className="h-10 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-3 text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">System Port</label>
              <input
                value={displaySystemPort != null ? String(displaySystemPort) : ""}
                placeholder="미지정"
                readOnly
                className="h-10 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-3 text-sm text-gray-700 dark:text-gray-300 outline-none"
              />
            </div>
          </div>
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
// 더미 페이지 (API 없이 동작)
// ──────────────────────────────────────────────────────────
export default function DeviceFarmPageDummy() {
  // "Appium 동기화" 표기를 위한 시간 표시만 더미로 갱신
  const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setLastUpdatedAt(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // 1) 등록된 기기 더미 2개
  const [beItems, setBeItems] = useState([
    {
      udid: "R59R701TDGL",
      name: "Galaxy A12",
      platform: "ANDROID",
      available: true,
      offline: false,
      busy: false,
      appiumHost: "127.0.0.1",
      appiumPort: 4723,
      systemPort: 8200,
      basePath: "/",
    },
    {
      udid: "R29R293SJTN",
      name: "Galaxy 폴드7",
      platform: "ANDROID",
      available: false,
      offline: false,
      busy: true,
      appiumHost: "127.0.0.1",
      appiumPort: 4723,
      systemPort: 8201,
      basePath: "/",
    },
  ]);

  // 2) 미등록 기기 더미 1개
  const [unregistered, setUnregistered] = useState([
    {
      udid: "R59R702XYZL",
      name: "s25",
      platform: "ANDROID",
      available: true,
      offline: false,
      busy: false,
      appiumHost: "127.0.0.1",
      appiumPort: 4723,
      systemPort: 8202,
      basePath: "/",
      _unregistered: true,
    },
  ]);

  // 3) 등록 버튼 → 모달 열기
  const [regOpen, setRegOpen] = useState(false);
  const [regInitial, setRegInitial] = useState(null);
  const openRegister = (d) => {
    setRegInitial(d);
    setRegOpen(true);
  };

  // 모달 저장 시: 더미로 등록 처리(목록 이동)
  const handleSaved = (payload) => {
    // 미등록 목록에서 제거
    setUnregistered((prev) => prev.filter((x) => x.udid !== payload.udid));
    // 등록 목록에 추가 (상태는 사용 가능한 것으로 기본 반영)
    setBeItems((prev) => [
      ...prev,
      {
        udid: payload.udid,
        name: payload.name || payload.udid,
        platform: payload.platform,
        available: true,
        offline: false,
        busy: false,
        appiumHost: payload.appiumHost || payload.connectedIp || "127.0.0.1",
        appiumPort: payload.appiumPort ?? 4723,
        systemPort: payload.systemPort ?? null,
        basePath: payload.basePath || "/",
      },
    ]);
  };

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        <PageHeader
          title="디바이스 관리"
          subtitle={lastUpdatedAt ? `Appium 동기화: ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Appium 동기화 대기"}
        />

        {/* 등록된 기기 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">등록된 기기</h2>
          {beItems.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">등록된 기기가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {beItems.map((d) => (
                <DeviceCard key={d.udid} d={d} />
              ))}
            </div>
          )}
        </section>

        {/* 미등록 기기 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">미등록 기기</h2>
          {unregistered.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">미등록 상태의 연결 기기가 없습니다.</div>
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
      <RegisterModal open={regOpen} onClose={() => setRegOpen(false)} initial={regInitial} onSaved={handleSaved} />
    </>
  );
}