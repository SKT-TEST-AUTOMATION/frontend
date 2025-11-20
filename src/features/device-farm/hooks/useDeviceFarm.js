import { useCallback, useEffect, useRef } from "react";
import { useSetRecoilState } from "recoil";
import { deviceFarmState } from "../state/deviceFarmState";

/**
 * Device Farm 응답 표준화
 * - connectedIp: "http://{host}:{port}"
 * - connectedUrl: connectedIp + basePath
 * - basePath 기본값: "/wd/hub"
 */
function mapDfDevice(
  raw,
  { appiumHost = "127.0.0.1", appiumPort = 4723, basePath = "/wd/hub", preferConfigHost = false } = {}
) {
  let hostFromDf = {
    protocol: "http:",
    hostname: appiumHost,
    port: String(appiumPort),
    pathname: basePath || "/wd/hub",
  };

  try {
    if (!preferConfigHost && raw.host) {
      const u = new URL(raw.host);
      hostFromDf = {
        protocol: u.protocol || "http:",
        hostname: u.hostname || appiumHost,
        port: u.port || String(appiumPort),
        // DF가 루트("/")만 주면 /wd/hub로 보정
        pathname: u.pathname && u.pathname !== "/" ? u.pathname : "/wd/hub",
      };
    }
  } catch {
    // 파싱 실패 시 기본값 유지
  }

  const udid = raw.udid;
  const name = raw.name;

  const p = (raw.platform || raw.os || "").toLowerCase();
  const platform = p.includes("ios") ? "IOS" : p.includes("android") ? "ANDROID" : "UNKNOWN";

  const offline = raw.offline === true;
  const busy = raw.busy === true;
  const blocked = raw.userBlocked === true || raw.blocked === true;
  const available = !offline && !busy && !blocked;

  const systemPort = raw.systemPort ?? raw.wdaLocalPort ?? null;
  const width = raw.width ? Number(raw.width) : undefined;
  const height = raw.height ? Number(raw.height) : undefined;

  const origin = `${hostFromDf.protocol}//${hostFromDf.hostname}${
    hostFromDf.port ? `:${hostFromDf.port}` : ""
  }`;
  const urlWithBase = `${origin}${hostFromDf.pathname || "/wd/hub"}`;

  return {
    udid,
    name,
    platform,

    offline,
    busy,
    available,
    blocked,
    state: raw.state,

    connectedIp: origin,       // 예: "http://172.16.17.205:4723"
    connectedUrl: urlWithBase, // 예: "http://172.16.17.205:4723/wd/hub"
    appiumHost: hostFromDf.hostname,
    appiumPort: Number(hostFromDf.port) || 4723,
    basePath: hostFromDf.pathname || "/wd/hub",

    systemPort,
    adbPort: raw.adbPort ?? null,

    realDevice: !!raw.realDevice,
    deviceType: raw.deviceType,
    width,
    height,

    _raw: raw,
  };
}

/**
 * useDeviceFarmPolling
 *
 * @param {Object} options
 * @param {"local"|"remote"} options.mode  - "local"이면 127.0.0.1:4723 기준 고정
 * @param {string} [options.url]           - mode === "remote" 일 때 DF 조회 URL
 * @param {number} [options.intervalMs]
 * @param {string} [options.appiumHost]    - mode === "remote" 에서 사용
 * @param {number} [options.appiumPort]    - mode === "remote" 에서 사용
 * @param {string} [options.basePath]
 */
export function useDeviceFarmPolling({
  mode = "local", // ★ 기본은 로컬 모드
  url,
  intervalMs = 4000,
  appiumHost,
  appiumPort,
  basePath = "/wd/hub",
} = {}) {
  const set = useSetRecoilState(deviceFarmState);
  const timerRef = useRef(null);

  // ★ 모드에 따라 실제 사용할 값 결정
  const isLocal = mode === "local";

  const effectiveUrl = isLocal
    ? "http://127.0.0.1:4723/device-farm/api/device"
    : url || "http://127.0.0.1:4723/device-farm/api/device"; // fallback

  const effectiveHost = isLocal ? "127.0.0.1" : appiumHost || "127.0.0.1";
  const effectivePort = isLocal ? 4723 : appiumPort || 4723;
  const effectiveBasePath = basePath || "/wd/hub";

  const fetchOnce = useCallback(
    async (signal) => {
      set((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(effectiveUrl, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.devices)
          ? data.devices
          : Array.isArray(data.items)
          ? data.items
          : [];

        const mapped = arr.map((d) =>
          mapDfDevice(d, {
            appiumHost: effectiveHost,
            appiumPort: effectivePort,
            basePath: effectiveBasePath,
            // local 모드에서는 DF가 내려주는 host(예: 198.x.x.x)를 무시하고
            // 설정값(127.0.0.1 등)을 강제로 사용
            preferConfigHost: isLocal,
          })
        );

        set({
          loading: false,
          error: null,
          lastUpdatedAt: Date.now(),
          items: mapped,
        });
      } catch (e) {
        console.log(e);
        set((s) => ({
          ...s,
          loading: false,
          error: e.message || "Failed to fetch device farm",
        }));
      }
    },
    [effectiveUrl, effectiveHost, effectivePort, effectiveBasePath, set, isLocal]
  );

  const start = useCallback(() => {
    if (timerRef.current?.id) clearInterval(timerRef.current.id);
    timerRef.current?.ctrl?.abort?.();

    const ctrl = new AbortController();
    fetchOnce(ctrl.signal); // 즉시 1회

    timerRef.current = {
      ctrl,
      id: setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        fetchOnce(ctrl.signal);
      }, intervalMs),
    };
  }, [fetchOnce, intervalMs]);

  const stop = useCallback(() => {
    if (timerRef.current?.id) clearInterval(timerRef.current.id);
    timerRef.current?.ctrl?.abort?.();
    timerRef.current = null;
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const refresh = useCallback(() => {
    const c = new AbortController();
    return fetchOnce(c.signal);
  }, [fetchOnce]);

  return { refresh, stop, start };
}
