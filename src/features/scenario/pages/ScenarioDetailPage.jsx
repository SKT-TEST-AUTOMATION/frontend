import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { toErrorMessage } from "../../../services/axios";
import { ScenarioTestCaseSection } from "../components/ScenarioTestCaseSection";
import { SkeletonScenarioDetail } from "../components/Commons";
import { useToast } from "../../../shared/hooks/useToast";
import PageHeader from "../../../shared/components/PageHeader";
import Toast from "../../../shared/components/Toast";
import { getScenario } from "../../../services/scenarioAPI";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import ScenarioTestFormModal from "../components/ScenarioTestFormModal";


export default function ScenarioDetailPage() {
  const { scenarioId } = useParams();

  // 데이터 상태
  const [scenario, setScenario] = useState({
    id: null,
    code: null,
    name: null,
    description: null,
    creatorName: null,
    creatorId: null,
    updatedAt: null,
    createdAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // 토스트 (공통 훅)
  const { toast, showToast, clearToast } = useToast(3000);

  // 테스트 케이스 섹션 열림/닫힘
  const [openCases, setOpenCases] = useState(true);

  // 데이터 패치
  const fetchScenario = useCallback(async (signal) => {
      if (!scenarioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getScenario(scenarioId, signal);
      setScenario((prev) => ({ ...prev, ...data }));
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchScenario(controller.signal);
    return () => controller.abort();
  }, [fetchScenario]);

  // 메타 포맷
  const prettyMeta = useMemo(() => {
    const fmt = (v) => (v ? new Date(v).toLocaleString() : "-");
    return {
      created: fmt(scenario?.createdAt),
      updated: fmt(scenario?.updatedAt),
    };
  }, [scenario?.createdAt, scenario?.updatedAt]);

  return (
    <>
      {/* 토스트 */}
      <Toast toast={toast} onClose={clearToast} />

      <div className="flex flex-col gap-8 p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* 헤더 + 브레드크럼/액션 */}
        <PageHeader
          title="시나리오 상세"
          subtitle="시나리오 메타 정보, 테스트 케이스, 실행을 한 화면에서 관리합니다."
          breadcrumbs={[
            { label: "테스트 시나리오", to: "/scenarios" },
            { label: "상세" },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ScenarioTestFormModal
                scenarioId={scenarioId}
                onSuccess={() => showToast("success", "시나리오 테스트 실행을 시작했습니다.")}
                onError={(msg) => showToast("error", msg || "시나리오 실행에 실패했습니다.")}
              />
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => fetchScenario(undefined)}
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                새로고침
              </button>
            </div>
          }
        />

        {/* 콘텐츠 카드: 로딩/에러/데이터 */}
        {loading && <SkeletonScenarioDetail />}

        {!loading && error && (
          <ErrorAlert title="불러오기 실패" message={error} className="rounded-2xl" />
        )}

        {!loading && !error && scenario && (
          <>
            {/* 기본 정보 카드 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded-full">
                      {scenario?.code || "CODE-N/A"}
                    </span>
                    {/* 복사 버튼 제거됨 */}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
                    {scenario?.name || "이름 없음"}
                  </h2>
                </div>
                {/* 우측 메타 */}
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div>생성: <span className="text-gray-700 dark:text-gray-300">{prettyMeta.created}</span></div>
                  <div className="mt-0.5">최종 수정: <span className="text-gray-700 dark:text-gray-300">{prettyMeta.updated}</span></div>
                </div>
              </div>

              <div className="px-6 py-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">등록자</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                          {getInitials(scenario?.creatorName)}
                        </span>
                        {scenario?.creatorName ?? "-"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">시나리오 코드</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {scenario?.code ?? "-"}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-xs uppercase text-gray-500 dark:text-gray-400">설명</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                      {scenario?.description ?? "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* 테스트 케이스 섹션: 항상 보이되 내부를 접기/펼치기 */}
            <ScenarioTestCaseSection
              scenarioId={scenarioId}
              collapsible
              open={openCases}
              onToggle={() => setOpenCases((v) => !v)}
            />

            {/* 원본 JSON (디버깅용) */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">data_object</span>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">원본 JSON</h3>
              </div>
              <div className="px-6 py-4">
                <pre className="overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 text-xs text-gray-800 dark:text-gray-200">
{JSON.stringify(scenario, null, 2)}
                </pre>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

function getInitials(name) {
  if (!name) return "?" ;
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
