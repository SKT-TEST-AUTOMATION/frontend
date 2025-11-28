import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Search,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  Terminal,
  Activity,
  Maximize2,
  X,
  Copy,
  Wifi,
  WifiOff
} from "lucide-react";
import { formatMs } from "../../../shared/utils/timeUtils.js";


// --- Evidence URL helpers (공통) ---
const API_ORIGIN =
  (import.meta.env.VITE_BACKEND_ORIGIN ?? "") ||
  (import.meta.env.DEV ? "http://localhost:18080" : "");

function toEvidenceUrl(p) {
  if (!p) return null;
  let v = String(p).trim();

  // 이미 절대 URL / data URL 이면 그대로 사용
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;

  // 윈도우 경로 보정
  v = v.replace(/\\/g, "/");

  // 이미 /artifacts/ 로 시작하는 경우
  if (v.startsWith("/artifacts/")) return `${API_ORIGIN}${v}`;

  // 그냥 /로 시작하면 (프록시로 넘기는 구조면) 그대로 사용
  if (v.startsWith("/")) return v;

  // 중간에 artifacts/ 가 포함된 경우
  const idx = v.toLowerCase().indexOf("artifacts/");
  if (idx >= 0) {
    const sub = v.slice(idx + "artifacts/".length);
    return `${API_ORIGIN}/artifacts/${encodeURI(sub)}`;
  }

  // 그 외: 상대 경로(screenshots/...) → /artifacts/screenshots/... 으로 매핑
  const cleaned = v.replace(/^(\.\/|\/)+/, "");
  return `${API_ORIGIN}/artifacts/${encodeURI(cleaned)}`;
}


// --- Logic Helpers ---

function buildStepKey(obj) {
  const sheet = obj?.sheet ?? obj?.sheetName ?? "_";
  const no = obj?.no ?? obj?.stepNo ?? "";
  return `${sheet}#${no}`;
}

function compareStep(a, b) {
  const sa = a.sheet || "";
  const sb = b.sheet || "";
  if (sa === sb) {
    return (Number(a.no) || 0) - (Number(b.no) || 0);
  }
  return sa.localeCompare(sb);
}

function smartMerge(base, patch) {
  const merged = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "" && (k === "name" || k === "type")) continue;

    if (k === "selector") {
      if (typeof v === "object") {
        merged.selector = { ...(merged.selector || {}), ...v };
      } else if (typeof v === "string") {
        merged.selector = v;
      }
      continue;
    }

    if (k === "visibleIf") {
      if (typeof v === "object") {
        merged.visibleIf = { ...(merged.visibleIf || {}), ...v };
      } else if (typeof v === "string") {
        merged.visibleIf = { ...(merged.visibleIf || {}), expr: v };
      }
      continue;
    }

    if (k === "cond" && typeof v === "string" && v.trim() !== "") {
      merged.visibleIf = { ...(merged.visibleIf || {}), expr: v };
      continue;
    }

    merged[k] = v;
  }
  return merged;
}

// --- UI Helpers ---

function fmtSelector(sel) {
  if (!sel) return "";
  if (typeof sel === "string") return sel;
  const by = (sel.by || "").toString().toUpperCase();
  const value = sel.value ?? "";
  return [by, value].filter(Boolean).join(" ");
}

function fmtVisibleIf(vif) {
  if (!vif) return "";
  if (typeof vif === "string") return vif;
  return vif.expr ?? "";
}

function copyToClipboard(text) {
  if (!navigator?.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

// --- Sub Components ---

const StatusBadge = ({ status }) => {
  const s = (status || "").toUpperCase();
  if (s === "PASS" || s === "OK") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        PASS
      </span>
    );
  }
  if (s === "FAIL") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        FAIL
      </span>
    );
  }
  if (s === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 animate-pulse">
        <Activity className="w-3.5 h-3.5 animate-spin-slow" />
        RUNNING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      <AlertCircle className="w-3.5 h-3.5" />
      {s}
    </span>
  );
};

const ResultPill = ({ result }) => {
  const r = (result || "na").toLowerCase();

  const styles = {
    ok: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    fail: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    skip: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    na: "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700/50"
  };

  const cls = styles[r] || styles.na;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${cls}`}>
      {r}
    </span>
  );
};

const EvidenceModal = ({ open, onClose, step }) => {
  if (!open || !step) return null;

  const okUrl = toEvidenceUrl(step.okImg || step.evidencePath);
  const failUrl = toEvidenceUrl(step.failImg || step.evidencePath);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-500" />
              Evidence
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">
              {step.sheet} #{step.no} : {step.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-950">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Success Image */}
            {/*<div className="flex flex-col gap-2">*/}
            {/*  <div className="flex items-center justify-between">*/}
            {/*    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">*/}
            {/*      Success State*/}
            {/*    </span>*/}
            {/*    {!okUrl && (*/}
            {/*      <span className="text-xs text-slate-400 italic">*/}
            {/*        Not available*/}
            {/*      </span>*/}
            {/*    )}*/}
            {/*  </div>*/}
            {/*  <div className="aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800 overflow-hidden flex items-center justify-center relative group">*/}
            {/*    {okUrl ? (*/}
            {/*      <img*/}
            {/*        src={okUrl}*/}
            {/*        alt="Success"*/}
            {/*        className="w-full h-full object-contain"*/}
            {/*      />*/}
            {/*    ) : (*/}
            {/*      <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-600">*/}
            {/*        <ImageIcon className="w-12 h-12 opacity-20" />*/}
            {/*      </div>*/}
            {/*    )}*/}
            {/*  </div>*/}
            {/*</div>*/}

            {/* Failure Image */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Failure/Evidence State
                </span>
                {!failUrl && (
                  <span className="text-xs text-slate-400 italic">
                    Not available
                  </span>
                )}
              </div>
              <div className="aspect-video bg-slate-200 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800 overflow-hidden flex items-center justify-center relative group">
                {failUrl ? (
                  <img
                    src={failUrl}
                    alt="Failure"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-600">
                    <ImageIcon className="w-12 h-12 opacity-20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Footer inside Modal */}
          <div className="mt-6 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-sm font-mono grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 block text-xs mb-1">
                  Reason
                </span>
                <div className="text-rose-600 dark:text-rose-400 break-words">
                  {step.reason || "—"}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-1">
                  Selector
                </span>
                <div
                  className="text-slate-700 dark:text-slate-300 truncate"
                  title={fmtSelector(step.selector)}
                >
                  {fmtSelector(step.selector) || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



// --- Main Component ---

export default function RunReportPanel({
                                         testName,
                                         runId,
                                         onClose,
                                         live = true,
                                         resultLog = null,
                                         initialReport = null,
                                         className = "",
                                         style = {}
                                       }) {
  // -- State --
  const [filters, setFilters] = useState({
    ok: true,
    fail: true,
    skip: true,
    na: true,
    q: ""
  });
  const [meta, setMeta] = useState(
    initialReport?.meta || { runId, status: live ? "RUNNING" : "N/A", elapsedMs: 0 }
  );
  const [steps, setSteps] = useState(initialReport?.steps || []);
  const [rawLines, setRawLines] = useState(initialReport?.rawLines || []);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // UI State
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showRawLogs, setShowRawLogs] = useState(false);
  const [evidenceStep, setEvidenceStep] = useState(null);

  const stepsMapRef = useRef(new Map());
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(true);

  // -- Helpers --
  const computeCounts = useCallback((arr) => {
    return arr.reduce(
      (acc, s) => {
        const r = s.result || "na";
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      },
      { ok: 0, fail: 0, skip: 0, na: 0 }
    );
  }, []);

  const deriveStatus = useCallback((arr, runningHint) => {
    const hasFail = arr.some((s) => s.result === "fail");
    if (hasFail) return "FAIL";
    const hasUnknown = arr.some((s) => !s.result || s.result === "na");
    if (runningHint || hasUnknown) return "RUNNING";
    return "PASS";
  }, []);

  const normalizeStepFromEvent = useCallback((e) => {
    const type = (e?.type || "RAW").toUpperCase();
    const stepObj = e?.step || {};
    const no = stepObj?.no ?? e?.no;
    const sheet = e?.sheet ?? stepObj?.sheet ?? stepObj?.sheetName ?? null;
    const out = { no, sheet };

    if (type === "STEP_START") {
      if (stepObj?.name || e?.msg) out.name = stepObj?.name ?? e?.msg;
      if (stepObj?.type) out.type = stepObj.type;
      if (stepObj?.selector) out.selector = stepObj.selector;
      else if (stepObj?.by || stepObj?.value)
        out.selector = { by: stepObj.by, value: stepObj.value };
      if (stepObj?.visibleIf) out.visibleIf = stepObj.visibleIf;
      else if (stepObj?.cond) out.visibleIf = { expr: stepObj.cond };
    }

    if (type === "STEP_OK") out.result = "ok";

    if (type === "STEP_FAIL") {
      out.result = "fail";

      // 에러 메시지
      if (e?.error?.reason) out.reason = e.error.reason;

      // evidence 경로: error / root / step / extra 순으로 채우기
      if (e?.error?.evidencePath) out.evidencePath = e.error.evidencePath;
      if (e?.evidencePath && !out.evidencePath) out.evidencePath = e.evidencePath;
      if (stepObj?.evidencePath && !out.evidencePath)
        out.evidencePath = stepObj.evidencePath;
      if (e?.extra?.evidencePath && !out.evidencePath)
        out.evidencePath = e.extra.evidencePath;

      if (e?.failImg) out.failImg = e.failImg;
    }

    if (type === "STEP_SKIP") out.result = "skip";

    if (e?.elapsedMs != null || stepObj?.ms != null)
      out.ms = stepObj?.ms ?? e?.elapsedMs;
    if (e?.okImg) out.okImg = e.okImg;

    // ARTIFACT 이벤트는 기존 로직 그대로 두되, path → evidence 로 보조 용도로 사용
    if (type === "ARTIFACT" && (e?.path || e?.url) && no != null) {
      const imgPath = e.path || e.url;
      const mime = e?.mime || e?.contentType || e?.kind || "";
      if (!out.evidencePath) out.evidencePath = imgPath;
      if (
        (mime && String(mime).includes("image")) ||
        /\.(png|jpe?g|webp)$/i.test(String(imgPath))
      ) {
        out.failImg = out.failImg || imgPath;
      }
    }

    return out;
  }, []);

  const parseMaybeJSON = useCallback((x) => {
    if (typeof x === "string") {
      const s = x.trim();
      if (!s) return { text: "" };
      if (s.startsWith("{") && s.endsWith("}")) {
        try {
          return JSON.parse(s);
        } catch {
          // ignore
        }
      }
      const m = s.match(/^\[(INFO|WARN|WARNING|ERROR|FAIL|DEBUG)\]\s*(.*)$/i);
      if (m) return { type: "LOG", lvl: m[1].toUpperCase(), msg: m[2] };
      return { text: s };
    }
    return x;
  }, []);

  const ingestEvent = useCallback(
    (objOrText) => {
      const obj =
        typeof objOrText === "object" ? objOrText : parseMaybeJSON(objOrText);

      setRawLines((prev) => {
        const asText =
          typeof objOrText === "string" ? objOrText : JSON.stringify(obj);
        const n = [...prev, asText];
        return n.length > 2000 ? n.slice(n.length - 2000) : n;
      });

      const type = (obj?.type || "RAW").toUpperCase();
      if (
        type.startsWith("STEP") ||
        type === "SHEET_END" ||
        type === "SHEET_START"
      ) {
        const patch = normalizeStepFromEvent(obj);
        if (patch.no != null) {
          const key = buildStepKey(patch);
          const m = stepsMapRef.current;
          const existed = m.get(key) || {
            no: patch.no,
            sheet: patch.sheet,
            id: key
          };
          const merged = smartMerge(existed, patch);
          merged.id = key;
          m.set(key, merged);

          const arr = Array.from(m.values()).sort(compareStep);
          setSteps(arr);
          setMeta((prev) => ({
            ...prev,
            status: deriveStatus(arr, true)
          }));
        }
      } else if (type === "RUN_EXIT") {
        setMeta((prev) => ({
          ...prev,
          status: deriveStatus(
            Array.from(stepsMapRef.current.values()),
            false
          )
        }));
        setConnected(false);
      }
    },
    [normalizeStepFromEvent, parseMaybeJSON, deriveStatus]
  );

  // -- Effects --

  // 1. Initial Sync
  useEffect(() => {
    const base = initialReport?.steps || [];
    if (base.length) {
      const m = new Map();
      base.forEach((s) => {
        if (s?.no == null) return;
        const sheet = s.sheet ?? null;
        const key = buildStepKey({ sheet, no: s.no });
        const merged = smartMerge({}, { ...s, sheet, id: key });
        m.set(key, merged);
      });
      stepsMapRef.current = m;
      setSteps(Array.from(m.values()).sort(compareStep));
      setMeta(
        initialReport?.meta || {
          runId,
          status: live ? "RUNNING" : "PASS",
          elapsedMs: 0
        }
      );
      setRawLines(initialReport?.rawLines || []);
    }
  }, [initialReport, live, runId]);

  // 2. Static Log seeding
  useEffect(() => {
    if (!runId || live) return;
    const hasSeed =
      Array.isArray(resultLog) ||
      (typeof resultLog === "string" && resultLog.trim().length > 0) ||
      (resultLog && typeof resultLog === "object");
    if (!hasSeed) return;

    const rawArr = Array.isArray(resultLog)
      ? resultLog
      : typeof resultLog === "string"
        ? resultLog.split(/\r?\n/)
        : [resultLog];

    stepsMapRef.current = new Map();
    setSteps([]);
    setRawLines([]);
    setConnected(false);

    for (const line of rawArr) ingestEvent(line);

    setMeta((prev) => ({
      ...prev,
      runId,
      status: deriveStatus(
        Array.from(stepsMapRef.current.values()),
        false
      )
    }));
  }, [runId, live, resultLog, ingestEvent, deriveStatus]);

  // 3. Static Fetch
  useEffect(() => {
    if (live || initialReport || !runId) return;
    const noSeed =
      !Array.isArray(resultLog) &&
      !(typeof resultLog === "string" && resultLog.length > 0) &&
      !(resultLog && typeof resultLog === "object");
    if (!noSeed) return;

    let aborted = false;
    (async () => {
      const tryUrls = [
        `/api/v1/runs/${runId}/report`,
        `/api/v1/run-results/${runId}`
      ];
      for (const url of tryUrls) {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) continue;
          const json = await res.json();
          if (aborted) return;

          const m = json?.meta || {};
          const ss = (Array.isArray(json?.steps) ? json.steps : []) || [];
          const rl = Array.isArray(json?.rawLines) ? json.rawLines : [];
          const mm = new Map();
          ss.forEach((s) => {
            if (s?.no == null) return;
            const sheet = s.sheet ?? null;
            const key = buildStepKey({ sheet, no: s.no });
            const merged = smartMerge({}, { ...s, sheet, id: key });
            mm.set(key, merged);
          });
          stepsMapRef.current = mm;
          const arr = Array.from(mm.values()).sort(compareStep);
          setMeta({
            ...m,
            runId: m.runId ?? runId,
            status: m.status || deriveStatus(arr, false)
          });
          setSteps(arr);
          setRawLines(rl);
          setConnected(false);
          return;
        } catch {
          // ignore and try next URL
        }
      }
      setError("Failed to load report data.");
    })();

    return () => {
      aborted = true;
    };
  }, [live, initialReport, runId, resultLog, deriveStatus]);

  // 4. SSE (Live)
  useEffect(() => {
    if (!live || !runId) return;
    const es = new EventSource(`/api/v1/events/runs/${runId}/logs`, {
      withCredentials: true
    });

    const onAny = (e) => {
      try {
        const raw = typeof e.data === "string" ? e.data : "";
        if (!raw) return;
        let obj;
        try {
          obj = JSON.parse(raw);
        } catch {
          obj = { type: "RAW", msg: raw };
        }
        ingestEvent(obj);

        const type = (obj?.type || "RAW").toUpperCase();
        if (type === "RUN_EXIT") {
          setMeta((prev) => ({
            ...prev,
            status: deriveStatus(
              Array.from(stepsMapRef.current.values()),
              false
            )
          }));
          setConnected(false);
        } else {
          setMeta((prev) => ({
            ...prev,
            elapsedMs:
              prev?.elapsedMs ||
              obj?.elapsedMs ||
              (prev?.startedAt ? Date.now() - prev.startedAt : prev?.elapsedMs),
            status: deriveStatus(
              Array.from(stepsMapRef.current.values()),
              true
            )
          }));
        }
      } catch (err) {
        console.debug(err);
      }
    };

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
    es.onmessage = onAny;
    [
      "STEP_START",
      "STEP_OK",
      "STEP_FAIL",
      "STEP_SKIP",
      "SHEET_START",
      "SHEET_END",
      "RUN_EXIT",
      "ERROR",
      "LOG",
      "RAW"
    ].forEach((t) => es.addEventListener(t, onAny));
    es.onerror = () => {
      setConnected(false);
      setError("Connection lost. Reconnecting...");
    };
    return () => es.close();
  }, [live, runId, ingestEvent, deriveStatus]);

  // Auto Scroll
  useEffect(() => {
    if (!autoScrollRef.current || !live) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length, live]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    autoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  // Filtering & Interaction
  const counts = useMemo(
    () => computeCounts(steps),
    [steps, computeCounts]
  );

  const filteredSteps = useMemo(() => {
    const q = filters.q.toLowerCase();
    return steps.filter((s) => {
      const key = s.result || "na";
      if (!filters[key]) return false;
      if (!q) return true;
      const hay = [s.name, s.type, fmtSelector(s.selector), fmtVisibleIf(s.visibleIf)]
        .map((v) => String(v || "").toLowerCase())
        .join("\n");
      return hay.includes(q);
    });
  }, [steps, filters]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const jumpToFirstFail = () => {
    const idx = filteredSteps.findIndex((s) => s.result === "fail");
    if (idx >= 0) {
      const el = document.getElementById(`step-${filteredSteps[idx].id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Grouping for Display
  let lastSheet = null;

  return (
    <div
      className={`flex flex-col w-full bg-white dark:bg-slate-900 text-sm overflow-hidden relative font-sans border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm max-h-[85vh] shadow-2xl ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-2">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {testName} #{meta.runId}
                </span>
                {connected ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-slate-400" />
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono">
                  {formatMs(meta.elapsedMs)} elapsed
                </span>
              </div>
            </div>
            <StatusBadge status={meta.status} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                <span className="block text-[10px] text-slate-500 uppercase font-bold">
                  Total
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {steps.length}
                </span>
              </div>
              <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-500 uppercase font-bold">
                  Pass
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {counts.ok}
                </span>
              </div>
              <div className="px-3 py-1 text-center border-r border-slate-200 dark:border-slate-700 last:border-0">
                <span className="block text-[10px] text-rose-600 dark:text-rose-500 uppercase font-bold">
                  Fail
                </span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                  {counts.fail}
                </span>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter steps..."
                className="w-full pl-10 pr-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={filters.q}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, q: e.target.value }))
                }
              />
            </div>

            {["ok", "fail", "skip"].map((key) => (
              <label
                key={key}
                className="flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <div
                  className={
                    "w-4 h-4 rounded border flex items-center justify-center bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  }
                >
                  {filters[key] && (
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={filters[key]}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, [key]: e.target.checked }))
                  }
                />
                <span className="text-xs font-medium uppercase text-slate-600 dark:text-slate-400">
                  {key}
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {counts.fail > 0 && (
              <button
                onClick={jumpToFirstFail}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30 rounded-md border border-rose-200 dark:border-rose-800 transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" /> First Fail
              </button>
            )}
            <button
              onClick={() => setShowRawLogs(!showRawLogs)}
              className={
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors " +
                (showRawLogs
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700")
              }
            >
              <Terminal className="w-3.5 h-3.5" /> Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row min-h-0">
        {/* Step List */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={
            "flex-1 overflow-y-auto min-h-0 " +
            (showRawLogs ? "md:w-2/3" : "w-full")
          }
        >
          {error && (
            <div className="p-4 m-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-1 bg-slate-50 dark:bg-slate-900/95 backdrop-blur shadow-sm">
            <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 w-16">#</th>
              <th className="px-4 py-3">Step Name</th>
              <th className="px-4 py-3 w-32">Action</th>
              <th className="px-4 py-3 hidden sm:table-cell">Details</th>
              <th className="px-4 py-3 w-24 text-center">Result</th>
              <th className="px-4 py-3 w-20 text-right">Time</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredSteps.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-slate-400 dark:text-slate-600"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>No steps match your filter.</p>
                  </div>
                </td>
              </tr>
            )}

            {filteredSteps.map((s) => {
              const rowId = s.id;
              const sheetLabel = s.sheet || "Default Sheet";
              const isNewSheet = sheetLabel !== lastSheet;
              lastSheet = sheetLabel;
              const isExpanded = expandedRows.has(rowId);

              return (
                <React.Fragment key={rowId}>
                  {isNewSheet && (
                    <tr className="bg-white dark:bg-slate-800/80">
                      <td
                        colSpan={6}
                        className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2"
                      >
                        <div className="flex flex-row items-center justify-start gap-2">
                          <div className="w-1 h-3 bg-blue-500 rounded-full" />
                          <div className="truncate max-w-[200px] sm:max-w-xs">
                            {sheetLabel}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  <tr
                    id={`step-${rowId}`}
                    onClick={() => toggleRow(rowId)}
                    className={
                      "group transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 " +
                      (isExpanded
                        ? "bg-blue-50/30 dark:bg-blue-900/10"
                        : "")
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {s.no}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      <div
                        className="truncate max-w-lg sm:max-w-42"
                        title={s.name}
                      >
                        {s.name}
                      </div>
                      {s.reason && (
                        <div className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate max-w-lg">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <div
                            className="max-w-xl whitespace-nowrap overflow-hidden text-ellipsis"
                            title={s.reason}
                          >
                            {s.reason}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700">
                          {s.type || "action"}
                        </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500 font-mono">
                      <div
                        className="truncate max-w-[150px]"
                        title={fmtSelector(s.selector)}
                      >
                        {fmtSelector(s.selector)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ResultPill result={s.result} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-slate-500 tabular-nums">
                      {formatMs(s.ms)}
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <td colSpan={6} className="px-4 py-0">
                        <div className="py-4 lg:py-5 border-t border-slate-200/80 dark:border-slate-800/80">
                          <div className="flex flex-col gap-4">

                            {/* 상단 메타 + Evidence 버튼 */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {/* 메타 정보 */}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <ResultPill result={s.result} />
                                <span className="ml-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {s.name}
                                </span>
                                <span className="ml-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {formatMs(s.ms)} 소요
                                </span>
                              </div>

                              {/* Evidence 버튼 */}
                              <div className="flex items-center">
                                {s.okImg || s.failImg || s.evidencePath ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEvidenceStep(s);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-700 text-white rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-all text-xs font-semibold"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                    스크린샷
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400 text-xs italic px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded bg-white/60 dark:bg-slate-900/40">
                                    <ImageIcon className="w-4 h-4" />
                                    스크린샷 없음
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Selector */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                                  Selector
                                </span>
                              </div>
                              <code className="block bg-white dark:bg-slate-950 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
                                {fmtSelector(s.selector) || "N/A"}
                              </code>
                            </div>

                            {/* Visible If */}
                            <div>
                              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                                Visible If
                              </span>
                              <code className="block mt-1 bg-white dark:bg-slate-950 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">
                                {fmtVisibleIf(s.visibleIf) || "N/A"}
                              </code>
                            </div>

                            {/* Error */}
                            {s.reason && (
                              <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                Error
              </span>
                                <pre className="mt-1 bg-white dark:bg-slate-950 px-3 py-2 rounded border border-rose-200/80 dark:border-rose-700/80 text-xs font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-words">
                {s.reason}
              </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                </React.Fragment>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Raw Log Panel (Collapsible Sidebar) */}
        {showRawLogs && (
          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-300 flex flex-col h-[300px] md:h-auto animate-in slide-in-from-right duration-300">
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" /> System Logs
              </span>
              <button
                onClick={() => setShowRawLogs(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed space-y-1">
              {rawLines.length === 0 && (
                <span className="text-slate-600 italic">
                  No logs available...
                </span>
              )}
              {rawLines.map((line, i) => (
                <div
                  key={i}
                  className="break-all border-b border-slate-800/50 pb-1 mb-1 last:border-0 hover:bg-slate-900/50"
                >
                  <span className="text-slate-500 mr-2 select-none">
                    {(i + 1).toString().padStart(3, "0")}
                  </span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EvidenceModal
        open={!!evidenceStep}
        onClose={() => setEvidenceStep(null)}
        step={evidenceStep}
      />
    </div>
  );
}
