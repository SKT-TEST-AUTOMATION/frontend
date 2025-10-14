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
  { appiumHost = "127.0.0.1", appiumPort = 4723, basePath = "/wd/hub" } = {}
) {
  // 1) host 파싱 (예: "http://172.16.17.205:4723")
  let hostFromDf = {
    protocol: "http:",
    hostname: appiumHost,
    port: String(appiumPort),
    pathname: basePath || "/wd/hub",
  };

  try {
    if (raw.host) {
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

  // 2) 플랫폼
  const p = (raw.platform || raw.os || "").toLowerCase();
  const platform = p.includes("ios") ? "IOS" : p.includes("android") ? "ANDROID" : "UNKNOWN";

  // 3) 상태
  const offline = raw.offline === true;
  const busy = raw.busy === true;
  const blocked = raw.userBlocked === true || raw.blocked === true;
  const available = !offline && !busy && !blocked;

  // 4) 포트/치수
  const systemPort = raw.systemPort ?? raw.wdaLocalPort ?? null;
  const width = raw.width ? Number(raw.width) : undefined;
  const height = raw.height ? Number(raw.height) : undefined;

  // ★ origin(프로토콜+호스트+포트)과 url(베이스패스까지) 생성
  const origin = `${hostFromDf.protocol}//${hostFromDf.hostname}${hostFromDf.port ? `:${hostFromDf.port}` : ""}`;
  const urlWithBase = `${origin}${hostFromDf.pathname || "/wd/hub"}`;

  return {
    // 식별/표시
    udid,
    name,
    platform,

    // 상태
    offline,
    busy,
    available,
    blocked,
    state: raw.state,

    // 연결 정보 (실행 DTO/등록에 사용)
    connectedIp: origin,            // 예: "http://172.16.17.205:4723"
    connectedUrl: urlWithBase,      // 예: "http://172.16.17.205:4723/wd/hub"
    appiumHost: hostFromDf.hostname,
    appiumPort: Number(hostFromDf.port) || 4723,
    basePath: hostFromDf.pathname || "/wd/hub",

    systemPort,
    adbPort: raw.adbPort ?? null,

    // 부가정보
    realDevice: !!raw.realDevice,
    deviceType: raw.deviceType,
    width,
    height,

    // 원본
    _raw: raw,
  };
}

export function useDeviceFarmPolling({
  url = "http://127.0.0.1:4723/device-farm/api/device",
  intervalMs = 4000,
  appiumHost = "127.0.0.1",
  appiumPort = 4723,
  basePath = "/wd/hub", // ★ 기본을 /wd/hub로
} = {}) {
  const set = useSetRecoilState(deviceFarmState);
  const timerRef = useRef(null);

  // 서버를 한 번 불러와서 전역 상태에 반영
  const fetchOnce = useCallback(
    async (signal) => {
      set((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.devices)
          ? data.devices
          : Array.isArray(data.items)
          ? data.items
          : [];

        const mapped = arr.map((d) => mapDfDevice(d, { appiumHost, appiumPort, basePath }));
        set({ loading: false, error: null, lastUpdatedAt: Date.now(), items: mapped });
      } catch (e) {
        console.log(e);
        set((s) => ({ ...s, loading: false, error: e.message || "Failed to fetch device farm" }));
      }
    },
    [url, appiumHost, appiumPort, basePath, set]
  );

  const start = useCallback(() => {
    // 기존 타이머/요청 정리
    if (timerRef.current?.id) clearInterval(timerRef.current.id);
    timerRef.current?.ctrl?.abort?.();

    const ctrl = new AbortController();
    fetchOnce(ctrl.signal); // 즉시 1회

    timerRef.current = {
      ctrl,
      id: setInterval(() => {
        // 현재 탭이 비활성화면 요청 스킵
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

  // 수동 새로고침: 독립 컨트롤러로 안전 호출
  const refresh = useCallback(() => {
    const c = new AbortController();
    return fetchOnce(c.signal);
  }, [fetchOnce]);

  return { refresh, stop, start };
}
