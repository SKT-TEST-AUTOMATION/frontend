// src/features/runs/components/wizard/DeviceSelectStep.jsx
import { useRecoilValue } from "recoil";
import { useDeviceFarmPolling } from "../../../device-farm/hooks/useDeviceFarm";
import { deviceFarmState } from "../../../device-farm/state/deviceFarmState";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getDevices } from "../../../../services/deviceAPI";

export default function DeviceSelectStep({ value, onChange }) {
  // 1) 라이브 상태 폴링 (Appium Device Farm)
  useDeviceFarmPolling({ intervalMs: 4000 });
  const df = useRecoilValue(deviceFarmState);
  const { loading: dfLoading, error: dfError, items: dfItems = [], lastUpdatedAt } = df || {};

  // 2) 백엔드 등록 장치 (Inventory)
  const [beLoading, setBeLoading] = useState(true);
  const [beError, setBeError] = useState(null);
  const [beItems, setBeItems] = useState([]);

  const fetchBackend = useCallback(async () => {
    setBeLoading(true);
    setBeError(null);
    try {
      const controller = new AbortController();
      const res = await getDevices(
        { page: 0, size: 100, sort: "udid,desc" },
        controller.signal
      );
      setBeItems(res.content || []);
    } catch (err) {
      setBeError(err?.message || "Failed to fetch registered devices");
    } finally {
      setBeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackend();
  }, [fetchBackend]);

  // 3) DF 데이터를 UDID 기준 Map
  const dfByUdid = useMemo(() => {
    const m = new Map();
    for (const d of dfItems) if (d?.udid) m.set(d.udid, d);
    return m;
  }, [dfItems]);

  // 4) 등록된 기기 머지
  const registeredDevices = useMemo(() => {
    return (beItems || [])
      .map((b) => {
        const live = dfByUdid.get(b.udid);

        const platformSource = b.deviceOsType || live?.platform || "";
        const platform = platformSource.toUpperCase().includes("IOS")
          ? "IOS"
          : "ANDROID";

        const name =
          (b.name && b.name.trim()) ||
          (live?.name && live.name.trim()) ||
          (b.udid || "");

        // ✅ (원본 코드에 오타로 보이는 부분이 있어 정정) systemPort는 connectedIp가 아니라 systemPort여야 합니다.
        const systemPort = b.systemPort ?? live?.systemPort ?? null;

        return {
          udid: b.udid,
          name,
          platform,
          available: !!live?.available,
          offline: !live || !!live?.offline,
          busy: !!live?.busy,
          appiumHost: live?.appiumHost ?? b.appiumHost ?? null,
          appiumPort: live?.appiumPort ?? b.appiumPort ?? null,
          basePath: live?.basePath ?? b.basePath ?? "/wd/hub",
          connectedIp: live?.connectedIp || b.connectedIp,
          systemPort,
          isRegistered: true,
        };
      })
      .filter(Boolean);
  }, [beItems, dfByUdid]);

  // 5) 후보: "가용(Available)한 등록된 기기"만
  const devices = useMemo(
    () => registeredDevices.filter((d) => d.available),
    [registeredDevices]
  );

  const loading = dfLoading || beLoading;
  const error = dfError || beError;

  // 외부 value가 바뀌면 내부도 동기화 (필요시)
  const [selectedDevice, setSelectedDevice] = useState(value ?? null);
  useEffect(() => setSelectedDevice(value ?? null), [value]);

  useEffect(() => {
    onChange?.(selectedDevice ?? null);
  }, [selectedDevice, onChange]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
        <div>
          <h3 className="text-sm font-bold text-slate-800">디바이스 선택</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {lastUpdatedAt
              ? `최근 업데이트: ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : "로딩 중…"}
          </p>
        </div>
        <span className="text-[11px] text-slate-400">
          등록한 기기 중 연결된 기기
        </span>
      </div>

      <div className="px-5 py-4">
        {loading && <div className="text-sm text-slate-600">불러오는 중…</div>}

        {!loading && error && (
          <div className="text-sm text-rose-600">{error}</div>
        )}

        {!loading && !error && devices.length === 0 && (
          <div className="text-sm text-slate-600">
            가용(Available) 등록 디바이스가 없습니다.
          </div>
        )}

        {!loading && !error && devices.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-auto pr-1">
            {devices.map((d) => (
              <li
                key={d.udid}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                  selectedDevice?.udid === d.udid
                    ? "border-blue-200 bg-blue-50/40"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="device"
                  value={d.udid}
                  checked={selectedDevice?.udid === d.udid}
                  onChange={() => setSelectedDevice(d)}
                  className="accent-blue-600"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">
                    {d.name ?? d.udid}
                  </span>
                  <span className="text-xs text-slate-500">
                    {d.platform} · {d.udid}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    IP {String(d.connectedIp)} · Appium {String(d.appiumPort)} · System{" "}
                    {String(d.systemPort ?? "")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}