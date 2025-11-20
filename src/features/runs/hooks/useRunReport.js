import { useEffect, useMemo, useRef, useState } from "react";

const PASS = "ok";
const FAIL = "fail";
const SKIP = "skip";
const NA   = "no-action";

function parseEvent(data) {
  try { return JSON.parse(data); } catch { return { type: "RAW", msg: data }; }
}
function simplifySelector(e) {
  const by  = e?.by || e?.step?.by;
  const val = e?.value || e?.step?.value;
  if (!by && !val) return "";
  if ((by || "").toUpperCase() === "XPATH") return `XPATH ${String(val||"").slice(0,180)}`;
  return `${by || ""} -> ${val || ""}`;
}

export default function useRunReport(runId, opts = {}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [rawLines, setRawLines] = useState([]);
  const [meta, setMeta] = useState({ code: "", elapsedMs: 0, status: "", appium: "", runId });

  // stepsByNo
  const stepsRef = useRef(new Map());
  const [stepsVer, setStepsVer] = useState(0);
  const [filters, setFilters] = useState({ ok:true, fail:true, skip:true, na:true, q:"" });

  const firstFailIndex = useMemo(() => {
    const arr = Array.from(stepsRef.current.values());
    return arr.findIndex(s => s.result === FAIL);
  }, [stepsVer]);

  // --- SSE endpoint discovery & reconnect ---
  const esRef      = useRef(null);
  const openTimer  = useRef(null);
  const retryTimer = useRef(null);
  const endpointIdxRef = useRef(0);
  const chosenEndpointRef = useRef("");

  const candidates = useMemo(() => {
    if (opts.endpoints?.length) return opts.endpoints;
    const m = (fn) => (typeof fn === "function" ? fn(runId) : fn);
    return [
      m((id)=>`/api/v1/events/runs/${id}/logs`),
      m((id)=>`/api/v1/runs/${id}/events`),
      m((id)=>`/api/runs/${id}/events`),
    ];
  }, [runId, opts.endpoints]);

  const clearTimers = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
  };
  const closeES = () => {
    if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
    setConnected(false);
  };
  const scheduleRetry = (delay = 1500, advanceEndpoint = false) => {
    clearTimers();
    retryTimer.current = setTimeout(() => {
      if (advanceEndpoint) endpointIdxRef.current = (endpointIdxRef.current + 1) % candidates.length;
      connect();
    }, delay);
  };

  const applyEvent = (ev) => {
    // 원본 라인 유지(디버깅용)
    if (ev.type === "RAW") setRawLines(prev => prev.length > 5000 ? [...prev.slice(-4000), ev.msg] : [...prev, ev.msg]);
    else setRawLines(prev => prev.length > 5000 ? [...prev.slice(-4000), JSON.stringify(ev)] : [...prev, JSON.stringify(ev)]);

    // 메타
    if (ev.runId && ev.runId !== meta.runId) setMeta(m => ({ ...m, runId: ev.runId }));
    if (ev.type === "RUN_START") setMeta(m => ({ ...m, status: "RUNNING" }));
    if (ev.type === "RUN_END")   setMeta(m => ({ ...m, status: String(ev.status||"").toUpperCase(), elapsedMs: ev.elapsedMs ?? m.elapsedMs }));
    if (ev.type === "LOG" && /Appium server resolved/.test(ev.msg||"")) {
      const m = /https?:\/\/([^/]+)/.exec(ev.msg);
      if (m?.[1]) setMeta(mm => ({ ...mm, appium: m[1] }));
    }
    if (ev.type === "SHEET_START" && ev.sheet) setMeta(m => ({ ...m, code: ev.sheet }));

    const bump = () => setStepsVer(v => v+1);

    if (ev.type === "STEP_START") {
      const no = String(ev?.step?.no ?? "");
      const name = ev?.step?.name || "";
      const action = (ev?.step?.type || NA) || NA;
      const s = stepsRef.current.get(no) || {};
      stepsRef.current.set(no, { ...s, no, name, action, selector: simplifySelector(ev), cond: ev?.visible_if || "", mandatory: true, result: s.result || (action === NA ? NA : undefined), ms: s.ms || 0 });
      bump();
    }
    if (ev.type === "STEP_OK") {
      const no = String(ev?.step?.no ?? "");
      const s = stepsRef.current.get(no) || { no };
      stepsRef.current.set(no, { ...s, result: PASS, ms: ev.elapsedMs ?? s.ms ?? 0 });
      bump();
    }
    if (ev.type === "STEP_FAIL") {
      const no = String(ev?.step?.no ?? "");
      const s = stepsRef.current.get(no) || { no };
      stepsRef.current.set(no, { ...s, result: FAIL, ms: ev.elapsedMs ?? s.ms ?? 0, reason: ev?.error?.reason || s.reason });
      bump();
    }
    if (ev.type === "LOG" && /\bScreenshot saved: (.+)/.test(ev.msg || "")) {
      const p = ev.msg.match(/Screenshot saved:\s*(.+)$/);
      if (p?.[1]) {
        const arr = Array.from(stepsRef.current.keys()).sort((a,b)=>parseFloat(a)-parseFloat(b));
        const lastKey = arr[arr.length-1];
        if (lastKey) {
          const s = stepsRef.current.get(lastKey);
          stepsRef.current.set(lastKey, { ...s, okImg: p[1] });
          setStepsVer(v => v+1);
        }
      }
    }
    if (ev.type === "ARTIFACT" && String(ev.kind||"").startsWith("image")) {
      const no = String(ev?.step?.no ?? "");
      const s = stepsRef.current.get(no);
      if (s) { stepsRef.current.set(no, { ...s, failImg: ev.path, evidence: ev.path }); setStepsVer(v => v+1); }
    }
  };

  const connect = () => {
    closeES();
    clearTimers();
    const idx = endpointIdxRef.current;
    const url = candidates[idx];
    chosenEndpointRef.current = url;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); clearTimers(); };
    es.onerror = () => { setConnected(false); setError("실시간 연결이 끊어졌습니다. 재시도 중..."); scheduleRetry(1500, true); };

    const onAny = (e) => {
      if (!e?.data) return;
      const ev = parseEvent(e.data);
      applyEvent(ev);
    };
    es.onmessage = onAny;
    ["STEP_START","STEP_OK","STEP_FAIL","SHEET_START","SHEET_END","RUN_START","RUN_END","ARTIFACT","LOG","ERROR"].forEach(t => {
      es.addEventListener(t, onAny);
    });

    // open 안 되면 다음 후보로
    openTimer.current = setTimeout(() => {
      if (!connected) { try { es.close(); } catch {} scheduleRetry(500, true); }
    }, 1500);
  };

  useEffect(() => {
    if (!runId) return;
    stepsRef.current = new Map(); setStepsVer(0);
    setRawLines([]); setError(null); setConnected(false);
    endpointIdxRef.current = 0; chosenEndpointRef.current = "";
    connect();
    return () => { clearTimers(); closeES(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const steps = useMemo(() => {
    let arr = Array.from(stepsRef.current.values()).sort((a,b)=>parseFloat(a.no) - parseFloat(b.no));
    const q = filters.q.trim().toLowerCase();
    arr = arr.filter(s => {
      if (s.result === PASS && !filters.ok) return false;
      if (s.result === FAIL && !filters.fail) return false;
      if (s.result === SKIP && !filters.skip) return false;
      if (s.action === NA && !filters.na) return false;
      if (q) {
        const txt = `${s.no} ${s.name} ${s.action} ${s.selector} ${s.cond || ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
    return arr;
  }, [filters, stepsVer]);

  const counts = useMemo(() => {
    const all = Array.from(stepsRef.current.values());
    return {
      total: all.length,
      ok: all.filter(s => s.result === PASS).length,
      fail: all.filter(s => s.result === FAIL).length,
      skip: all.filter(s => s.result === SKIP).length,
      na:   all.filter(s => s.action === NA).length,
    };
  }, [stepsVer]);

  return { meta, steps, counts, rawLines, connected, error, filters, setFilters, firstFailIndex, endpoint: chosenEndpointRef.current };
}