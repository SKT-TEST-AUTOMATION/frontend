import React from "react";
import { formatMs } from '../../../shared/utils/timeUtils.js';

/**
 * RunReportPanel
 * - live=true  : 실행 화면(진행 중)에서 SSE(EventSource) 구독으로 실시간 반영
 * - live=false : 결과(히스토리) 페이지에서
 *    a) resultLog(문자열/배열)로 시딩하여 즉시 렌더
 *    b) resultLog 없으면 /api/v1/runs/{id}/report 1회 fetch
 *
 * props:
 *  - runId: number|string (필수)
 *  - live?: boolean = true
 *  - resultLog?: string | string[] | object[]   // 결과 페이지에서 바로 주입 가능
 *  - initialReport?: { meta, steps, rawLines }  // 있으면 최우선 사용
 *  - onClose?: () => void
 */

// — Tone-neutral palette for light/dark
const RP_PALETTE = {
  // containers
  card: "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden",
  header: "bg-white dark:bg-slate-900",
  subbar: "border-b border-slate-200 dark:border-slate-800",
  chip: "px-2 py-0.5 text-xs rounded-full border",

  // texts
  text: "text-slate-900 dark:text-slate-100",
  faint: "text-slate-500 dark:text-slate-400",

  // row hovers
  rowHover: "hover:bg-gray-50 dark:hover:bg-slate-800/40",

  // statuses (muted)
  dot: {
    PASS: "bg-emerald-500/70 dark:bg-emerald-400/60",
    FAIL: "bg-rose-500/70 dark:bg-rose-400/60",
    RUNNING: "bg-amber-500/70 dark:bg-amber-400/60",
  },

  // result chips / texts (muted & consistent)
  resultText: {
    ok:   "text-emerald-700 dark:text-emerald-300",
    fail: "text-rose-700 dark:text-rose-300",
    skip: "text-amber-700 dark:text-amber-300",
    na:   "text-slate-600 dark:text-slate-400",
  },
  resultBadge: {
    ok:   "border-emerald-300/40 text-emerald-700 bg-emerald-500/5 dark:text-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10",
    fail: "border-rose-300/40 text-rose-700 bg-rose-500/5 dark:text-rose-300 dark:border-rose-500/20 dark:bg-rose-500/10",
    skip: "border-amber-300/40 text-amber-700 bg-amber-500/5 dark:text-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10",
    na:   "border-slate-300/60 text-slate-700 bg-slate-500/5 dark:text-slate-300 dark:border-slate-600/40 dark:bg-slate-500/10",
  },

  // connectivity badge
  connected:    "border-emerald-400/30 text-emerald-700 bg-emerald-500/5 dark:text-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10",
  disconnected: "border-amber-400/30 text-amber-700 bg-amber-500/5 dark:text-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10",

  // code & pills
  codeBox: "font-mono text-[12px] bg-slate-50 dark:bg-slate-800/40 rounded px-2 py-1 border border-slate-200 dark:border-slate-700",
  pill: "px-1.5 py-0.5 rounded-full text-[11px] border border-slate-300/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/60",
};

function resultTextCls(r) {
  if (r === "ok") return RP_PALETTE.resultText.ok;
  if (r === "fail") return RP_PALETTE.resultText.fail;
  if (r === "skip") return RP_PALETTE.resultText.skip;
  return RP_PALETTE.resultText.na;
}
function resultBadgeCls(r) {
  if (r === "ok") return RP_PALETTE.resultBadge.ok;
  if (r === "fail") return RP_PALETTE.resultBadge.fail;
  if (r === "skip") return RP_PALETTE.resultBadge.skip;
  return RP_PALETTE.resultBadge.na;
}

// --- Helpers for selector/visibleIf formatting ---
function fmtSelector(sel) {
  if (!sel) return "";
  if (typeof sel === "string") return sel;
  const by = (sel.by || "").toString().toUpperCase();
  const value = sel.value ?? "";
  return [by, value].filter(Boolean).join(" ");
}
function fmtVisibleIf(vif) {
  if (!vif) return "";
  if (typeof vif === "string") return vif;      // 문자열이면 그대로
  return vif.expr ?? "";
}

// ★ (sheet, no) 기반 스텝 키 생성
function buildStepKey(obj) {
  const sheet = obj?.sheet ?? obj?.sheetName ?? "_";
  const no = obj?.no ?? obj?.stepNo ?? "";
  return `${sheet}#${no}`;
}

// ★ 시트/번호 기준 정렬
function compareStep(a, b) {
  const sa = a.sheet || "";
  const sb = b.sheet || "";
  if (sa === sb) {
    return (Number(a.no) || 0) - (Number(b.no) || 0);
  }
  return sa.localeCompare(sb);
}

// --- Small helpers for UX ---
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}
function middleEllipsis(v, max = 64) {
  const s = String(v ?? "");
  if (!s || s.length <= max) return s;
  const head = Math.ceil(max * 0.5) - 1;
  const tail = max - head - 1;
  return s.slice(0, head) + "…" + s.slice(-tail);
}
function fmtSelectorShort(sel, max = 64) {
  if (!sel) return "";
  if (typeof sel === "string") return middleEllipsis(sel, max);
  const by = (sel.by || "").toString().toUpperCase();
  const value = sel.value ?? "";
  const space = by ? 1 : 0;
  const remain = Math.max(8, max - by.length - space);
  return [by, middleEllipsis(value, remain)].filter(Boolean).join(" ");
}

function fmtVisibleIfShort(vif, max = 60) {
  // 축약은 expr 기준으로만
  const full = fmtVisibleIf(vif);
  return middleEllipsis(full, max);
}

async function copyToClipboard(text) {
  try {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  } catch {
    // no-op (older browsers)
  }
}

export default function RunReportPanel({
                                         runId,
                                         onClose,
                                         live = true,
                                         resultLog = null,
                                         initialReport = null,
                                       }) {
  // 필터 (결과/실행 화면 공용)
  const [filters, setFilters] = React.useState({ ok: true, fail: true, skip: true, na: true, q: "" });

  // 표시 상태
  const [meta, setMeta] = React.useState(
    initialReport?.meta || { runId, status: live ? "RUNNING" : "PASS", elapsedMs: 0 }
  );
  const [steps, setSteps] = React.useState(initialReport?.steps || []);
  const [rawLines, setRawLines] = React.useState(initialReport?.rawLines || []);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState(null);

  // 병합용 Map((sheet,no) 키 → 스텝)
  const stepsMapRef = React.useRef(new Map());

  /* -------------------------------- helpers ------------------------------- */

  // 문자열 메타(name/action/selector/cond)가 빈 문자열/undefined/null로 덮어씌워지지 않도록
  function smartMerge(base, patch) {
    const merged = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null) continue;
      // skip empty strings for key text fields
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
      // legacy: cond string maps into visibleIf.expr
      if (k === "cond" && typeof v === "string" && v.trim() !== "") {
        merged.visibleIf = { ...(merged.visibleIf || {}), expr: v };
        continue;
      }
      merged[k] = v;
    }
    return merged;
  }

  const computeCounts = React.useCallback(
    (arr = []) =>
      arr.reduce(
        (acc, s) => {
          const r = s.result || "na";
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        },
        { ok: 0, fail: 0, skip: 0, na: 0 }
      ),
    []
  );

  const deriveStatus = React.useCallback((arr, runningHint) => {
    const hasFail = arr.some((s) => s.result === "fail");
    if (hasFail) return "FAIL";
    const hasUnknown = arr.some((s) => !s.result || s.result === "na");
    if (runningHint || hasUnknown) return "RUNNING";
    return "PASS";
  }, []);

  // 이벤트 → 부분 갱신 패치
  const normalizeStepFromEvent = React.useCallback((e) => {
    const type = (e?.type || "RAW").toUpperCase();
    const stepObj = e?.step || {};

    const no = stepObj?.no ?? e?.no;
    const sheet = e?.sheet ?? stepObj?.sheet ?? stepObj?.sheetName ?? null;

    const out = { no, sheet };

    if (type === "STEP_START") {
      if (stepObj?.name || e?.msg) out.name = stepObj?.name ?? e?.msg;
      if (stepObj?.type) out.type = stepObj.type;

      // selector: object {by, value} or legacy string
      if (stepObj?.selector) {
        out.selector = stepObj.selector;
      } else if (stepObj?.by || stepObj?.value) {
        out.selector = { by: stepObj.by, value: stepObj.value };
      }

      // visibleIf
      if (stepObj?.visibleIf) {
        out.visibleIf = stepObj.visibleIf;
      } else if (stepObj?.cond) {
        out.visibleIf = { expr: stepObj.cond };
      }
    }

    if (type === "STEP_OK") out.result = "ok";

    if (type === "STEP_FAIL") {
      out.result = "fail";
      if (e?.error?.reason) out.reason = e.error.reason;
      if (e?.error?.evidence) out.evidence = e.error.evidence;
      if (e?.failImg) out.failImg = e.failImg;
    }

    if (type === "STEP_SKIP") out.result = "skip";

    // timing & images
    if (e?.elapsedMs != null || stepObj?.ms != null) out.ms = stepObj?.ms ?? e?.elapsedMs;
    if (e?.okImg) out.okImg = e.okImg;

    // ARTIFACT 처리 (기존 그대로)
    if (type === "ARTIFACT" && (e?.path || e?.url) && no != null) {
      const imgPath = e.path || e.url;
      const mime = e?.mime || e?.contentType || e?.kind || "";
      if (!out.evidence) out.evidence = imgPath;
      if ((mime && String(mime).includes("image")) || /\.(png|jpe?g|webp)$/i.test(String(imgPath))) {
        out.failImg = out.failImg || imgPath;
      }
    }

    return out;
  }, []);

  // 문자열/원시 라인을 이벤트/표시용 객체로 정규화
  const parseMaybeJSON = React.useCallback((x) => {
    if (typeof x === "string") {
      const s = x.trim();
      if (!s) return { text: "" };
      // NDJSON 라인
      if (s.startsWith("{") && s.endsWith("}")) {
        try {
          return JSON.parse(s);
        } catch {
          /* fallthrough */
        }
      }
      // [INFO]/[WARN]/[ERROR]/[DEBUG]/[FAIL] 패턴
      const m = s.match(/^\[(INFO|WARN|WARNING|ERROR|FAIL|DEBUG)\]\s*(.*)$/i);
      if (m) return { type: "LOG", lvl: m[1].toUpperCase(), msg: m[2] };
      // 일반 텍스트
      return { text: s };
    }
    // 이미 객체라면 통과
    return x;
  }, []);

  // 단일 이벤트/라인 주입 → steps/rawLines 갱신
  const ingestEvent = React.useCallback(
    (objOrText) => {
      const obj = typeof objOrText === "object" ? objOrText : parseMaybeJSON(objOrText);

      // 원본 라인 보관 (기존 그대로)
      setRawLines((prev) => {
        const asText = typeof objOrText === "string" ? objOrText : JSON.stringify(obj);
        const n = [...prev, asText];
        if (n.length > 2000) n.splice(0, n.length - 2000);
        return n;
      });

      const type = (obj?.type || "RAW").toUpperCase();
      if (type.startsWith("STEP") || type === "SHEET_END" || type === "SHEET_START") {
        const patch = normalizeStepFromEvent(obj);
        if (patch.no != null) {
          const key = buildStepKey(patch); // ★ 시트+번호 기반 키
          const m = stepsMapRef.current;
          const existed = m.get(key) || { no: patch.no, sheet: patch.sheet };
          const merged = smartMerge(existed, patch);
          merged.id = key; // ★ UI에서 쓸 고유 id
          m.set(key, merged);

          const arr = Array.from(m.values()).sort(compareStep);
          setSteps(arr);
          setMeta((prev) => ({ ...prev, status: deriveStatus(arr, true) }));
        }
      } else if (type === "RUN_EXIT") {
        setMeta((prev) => ({ ...prev, status: deriveStatus(Array.from(stepsMapRef.current.values()), false) }));
        setConnected(false);
      }
    },
    [normalizeStepFromEvent, parseMaybeJSON, deriveStatus]
  );

  const filterSteps = React.useCallback((arr, f) => {
    const q = (f?.q || "").toLowerCase();
    return arr.filter((s) => {
      const byResult = !!f?.[s.result || "na"];
      if (!byResult) return false;
      if (!q) return true;
      const hay = [
        s.name,
        s.type,
        fmtSelector(s.selector),
        fmtVisibleIf(s.visibleIf || s.cond)
      ]
        .map((v) => String(v || "").toLowerCase())
        .join("\n");
      return hay.includes(q);
    });
  }, []);

  /* ------------------------------- 초기 동기화 ------------------------------ */

  // initialReport가 바뀌면 동기화
  React.useEffect(() => {
    const base = initialReport?.steps || [];
    if (base.length) {
      const m = new Map();
      base.forEach((s) => {
        if (s?.no == null) return;
        const sheet = s.sheet ?? s.sheetName ?? null;
        const key = buildStepKey({ sheet, no: s.no });
        const merged = smartMerge({}, { ...s, sheet, id: key });
        m.set(key, merged);
      });
      stepsMapRef.current = m;
      const arr = Array.from(m.values()).sort(compareStep);
      setSteps(arr);
      setMeta(initialReport?.meta || { runId, status: live ? "RUNNING" : "PASS", elapsedMs: 0 });
      setRawLines(initialReport?.rawLines || []);
    }
  }, [initialReport, live, runId]);

  // live=false && resultLog 제공 시: 즉시 시딩(보고서 fetch 없이)
  React.useEffect(() => {
    if (!runId || live) return;
    // resultLog가 제공되지 않으면 이 훅은 건너뛴다(다음 훅에서 fetch 시도)
    const hasSeed =
      Array.isArray(resultLog) ||
      (typeof resultLog === "string" && resultLog.trim().length > 0) ||
      (resultLog && typeof resultLog === "object");

    if (!hasSeed) return;

    // resultLog → 배열로 정규화
    const rawArr = Array.isArray(resultLog)
      ? resultLog
      : typeof resultLog === "string"
        ? resultLog.split(/\r?\n/)
        : [resultLog];

    // 초기화
    stepsMapRef.current = new Map();
    setSteps([]);
    setRawLines([]);
    setError(null);
    setConnected(false);

    // 주입
    for (const line of rawArr) {
      ingestEvent(line);
    }
    // 상태 보정
    setMeta((prev) => ({
      ...prev,
      runId: prev?.runId ?? runId,
      status: deriveStatus(Array.from(stepsMapRef.current.values()), false),
    }));
  }, [runId, live, resultLog, ingestEvent, deriveStatus]);

  // live=false 이고 resultLog가 없을 때만 보고서 fetch
  React.useEffect(() => {
    if (live || initialReport || !runId) return;
    const noSeed =
      !Array.isArray(resultLog) &&
      !(typeof resultLog === "string" && resultLog.trim().length > 0) &&
      !(resultLog && typeof resultLog === "object");
    if (!noSeed) return; // 이미 resultLog로 시딩됨

    let aborted = false;

    (async () => {
      const tryUrls = [`/api/v1/runs/${runId}/report`, `/api/v1/run-results/${runId}`];
      for (const url of tryUrls) {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) continue;
          const json = await res.json();
          if (aborted) return;

          const m = json?.meta || {};
          const ss = Array.isArray(json?.steps) ? json.steps : [];
          const rl = Array.isArray(json?.rawLines) ? json.rawLines : [];
          const mm = new Map();
          ss.forEach((s) => {
            if (s?.no == null) return;
            const sheet = s.sheet ?? s.sheetName ?? null;
            const key = buildStepKey({ sheet, no: s.no });
            const merged = smartMerge({}, { ...s, sheet, id: key });
            mm.set(key, merged);
          });
          stepsMapRef.current = mm;
          const arr = Array.from(mm.values()).sort(compareStep);
          setMeta({ ...m, runId: m.runId ?? runId, status: m.status || deriveStatus(arr, false) });
          setSteps(arr);
          setRawLines(rl);
          setConnected(false);
          setError(null);
          return;
        } catch {
          // 다음 url 시도
        }
      }
      setError("결과 보고서를 불러오지 못했습니다.");
    })();

    return () => {
      aborted = true;
    };
  }, [live, initialReport, runId, resultLog, deriveStatus]);

  /* --------------------------------- SSE 구독 -------------------------------- */

  // live=true 일 때 SSE
  React.useEffect(() => {
    if (!live || !runId) return;
    const es = new EventSource(`/api/v1/events/runs/${runId}/logs`, { withCredentials: true });

    const onAny = (e) => {
      try {
        const raw = typeof e.data === "string" ? e.data : "";
        if (!raw) return;
        let obj = null;
        try {
          obj = JSON.parse(raw);
        } catch {
          obj = { type: "RAW", msg: raw };
        }

        // 원본 라인 보관 + 스텝 병합
        ingestEvent(obj);

        const type = (obj?.type || "RAW").toUpperCase();
        const now = Date.now();
        if (type === "RUN_EXIT") {
          setMeta((prev) => ({
            ...prev,
            status: deriveStatus(Array.from(stepsMapRef.current.values()), false),
          }));
          setConnected(false);
        } else {
          setMeta((prev) => ({
            ...prev,
            elapsedMs:
              prev?.elapsedMs || obj?.elapsedMs || (prev?.startedAt ? now - prev.startedAt : prev?.elapsedMs),
            status: deriveStatus(Array.from(stepsMapRef.current.values()), true),
          }));
        }
      } catch (err) {
        if (import.meta.env?.DEV) console.debug(err);
      }
    };

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
    es.onmessage = onAny;
    ["STEP_START", "STEP_OK", "STEP_FAIL", "STEP_SKIP", "SHEET_START", "SHEET_END", "RUN_EXIT", "ERROR", "LOG", "RAW"].forEach(
      (t) => es.addEventListener(t, onAny)
    );
    es.onerror = () => {
      setConnected(false);
      setError("실시간 연결이 끊어졌습니다. 재시도 중…");
    };

    return () => es.close();
  }, [live, runId, ingestEvent, deriveStatus]);

  /* -------------------------------- 파생값/뷰 -------------------------------- */

  const counts = React.useMemo(() => computeCounts(steps), [steps, computeCounts]);
  const firstFailIndex = React.useMemo(() => steps.findIndex((s) => s.result === "fail"), [steps]);
  const visibleSteps = React.useMemo(() => filterSteps(steps, filters), [steps, filters, filterSteps]);

  const [rawOpen, setRawOpen] = React.useState(false);
  const [evOpen, setEvOpen] = React.useState(false);
  const [evStep, setEvStep] = React.useState(null);

  const openEvidence = (s) => {
    setEvStep(s);
    setEvOpen(true);
  };

  const jumpFirstFail = () => {
    if (firstFailIndex < 0) return;
    const rows = document.querySelectorAll("tbody tr");
    const row = rows[firstFailIndex];
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className={RP_PALETTE.card}>
      <RunSummaryBar
        meta={meta || { runId, status: live ? "RUNNING" : "PASS" }}
        counts={counts}
        connected={connected}
        onToggleRaw={() => setRawOpen((v) => !v)}
        onJumpFirstFail={jumpFirstFail}
      />
      <RunFilters filters={filters} setFilters={setFilters} />
      {error && <div className="px-3 py-2 text-amber-400 text-sm">⚠ {error}</div>}
      <RunStepTable steps={visibleSteps} onOpenEvidence={openEvidence} autoScroll={live} />
      <RawNdjsonPanel open={rawOpen} onClose={() => setRawOpen(false)} lines={rawLines || []} />
      <EvidenceModal open={evOpen} onClose={() => setEvOpen(false)} step={evStep} />
      {onClose && (
        <div className="px-3 py-2 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-2 py-1 rounded border border-slate-600 text-xs">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================== Sub Components ============================== */

function RunSummaryBar({ meta, counts, connected, onToggleRaw, onJumpFirstFail }) {
  const dot = RP_PALETTE.dot[meta.status] ?? RP_PALETTE.dot.RUNNING;
  return (
    <div className={`sticky top-0 z-20 px-3 py-2 ${RP_PALETTE.header} ${RP_PALETTE.subbar} flex items-center justify-between`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="font-semibold text-sm">
          {meta.code || `Run #${meta.runId || ""}`} · {meta.status || "…"}
        </span>

        <span className={`${RP_PALETTE.chip} border-slate-300/60 bg-slate-500/5 dark:border-slate-700/60 dark:bg-slate-800/40`}>
          ⏱ {meta.elapsedMs ? `${Math.round(meta.elapsedMs / 1000)}s` : "—"}
        </span>

        <span className={`${RP_PALETTE.chip} ${resultBadgeCls("ok")}`}>통과 {counts.ok}</span>
        <span className={`${RP_PALETTE.chip} ${resultBadgeCls("fail")}`}>실패 {counts.fail}</span>
        <span className={`${RP_PALETTE.chip} ${resultBadgeCls("skip")}`}>스킵 {counts.skip}</span>

        <span className={`${RP_PALETTE.chip} ${connected ? RP_PALETTE.connected : RP_PALETTE.disconnected}`}>
          {connected ? "connected" : "offline"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onJumpFirstFail} className="px-2 py-1 rounded border text-xs border-slate-300/60 dark:border-slate-700/60">
          첫 실패로 이동
        </button>
        <button onClick={onToggleRaw} className="px-2 py-1 rounded border text-xs border-slate-300/60 dark:border-slate-700/60">
          원본 로그
        </button>
      </div>
    </div>
  );
}

function RunFilters({ filters, setFilters }) {
  return (
    <div className={`px-3 py-2 ${RP_PALETTE.subbar} flex items-center gap-2 flex-wrap ${RP_PALETTE.header}`}>
      <strong className="text-sm">필터</strong>
      {["ok", "fail", "skip", "na"].map((k) => (
        <label
          key={k}
          className={`${RP_PALETTE.chip} cursor-pointer bg-white/50 dark:bg-slate-800/60 border-slate-300/60 dark:border-slate-700/60 inline-flex items-center gap-1`}
        >
          <input
            type="checkbox"
            className="accent-sky-500"
            checked={filters[k]}
            onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.checked }))}
          />
          {k.toUpperCase()}
        </label>
      ))}
      <div className="ml-auto">
        <input
          type="search"
          placeholder="스텝/선택자/조건 검색…"
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 min-w-[240px] outline-none"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
      </div>
    </div>
  );
}

function EvidenceModal({ open, onClose, step }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-[96vw] w-[1080px] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <strong>증거(Evidence)</strong>
          <button onClick={onClose} className="px-2 py-1 rounded border border-slate-600">
            닫기
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          <div>
            <div className="text-slate-400 text-sm mb-1">성공 시점 (있으면)</div>
            {step?.okImg ? (
              <img src={step.okImg} alt="성공 시점" className="w-full rounded-lg border border-slate-700" />
            ) : (
              <div className="w-full h-[180px] rounded-lg border border-slate-700 text-slate-500 flex items-center justify-center">
                성공 시점 스크린샷 없음
              </div>
            )}
          </div>
          <div>
            <div className="text-slate-400 text-sm mb-1">실패 시점</div>
            {step?.failImg || step?.evidence ? (
              <img src={step.failImg || step.evidence} alt="실패 시점" className="w-full rounded-lg border border-slate-700" />
            ) : (
              <div className="w-full h-[180px] rounded-lg border border-slate-700 text-slate-500 flex items-center justify-center">
                실패 시점 스크린샷 없음
              </div>
            )}
          </div>
          <div className="md:col-span-2 text-slate-400 text-sm">
            #{step?.no} {step?.name} · {String(step?.type || "").toUpperCase()} · mandatory=Y · {step?.ms}ms
            {step?.reason ? ` · ${step.reason}` : ""} {step?.evidence ? ` · evidence: ${step.evidence}` : ""}
            {fmtSelector(step?.selector) ? ` · sel=${fmtSelector(step?.selector)}` : ""}
            {fmtVisibleIf(step?.visibleIf) ? ` · cond=${fmtVisibleIf(step?.visibleIf)}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function RunStepTable({ steps, onOpenEvidence, tableHeight = "65vh", autoScroll = false }) {
  // 펼침 상태 관리
  const [openSet, setOpenSet] = React.useState(() => new Set());
  const isOpen = (id) => openSet.has(String(id));
  const toggle = (id) =>
    setOpenSet((prev) => {
      const n = new Set(prev);
      const key = String(id);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  // 스크롤 자동 이동 관련
  const scrollRef = React.useRef(null);
  const autoScrollRef = React.useRef(true);   // 현재 "바닥에 거의 붙어 있는지" 상태
  const prevLenRef = React.useRef(0);         // 직전 행 개수

  // 사용자가 스크롤을 위로 올렸는지 감지
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const threshold = 40; // px: 이 정도 이내면 바닥으로 간주
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    autoScrollRef.current = nearBottom;
  };

  // steps 길이가 늘어났을 때, 바닥에 붙어 있으면 자동 스크롤
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevLen = prevLenRef.current;
    const currLen = steps.length;
    prevLenRef.current = currLen;

    if (!autoScroll) return;          // live=false인 히스토리에서는 자동 스크롤 X
    if (currLen <= prevLen) return;   // 새로 추가된 행이 아닐 때는 스킵
    if (!autoScrollRef.current) return; // 사용자가 위로 올려서 보고 있는 중이면 스킵

    // 맨 아래로 스크롤
    el.scrollTop = el.scrollHeight;
  }, [steps.length, autoScroll]);

  // 버튼/링크 클릭 시 행 토글이 일어나지 않도록
  const stop = (e) => e.stopPropagation();
  let lastSheet = null;

  return (
    <div className="overflow-auto" style={{ maxHeight: tableHeight }} ref={scrollRef} onScroll={handleScroll}>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="text-xs uppercase tracking-wide">
          <tr className={`${RP_PALETTE.header}`}>
            <th className={`sticky left-0 z-10 text-left px-3 py-2 ${RP_PALETTE.subbar}`}>#</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>스텝명</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>액션</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>선택자</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>조건(visible_if)</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>필수</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>결과</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>시간(ms)</th>
            <th className={`text-left px-3 py-2 ${RP_PALETTE.subbar}`}>증거</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, idx) => {
            const res = String(s.result || "na").toLowerCase();
            const accentBarCls =
              res === "ok"
                ? "bg-emerald-500/70 dark:bg-emerald-400/60"
                : res === "fail"
                  ? "bg-rose-500/70 dark:bg-rose-400/60"
                  : res === "skip"
                    ? "bg-amber-500/70 dark:bg-amber-400/60"
                    : "bg-slate-300/60 dark:bg-slate-700/60";

            const selFull = fmtSelector(s.selector);
            const selShort = fmtSelectorShort(s.selector, 70);
            const condFull = fmtVisibleIf(s.visibleIf || s.cond);
            const condShort = fmtVisibleIfShort(s.visibleIf || s.cond, 70);

            const rowId = s.id ?? buildStepKey(s); // ★ 고유 id

            const sheetLabel = s.sheet ?? s.sheetName ?? "";
            const showHeader = sheetLabel !== lastSheet;
            lastSheet = sheetLabel;

            return (
              <React.Fragment key={rowId}>
                {showHeader && (
                  <tr className="bg-slate-100 dark:bg-slate-800/70">
                    <td
                      colSpan={9}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700"
                    >
                      {sheetLabel || "(이름 없는 시트)"}
                    </td>
                  </tr>
                )}

                {/* 접힘 행 (콤팩트) */}
                <tr
                  className={[
                    "odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/60 dark:even:bg-slate-900/60",
                    RP_PALETTE.rowHover,
                    "cursor-pointer"
                  ].join(" ")}
                  onClick={() => toggle(rowId)}
                  aria-expanded={isOpen(rowId)}
                >
                  {/* # + chevron */}
                  <td className={`sticky left-0 bg-inherit border-b border-slate-200 dark:border-slate-800 font-mono px-2 py-1.5 relative`}>
                    <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${accentBarCls}`} />
                    <div className="flex items-center gap-1">
                      <span
                        className={[
                          "inline-block select-none transition-transform duration-150",
                          isOpen(rowId) ? "rotate-180" : "rotate-0"
                        ].join(" ")}
                      >
                        ⌄
                      </span>
                      <span>{s.no}</span>
                    </div>
                  </td>

                  {/* 이름 */}
                  <td
                    className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800
                                min-w-[12rem] max-w-[24rem] whitespace-nowrap break-keep truncate"
                    title={s.name}
                  >
                    {s.name || <span className={RP_PALETTE.faint}>—</span>}
                  </td>
                  {/* 액션 */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800">
                    {s.type === "no-action"
                      ? <span className={RP_PALETTE.faint}>No-Action</span>
                      : <span className="font-semibold">{s.type}</span>}
                  </td>

                  {/* 선택자(축약 표시) */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 font-mono truncate max-w-[22rem]" title={selFull}>
                    {selShort || <span className={RP_PALETTE.faint}>—</span>}
                  </td>

                  {/* 조건(축약 표시) */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 font-mono truncate max-w-[22rem]" title={condFull}>
                    {condShort || <span className={RP_PALETTE.faint}>—</span>}
                  </td>

                  {/* 필수 */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 font-semibold">Y</td>

                  {/* 결과 */}
                  <td className={`px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 font-bold ${resultTextCls(s.result)}`}>
                    {(s.result || "NA").toUpperCase()}
                  </td>

                  {/* 시간 */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 font-mono  text-xs">{formatMs(s.ms) ?? "—"}</td>

                  {/* 증거 버튼(클릭 전파 차단) */}
                  <td className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800">
                    {(s.okImg || s.failImg || s.evidence) ? (
                      <button
                        onClick={(e) => { stop(e); onOpenEvidence(s); }}
                        className="px-2 h-7 rounded border border-slate-300/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 text-[11px]"
                        title="증거 보기"
                      >
                        보기
                      </button>
                    ) : (
                      <span className={`${RP_PALETTE.faint} text-xs`}>—</span>
                    )}
                  </td>
                </tr>

                {/* 펼침 행 (상세) */}
                {isOpen(rowId) && (
                  <tr className="bg-white/70 dark:bg-slate-900/70">
                    <td colSpan={9} className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* selector */}
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">선택자</div>
                          {selFull ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`${RP_PALETTE.codeBox} truncate`} title={selFull}>{selFull}</div>
                              <button onClick={(e) => { stop(e); copyToClipboard(selFull); }} className={`${RP_PALETTE.pill} shrink-0`}>복사</button>
                            </div>
                          ) : <div className={RP_PALETTE.faint}>—</div>}
                        </div>

                        {/* visible_if */}
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">조건(visible_if)</div>
                          {condFull ? (
                            <div className={`${RP_PALETTE.codeBox} truncate`} title={condFull}>
                              {condFull}
                            </div>
                          ) : (
                            <div className={RP_PALETTE.faint}>—</div>
                          )}
                        </div>

                        {/* reason / evidence path */}
                        {(s.reason || s.evidence) && (
                          <div className="md:col-span-2 text-sm text-slate-500 dark:text-slate-400">
                            {s.reason && <div className="mb-1">사유: <span className="text-slate-800 dark:text-slate-200">{s.reason}</span></div>}
                            {s.evidence && <div>evidence: <span className="font-mono">{s.evidence}</span></div>}
                          </div>
                        )}
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
  );
}

function RawNdjsonPanel({ open, onClose, lines = [] }) {
  if (!open) return null;
  return (
    <section className="mt-3 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <strong>원본 NDJSON</strong>
        <button onClick={onClose} className="px-2 py-1 rounded border border-slate-600 text-xs">
          닫기
        </button>
      </div>
      <pre className="p-3 bg-slate-950/70 max-h-[40vh] overflow-auto text-slate-200 text-xs">
        {lines.join("\n")}
      </pre>
    </section>
  );
}