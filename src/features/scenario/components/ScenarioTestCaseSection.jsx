// src/features/scenarios/components/ScenarioTestCaseSection.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../services/axios";
import fmtDT from "../../../shared/utils/dateUtils";
import { toErrorMessage } from "../../../services/axios";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";

// props:
// - scenarioId: number|string (필수)
// - collapsible: boolean (섹션 자체 접기/펼치기 지원)
// - open: boolean (초깃값)
// - onToggle: () => void (섹션 토글 콜백)
export function ScenarioTestCaseSection({
  scenarioId,
  collapsible = false,
  open = true,
  onToggle,
}) {
  // 목록/상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]); // [{id, code, name, ...}]

  // 행 확장 상태 및 상세 캐시
  const [expandedId, setExpandedId] = useState(null);
  const [detailMap, setDetailMap] = useState({}); // id -> {loading, error, data}

  // 상세 요청 취소 컨트롤러 맵
  const detailAbortRef = useRef({}); // { [id]: AbortController }

  // 목록 로드
  const fetchList = useCallback(
    async (signal) => {
      if (!scenarioId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(
          `/scenarios/${encodeURIComponent(scenarioId)}/testcases`,
          { signal }
        );
        const list = res?.data?.data ?? res?.data ?? [];
        const normalized = (Array.isArray(list) ? list : []).map((it, idx) => ({
          id: Number(it.id),
          order: Number(it.order ?? idx + 1),
          code: it.code ?? it.tcId ?? `TC${it.id}`,
          name: it.name ?? it.title ?? "-",
          description: it.description ?? null,
        }));
        setRows(normalized);
      } catch (err) {
        if (err?.code === REQUEST_CANCELED_CODE) return;
        setError(toErrorMessage(err) || "테스트 케이스 목록 조회에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [scenarioId]
  );

  useEffect(() => {
    const c = new AbortController();
    fetchList(c.signal);
    return () => c.abort();
  }, [fetchList]);

  useEffect(() => {
    // 언마운트 시 진행 중인 상세 요청 취소
    return () => {
      Object.values(detailAbortRef.current).forEach((ctl) => {
        try {
          ctl?.abort();
        } catch {}
      });
      detailAbortRef.current = {};
    };
  }, []);

  // 행 상세 로드 (지연)
  const ensureDetail = useCallback((id) => {
    // 이미 완료/진행 중이면 스킵(최신 상태 기반으로 판단)
    let shouldFetch = true;
    setDetailMap((prev) => {
      const hit = prev[id];
      if (hit?.loading || hit?.data) {
        shouldFetch = false;
        return prev;
      }
      return { ...prev, [id]: { ...(hit || {}), loading: true, error: null } };
    });
    if (!shouldFetch) return;

    // 기존 요청 있으면 취소
    try {
      detailAbortRef.current[id]?.abort();
    } catch {}
    const ctl = new AbortController();
    detailAbortRef.current[id] = ctl;

    (async () => {
      try {
        const res = await api.get(`testcases/${encodeURIComponent(id)}`, {
          signal: ctl.signal,
        });
        const d = res?.data?.data ?? res?.data ?? {};
        const detail = {
          id: Number(d.id ?? id),
          code: d.code ?? d.tcId ?? `TC${id}`,
          name: d.name ?? d.title ?? "-",
          precondition: d.precondition ?? "",
          navigation: d.navigation ?? "",
          procedureDesc: d.procedureDesc ?? "",
          expectedResult: d.expectedResult ?? "",
          comment: d.comment ?? "",
          creatorName: d.creatorName ?? null,
          createdAt: d.createdAt ?? null,
          updatedAt: d.updatedAt ?? null,
        };

        setDetailMap((prev) => ({
          ...prev,
          [id]: { loading: false, error: null, data: detail },
        }));
      } catch (err) {
        if (err?.code === REQUEST_CANCELED_CODE) return;
        setDetailMap((prev) => ({
          ...prev,
          [id]: {
            loading: false,
            error: toErrorMessage(err) || "테스트 케이스 상세 조회에 실패했습니다.",
            data: null,
          },
        }));
      } finally {
        // 사용 끝난 컨트롤러 정리
        delete detailAbortRef.current[id];
      }
    })();
  }, []);

  // 행 토글
  const toggleRow = (id) => {
    setExpandedId((cur) => {
      const next = cur === id ? null : id;
      if (next === id) {
        ensureDetail(id);
      }
      return next;
    });
  };

  // 렌더 유틸
  const toList = (text) =>
    String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
            format_list_bulleted
          </span>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            포함된 테스트 케이스
            {rows?.length ? (
              <span className="ml-2 text-gray-400">({rows.length})</span>
            ) : null}
          </h3>
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="material-symbols-outlined text-base">
              {open ? "expand_less" : "expand_more"}
            </span>
            {open ? "접기" : "펼치기"}
          </button>
        )}
      </div>

      {/* 섹션 본문 */}
      {(!collapsible || open) && (
        <div className="px-6 py-4">
          {loading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              불러오는 중...
            </div>
          )}

          {!loading && error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {!loading && !error && rows?.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              등록된 테스트 케이스가 없습니다.
            </div>
          )}

          {!loading && !error && rows?.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r) => {
                const isOpen = expandedId === r.id;
                const dState = detailMap[r.id] || {};
                const d = dState.data;

                return (
                  <li key={r.id} className="py-2">
                    {/* 행 헤더 */}
                    <button
                      type="button"
                      onClick={() => toggleRow(r.id)}
                      className="w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                          {r.order}
                        </span>
                        <span className="shrink-0 inline-flex items-center px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded-full">
                          {r.code}
                        </span>
                        <span
                          className="text-sm text-gray-900 dark:text-gray-100 truncate"
                          title={r.name}
                        >
                          {r.name}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-gray-500">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </button>

                    {/* 행 본문(펼침) */}
                    {isOpen && (
                      <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
                        {dState.loading && (
                          <div className="text-sm text-gray-500">상세 불러오는 중...</div>
                        )}

                        {dState.error && (
                          <div className="text-sm text-red-600">{dState.error}</div>
                        )}

                        {!dState.loading && !dState.error && d && (
                          <>
                            {/* 상단 메타 */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <span>생성: {fmtDT(d?.createdAt)}</span>
                              <span className="opacity-40">•</span>
                              <span>수정: {fmtDT(d?.updatedAt)}</span>
                              {d?.creatorName && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span>작성자: {d.creatorName}</span>
                                </>
                              )}
                              <Link
                                to={`/testcases/${r.id}/detail`}
                                className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  open_in_new
                                </span>
                                상세 보기
                              </Link>
                            </div>

                            {/* 본문: 프리컨디션/네비/절차/기대결과/비고 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <Field label="Precondition">
                                <Pre>{d?.precondition || "-"}</Pre>
                              </Field>
                              <Field label="Navigation">
                                <Pre>{d?.navigation || "-"}</Pre>
                              </Field>
                              <Field label="절차(Procedure)">
                                <StepList items={toList(d?.procedureDesc)} />
                              </Field>
                              <Field label="기대 결과(Expected)">
                                <StepList items={toList(d?.expectedResult)} />
                              </Field>
                              <div className="md:col-span-2">
                                <Field label="비고">
                                  <Pre>{d?.comment || "-"}</Pre>
                                </Field>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ── 작은 프리젠테이션 컴포넌트들 ───────────────────────── */

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{children}</div>
    </div>
  );
}

function Pre({ children }) {
  return (
    <pre className="whitespace-pre-wrap rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-[13px] leading-relaxed">
      {children}
    </pre>
  );
}

function StepList({ items = [] }) {
  if (!items?.length) return <div className="text-gray-500 dark:text-gray-400">-</div>;
  return (
    <ol className="space-y-1 list-decimal pl-5">
      {items.map((s, i) => (
        <li key={i} className="text-[13px] leading-relaxed">
          {s}
        </li>
      ))}
    </ol>
  );
}
