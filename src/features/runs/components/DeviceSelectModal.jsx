import { useRecoilValue } from "recoil";
import { useDeviceFarmPolling } from "../../device-farm/hooks/useDeviceFarm";
import { deviceFarmState } from "../../device-farm/state/deviceFarmState";
import { useEffect, useMemo, useState } from "react";

export default function DeviceSelectModal({ onClose, onConfirm }) {
  // 모달이 마운트되는 순간부터 폴링 시작 (훅 내부에서 start/stop 자동)
  useDeviceFarmPolling({ intervalMs: 4000 });

  const df = useRecoilValue(deviceFarmState);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const { loading, error, items = [], lastUpdatedAt } = df || {};

  // 가용 장치만
  const devices = useMemo(() => (items || []).filter((d) => d?.available), [items]);

  // 모달 열릴 때마다 선택 초기화
  useEffect(() => { setSelectedDevice(null); }, []);


  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">디바이스 선택</h3>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {lastUpdatedAt ? `최근 업데이트: ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "로딩 중…"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="닫기">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* 바디 */}
        <div className="px-5 py-4">
          {loading && <div className="text-sm text-gray-600 dark:text-gray-300">불러오는 중…</div>}
          {!loading && error && <div className="text-sm text-rose-600 dark:text-rose-300">{error}</div>}
          {!loading && !error && devices.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300">가용(Available) 디바이스가 없습니다.</div>
          )}

          {!loading && !error && devices.length > 0 && (
            <ul className="space-y-2 max-h-72 overflow-auto pr-1">
              {devices.map((raw) => {
                const d = raw;
                return (
                  <li key={d.udid} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                    <input
                      type="radio"
                      name="device"
                      value={d.udid}
                      checked={selectedDevice?.udid === d.udid}
                      onChange={() => setSelectedDevice(d)}
                      className="accent-blue-600"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.name ?? d.udid}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {d.platform} · {d.udid}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        IP {String(d.connectedIp)} · Appium {String(d.appiumPort)} · System {String(d.systemPort ?? "")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-5 py-3">
          <button onClick={onClose} className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            취소
          </button>
          <button
            onClick={() => onConfirm?.(selectedDevice)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
            disabled={!selectedDevice}
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            테스트 실행
          </button>
        </div>
      </div>
    </div>
  );
}