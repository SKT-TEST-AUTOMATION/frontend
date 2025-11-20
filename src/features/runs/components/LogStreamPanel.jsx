import React from "react";

/**
 * LogStreamPanel
 * - SSE로 들어온 라인을 실시간 표시
 * - 자동 스크롤(바닥 벗어나면 일시 정지), 재개 버튼 제공
 *
 * props:
 *  - runId: number|string (필수)
 *  - onClose?: () => void
 */
export default function LogStreamPanel({ runId, onClose }) {
  const [lines, setLines] = React.useState([]);
  const bottomRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [isNearBottom, setIsNearBottom] = React.useState(true);
  const seenIdsRef = React.useRef(new Set()); // 디듑용 (ts 또는 원문)

  const BOTTOM_THRESHOLD = 24; // px

  // 타입/레벨 별 스타일
  const typeStyle = (t, result, lvl) => {
    const L = (lvl || "").toUpperCase();
    switch (t) {
      case "STEP_START":
        return { cls: "text-cyan-700 dark:text-cyan-300", marker: "▶" };
      case "STEP_OK":
        return { cls: "text-emerald-700 dark:text-emerald-300", marker: "✓" };
      case "STEP_FAIL":
        return { cls: "text-red-700 dark:text-red-300", marker: "✗" };
      case "SHEET_START":
        return { cls: "text-blue-700 dark:text-blue-300", marker: "▣" };
      case "SHEET_END":
        return {
          cls: result === "P" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
          marker: "■",
        };
      case "RUN_EXIT":
        return { cls: "text-slate-600 dark:text-slate-300", marker: "⏻" };
      case "LOG":
        if (L === "WARN" || L === "WARNING") return { cls: "text-amber-700 dark:text-amber-300", marker: "!" };
        if (L === "ERROR" || L === "FAIL") return { cls: "text-red-700 dark:text-red-300", marker: "!" };
        if (L === "DEBUG") return { cls: "text-slate-500 dark:text-slate-400", marker: "·" };
        return { cls: "text-slate-700 dark:text-slate-200", marker: "·" }; // INFO/default
      default:
        return { cls: "text-slate-700 dark:text-slate-200", marker: "•" };
    }
  };

  const checkNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
    setIsNearBottom(near);
    return near;
  };
  const onScroll = () => {
    const near = checkNearBottom();
    if (!near && autoScroll) setAutoScroll(false);
  };

  React.useEffect(() => {
    if (!runId) return;

    const es = new EventSource(`/api/v1/events/runs/${runId}/logs`, { withCredentials: true });

    const onAny = (e) => {
      try {
        const raw = typeof e.data === "string" ? e.data : "";
        if (!raw) return; // keepalive/comment 등
        let text = raw;
        let cls = "text-slate-700 dark:text-slate-200";
        let idForDedup = null;

        try {
          const obj = JSON.parse(raw);
          idForDedup = obj?.ts ?? raw;
          const lvl = (obj?.lvl || "").toUpperCase();
          const type = (obj?.type || "RAW").toUpperCase();
          const step = obj?.step?.name || obj?.msg || "";
          const stepNo = obj?.step?.no != null ? ` #${obj.step.no}` : "";
          const sheet = obj?.sheet ? `[${obj.sheet}${stepNo}] ` : "";
          const elapsed = obj?.elapsedMs != null ? ` (${obj.elapsedMs}ms)` : "";
          const errMsg = obj?.error?.reason ? ` :: ${obj.error.reason}` : "";

          const ts = obj?.ts ? new Date(obj.ts).toLocaleTimeString() : "";
          text = `${ts} (${type}) ${sheet}${step}${elapsed}${errMsg}`;

          const sty = typeStyle(type, obj?.result, lvl);
          cls = sty.cls;
        } catch {
          // JSON 아님 → 원문 유지
          idForDedup = raw;
        }

        // 디듑 & 윈도우 유지
        const seen = seenIdsRef.current;
        if (seen.has(idForDedup)) return;
        seen.add(idForDedup);
        if (seen.size > 5000) {
          seenIdsRef.current = new Set(Array.from(seen).slice(-2500));
        }

        setLines((prev) => {
          const next = [...prev, { text, cls }];
          if (next.length > 2000) next.splice(0, next.length - 2000);
          return next;
        });
      } catch (err) {
        if (import.meta.env?.DEV) console.debug(err);
      }
    };

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
    es.onmessage = onAny;
    ["STEP_START", "STEP_OK", "STEP_FAIL", "SHEET_START", "SHEET_END", "RUN_EXIT", "RAW", "STREAM_IO", "ERROR", "LOG"].forEach(
      (t) => es.addEventListener(t, onAny)
    );
    es.onerror = () => {
      setConnected(false);
      setError("실시간 연결이 끊어졌습니다. 재시도 중...");
    };

    return () => es.close();
  }, [runId]);

  // 자동 스크롤
  React.useEffect(() => {
    if (autoScroll && (isNearBottom || lines.length <= 1)) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [lines.length, autoScroll, isNearBottom]);

  const panelCls =
    "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden";
  const headerCls =
    "flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700";
  const badgeCls = (ok) =>
    ok
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-600/20 dark:text-yellow-200";
  const gotoBottomBtnCls =
    "absolute right-3 bottom-3 px-2 py-1 text-[11px] rounded bg-slate-200/80 hover:bg-slate-300 text-slate-900 shadow dark:bg-slate-700/80 dark:hover:bg-slate-600 dark:text-white";
  const errorTextCls = "text-amber-700 dark:text-amber-300 mb-2";
  const lineContainerCls = "h-60 overflow-auto p-3 font-mono text-xs relative";

  return (
    <div className={panelCls}>
      <div className={headerCls}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">terminal</span>
          <span className="text-xs font-semibold">실시간 로그 · runId={runId}</span>
          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${badgeCls(connected)}`}>
            {connected ? "connected" : "connecting..."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className={`inline-flex items-center gap-1 text-[11px] select-none cursor-pointer text-slate-700 dark:text-slate-300`}>
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            자동 스크롤
          </label>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-white transition text-xs"
          >
            닫기
          </button>
        </div>
      </div>

      <div ref={containerRef} onScroll={onScroll} className={lineContainerCls}>
        {!isNearBottom && !autoScroll && (
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (el) el.scrollTop = el.scrollHeight;
              setAutoScroll(true);
            }}
            className={gotoBottomBtnCls}
            title="맨 아래로 이동"
          >
            ↓ 최신으로
          </button>
        )}
        {error && <div className={errorTextCls}>⚠ {error}</div>}
        {lines.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap break-words ${l.cls}`}>
            {l.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/**
 * LogLinesPanel
 * - 외부에서 라인 배열을 주입받아 보여주는 읽기 전용 패널
 */
export function LogLinesPanel({
  title = "실행 로그",
  lines = [], // string | {text, cls} | jlog event object
  onClose, // optional
  connected, // optional boolean → 상태 뱃지
  height = 240,
  autoScrollDefault = true,
}) {
  const [autoScroll, setAutoScroll] = React.useState(autoScrollDefault);
  const [isNearBottom, setIsNearBottom] = React.useState(true);
  const containerRef = React.useRef(null);
  const BOTTOM_THRESHOLD = 24;

  const typeStyle = (t, result, lvl) => {
    const L = (lvl || "").toUpperCase();
    switch (t) {
      case "STEP_START":
        return { cls: "text-cyan-700 dark:text-cyan-300", marker: "▶" };
      case "STEP_OK":
        return { cls: "text-emerald-700 dark:text-emerald-300", marker: "✓" };
      case "STEP_FAIL":
        return { cls: "text-red-700 dark:text-red-300", marker: "✗" };
      case "SHEET_START":
        return { cls: "text-blue-700 dark:text-blue-300", marker: "▣" };
      case "SHEET_END":
        return {
          cls: result === "P" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
          marker: "■",
        };
      case "RUN_EXIT":
        return { cls: "text-slate-600 dark:text-slate-300", marker: "⏻" };
      case "LOG":
        if (L === "WARN" || L === "WARNING") return { cls: "text-amber-700 dark:text-amber-300", marker: "!" };
        if (L === "ERROR" || L === "FAIL") return { cls: "text-red-700 dark:text-red-300", marker: "!" };
        if (L === "DEBUG") return { cls: "text-slate-500 dark:text-slate-400", marker: "·" };
        return { cls: "text-slate-700 dark:text-slate-200", marker: "·" };
      default:
        return { cls: "text-slate-700 dark:text-slate-200", marker: "•" };
    }
  };

  const normalize = (item) => {
    const faintCls = "text-slate-400 dark:text-slate-500";
    if (typeof item === "string") return { text: item, cls: faintCls };

    if (item && typeof item === "object") {
      if (Object.prototype.hasOwnProperty.call(item, "text")) {
        return { text: String(item.text ?? ""), cls: item.cls || faintCls };
      }
      const L = (item.lvl || "").toUpperCase();
      const type = (item.type || "RAW").toUpperCase();
      const step = item?.step?.name || item?.msg || "";
      const stepNo = item?.step?.no != null ? ` #${item.step.no}` : "";
      const sheet = item?.sheet ? `[${item.sheet}${stepNo}] ` : "";
      const elapsed = item?.elapsedMs != null ? ` (${item.elapsedMs}ms)` : "";
      const errMsg = item?.error?.reason ? ` :: ${item.error.reason}` : "";
      const ts = item?.ts ? new Date(item.ts).toLocaleTimeString() : "";
      const text = `${ts} (${type}) ${sheet}${step}${elapsed}${errMsg}`;
      const sty = typeStyle(type, item?.result, L);
      const hasTypedStyle = type !== "RAW" || L || item?.result || item?.step || item?.sheet;
      return { text, cls: hasTypedStyle ? sty.cls : faintCls };
    }
    return { text: String(item ?? ""), cls: faintCls };
  };

  const panelCls =
    "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden";
  const headerCls =
    "flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700";
  const badgeCls = (ok) =>
    ok
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-600/20 dark:text-yellow-200";
  const gotoBottomBtnCls =
    "absolute right-3 bottom-3 px-2 py-1 text-[11px] rounded bg-slate-200/80 hover:bg-slate-300 text-slate-900 shadow dark:bg-slate-700/80 dark:hover:bg-slate-600 dark:text-white";
  const lineContainerBase = "overflow-auto p-3 font-mono text-xs relative";

  const checkNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD;
    setIsNearBottom(near);
    return near;
  };
  const onScroll = () => {
    const near = checkNearBottom();
    if (!near && autoScroll) setAutoScroll(false);
  };

  React.useEffect(() => {
    if (autoScroll && (isNearBottom || (lines?.length || 0) <= 1)) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [lines?.length, autoScroll, isNearBottom]);

  const normLines = Array.isArray(lines) ? lines.map(normalize) : [];

  return (
    <div className={panelCls}>
      <div className={headerCls}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">terminal</span>
          <span className="text-xs font-semibold">{title}</span>
          {typeof connected === "boolean" && (
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${badgeCls(connected)}`}>
              {connected ? "connected" : "offline"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className={`inline-flex items-center gap-1 text-[11px] select-none cursor-pointer text-slate-700 dark:text-slate-300`}>
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            자동 스크롤
          </label>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-white transition text-xs"
            >
              닫기
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} onScroll={onScroll} className={lineContainerBase} style={{ height }}>
        {!isNearBottom && !autoScroll && (
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (el) el.scrollTop = el.scrollHeight;
              setAutoScroll(true);
            }}
            className={gotoBottomBtnCls}
            title="맨 아래로 이동"
          >
            ↓ 최신으로
          </button>
        )}
        {normLines.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap break-words ${l.cls}`}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}